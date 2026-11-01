import type { WifiReader } from "../services/wifi";
export function createWifiReader(): WifiReader {
  return { read: async () => ({ connection: "unknown", band: "unknown", source: "system" }) };
}
