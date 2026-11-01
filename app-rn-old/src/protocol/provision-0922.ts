import { ApiError, type BindingResult } from "../services/models";
import { deriveKey, utf8 } from "./ble";
import { cipherDigest0922, encrypt0922, packets0922 } from "./ble-0922";
import { withBudget, type DeviceTransport, type ProvisionInput } from "./device";
import type { ProvisionRunner } from "./provision-0822";
import { provisionAddresses } from "./provision-urls";

/** SOFTSTART=4 JSON/AES-CBC route. The repaired cipher-first transition needs board-level verification. */
export class Provisioner0922 implements ProvisionRunner {
  constructor(
    private transport: DeviceTransport,
    private stageTimeout: number,
    private environment?: string,
  ) {}
  async run(
    input: ProvisionInput,
    onStatus: (status: string) => void,
    signal?: AbortSignal,
    confirmBinding?: (signal?: AbortSignal) => Promise<BindingResult>,
    onSubmitted?: () => void,
  ): Promise<BindingResult> {
    if (!confirmBinding) throw new ApiError(503, "0922必须通过云端确认账号绑定");
    if (!Number.isFinite(this.stageTimeout) || this.stageTimeout <= 0)
      throw new ApiError(503, "0922配网等待预算未配置");
    if (input.modelID !== input.model || !input.productID || !input.token || !input.seriesName)
      throw new ApiError(503, "真实配网产品/系列/型号/Token未确认");
    if (!input.ssid || utf8(input.ssid).length > 32)
      throw new ApiError(400, "Wi-Fi 名称不能为空或超过32字节");
    const urls = input.urls;
    provisionAddresses(urls, this.environment);
    const key = deriveKey(input.mac, input.model);
    const cipher = JSON.stringify({
      type: "cipher",
      data: { cipher: cipherDigest0922(input.mac, input.seriesName, input.modelID) },
    });
    const apinfo = JSON.stringify({
      type: "apinfo",
      data: {
        ssid: input.ssid,
        password: input.password,
        binding_code: input.bindCode || "null",
        user_token: input.token,
        activate_url: urls!.activationURL,
        certificationUrl: urls!.certificationURL,
        bindUrl: urls!.bindingURL,
        otaUrl: urls!.otaURL,
        productId: input.productID,
        modelId: input.modelID,
        extraData: input.productID,
      },
    });
    const cipherBytes = utf8(cipher),
      note = utf8(JSON.stringify({ type: "encrypt_note", data: { error_code: 0 } })),
      encrypted = encrypt0922(apinfo, key);
    try {
      // Validate payload size before any BLE write. Transport refragments to the negotiated MTU.
      for (const payload of [cipherBytes, note, encrypted]) packets0922(payload, 128);
      const send = async (payload: Uint8Array) => {
        if (signal?.aborted) throw new ApiError(499, "0922客户端操作已停止");
        if (this.transport.reportsProvisionWriteStart !== true) onSubmitted?.();
        return this.transport.exchange(input, packets0922(payload, 128), signal, onSubmitted);
      };
      onStatus("校验设备");
      const replies = await send(cipherBytes);
      try {
        if (replies.length !== 1) throw new ApiError(0x63, "0922身份应答数量无效");
        const reply = JSON.parse(new TextDecoder().decode(replies[0])) as {
          type?: string;
          data?: { error_code?: number };
        };
        if (reply.type !== "cipher_reply" || reply.data?.error_code !== 0)
          throw new ApiError(0x70, "0922设备身份校验失败");
      } finally {
        for (const reply of replies) reply.fill(0);
      }
      await send(note);
      onStatus("发送 Wi-Fi 参数");
      await send(encrypted);
      await withBudget(
        (budget) => this.transport.provision(input, onStatus, budget),
        this.stageTimeout,
        "0922设备状态等待超时，请核对云端结果",
        signal,
      );
      onStatus("确认绑定");
      return await confirmBinding(signal);
    } finally {
      note.fill(0);
      cipherBytes.fill(0);
      encrypted.fill(0);
      key.fill(0);
      this.transport.releaseProvision?.(input.bindCode || input.mac);
    }
  }
}
