import { ApiError } from "./models";
import type { WifiObservation } from "./network-policy";

export interface WifiReader {
  readonly supportsManualSSID?: boolean;
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

/** Manual input is a user target, never a fabricated system observation. */
export async function checkProvisionWifi(
  reader: WifiReader,
  ssid: string,
  manual: boolean,
  signal: AbortSignal,
) {
  const allowed = manual && reader.supportsManualSSID === true;
  if (manual && !allowed) throw new ApiError(403, "当前平台不支持手动输入 Wi-Fi");
  let network: WifiObservation;
  try {
    network = await reader.read(signal);
  } catch (error) {
    if (signal.aborted || (error instanceof ApiError && error.code === 499) || !allowed)
      throw error;
    return;
  }
  if (signal.aborted) throw new ApiError(499, "网络读取已停止");
  if (network.band === "5") throw new ApiError(400, "请使用设备支持的2.4GHz网络");
  if (allowed && !network.ssid) return;
  requireCurrentWifi(network, ssid);
}
