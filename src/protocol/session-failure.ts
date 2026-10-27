import { ApiError } from "../services/models";

export type SessionFailureKind =
  "transient" | "authorization" | "not_found" | "configuration" | "cancelled";
export interface SessionFailure {
  kind: SessionFailureKind;
  code?: number;
}
export function sessionFailure(error: unknown): SessionFailure {
  if (!(error instanceof ApiError)) return { kind: "configuration" };
  const code = error.code;
  if (error.failureKind) return { kind: error.failureKind, code };
  return {
    code,
    kind:
      code === 499
        ? "cancelled"
        : [401, 403].includes(code)
          ? "authorization"
          : code === 404
            ? "not_found"
            : code === 0 || code === 408 || code === 429 || (code >= 500 && code <= 599)
              ? "transient"
              : "configuration",
  };
}
