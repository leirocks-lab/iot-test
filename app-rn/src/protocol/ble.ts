import { bytesToHex } from "@noble/hashes/utils.js";
import { ctr } from "@noble/ciphers/aes.js";

export const BLE_UUID = {
  services: ["00000822-0000-1000-8000-00805f9b34fb", "00000922-0000-1000-8000-00805f9b34fb"],
  write: "0000aab1-0000-1000-8000-00805f9b34fb",
  notify: "0000aab2-0000-1000-8000-00805f9b34fb",
};
export const utf8 = (value: string) => new TextEncoder().encode(value);
/** Existing 0922 key rule, retained for the real dual-protocol adapter. */
export function deriveKey(mac: string, model: string) {
  const normalized = mac.replaceAll(":", "").toLowerCase();
  if (!/^[0-9a-f]{12}$/.test(normalized) || model.length < 4 || !/^[\x20-\x7e]+$/.test(model))
    throw new Error("0922 Key profile requires MAC and ASCII model");
  return utf8(normalized + model.slice(0, 4));
}
export function crc8(data: Uint8Array) {
  let crc = 0;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0x8c : crc >>> 1;
  }
  return crc;
}
export function encodeFrame(command: number, data: Uint8Array, key: Uint8Array) {
  if (data.length > 254 || command < 0 || command > 255) throw new Error("BLE LEN overflow");
  const plain = new Uint8Array([command, ...data]),
    encrypted = ctr(key, new Uint8Array(16)).encrypt(plain);
  return new Uint8Array([0xa5, 0x5a, plain.length, ...encrypted, crc8(plain)]);
}
export function decodeFrame(frame: Uint8Array, key: Uint8Array) {
  if (frame.length < 5 || frame[0] !== 0xa5 || frame[1] !== 0x5a || frame[2] !== frame.length - 4)
    throw new Error("Invalid BLE header/LEN");
  const plain = ctr(key, new Uint8Array(16)).decrypt(frame.slice(3, -1));
  if (crc8(plain) !== frame[frame.length - 1]) throw new Error("BLE CRC mismatch");
  return { command: plain[0], data: plain.slice(1) };
}
export function fragment(payload: Uint8Array, mtu: number) {
  const size = Math.min(127, mtu - 4);
  if (size < 1) throw new Error("Invalid MTU");
  if (payload.length <= size) return [new Uint8Array([0, ...payload])];
  const result: Uint8Array[] = [];
  for (let i = 0; i < payload.length; i += size)
    result.push(
      new Uint8Array([
        i === 0 ? 1 : i + size >= payload.length ? 0x11 : 0x10,
        ...payload.slice(i, i + size),
      ]),
    );
  return result;
}
export function reassemble(packets: readonly Uint8Array[]) {
  if (!packets.length) throw new Error("Missing BLE fragments");
  if (packets.length === 1 && packets[0][0] === 0) return packets[0].slice(1);
  if (
    packets.length < 2 ||
    packets[0][0] !== 1 ||
    packets.at(-1)![0] !== 0x11 ||
    packets.slice(1, -1).some((p) => p[0] !== 0x10)
  )
    throw new Error("BLE fragment order");
  const out = new Uint8Array(packets.reduce((sum, p) => sum + p.length - 1, 0));
  let offset = 0;
  for (const p of packets) {
    out.set(p.slice(1), offset);
    offset += p.length - 1;
  }
  return out;
}
export interface Advertisement {
  handle: string;
  service: string;
  manufacturer: Uint8Array;
  rssi?: number;
  manufacturerIncludesCompany?: boolean;
}
export interface DiscoveredDevice {
  handle: string;
  mac: string;
  model: string;
  service: string;
  rssi?: number;
  productID?: string;
}
export function parseAdvertisement(ad: Advertisement): DiscoveredDevice {
  if (!["0822", "0922", ...BLE_UUID.services].includes(ad.service.toLowerCase()))
    throw new Error("Unsupported BLE service");
  const offset = ad.manufacturerIncludesCompany === false ? 0 : 2,
    data = ad.manufacturer;
  if (data.length < offset + 7) throw new Error("Truncated manufacturer data");
  const length = data[offset + 6];
  if (length < 1 || length > 15 || data.length < offset + 7 + length)
    throw new Error("Invalid model length");
  const mac = bytesToHex(data.slice(offset, offset + 6)),
    model = new TextDecoder("utf-8", { fatal: true }).decode(
      data.slice(offset + 7, offset + 7 + length),
    );
  return { handle: ad.handle, mac, model, service: ad.service, rssi: ad.rssi ?? -50 };
}
