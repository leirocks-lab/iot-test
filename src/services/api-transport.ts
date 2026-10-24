/** Only named development/test environments may use cleartext business APIs. */
export function allowsHttpApi(environment: unknown = "production"): boolean {
  if (!["development", "preview", "production"].includes(environment as string)) {
    throw new Error(`Unknown communication environment: ${String(environment)}`);
  }
  return environment !== "production";
}

/** Shared by config and both real HTTP layers; missing low-level environment is strict. */
export function validateApiBaseUrl(base: string, environment?: string): URL {
  const allowHttp = allowsHttpApi(environment);
  if (typeof base !== "string" || base !== base.trim() || !/^https?:\/\//i.test(base)) {
    throw new Error("业务 API 必须配置有效 HTTP/HTTPS 地址；production 仅允许 HTTPS");
  }
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error("业务 API 地址格式无效");
  }
  if (!allowHttp && url.protocol !== "https:") {
    throw new Error("Production business APIs require HTTPS");
  }
  if (
    !url.hostname ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    base.includes("?") ||
    base.includes("#")
  ) {
    throw new Error("真实模块根必须是无凭据、查询和片段的 HTTP/HTTPS 地址");
  }
  if (/\/app-api\/?$/.test(url.pathname)) {
    throw new Error("请配置模块根地址，不要包含/app-api");
  }
  return url;
}
