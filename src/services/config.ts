import { allowsHttpApi, validateApiBaseUrl } from "./api-transport";
import type { HttpLogLevel } from "./http-logging";
import type { MqttLogLevel } from "../protocol/mqtt-logging";

export interface CommunicationConfig {
  apiBaseUrl: string;
  iotApiBaseUrl?: string;
  tenantID?: string;
  environment: string;
  integrationProfile?: string;
  httpLogLevel?: HttpLogLevel;
  mqttLogLevel?: MqttLogLevel;
}
/** A public identifier, never a URL, executable module path or credential. */
export function integrationProfileID(value: unknown): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" || !/^[a-z][a-z0-9-]{0,63}$/.test(value))
    throw new Error("ROWAN_INTEGRATION_PROFILE must be a bundled lowercase profile ID");
  return value;
}
export function communicationConfig(input: Partial<CommunicationConfig>): CommunicationConfig {
  const environment = input.environment === undefined ? "development" : input.environment;
  allowsHttpApi(environment);
  rejectRemovedMockModes(input);
  const apiBaseUrl = input.apiBaseUrl ?? "";
  const iotApiBaseUrl = input.iotApiBaseUrl ?? apiBaseUrl;
  for (const base of [apiBaseUrl, iotApiBaseUrl]) validateApiBaseUrl(base, environment);
  const tenantID = input.tenantID?.trim() || undefined;
  if (tenantID !== undefined && !/^\d+$/.test(tenantID))
    throw new Error("tenant-id must be an integer supplied by the backend");
  const integrationProfile = integrationProfileID(input.integrationProfile);
  const httpLogLevel = input.httpLogLevel ?? (environment === "production" ? "off" : "debug");
  if (!["off", "error", "debug"].includes(httpLogLevel))
    throw new Error("Invalid ROWAN_HTTP_LOG_LEVEL; expected off, error or debug");
  const mqttLogLevel = input.mqttLogLevel ?? (environment === "production" ? "off" : "debug");
  if (!["off", "error", "debug"].includes(mqttLogLevel))
    throw new Error("Invalid ROWAN_MQTT_LOG_LEVEL; expected off, error or debug");
  return {
    environment,
    apiBaseUrl,
    iotApiBaseUrl,
    tenantID,
    ...(integrationProfile ? { integrationProfile } : {}),
    httpLogLevel,
    mqttLogLevel,
  };
}

/** Reject old public selectors rather than silently accepting a removed simulation mode. */
export function rejectRemovedMockModes(input: object) {
  const legacy = input as Record<string, unknown>;
  if ([legacy.httpMode, legacy.deviceMode].some((value) => value === "mock"))
    throw new Error("mock 运行模式已移除，请删除旧通信模式配置并配置真实 API");
}
