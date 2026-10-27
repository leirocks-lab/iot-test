import type { HttpRequest, HttpResponse, Logger } from "../lib/core";

export type HttpLogLevel = "off" | "error" | "debug";
type Target = "platform" | "iot" | "http";
export type HttpFailure =
  | "network_error"
  | "request_error"
  | "response_parse_error"
  | "response_adapter_error"
  | "cancelled";
export interface HttpLogContext {
  target?: Target;
  sourcePath?: string;
  url?: string;
}

const REDACTED = "[REDACTED]";
const TRUNCATED = "[TRUNCATED]";
const MAX_FIELD = 4096;
const sensitive = (key: string) =>
  /authorization|cookie|token|password|passwd|passphrase|captcha|secret|privatekey|apikey|clientkey|^pin$|^pwd$|^verificationcode$|^verifycode$|^codeverifier$/i.test(
    key.replace(/[^a-z0-9]/gi, ""),
  );

function pathText(text: string) {
  return text
    .replace(/(\/captcha\/)[^/?#\s]+/gi, `$1${REDACTED}`)
    .replace(
      /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
      (email) => `${email[0]}***@${email.split("@")[1]}`,
    )
    .replace(/\bBearer\s+[^\s,;"']+/gi, `Bearer ${REDACTED}`);
}

function safeText(text: string, depth = 0): string {
  const cleanUrl = (raw: string, relative: boolean) => {
    try {
      const url = new URL(raw, "https://http-log.invalid");
      if (url.username || url.password) {
        url.username = REDACTED;
        url.password = REDACTED;
      }
      if (url.hash) url.hash = REDACTED;
      for (const [key, value] of [...url.searchParams]) {
        url.searchParams.set(
          key,
          sensitive(key) || depth >= 3 ? REDACTED : safeText(value, depth + 1),
        );
      }
      // Decode each segment (%40 included) without turning encoded slashes into separators.
      const segments = url.pathname.split("/").map((part) => decodeURIComponent(part));
      url.pathname = segments
        .map((part, index) =>
          encodeURIComponent(
            segments[index - 1]?.toLowerCase() === "captcha" ? REDACTED : pathText(part),
          ),
        )
        .join("/");
      return relative
        ? `${raw.startsWith("//") ? `//${url.host}` : ""}${url.pathname}${url.search}${url.hash}`
        : url.toString();
    } catch {
      return "[UNREADABLE_URL]";
    }
  };
  // Relative logical paths can include credentials in query parameters as well.
  if (/^(?:\/|\.\.?\/|\?)/.test(text)) return cleanUrl(text, true);
  // Query parameters and URL credentials can carry secrets even inside JSON values.
  const cleaned = text.replace(/https?:\/\/[^\s"<>]+/gi, (raw) => cleanUrl(raw, false));
  return pathText(cleaned);
}

/** Creates bounded, detached data: never hands original request/response objects to a sink. */
function snapshot(value: unknown): unknown {
  let remaining = 200;
  const seen = new WeakSet<object>();
  const walk = (item: unknown, depth: number): unknown => {
    if (--remaining < 0 || depth > 6) return TRUNCATED;
    if (typeof item === "string") {
      const text = safeText(item);
      return text.length > MAX_FIELD ? text.slice(0, MAX_FIELD) + TRUNCATED : text;
    }
    if (
      item === null ||
      typeof item === "number" ||
      typeof item === "boolean" ||
      item === undefined
    )
      return item;
    if (typeof item !== "object") return `[${typeof item}]`;
    if (seen.has(item)) return "[CIRCULAR]";
    seen.add(item);
    if (Array.isArray(item)) {
      // Read descriptors rather than elements: diagnostics must not execute indexed getters.
      const length = Object.getOwnPropertyDescriptor(item, "length")?.value as number;
      const result: unknown[] = [];
      for (let index = 0; index < Math.min(length, 30); index++) {
        const descriptor = Object.getOwnPropertyDescriptor(item, String(index));
        result.push(
          !descriptor
            ? undefined
            : "value" in descriptor
              ? walk(descriptor.value, depth + 1)
              : "[ACCESSOR]",
        );
      }
      if (length > 30) result.push(TRUNCATED);
      return result;
    }
    const result: Record<string, unknown> = {};
    const fields = Object.entries(Object.getOwnPropertyDescriptors(item));
    for (const [key, descriptor] of fields.slice(0, 30)) {
      if (!descriptor.enumerable) continue;
      Object.defineProperty(result, safeText(key), {
        value: sensitive(key)
          ? REDACTED
          : "value" in descriptor
            ? walk(descriptor.value, depth + 1)
            : "[ACCESSOR]",
        enumerable: true,
      });
    }
    if (fields.length > 30)
      Object.defineProperty(result, "__truncated", { value: TRUNCATED, enumerable: true });
    return result;
  };
  try {
    const result = walk(value, 0);
    const serialized = JSON.stringify(result);
    return serialized && serialized.length > MAX_FIELD
      ? serialized.slice(0, MAX_FIELD) + TRUNCATED
      : result;
  } catch {
    return "[UNREADABLE]";
  }
}

/** Shared bounded redaction for transport diagnostics; HTTP formatting is unchanged. */
export { snapshot as diagnosticSnapshot };

/** Formats snapshots into one console call so concurrent requests do not interleave lines. */
export class ConsoleLogger implements Logger {
  debug(message: string, context?: Readonly<Record<string, unknown>>) {
    console.debug(message + "\n" + JSON.stringify(context, null, 2));
  }
  info(message: string, context?: Readonly<Record<string, unknown>>) {
    console.info(message + "\n" + JSON.stringify(context, null, 2));
  }
  warn(message: string, context?: Readonly<Record<string, unknown>>) {
    console.warn(message + "\n" + JSON.stringify(context, null, 2));
  }
  error(message: string, context?: Readonly<Record<string, unknown>>) {
    console.error(message + "\n" + JSON.stringify(context, null, 2));
  }
}

let sequence = 0;
const clock = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
function outcome(response: HttpResponse<unknown>) {
  if (response.status >= 400) return "http_error";
  const body = response.data;
  if (body && typeof body === "object") {
    const code = Object.getOwnPropertyDescriptor(body, "code")?.value;
    const success = Object.getOwnPropertyDescriptor(body, "success")?.value;
    if (success === false || (typeof code === "number" && code !== 0)) return "business_error";
  }
  return "success";
}

export interface HttpLogSpan {
  response(response: HttpResponse<unknown>): void;
  failure(
    error: unknown,
    result: HttpFailure,
    response?: HttpResponse<unknown>,
    status?: number,
  ): void;
}
const silentSpan: HttpLogSpan = { response: () => undefined, failure: () => undefined };

export class HttpDiagnostics {
  private level: HttpLogLevel;
  private logger: Logger;
  constructor(options: { level?: HttpLogLevel; logger?: Logger } = {}) {
    this.level = options.level ?? "off";
    this.logger = options.logger ?? new ConsoleLogger();
  }

  start(req: HttpRequest, context: HttpLogContext = {}): HttpLogSpan {
    if (this.level === "off") return silentSpan;
    const start = clock();
    const requestId = `req-${++sequence}`;
    // Fail closed if metadata cannot be snapshotted. Logging must never fail a request.
    let base: Record<string, unknown>;
    try {
      base = {
        requestId,
        method: req.method,
        target: context.target ?? "http",
        sourcePath: snapshot(context.sourcePath ?? req.path),
        url: snapshot(context.url ?? req.path),
      };
    } catch {
      return silentSpan;
    }
    const emit = (
      event: string,
      result?: string,
      response?: HttpResponse<unknown>,
      error?: unknown,
      status?: number,
    ) => {
      try {
        const failed = result !== undefined && result !== "success" && result !== "cancelled";
        if (this.level === "error" && !failed) return;
        const entry = {
          ...base,
          timestamp: new Date().toISOString(),
          event,
          ...(event === "request"
            ? {
                headers: snapshot(req.headers ?? {}),
                query: snapshot(req.query),
                body: snapshot(req.body),
              }
            : {
                result,
                durationMs: Math.max(0, Math.round(clock() - start)),
                status: response?.status ?? status ?? null,
                ...(response
                  ? { headers: snapshot(response.headers), body: snapshot(response.data) }
                  : {}),
                // Arbitrary exception messages/stacks can echo credentials; only emit a known name.
                ...(error
                  ? {
                      error:
                        error instanceof Error &&
                        [
                          "Error",
                          "TypeError",
                          "SyntaxError",
                          "AbortError",
                          "TimeoutError",
                        ].includes(error.name)
                          ? error.name
                          : "Error",
                    }
                  : {}),
              }),
        };
        const marker = event === "request" ? "→" : failed ? "✕" : "←";
        const title = `[HTTP] ${marker} [${requestId}] ${req.method} ${String(base.url)}`;
        if (failed) this.logger.error(title, entry);
        else this.logger.debug(title, entry);
      } catch {
        /* A broken sink or snapshot must not affect transport or business behavior. */
      }
    };
    emit("request");
    return {
      response: (response) => {
        try {
          emit("response", outcome(response), response);
        } catch {
          /* Classification is diagnostic only. */
        }
      },
      failure: (error, result, response, status) =>
        emit("failure", result, response, error, status),
    };
  }
}

export function isHttpCancellation(error: unknown, req: HttpRequest) {
  return (
    req.signal?.aborted === true ||
    (error instanceof Error &&
      (error.name === "AbortError" || ("code" in error && error.code === 499)))
  );
}
