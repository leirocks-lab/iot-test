import { ApiError } from "./models";
import type { WifiObservation } from "./network-policy";

export interface WifiReader {
  read(signal?: AbortSignal, requestPermission?: boolean): Promise<WifiObservation>;
}
export function observeWifi(input: {
  type: string;
  isConnected: boolean | null;
  details?: { ssid?: string | null; frequency?: number | null } | null;
}): WifiObservation {
  const connection =
    input.isConnected === false
      ? "offline"
      : input.type === "wifi"
        ? "wifi"
        : ["none", "cellular", "ethernet", "wimax"].includes(input.type)
          ? "other"
          : "unknown";
  const ssid = input.details?.ssid;
  const frequency = input.details?.frequency;
  return {
    connection,
    source: "system",
    ...(connection === "wifi" && input.isConnected === true && ssid && ssid !== "<unknown ssid>"
      ? { ssid }
      : {}),
    band:
      typeof frequency === "number" && frequency >= 2400 && frequency < 2500
        ? "2.4"
        : typeof frequency === "number" && frequency >= 4900 && frequency < 5900
          ? "5"
          : "unknown",
  };
}
export function requireCurrentWifi(observation: WifiObservation, expectedSSID?: string) {
  if (observation.connection !== "wifi")
    throw new ApiError(400, "请在系统设置中连接设备支持的Wi-Fi网络");
  if (!observation.ssid) throw new ApiError(403, "无法读取当前Wi-Fi名称，请检查系统权限和网络设置");
  if (expectedSSID !== undefined && observation.ssid !== expectedSSID)
    throw new ApiError(409, "当前Wi-Fi已变化，请核对网络并重新输入密码");
  return observation.ssid;
}
