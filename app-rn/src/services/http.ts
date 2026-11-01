import type { HttpClient, HttpRequest, HttpResponse } from "../lib/core";
import { validateApiBaseUrl } from "./api-transport";
import {
  HttpDiagnostics,
  isHttpCancellation,
  type HttpFailure,
  type HttpLogContext,
} from "./http-logging";

export function requestUrl(base: string, req: HttpRequest) {
  const url = new URL(base.replace(/\/$/, "") + req.path);
  for (const [key, value] of Object.entries(req.query ?? {}))
    if (value !== undefined) url.searchParams.set(key, String(value));
  return url.toString();
}
export type HttpFetcher = (url: string, init?: RequestInit) => Promise<Response>;
export class FetchHttpClient implements HttpClient {
  constructor(
    private base: string,
    private fetcher: HttpFetcher = (url, init) => globalThis.fetch(url, init),
    environment?: string,
    private diagnostics = new HttpDiagnostics(),
  ) {
    validateApiBaseUrl(base, environment);
  }
  async request<T>(
    req: HttpRequest,
    context: HttpLogContext & { adapt?: (response: HttpResponse<unknown>) => HttpResponse<T> } = {},
  ): Promise<HttpResponse<T>> {
    const url = requestUrl(this.base, req);
    const headers = {
      Accept: "application/json",
      ...(req.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...req.headers,
    };
    const span = this.diagnostics.start({ ...req, headers }, { ...context, url });
    let phase: HttpFailure = "request_error";
    let raw: HttpResponse<unknown> | undefined;
    let status: number | undefined;
    try {
      const body = req.body === undefined ? undefined : JSON.stringify(req.body);
      phase = "network_error";
      const response = await this.fetcher(url, {
        method: req.method,
        headers,
        body,
        signal: req.signal,
      });
      status = response.status;
      phase = "response_parse_error";
      const data =
        status === 204 ? { success: true, code: 0, message: "", data: {} } : await response.json();
      raw = { status, data, headers: Object.fromEntries(response.headers.entries()) };
      phase = "response_adapter_error";
      const result = context.adapt ? context.adapt(raw) : (raw as HttpResponse<T>);
      span.response(raw);
      return result;
    } catch (error) {
      span.failure(error, isHttpCancellation(error, req) ? "cancelled" : phase, raw, status);
      throw error;
    }
  }
}
