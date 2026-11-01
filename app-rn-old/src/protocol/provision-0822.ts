import { ApiError, type BindingResult } from "../services/models";
import { utf8 } from "./ble";
import {
  appDigest0822,
  decodeDevice0822,
  encode0822,
  factoryReply0822,
  key0822,
  verifyFactory0822,
} from "./ble-0822";
import { withBudget, type DeviceTransport, type ProvisionInput } from "./device";
import { provisionAddresses } from "./provision-urls";

export interface ProvisionRunner {
  run(
    input: ProvisionInput,
    onStatus: (status: string) => void,
    signal?: AbortSignal,
    confirmBinding?: (signal?: AbortSignal) => Promise<BindingResult>,
    onSubmitted?: () => void,
  ): Promise<BindingResult>;
}
export interface Profile0822 {
  /** App 0x8F DATA after the 0x0F challenge; current firmware uses zero-length DATA. */
  factoryReply: Uint8Array;
  stageTimeout: number;
}
/** Selected SOFTSTART=5 protocol. Injected ports/vectors are development evidence, not board acceptance. */
export class Provisioner0822 implements ProvisionRunner {
  constructor(
    private transport: DeviceTransport,
    private profile: Profile0822,
    private environment?: string,
  ) {}
  async run(
    input: ProvisionInput,
    onStatus: (status: string) => void,
    signal?: AbortSignal,
    confirmBinding?: (signal?: AbortSignal) => Promise<BindingResult>,
    onSubmitted?: () => void,
  ): Promise<BindingResult> {
    const check = () => {
      if (signal?.aborted) throw new ApiError(499, "0822客户端操作已停止");
    };
    check();
    if (!confirmBinding) throw new ApiError(503, "0822必须通过云端查询确认账号绑定");
    if (
      !this.profile ||
      !(this.profile.factoryReply instanceof Uint8Array) ||
      !Number.isFinite(this.profile.stageTimeout) ||
      this.profile.stageTimeout <= 0
    )
      throw new ApiError(503, "0822等待预算或工厂确认数据无效");
    if (input.modelID !== input.model || !input.productID || !input.token || !input.seriesName)
      throw new ApiError(503, "真实配网产品/系列/型号/Token未确认");
    const addresses = provisionAddresses(input.urls, this.environment);
    if (!input.ssid || utf8(input.ssid).length > 32)
      throw new ApiError(400, "Wi-Fi 名称不能为空或超过32字节");
    const key = key0822(input.mac, input.model);
    const frames: Uint8Array[] = [];
    try {
      // Preflight every value before the first device write; do not partially send an invalid transaction.
      frames.push(encode0822(0, appDigest0822(input.mac, input.seriesName, input.modelID), key));
      const factory = factoryReply0822(this.profile.factoryReply, key);
      frames.push(factory);
      const values = [
        input.ssid,
        input.password,
        input.token,
        input.bindCode || "null",
        input.productID,
        input.modelID,
        ...(addresses as string[]),
      ];
      for (let index = 0; index < values.length; index++)
        frames.push(encode0822(index + 1, utf8(values[index]), key));
      const send = async (frame: Uint8Array, expected?: number, echo?: string) => {
        check();
        if (this.transport.reportsProvisionWriteStart !== true) onSubmitted?.();
        const response = await this.transport.exchange(input, [frame], signal, onSubmitted);
        try {
          check();
          if (expected === undefined) {
            if (response.length) throw new ApiError(0x63, "8F不应有未定义ACK");
            return;
          }
          if (response.length !== 1) throw new ApiError(0x63, "0822应答数量无效");
          const reply = decodeDevice0822(response[0], key);
          try {
            if (reply.command !== expected) throw new ApiError(0x63, "0822参数ACK不匹配");
            if (echo !== undefined) {
              const bytes = utf8(echo);
              try {
                if (
                  reply.data.length > 0 &&
                  (bytes.length !== reply.data.length ||
                    bytes.some((byte, index) => byte !== reply.data[index]))
                ) {
                  if (typeof __DEV__ !== "undefined" && __DEV__) {
                    let matchingPrefix = 0;
                    while (
                      matchingPrefix < bytes.length &&
                      matchingPrefix < reply.data.length &&
                      bytes[matchingPrefix] === reply.data[matchingPrefix]
                    )
                      matchingPrefix++;
                    console.warn("0822 echo mismatch metadata", {
                      command: reply.command,
                      expectedLength: bytes.length,
                      actualLength: reply.data.length,
                      matchingPrefix,
                      trailingNull:
                        reply.data.length === bytes.length + 1 &&
                        matchingPrefix === bytes.length &&
                        reply.data.at(-1) === 0,
                      replyIsOk:
                        reply.data.length === 2 && reply.data[0] === 0x6f && reply.data[1] === 0x6b,
                    });
                  }
                  throw new ApiError(0x63, "0822 Wi-Fi参数回显不一致");
                }
              } finally {
                bytes.fill(0);
              }
            }
          } finally {
            reply.data.fill(0);
          }
        } finally {
          for (const raw of response) raw.fill(0);
        }
      };
      onStatus("校验设备");
      await send(frames[0], 0x80);
      const replies = await this.transport.challenge(input, signal);
      try {
        check();
        if (replies.length !== 1) throw new ApiError(0x7f, "0822工厂挑战数量无效");
        const reply = decodeDevice0822(replies[0], key);
        try {
          if (reply.command !== 0x0f || !verifyFactory0822(input.mac, reply.data))
            throw new ApiError(0x7f, "0822工厂挑战不匹配");
        } finally {
          reply.data.fill(0);
        }
      } finally {
        for (const raw of replies) raw.fill(0);
      }
      await send(factory);
      for (let index = 0; index < values.length; index++) {
        onStatus(`参数 ${index + 1}/10`);
        await send(frames[index + 2], 0x81 + index, index < 2 ? values[index] : undefined);
      }
      await withBudget(
        (budget) => this.transport.provision(input, onStatus, budget),
        this.profile.stageTimeout,
        "设备配网状态等待超时，请核对云端结果",
        signal,
      );
      check();
      onStatus("确认绑定");
      const binding = await confirmBinding(signal);
      check();
      return binding;
    } finally {
      for (const frame of frames) frame.fill(0);
      key.fill(0);
      this.transport.releaseProvision?.(input.bindCode || input.mac);
    }
  }
}
