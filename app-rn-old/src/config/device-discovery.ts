/** Default foreground BLE scan window, in milliseconds. */
export const deviceDiscoveryConfig = { scanDurationMs: 60_000 };

export function resolveDeviceScanDuration(
  durationMs = deviceDiscoveryConfig.scanDurationMs,
): number {
  if (!Number.isInteger(durationMs) || durationMs <= 0 || durationMs > 2_147_483_647) {
    throw new Error("设备扫描时长必须为正整数毫秒，且不超过 2147483647");
  }
  return durationMs;
}
