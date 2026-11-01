import { describe, expect, it, vi } from "vitest";
import {
  displayNumber,
  numericDraft,
  PropertyControls,
  validateAttributeValue,
  type ControlProfile,
  type ControlState,
} from "./device-controls";
import type { Attribute, ThingModel } from "./models";

const model: ThingModel = {
  version: "fixture-v2",
  attributes: [
    { identifier: "relay", type: "boolean", writable: true },
    { identifier: "set_t", type: "number", writable: true, min: 5, max: 22, step: 0.5, unit: "C" },
    { identifier: "rh", type: "number", writable: true, min: 30, max: 80, step: 5, unit: "%RH" },
    { identifier: "program", type: "enum", writable: true, values: ["eco", "rapid"] },
    { identifier: "lamp", type: "enum", writable: true, values: ["lit", "dark"] },
    {
      identifier: "lux_level",
      type: "number",
      writable: true,
      min: 1,
      max: 10,
      step: 0.25,
      unit: "level",
    },
    { identifier: "locked", type: "boolean", writable: true },
    { identifier: "quiet", type: "boolean", writable: true },
    { identifier: "extra_unscoped", type: "number", writable: true, min: 0, max: 1, step: 1 },
  ],
  services: [],
  events: [],
};
const profile: ControlProfile = {
  bindings: {
    power: {
      identifier: "relay",
      roles: ["sa", "mbr"],
      switch: { on: true, off: false },
      whenLocked: "blocked",
    },
    temperature: { identifier: "set_t", roles: ["sa", "mbr"], whenLocked: "blocked" },
    humidity: { identifier: "rh", roles: ["sa", "mbr"], whenLocked: "blocked" },
    mode: { identifier: "program", roles: ["sa", "mbr"], conditions: [], whenLocked: "blocked" },
    light: {
      identifier: "lamp",
      roles: ["sa", "mbr"],
      switch: { on: "lit", off: "dark" },
      whenLocked: "allowed",
    },
    brightness: {
      identifier: "lux_level",
      roles: ["sa", "mbr"],
      allowWhenLightOff: true,
      whenLocked: "allowed",
    },
    childLock: { identifier: "locked", roles: ["sa"], switch: { on: true, off: false } },
    mute: {
      identifier: "quiet",
      roles: ["sa", "mbr"],
      switch: { on: true, off: false },
      whenLocked: "allowed",
    },
  },
};
function setup(
  options: { profile?: ControlProfile; model?: ThingModel; role?: "sa" | "mbr" | "obs" } = {},
) {
  const state: ControlState = {
    ready: true,
    sending: false,
    canWrite: true,
    confirmed: {
      relay: false,
      set_t: 12,
      rh: 50,
      program: "eco",
      lamp: "dark",
      lux_level: 5,
      locked: false,
      quiet: false,
    },
  };
  const publish = vi.fn(async (_properties: Record<string, unknown>) => undefined);
  const controls = new PropertyControls(
    options.model ?? structuredClone(model),
    options.profile ?? structuredClone(profile),
    options.role ?? "sa",
    () => state,
    publish,
  );
  return { state, publish, controls };
}
describe("七项产品属性控制（显式合成映射）", () => {
  it.each(["power", "childLock", "light"] as const)(
    "renders an absent %s capability as unknown and still rejects its commands",
    async (kind) => {
      const p = structuredClone(profile);
      delete p.bindings[kind];
      const { controls, publish } = setup({ profile: p });
      expect(controls.list().some((view) => view.kind === kind)).toBe(false);
      expect(controls.isOn(kind)).toBeUndefined();
      await expect(controls.toggle(kind)).rejects.toThrow("当前产品未提供此控制能力");
      expect(publish).not.toHaveBeenCalled();
    },
  );

  it("distinguishes confirmed switch values from an unknown state", () => {
    const { controls, state } = setup();
    expect(controls.isOn("power")).toBe(false);
    state.confirmed.relay = true;
    expect(controls.isOn("power")).toBe(true);
    delete state.confirmed.relay;
    expect(controls.isOn("power")).toBeUndefined();
  });

  it.each(["sa", ["sa", "unconfirmed-role"]])(
    "does not interpret malformed or unconfirmed role declarations as authorization: %j",
    (roles) => {
      const p = structuredClone(profile),
        { controls, publish } = setup({ profile: p });
      p.bindings.power!.roles = roles as never;
      return expect(controls.toggle("power"))
        .rejects.toThrow("权限尚未完整确认")
        .then(() => expect(publish).not.toHaveBeenCalled());
    },
  );
  it.each([
    [{ identifier: "not_published", equals: true }],
    [{ identifier: "locked" }],
    [{ identifier: "locked", equals: undefined }],
    [{ identifier: "locked", equals: 0 }],
    [{ identifier: "program", equals: "unpublished" }],
    [{ identifier: "extra_unscoped", equals: NaN }],
    null,
  ])("does not authorize incomplete/unpublished product conditions %j", (conditions) => {
    const p = structuredClone(profile);
    p.bindings.mode!.conditions = conditions as never;
    const publish = vi.fn();
    expect(
      () =>
        new PropertyControls(
          model,
          p,
          "sa",
          () => ({
            ready: true,
            sending: false,
            canWrite: true,
            confirmed: { program: "eco", not_published: true },
          }),
          publish,
        ),
    ).toThrow("产品操作条件");
    expect(publish).not.toHaveBeenCalled();
  });
  it("revalidates a changed condition before action instead of treating missing values as equal", async () => {
    const p = structuredClone(profile),
      { controls, publish, state } = setup({ profile: p });
    p.bindings.mode!.conditions = [{ identifier: "not_published", equals: true }];
    state.confirmed.not_published = true;
    await expect(controls.choose("mode", "rapid")).rejects.toThrow("产品操作条件");
    expect(publish).not.toHaveBeenCalled();
  });
  it("allows a declared readonly numeric condition without inventing a writable range for it", async () => {
    const m = structuredClone(model),
      p = structuredClone(profile);
    m.attributes.push({ identifier: "sensor", type: "number", writable: false });
    p.bindings.mode!.conditions = [{ identifier: "sensor", equals: 55 }];
    const { controls, state, publish } = setup({ model: m, profile: p });
    await expect(controls.choose("mode", "rapid")).rejects.toThrow("不满足");
    state.confirmed.sensor = 55;
    await controls.choose("mode", "rapid");
    expect(publish).toHaveBeenCalledExactlyOnceWith({ program: "rapid" });
  });
  it("preserves identifiers and boolean/string switch values without inferring Power or max=1", async () => {
    const { controls, publish, state } = setup();
    await controls.toggle("power");
    expect(publish).toHaveBeenLastCalledWith({ relay: true });
    expect(state.confirmed.relay).toBe(false);
    await controls.toggle("light");
    expect(publish).toHaveBeenLastCalledWith({ lamp: "lit" });
    await controls.toggle("mute");
    expect(publish).toHaveBeenLastCalledWith({ quiet: true });
    expect(controls.list().map((item) => item.kind)).toHaveLength(8);
    expect(controls.list().some((item) => item.attribute.identifier === "extra_unscoped")).toBe(
      false,
    );
  });
  it.each([{}, { relay: 1 }, { relay: "false" }])(
    "does not toggle an absent or invalid confirmed switch: %o",
    async (confirmed) => {
      const { controls, publish, state } = setup();
      state.confirmed = Object.fromEntries(Object.entries(confirmed));
      await expect(controls.toggle("power")).rejects.toThrow("未知");
      expect(publish).not.toHaveBeenCalled();
    },
  );
  it("keeps numeric switches explicit and refuses out-of-domain targets even inside the model range", async () => {
    const m = structuredClone(model),
      p = structuredClone(profile);
    m.attributes[0] = {
      identifier: "relay",
      type: "number",
      writable: true,
      min: 0,
      max: 5,
      step: 1,
    };
    p.bindings.power!.switch = { on: 3, off: 1 };
    const { controls, publish, state } = setup({ model: m, profile: p });
    state.confirmed.relay = 1;
    await controls.toggle("power");
    expect(publish).toHaveBeenCalledWith({ relay: 3 });
    await expect(controls.command({ relay: 2 })).rejects.toThrow("开关目标");
    await expect(controls.command({ relay: true })).rejects.toThrow("有效数值");
  });
  it("converts Fahrenheit to legal native decimal values without rounding an illegal target", async () => {
    const { controls, publish } = setup();
    await controls.submit("temperature", "68.9", "F");
    expect(publish).toHaveBeenCalledWith({ set_t: 20.5 });
    await expect(controls.submit("temperature", "69", "F")).rejects.toThrow("步长");
    expect(publish).toHaveBeenCalledOnce();
    expect(displayNumber(20.5, "C", "F")).toBe("68.9 °F");
    expect(displayNumber(68.9, "F", "C")).toBe("20.5 °C");
  });
  it("respects a Fahrenheit native model when entering Celsius", () => {
    const a: Attribute = {
      identifier: "native_f",
      type: "number",
      writable: true,
      min: 32,
      max: 100,
      step: 0.5,
      unit: "F",
    };
    expect(numericDraft(a, "temperature", "20", "C")).toBe(68);
    expect(() => numericDraft(a, "temperature", "20.1", "C")).toThrow("步长");
  });
  it.each(["", "   ", "NaN", "Infinity", "0x10", "1e3", "hello", "23", "4.5", "20.6"])(
    "rejects invalid/out-of-range/off-grid temperature draft %j before publishing",
    async (input) => {
      const { controls, publish } = setup();
      await expect(controls.submit("temperature", input, "C")).rejects.toThrow();
      expect(publish).not.toHaveBeenCalled();
    },
  );
  it("validates humidity in the product unit and grid, sends only the chosen target", async () => {
    const { controls, publish, state } = setup();
    await controls.submit("humidity", "55", "F");
    expect(publish).toHaveBeenCalledWith({ rh: 55 });
    expect(state.confirmed.rh).toBe(50);
    await expect(controls.submit("humidity", "56", "C")).rejects.toThrow("步长");
    await expect(controls.submit("humidity", "85", "C")).rejects.toThrow("范围");
    expect(publish).toHaveBeenCalledOnce();
  });
  it("accepts binary floating-point noise on a legal grid, without accepting nearby off-grid values", () => {
    const a: Attribute = {
      identifier: "decimal",
      type: "number",
      writable: true,
      min: 0.1,
      max: 1,
      step: 0.1,
    };
    expect(validateAttributeValue(a, 0.1 + 0.2)).toBe(0.3);
    expect(() => validateAttributeValue(a, 0.300001)).toThrow("步长");
  });
  it.each([
    { min: 5, max: 4, step: 1 },
    { min: 0, max: 1, step: 0 },
    { min: 0, max: 1, step: -1 },
    { min: 0, max: Infinity, step: 1 },
    { min: 0, max: 1 },
  ])("does not open an incomplete or invalid native range %o", async (bounds) => {
    const m = structuredClone(model);
    m.attributes[1] = { identifier: "set_t", type: "number", writable: true, unit: "C", ...bounds };
    const { controls, publish } = setup({ model: m });
    await expect(controls.submit("temperature", "10", "C")).rejects.toThrow("范围或步长");
    expect(controls.reason("temperature")).toContain("范围或步长");
    expect(publish).not.toHaveBeenCalled();
  });
  it("rejects unknown units instead of guessing Celsius or percent", async () => {
    const m = structuredClone(model);
    m.attributes[1].unit = "unknown";
    delete m.attributes[2].unit;
    const { controls, publish } = setup({ model: m });
    await expect(controls.submit("temperature", "12", "F")).rejects.toThrow("单位");
    await expect(controls.submit("humidity", "55", "C")).rejects.toThrow("单位");
    expect(publish).not.toHaveBeenCalled();
  });
  it("does not resend the confirmed enum or numeric value and never writes implicit linked properties", async () => {
    const { controls, publish } = setup();
    await controls.choose("mode", "eco");
    await controls.submit("humidity", "50", "C");
    expect(publish).not.toHaveBeenCalled();
    await controls.choose("mode", "rapid");
    expect(publish).toHaveBeenCalledWith({ program: "rapid" });
    await expect(controls.choose("mode", "sleep")).rejects.toThrow("枚举");
    expect(publish).toHaveBeenCalledOnce();
  });
  it("keeps unknown modes visible and refuses missing conflict conditions", async () => {
    const p = structuredClone(profile),
      { controls, publish, state } = setup({ profile: p });
    state.confirmed.program = "unknown-wire-mode";
    expect(controls.list().find((item) => item.kind === "mode")!.value).toBe("unknown-wire-mode");
    await expect(controls.choose("mode", "rapid")).rejects.toThrow("枚举");
    state.confirmed.program = "eco";
    delete p.bindings.mode!.conditions;
    await expect(controls.choose("mode", "rapid")).rejects.toThrow("冲突规则");
    expect(publish).not.toHaveBeenCalled();
  });
  it("enforces explicitly declared product conditions from confirmed state", async () => {
    const p = structuredClone(profile);
    p.bindings.mode!.conditions = [{ identifier: "relay", equals: true }];
    const { controls, publish, state } = setup({ profile: p });
    await expect(controls.choose("mode", "rapid")).rejects.toThrow("操作条件");
    state.confirmed.relay = true;
    await controls.choose("mode", "rapid");
    expect(publish).toHaveBeenCalledWith({ program: "rapid" });
  });
  it("limits only defined child-lock conflicts while keeping unlock and allowed controls reachable", async () => {
    const { controls, state, publish } = setup();
    state.confirmed.locked = true;
    await expect(controls.toggle("power")).rejects.toThrow("解除童锁");
    await expect(controls.submit("temperature", "20", "C")).rejects.toThrow("解除童锁");
    await controls.toggle("childLock");
    expect(publish).toHaveBeenLastCalledWith({ locked: false });
    expect(state.confirmed.locked).toBe(true);
    await expect(controls.toggle("power")).rejects.toThrow("解除童锁");
    await controls.toggle("mute");
    expect(publish).toHaveBeenLastCalledWith({ quiet: true });
  });
  it("does not infer a conflict set from an unknown lock rule or unknown lock value", async () => {
    const p = structuredClone(profile);
    delete p.bindings.power!.whenLocked;
    const { controls, state, publish } = setup({ profile: p });
    state.confirmed.locked = true;
    await expect(controls.toggle("power")).rejects.toThrow("冲突规则");
    delete state.confirmed.locked;
    await expect(controls.toggle("power")).rejects.toThrow("童锁状态");
    expect(publish).not.toHaveBeenCalled();
  });
  it.each([undefined, false])(
    "blocks brightness while light is off with policy %s and never turns light on",
    async (policy) => {
      const p = structuredClone(profile);
      p.bindings.brightness!.allowWhenLightOff = policy;
      const { controls, state, publish } = setup({ profile: p });
      await expect(controls.submit("brightness", "6", "C")).rejects.toThrow();
      expect(publish).not.toHaveBeenCalled();
      state.confirmed.lamp = "lit";
      await controls.submit("brightness", "6", "C");
      expect(publish).toHaveBeenCalledWith({ lux_level: 6 });
    },
  );
  it("allows explicitly supported off-light brightness without assuming percent or sending light state", async () => {
    const { controls, publish } = setup();
    await controls.submit("brightness", "6,25", "C");
    expect(publish).toHaveBeenCalledWith({ lux_level: 6.25 });
    await expect(controls.submit("brightness", "50", "C")).rejects.toThrow("范围");
  });
  it.each(["obs", "mbr"] as const)(
    "enforces both observer restrictions and per-property roles: %s",
    async (role) => {
      const { controls, publish } = setup({ role });
      await expect(controls.toggle("childLock")).rejects.toThrow("权限");
      if (role === "obs") await expect(controls.toggle("power")).rejects.toThrow("权限");
      else await controls.toggle("power");
      expect(publish).toHaveBeenCalledTimes(role === "obs" ? 0 : 1);
    },
  );
  it("disables writes before full sync, when broker write permission is unknown/denied or while awaiting report", async () => {
    const { controls, state, publish } = setup();
    state.ready = false;
    await expect(controls.toggle("power")).rejects.toThrow("同步");
    state.ready = true;
    state.canWrite = false;
    await expect(controls.toggle("power")).rejects.toThrow("权限");
    state.canWrite = true;
    state.sending = true;
    await expect(controls.toggle("power")).rejects.toThrow("回报");
    expect(publish).not.toHaveBeenCalled();
    state.sending = false;
    state.canWrite = undefined;
    await expect(controls.toggle("power")).rejects.toThrow("权限");
    expect(publish).not.toHaveBeenCalled();
  });
  it("rejects read-only, unscoped, multi-property and type-coerced commands at the business entry", async () => {
    const m = structuredClone(model);
    m.attributes[0].writable = false;
    const { controls, publish } = setup({ model: m });
    await expect(controls.command({ relay: true })).rejects.toThrow("只读");
    await expect(controls.command({ extra_unscoped: 1 })).rejects.toThrow("未授权");
    await expect(controls.command({ quiet: true, relay: true })).rejects.toThrow("一个");
    await expect(controls.command({ quiet: 1 })).rejects.toThrow("布尔");
    expect(publish).not.toHaveBeenCalled();
  });
  it("rejects duplicate identifiers/semantic aliases and attributes absent from the current model", () => {
    const m = structuredClone(model);
    m.attributes.push(m.attributes[0]);
    expect(() => setup({ model: m })).toThrow("不唯一");
    const p = structuredClone(profile);
    p.bindings.mute!.identifier = "relay";
    expect(() => setup({ profile: p })).toThrow("不唯一");
    p.bindings.mute!.identifier = "absent";
    expect(() => setup({ profile: p })).toThrow("不在当前");
  });
  it("deduplicates pending control in the business layer and never optimistically changes confirmed state", async () => {
    const { controls, publish, state } = setup();
    let resolve: () => void = () => undefined;
    publish.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = () => done(undefined);
        }),
    );
    const pending = controls.toggle("mute");
    await expect(controls.toggle("mute")).rejects.toThrow("回报");
    expect(state.confirmed.quiet).toBe(false);
    expect(publish).toHaveBeenCalledOnce();
    resolve();
    await pending;
    expect(state.confirmed.quiet).toBe(false);
  });
});
