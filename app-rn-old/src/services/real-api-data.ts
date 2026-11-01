import type { HttpRequest } from "../lib/core";
import { productCategories, productData, productGroups } from "./product-data";
import {
  ApiError,
  type ApiEnvelope,
  type DeviceView,
  type DeviceMember,
  type HelpArticle,
  type HomeGroup,
  type ThingModel,
  type UserProfile,
} from "./models";

type ObjectValue = Record<string, unknown>;
function object(value: unknown): ObjectValue {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError(502, "服务端响应结构不完整");
  return value as ObjectValue;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new ApiError(502, "服务端响应不是列表");
  return value;
}

function id(value: unknown): string {
  if (typeof value !== "string" || !value) throw new ApiError(502, "服务端响应缺少有效标识");
  return value;
}
const text = (value: unknown) => (typeof value === "string" ? value : undefined);
function strings(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string"))
    throw new ApiError(502, "产品列表字段格式不支持");
  return value as string[];
}
function image(value: unknown): string {
  if (value === undefined || value === null) return "";
  return strings(value)[0] ?? "";
}

export function realEnvelope(value: unknown, status: number): ApiEnvelope<unknown> {
  const wire = object(value);
  const code =
    typeof wire.code === "number" && Number.isFinite(wire.code)
      ? wire.code
      : status >= 400
        ? status
        : undefined;
  if (code === undefined) throw new ApiError(502, "服务端响应缺少业务结果码");
  return {
    code,
    message: text(wire.message) ?? text(wire.msg) ?? "服务响应异常",
    success: status < 400 && code === 0 && wire.success !== false,
    data: wire.data,
  };
}

function device(value: unknown): DeviceView {
  const wire = object(value),
    metadata = object(wire.device),
    deviceID = id(metadata.id);
  if (!["sa", "mbr", "obs"].includes(String(wire.bindingRole)))
    throw new ApiError(502, "设备绑定角色未确认");
  const p = wire.product === null || wire.product === undefined ? null : object(wire.product);
  return {
    deviceNickname: text(wire.deviceNickname) ?? text(metadata.name) ?? deviceID,
    bindingRole: wire.bindingRole as DeviceView["bindingRole"],
    bindingAt: text(wire.bindingAt) ?? "",
    ...(typeof wire.online === "boolean" ? { online: wire.online } : {}),
    device: { ...metadata, id: deviceID },
    product: p
      ? {
          id: id(p.id),
          ...(text(p.name) !== undefined ? { name: text(p.name) } : {}),
          category: text(p.category),
          seriesName: text(p.seriesName),
          modelName: text(p.modelName),
          image: image(p.image),
        }
      : null,
  };
}
function home(value: unknown): HomeGroup[] {
  return array(value).map((item) => {
    const group = object(item);
    const room = group.room === null ? null : object(group.room);
    if (room && room.id !== null && typeof room.id !== "string")
      throw new ApiError(502, "房间归属标识未确认");
    return {
      room: room ? { id: room.id as string | null, name: text(room.name) ?? "" } : null,
      devices: array(group.devices).map(device),
    };
  });
}
export function helpArticles(value: unknown): HelpArticle[] {
  const items = Array.isArray(value) ? value : [value];
  return items.map((item) => {
    const wire = object(item);
    if (typeof wire.title !== "string" || typeof wire.content !== "string")
      throw new ApiError(502, "帮助内容格式不支持");
    return {
      title: wire.title,
      content: wire.content,
      id: text(wire.id),
      createdAt: text(wire.createdAt),
    };
  });
}
export function deviceMembers(value: unknown): DeviceMember[] {
  const seen = new Set<string>();
  return array(value).map((item) => {
    const wire = object(item);
    const userID = id(wire.userID);
    if (!userID.trim() || seen.has(userID)) {
      throw new ApiError(502, "设备成员标识无效或重复");
    }
    seen.add(userID);
    if (!["sa", "mbr", "obs"].includes(String(wire.bindingRole))) {
      throw new ApiError(502, "设备成员角色未确认");
    }
    if (
      wire.nickname !== undefined &&
      wire.nickname !== null &&
      typeof wire.nickname !== "string"
    ) {
      throw new ApiError(502, "设备成员昵称格式不支持");
    }
    return {
      userID,
      nickname: typeof wire.nickname === "string" ? wire.nickname : null,
      bindingRole: wire.bindingRole as DeviceMember["bindingRole"],
    };
  });
}
function thingModel(value: unknown): ThingModel {
  const wire = object(value);
  if (typeof wire.version !== "string") throw new ApiError(502, "物模型版本未确认");
  const attributes = array(wire.attributes).map((item) => {
    let a = object(item);
    if (Object.hasOwn(a, "dataType") || Object.hasOwn(a, "access")) {
      // The deployed HTTP schema differs from the internal model. Never infer business bindings.
      if (
        ["type", "writable", "values", "min", "max"].some((key) => Object.hasOwn(a, key)) ||
        !["integer", "boolean", "enum"].includes(String(a.dataType)) ||
        !["r", "rw"].includes(String(a.access)) ||
        (a.unit !== undefined && typeof a.unit !== "string")
      )
        throw new ApiError(503, "真实物模型属性格式尚未适配，不能开放控制");
      const normalized: Record<string, unknown> = {
        identifier: a.identifier,
        type: a.dataType === "integer" ? "number" : a.dataType,
        writable: a.access === "rw",
      };
      if (a.unit !== undefined) normalized.unit = a.unit;
      if (a.dataType === "enum") {
        if (
          !Array.isArray(a.range) ||
          !a.range.length ||
          a.range.some((value) => typeof value !== "string") ||
          new Set(a.range).size !== a.range.length
        )
          throw new ApiError(503, "真实物模型枚举尚未适配");
        normalized.values = a.range;
      }
      if (a.dataType === "integer") {
        if (
          !Array.isArray(a.range) ||
          a.range.length !== 2 ||
          a.range.some((value) => !Number.isSafeInteger(value)) ||
          a.range[0] > a.range[1] ||
          (a.step !== undefined && (!Number.isSafeInteger(a.step) || Number(a.step) <= 0))
        )
          throw new ApiError(503, "真实物模型数值约束尚未适配");
        normalized.min = a.range[0];
        normalized.max = a.range[1];
        // An integer type does not supply a product's adjustment step.
        if (a.step !== undefined) normalized.step = a.step;
      }
      a = normalized;
    }
    if (
      typeof a.identifier !== "string" ||
      !["number", "boolean", "enum"].includes(String(a.type)) ||
      typeof a.writable !== "boolean"
    )
      throw new ApiError(503, "真实物模型属性格式尚未适配，不能开放控制");
    if (
      a.type === "enum" &&
      (!Array.isArray(a.values) || a.values.some((v) => typeof v !== "string"))
    )
      throw new ApiError(503, "真实物模型枚举尚未适配");
    for (const key of ["min", "max", "step"])
      if (a[key] !== undefined && (typeof a[key] !== "number" || !Number.isFinite(a[key])))
        throw new ApiError(503, "真实物模型数值约束尚未适配");
    return { ...a } as unknown as ThingModel["attributes"][number];
  });
  const entries = (value: unknown) =>
    array(value).map((item) => {
      const entry = object(item);
      id(entry.identifier);
      return entry;
    });
  const services = entries(wire.services).map((s) => ({ identifier: s.identifier as string }));
  const events = entries(wire.events).map((e) => {
    if (typeof e.level !== "string") throw new ApiError(503, "真实物模型事件等级尚未适配");
    return { identifier: e.identifier as string, level: e.level };
  });
  return { version: wire.version, attributes, services, events };
}
function userProfile(value: unknown): UserProfile {
  const wire = object(value);
  const identities =
    Array.isArray(wire.identities)
      ? wire.identities
      : typeof wire.identities === "string"
        ? (() => {
            try {
              const parsed: unknown = JSON.parse(wire.identities as string);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })()
        : [];
  if (
    typeof wire.userID !== "string" ||
    typeof wire.nickname !== "string" ||
    typeof wire.emailMasked !== "string" ||
    identities.some((entry) => typeof entry !== "string") ||
    typeof wire.deletionStatus !== "string"
  )
    throw new ApiError(502, "个人信息响应字段格式不支持");
  return {
    userID: wire.userID,
    nickname: wire.nickname,
    emailMasked: wire.emailMasked,
    identities: identities as string[],
    deletionStatus: wire.deletionStatus,
  };
}

export function realResponseData(req: HttpRequest, value: unknown): unknown {
  if (req.method !== "GET") return value;
  const path = req.path;
  if (path === "/api/app/products/category") {
    return productCategories(value);
  }
  if (path === "/api/app/products") {
    return productGroups(value);
  }
  if (/^\/api\/app\/products\/[^/]+$/.test(path)) {
    return productData(value);
  }
  if (path === "/api/app/devices") return home(value);
  if (path === "/api/app/user/profile") return userProfile(value);
  if (/^\/api\/app\/devices\/[^/]+$/.test(path)) return device(value);
  if (path.endsWith("/connectHelping") || path.endsWith("/helping")) return helpArticles(value);
  if (path.endsWith("/thing-model")) return thingModel(value);
  if (path === "/api/app/user/locations")
    return array(value).map((item) => {
      const room = object(item);
      if (typeof room.name !== "string") throw new ApiError(502, "候选房间名称尚未确认");
      return { ...room, id: id(room.id), name: room.name };
    });
  if (/^\/api\/app\/devices\/[^/]+\/location$/.test(path)) {
    // The deployed GET contract explicitly omits data when no room is assigned.
    if (value === undefined) return { id: null, name: "" };
    const room = object(value);
    if (room.id !== null && typeof room.id !== "string")
      throw new ApiError(502, "设备房间归属尚未确认，请重试读取");
    return { ...room, name: text(room.name) ?? "" };
  }
  return value;
}
