import { ApiError } from "../services/models";

const names = ["certificationURL", "activationURL", "bindingURL", "otaURL"] as const;

/** PAIR-04 device-side URLs must use HTTPS in every environment. */
export function provisionAddresses(
  urls: Record<string, string> | undefined,
  _environment?: string,
): string[] {
  const addresses = names.map((name) => urls?.[name]);
  if (
    addresses.some((value) => {
      if (typeof value !== "string" || value !== value.trim()) return true;
      try {
        const url = new URL(value);
        return !url.hostname || url.protocol !== "https:";
      } catch {
        return true;
      }
    })
  )
    throw new ApiError(503, "配网服务地址未提供有效HTTPS地址");
  return addresses as string[];
}
