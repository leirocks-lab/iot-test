import { createClassicShadowResolver } from "../protocol/classic-shadow";
import type { RuntimeContracts } from "../services/runtime";
import { ApiError, type DeviceView, type ThingModel } from "../services/models";

/** prd_100/tm_1 is a development test product, confirmed on 2026-10-28.
 * No model/category-name matching and no production registration.
 */
function confirmedTestProduct(context: { device: DeviceView; model: ThingModel }) {
  if (context.device.product?.id !== "prd_100" || context.model.version !== "tm_1") return false;
  const attributes = new Map(
    context.model.attributes.map((attribute) => [attribute.identifier, attribute]),
  );
  if (attributes.size !== context.model.attributes.length) return false;
  const power = attributes.get("Power"),
    lock = attributes.get("ChildLock"),
    online = attributes.get("Online");
  const valuesMatch = (actual: readonly string[] | undefined, expected: readonly string[]) =>
    actual?.length === expected.length && expected.every((value) => actual.includes(value));
  return (
    power?.type === "enum" &&
    power.writable === true &&
    valuesMatch(power.values, ["on", "off"]) &&
    lock?.type === "boolean" &&
    online?.type === "enum" &&
    online.writable === false &&
    valuesMatch(online.values, ["online", "offline"])
  );
}

export function developmentProductContracts(): Pick<
  RuntimeContracts,
  "realtime" | "controls" | "realtimeModelOptional"
> {
  const readonly = createClassicShadowResolver();
  const testProduct = createClassicShadowResolver({
    prd_100: {
      writable: ["Power"],
      connection: { identifier: "Online", online: "online", offline: "offline" },
    },
  });
  return {
    realtimeModelOptional: true,
    realtime: (context, signal) =>
      (confirmedTestProduct(context) ? testProduct : readonly)(context, signal),
    controls: async (context, signal) => {
      if (signal.aborted) throw new ApiError(499, "产品控制映射读取已停止");
      if (!confirmedTestProduct(context))
        throw new ApiError(503, "当前产品或物模型版本的控制映射尚未配置");
      return {
        bindings: {
          power: {
            identifier: "Power",
            roles: ["sa", "mbr"],
            switch: { on: "on", off: "off" },
            // Observe the lock without exposing a child-lock control.
            conditions: [{ identifier: "ChildLock", equals: false }],
          },
        },
      };
    },
  };
}
