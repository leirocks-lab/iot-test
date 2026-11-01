import { describe, expect, it, vi } from "vitest";
import {
  maintenanceLedger,
  MaintenanceControls,
  ServiceRejectedError,
  type MaintenanceProfile,
} from "./device-maintenance";
import type { DeviceView, ThingModel } from "./models";

const device: DeviceView = {
  deviceNickname: "书房设备",
  bindingRole: "sa",
  bindingAt: "",
  device: { id: "dev" },
  product: { id: "fixture" },
};
const model: ThingModel = {
  version: "published-2",
  attributes: [
    { identifier: "filter_minutes", type: "number", writable: false, unit: "min" },
    { identifier: "lock_flag", type: "boolean", writable: false },
  ],
  services: [{ identifier: "reset_filter_v2" }],
  events: [],
};
const profile: MaintenanceProfile = {
  attribute: "filter_minutes",
  reset: {
    identifier: "reset_filter_v2",
    params: { target: "main", options: { preserveHistory: true } },
    roles: ["sa", "mbr"],
    conditions: [{ identifier: "lock_flag", equals: false }],
  },
};
function setup(
  input: { profile?: MaintenanceProfile; model?: ThingModel; role?: "mbr" | "obs" } = {},
) {
  const state = {
    ready: true,
    sending: false,
    canInvokeService: true,
    confirmed: { filter_minutes: 215, lock_flag: false } as Record<
      string,
      number | string | boolean
    >,
  };
  const invoke = vi.fn(async () => undefined),
    changed = vi.fn(),
    ledger = maintenanceLedger();
  const controls = new MaintenanceControls(
    input.model ?? model,
    input.profile ?? profile,
    { ...device, bindingRole: input.role ?? "sa" },
    () => state,
    invoke,
    ledger,
    changed,
  );
  return { controls, state, invoke, changed, ledger };
}
describe("维护计时和一次性重置业务（合成产品）", () => {
  it("uses the explicit native identifier and unit, never computes elapsed time or uses hours by default", () => {
    const { controls } = setup();
    expect(controls.identifier).toBe("filter_minutes");
    expect(controls.text).toBe("215 min");
    const ticket = controls.requestReset();
    expect(ticket.body).toContain("书房设备");
    expect(ticket.body).toContain("215 min");
    ticket.cancel();
    expect(controls.text).toBe("215 min");
  });
  it.each([undefined, NaN, Infinity, -1, "215"])(
    "keeps invalid or missing reported %s unknown and blocks reset",
    (value) => {
      const { controls, state, invoke } = setup();
      if (value === undefined) delete state.confirmed.filter_minutes;
      else state.confirmed.filter_minutes = value;
      expect(controls.text).toContain("未知");
      expect(() => controls.requestReset()).toThrow("未知");
      expect(invoke).not.toHaveBeenCalled();
    },
  );
  it("accepts reported zero as data but still requires confirmation and a new service result", async () => {
    const { controls, state, invoke } = setup();
    state.confirmed.filter_minutes = 0;
    expect(controls.text).toBe("0 min");
    const ticket = controls.requestReset();
    expect(invoke).not.toHaveBeenCalled();
    await ticket.confirm();
    expect(invoke).toHaveBeenCalledOnce();
  });
  it("shows actual data with unknown unit but refuses reset", () => {
    const { controls } = setup({
      model: {
        ...model,
        attributes: model.attributes.map((attribute) => ({ ...attribute, unit: undefined })),
      },
    });
    expect(controls.text).toBe("215 单位待确认");
    expect(() => controls.requestReset()).toThrow("单位");
  });
  it("supports read-only maintenance without a reset service", () => {
    const { controls, invoke } = setup({ profile: { attribute: "filter_minutes" } });
    expect(controls.text).toBe("215 min");
    expect(() => controls.requestReset()).toThrow("未提供");
    expect(invoke).not.toHaveBeenCalled();
  });
  it.each(["obs", "mbr"] as const)("enforces explicit reset roles for %s", (role) => {
    const { controls } = setup({
      role,
      profile: { ...profile, reset: { ...profile.reset!, roles: ["sa"] } },
    });
    expect(() => controls.requestReset()).toThrow("权限");
  });
  it("requires full synchronization, explicit service permission and actual product conditions", () => {
    const { controls, state, invoke } = setup();
    state.ready = false;
    expect(() => controls.requestReset()).toThrow("未同步");
    state.ready = true;
    state.canInvokeService = false;
    expect(() => controls.requestReset()).toThrow("权限");
    state.canInvokeService = true;
    state.confirmed.lock_flag = true;
    expect(() => controls.requestReset()).toThrow("条件");
    delete state.confirmed.lock_flag;
    expect(() => controls.requestReset()).toThrow("条件");
    expect(invoke).not.toHaveBeenCalled();
  });
  it("cancel and repeated or stopped confirmation never invoke a service", async () => {
    const { controls, invoke } = setup();
    const cancelled = controls.requestReset();
    cancelled.cancel();
    await expect(cancelled.confirm()).rejects.toThrow("失效");
    const old = controls.requestReset();
    controls.stop();
    await expect(old.confirm()).rejects.toThrow("失效");
    expect(invoke).not.toHaveBeenCalled();
    const next = controls.requestReset();
    await next.confirm();
    await expect(next.confirm()).rejects.toThrow("失效");
    expect(invoke).toHaveBeenCalledOnce();
  });
  it("rechecks permissions and conditions after the dialog instead of trusting its opening state", async () => {
    const { controls, state, invoke } = setup();
    const ticket = controls.requestReset();
    state.confirmed.lock_flag = true;
    await expect(ticket.confirm()).rejects.toThrow("条件");
    expect(invoke).not.toHaveBeenCalled();
  });
  it("preserves current count during sending and after result-only success; sends immutable parameters exactly once", async () => {
    const { controls, state, invoke, ledger } = setup();
    let complete: () => void = () => undefined;
    invoke.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = () => resolve(undefined);
        }),
    );
    const ticket = controls.requestReset(),
      pending = ticket.confirm();
    expect(controls.text).toBe("215 min");
    expect(ledger.phase).toBe("sending");
    expect(() => controls.requestReset()).toThrow("等待");
    expect(invoke).toHaveBeenCalledWith({
      identifier: "reset_filter_v2",
      params: { target: "main", options: { preserveHistory: true } },
    });
    complete();
    await pending;
    expect(ledger.phase).toBe("confirmed");
    expect(state.confirmed.filter_minutes).toBe(215);
  });
  it("locks unknown execution until a new complete valid snapshot, never accepts a delta as reconciliation", async () => {
    const { controls, state, invoke, ledger } = setup();
    invoke.mockRejectedValueOnce(new Error("未确认设备结果"));
    await expect(controls.requestReset().confirm()).rejects.toThrow("未确认");
    expect(ledger.phase).toBe("unknown");
    state.confirmed.filter_minutes = 0;
    expect(() => controls.requestReset()).toThrow("先同步");
    state.ready = false;
    controls.synchronized();
    expect(ledger.phase).toBe("unknown");
    state.ready = true;
    delete state.confirmed.filter_minutes;
    controls.synchronized();
    expect(ledger.phase).toBe("unknown");
    state.confirmed.filter_minutes = 3;
    controls.synchronized();
    expect(ledger.phase).toBe("idle");
    expect(ledger.message).toContain("未推断");
    expect(invoke).toHaveBeenCalledOnce();
    await controls.requestReset().confirm();
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(controls.text).toBe("3 min");
  });
  it("keeps an explicit device refusal distinct from an unknown result", async () => {
    const { controls, invoke, ledger } = setup();
    invoke.mockRejectedValueOnce(new ServiceRejectedError());
    await expect(controls.requestReset().confirm()).rejects.toThrow("拒绝");
    expect(ledger.phase).toBe("failed");
    expect(controls.text).toBe("215 min");
  });
  it("interrupting an in-flight reset retains unknown and ignores a late old success", async () => {
    const { controls, invoke, ledger } = setup();
    let complete: () => void = () => undefined;
    invoke.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = () => resolve(undefined);
        }),
    );
    const pending = controls.requestReset().confirm(),
      rejected = expect(pending).rejects.toMatchObject({ code: 499 });
    controls.stop();
    expect(ledger.phase).toBe("unknown");
    complete();
    await rejected;
    expect(ledger.phase).toBe("unknown");
    expect(invoke).toHaveBeenCalledOnce();
  });
  it.each([
    { ...model, version: "" },
    { ...model, attributes: [] },
    { ...model, attributes: [...model.attributes, model.attributes[0]] },
    { ...model, services: [] },
  ])("refuses incomplete or ambiguous published capabilities", (bad) => {
    expect(() => setup({ model: bad })).toThrow();
  });
  it("refuses missing permission/conditions and non-JSON parameters rather than silently assuming defaults", () => {
    expect(() =>
      setup({
        profile: { ...profile, reset: { ...profile.reset!, conditions: undefined as never } },
      }),
    ).toThrow("条件");
    expect(() =>
      setup({ profile: { ...profile, reset: { ...profile.reset!, params: { timeout: NaN } } } }),
    ).toThrow("JSON");
    expect(() =>
      setup({
        profile: { ...profile, reset: { ...profile.reset!, params: { target: undefined } } },
      }),
    ).toThrow("JSON");
  });
});
