import { bytesToHex } from "@noble/hashes/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";
import type { HttpClient, HttpRequest, HttpResponse } from "../lib/core";
import type { CommunicationConfig } from "./config";
import { FetchHttpClient, type HttpFetcher } from "./http";
import { ApiError } from "./models";
import { realEnvelope, realResponseData } from "./real-api-data";
import { validateApiBaseUrl } from "./api-transport";
import { HttpDiagnostics } from "./http-logging";

type RealHttpConfig = Pick<CommunicationConfig, "apiBaseUrl" | "iotApiBaseUrl" | "tenantID"> &
  Partial<Pick<CommunicationConfig, "environment">>;
export function realSessionScope(config: RealHttpConfig) {
  const scope = JSON.stringify([
    config.apiBaseUrl,
    config.iotApiBaseUrl ?? config.apiBaseUrl,
    config.tenantID ?? null,
  ]);
  return bytesToHex(sha256(new TextEncoder().encode(scope)));
}
export class RealHttpClient implements HttpClient {
  private platform: FetchHttpClient;
  private iot: FetchHttpClient;
  private tenantID?: string;
  constructor(config: RealHttpConfig, fetcher?: HttpFetcher, diagnostics = new HttpDiagnostics()) {
    for (const root of [config.apiBaseUrl, config.iotApiBaseUrl ?? config.apiBaseUrl]) {
      validateApiBaseUrl(root, config.environment);
    }
    this.tenantID = config.tenantID;
    if (this.tenantID !== undefined && !/^\d+$/.test(this.tenantID))
      throw new Error("tenant-id must be an integer supplied by the backend");
    this.platform = new FetchHttpClient(
      config.apiBaseUrl,
      fetcher,
      config.environment,
      diagnostics,
    );
    this.iot = new FetchHttpClient(
      config.iotApiBaseUrl ?? config.apiBaseUrl,
      fetcher,
      config.environment,
      diagnostics,
    );
  }
  async request<T>(req: HttpRequest): Promise<HttpResponse<T>> {
    if (req.signal?.aborted) throw new ApiError(499, "操作已取消");
    if (!req.path.startsWith("/api/app/")) throw new ApiError(400, "接口不属于App通信边界");
    const isIot =
      /^\/api\/app\/(?:device(?:s)?(?:\/|$)|products?(?:\/|$)|plugins?(?:\/|$)|user\/(?:locations|device-shares)(?:\/|$))/.test(
        req.path,
      );
    const body =
      req.method === "PUT" &&
      /^\/api\/app\/devices\/[^/]+\/location$/.test(req.path) &&
      (req.body as { id?: unknown } | undefined)?.id === null
        ? {}
        : req.body;
    return (isIot ? this.iot : this.platform).request<T>(
      {
        ...req,
        path: req.path.replace(/^\/api\/app\//, "/app-api/"),
        body,
        headers: {
          ...req.headers,
          ...(this.tenantID !== undefined ? { "tenant-id": this.tenantID } : {}),
        },
      },
      {
        target: isIot ? "iot" : "platform",
        sourcePath: req.path,
        adapt: (response) => {
          if (req.signal?.aborted) throw new ApiError(499, "操作已取消");
          const envelope = realEnvelope(response.data, response.status);
          if (envelope.success) envelope.data = realResponseData(req, envelope.data);
          return { ...response, data: envelope as T };
        },
      },
    );
  }
}
