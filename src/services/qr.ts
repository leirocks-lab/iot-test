export type CodeIdentity =
  { type: "share"; deviceID: string; bindCode: string } |
  { type: "device"; deviceID: string; deviceProductID: string };
export type RowanCodeParser = (value: string) => CodeIdentity;

/** App-owned first-binding device label. Share codes remain deployment-defined. */
export function parseRowanDeviceCode(value: string): CodeIdentity {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("无效的 ROWAN 设备二维码");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("无效的 ROWAN 设备二维码");
  const code = parsed as Record<string, unknown>;
  if (
    Object.keys(code).length !== 4 ||
    code.type !== "rowan.device" ||
    code.v !== 1 ||
    typeof code.deviceId !== "string" ||
    !code.deviceId.trim() ||
    typeof code.productId !== "string" ||
    !code.productId.trim()
  )
    throw new Error("无效的 ROWAN 设备二维码");
  return { type: "device", deviceID: code.deviceId, deviceProductID: code.productId };
}

export function rowanCodeParser(shareParser?: RowanCodeParser): RowanCodeParser {
  return (value) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      // A separately configured share parser may use a non-JSON format.
    }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const kind = (parsed as Record<string, unknown>).type;
      if (kind === "rowan.device" || kind === "rowan.product")
        return parseRowanDeviceCode(value);
    }
    if (shareParser) return shareParser(value);
    return parseRowanDeviceCode(value);
  };
}

export function parseRowanCandidates(
  values: readonly string[],
  parser: RowanCodeParser,
): CodeIdentity[] {
  const unique = new Map<string, CodeIdentity>();
  for (const value of values) {
    try {
      const code = parser(value);
      if (
        !code ||
        (code.type === "device"
          ? typeof code.deviceID !== "string" || !code.deviceID ||
            typeof code.deviceProductID !== "string" || !code.deviceProductID
          : code.type !== "share" ||
            typeof code.deviceID !== "string" ||
            !code.deviceID ||
            typeof code.bindCode !== "string" ||
            !code.bindCode)
      )
        continue;
      const key = JSON.stringify(
        code.type === "device"
          ? ["device", code.deviceID, code.deviceProductID]
          : ["share", code.deviceID, code.bindCode],
      );
      if (!unique.has(key)) unique.set(key, code);
    } catch {
      /* A non-ROWAN barcode is not an eligible candidate. */
    }
  }
  if (!unique.size) throw new Error("图片中没有有效的 ROWAN 二维码");
  return [...unique.values()];
}
