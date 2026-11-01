import { encode0822 } from "./ble-0822";

/** Simulated firmware reply: same AES frame layout, firmware's observed CRC-8/0x31. */
export function deviceFrame0822(command: number, data: Uint8Array, key: Uint8Array) {
  const frame = encode0822(command, data, key);
  let crc = 0;
  for (const byte of [command, ...data]) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = crc & 0x80 ? ((crc << 1) ^ 0x31) & 0xff : (crc << 1) & 0xff;
  }
  frame[frame.length - 1] = crc;
  return frame;
}
