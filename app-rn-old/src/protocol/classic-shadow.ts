import { ApiError, type DeviceView, type ThingModel } from "../services/models";
import { validateAttributeValue, type PropertyValue } from "../services/device-controls";
import type { DeviceProfileResolver, DeviceSyncProfile, Publication } from "./device-session";
import type { ServiceCall } from "../services/device-maintenance";

type Values = Record<string, PropertyValue>;
/** Product dictionaries are explicit inputs, never inferred from demo names or model labels. */
export interface ShadowProductContract {
  writable: readonly string[];
  connection: { identifier: string; online: PropertyValue; offline: PropertyValue };
  actions?: Readonly<
    Record<string, (call: ServiceCall, requestID: string) => { desired: Values; expected: Values }>
  >;
}
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const scalar = (value: unknown): value is PropertyValue =>
  ["string", "boolean", "number"].includes(typeof value) &&
  (typeof value !== "number" || Number.isFinite(value));
const reserved = new Set([
  "EnduserId",
  "DeviceId",
  "CommandType",
  "__proto__",
  "constructor",
  "prototype",
]);
export function shadowTopics(deviceID: string) {
  if (typeof deviceID !== "string" || !deviceID.trim() || /[\/+#\0]/.test(deviceID))
    throw new ApiError(400, "Shadow设备标识无效");
  const prefix = `$aws/things/${deviceID}/shadow`;
  return {
    get: `${prefix}/get`,
    update: `${prefix}/update`,
    responses: ["get/accepted", "get/rejected", "update/accepted", "update/rejected"].map(
      (s) => `${prefix}/${s}`,
    ),
  };
}
function validateContext(deviceID: string, device: DeviceView) {
  if (device.device.id !== deviceID) throw new ApiError(403, "Shadow设备身份不一致");
}
function wire(topic: string, body: unknown): Publication {
  return { topic, payload: new TextEncoder().encode(JSON.stringify(body)) };
}
function profile(
  deviceID: string,
  userID: string,
  device: DeviceView,
  model: ThingModel,
  contract?: ShadowProductContract,
): DeviceSyncProfile {
  validateContext(deviceID, device);
  const topics = shadowTopics(deviceID);
  const attributes = new Map(model.attributes.map((a) => [a.identifier, a]));
  const writable =
    !!contract &&
    !!model.version &&
    device.bindingRole !== "obs" &&
    new Set(contract.writable).size === contract.writable.length &&
    contract.writable.every((id) => !reserved.has(id) && attributes.get(id)?.writable === true) &&
    !!attributes.get(contract.connection.identifier) &&
    scalar(contract.connection.online) &&
    scalar(contract.connection.offline) &&
    contract.connection.online !== contract.connection.offline;
  const desired = (values: Values, requestID: string) => {
    if (
      typeof requestID !== "string" ||
      !requestID.length ||
      new TextEncoder().encode(requestID).length > 64
    )
      throw new ApiError(400, "Shadow clientToken必须为1至64字节");
    return wire(topics.update, {
      state: { desired: { EnduserId: userID, DeviceId: deviceID, CommandType: "app", ...values } },
      clientToken: requestID,
    });
  };
  const result: DeviceSyncProfile = {
    topics: topics.responses,
    confirmation: "shadow",
    canWrite: writable,
    query: () => ({ topic: topics.get, payload: new Uint8Array() }),
    online: contract
      ? (values) => {
          const value = values[contract.connection.identifier];
          if (value === contract.connection.online) return true;
          if (value === contract.connection.offline) return false;
          return undefined;
        }
      : undefined,
    decode: (topic, payload) => {
      if (!topics.responses.includes(topic)) return;
      try {
        const body: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(payload));
        if (!object(body)) return;
        const requestID = typeof body.clientToken === "string" ? body.clientToken : undefined;
        if (topic.endsWith("/rejected")) {
          if (
            !Number.isInteger(body.code) ||
            typeof body.code !== "number" ||
            body.code < 400 ||
            body.code > 599
          )
            return;
          return {
            kind: "rejected",
            operation: topic === topics.responses[1] ? "query" : "update",
            code: body.code,
            requestID,
          };
        }
        if (
          !Number.isSafeInteger(body.version) ||
          typeof body.version !== "number" ||
          body.version < 0 ||
          !object(body.state)
        )
          return;
        const state = body.state;
        if (state.reported === null)
          return {
            kind: topic === topics.responses[0] ? "full" : "delta",
            version: body.version,
            reported: {},
            clearReported: true,
            requestID,
          };
        if (topic === topics.responses[0] && !Object.hasOwn(state, "reported"))
          return { kind: "full", version: body.version, reported: {}, requestID };
        if (object(state.reported)) {
          if (Object.hasOwn(state.reported, "DeviceId") && state.reported.DeviceId !== deviceID)
            return;
          const reported: Values = {};
          for (const [key, value] of Object.entries(state.reported))
            if (!reserved.has(key) && scalar(value)) reported[key] = value;
          const deleted = Object.entries(state.reported)
            .filter(([key, value]) => !reserved.has(key) && value === null)
            .map(([key]) => key);
          return {
            kind: topic === topics.responses[0] ? "full" : "delta",
            version: body.version,
            reported,
            deleted,
            requestID,
          };
        }
        if (topic === topics.responses[2] && object(state.desired) && requestID) {
          if (Object.hasOwn(state.desired, "DeviceId") && state.desired.DeviceId !== deviceID)
            return;
          return { kind: "accepted", version: body.version, requestID };
        }
      } catch {
        /* Untrusted or malformed payloads cannot update or confirm device state. */
      }
    },
  };
  if (writable && contract) {
    result.command = (properties, requestID) => {
      if (!object(properties) || !Object.keys(properties).length)
        throw new ApiError(400, "没有可下发的属性");
      const values: Values = {};
      for (const [key, value] of Object.entries(properties)) {
        if (reserved.has(key) || !contract.writable.includes(key))
          throw new ApiError(403, "属性未获产品控制授权");
        values[key] = validateAttributeValue(attributes.get(key)!, value);
      }
      return { ...desired(values, requestID), expected: { ...values } };
    };
    if (contract.actions && Object.keys(contract.actions).length)
      result.service = (call, requestID) => {
        if (!Object.hasOwn(contract.actions!, call.identifier))
          throw new ApiError(503, "产品动作字段尚未配置");
        const action = contract.actions![call.identifier](call, requestID);
        for (const values of [action.desired, action.expected]) {
          if (
            !object(values) ||
            !Object.keys(values).length ||
            Object.entries(values).some(
              ([key, value]) => reserved.has(key) || !attributes.has(key) || !scalar(value),
            )
          )
            throw new ApiError(503, "产品动作或确认规则无效");
          for (const [key, value] of Object.entries(values))
            validateAttributeValue(attributes.get(key)!, value);
        }
        if (Object.keys(action.desired).some((key) => !attributes.get(key)!.writable))
          throw new ApiError(403, "产品动作字段不可写");
        return {
          ...desired(action.desired, requestID),
          confirmation: { kind: "reported", expected: { ...action.expected } },
        };
      };
  }
  return result;
}
export function createClassicShadowResolver(
  products: Readonly<Record<string, ShadowProductContract>> = {},
): DeviceProfileResolver {
  return async (context, signal) => {
    if (signal.aborted) throw new ApiError(499, "Shadow会话已停止");
    const productID = context.device.product?.id;
    return profile(
      context.deviceID,
      context.userID,
      context.device,
      context.model,
      productID && Object.hasOwn(products, productID) ? products[productID] : undefined,
    );
  };
}
