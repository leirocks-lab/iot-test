import { describe, expect, it, vi } from "vitest";
import { EventControls, eventLedger, type DeviceEvent, type EventProfile } from "./device-events";
import type { DeviceView, ThingModel } from "./models";

const context = {
  device: {
    deviceNickname: "Fixture",
    device: { id: "dev" },
    product: { id: "fixture" },
    bindingRole: "obs",
    bindingAt: "",
  } as DeviceView,
  model: {
    version: "v1",
    attributes: [
      { identifier: "fault_state", type: "number", writable: false },
      { identifier: "Temperature", type: "number", writable: false },
    ],
    services: [],
    events: [
      { identifier: "Fault", level: "critical" },
      { identifier: "FaultRecovery", level: "info" },
    ],
  } as ThingModel,
};
const profile: EventProfile = {
  definitions: [
    {
      identifier: "Fault",
      title: "已定义故障",
      level: "critical",
      guidance: "已发布处置文案",
      recovery: { event: "FaultRecovery", property: { identifier: "fault_state", equals: 0 } },
    },
  ],
};
const fault = (extra: Partial<DeviceEvent> = {}): DeviceEvent => ({
  identifier: "Fault",
  occurrenceID: "incident-1",
  revision: 1,
  data: { code: 7, detail: { sensor: "fixture" } },
  ...extra,
});
function setup(configured = true) {
  const ledger = eventLedger(),
    changed = vi.fn();
  let current = true;
  const events = new EventControls(ledger, () => current, changed);
  if (configured) events.configure(context, profile);
  return {
    events,
    ledger,
    changed,
    stop: () => {
      events.stop();
      current = false;
    },
  };
}
describe("设备告警业务（合成产品规则）", () => {
  it("keeps device context, actual level and time without manufacturing missing values or mutating input", () => {
    const { events } = setup(),
      input = fault({ occurredAt: "2026-10-11T12:00:00Z", level: "device-level" });
    events.receive(input);
    (input.data.detail as { sensor: string }).sensor = "changed";
    expect(events.records[0]).toMatchObject({
      title: "已定义故障",
      level: "device-level",
      guidance: "已发布处置文案",
      event: { occurredAt: "2026-10-11T12:00:00Z", data: { detail: { sensor: "fixture" } } },
    });
    events.receive(fault({ occurrenceID: "incident-2", occurredAt: "invalid" }));
    expect(events.records[1].event.occurredAt).toBeUndefined();
  });
  it("unknown or unconfigured events retain identifiers and payload with no inferred repair instructions", () => {
    const { events } = setup(false);
    events.receive(fault({ identifier: "unpublished", level: "wire-level" }));
    expect(events.records[0]).toMatchObject({
      title: "设备告警",
      level: "wire-level",
      event: { identifier: "unpublished" },
      state: "active",
    });
    expect(events.records[0].guidance).toBeUndefined();
  });
  it("dismiss and redisplay do not recover or erase context; observer role can read", () => {
    const { events } = setup();
    events.receive(fault());
    const key = events.records[0].key;
    events.dismiss(key);
    expect(events.records[0]).toMatchObject({ dismissed: true, state: "active" });
    events.dismiss(key, false);
    expect(events.records[0]).toMatchObject({ dismissed: false, state: "active" });
  });
  it("disconnect/re-entry/full sync without explicit recovery condition never clears or marks recovered", () => {
    const { events, ledger, stop } = setup();
    events.receive(fault());
    stop();
    expect(events.records[0]).toMatchObject({ needsCheck: true, state: "active" });
    const next = new EventControls(ledger);
    next.configure(context, profile);
    next.properties({ full: true, reported: { Temperature: 20 } });
    expect(next.records[0]).toMatchObject({ needsCheck: true, state: "active" });
  });
  it("only a newer recovery for the same occurrence updates state and keeps original context", () => {
    const { events } = setup();
    events.receive(fault());
    events.receive(fault({ identifier: "FaultRecovery", occurrenceID: "other", revision: 2 }));
    expect(events.records[0].state).toBe("active");
    events.receive(fault({ identifier: "FaultRecovery", revision: 1 }));
    expect(events.records[0].state).toBe("active");
    events.receive(fault({ identifier: "FaultRecovery", revision: 3, data: { cleared: true } }));
    expect(events.records[0]).toMatchObject({
      state: "recovered",
      event: { identifier: "Fault", revision: 1, data: { code: 7 } },
      recovery: { identifier: "FaultRecovery", revision: 3 },
    });
    events.receive(fault({ revision: 2 }));
    expect(events.records[0].state).toBe("recovered");
  });
  it("duplicate/older input cannot change data, reopen dismissed prompt or lose pending verification", () => {
    const { events } = setup();
    events.receive(fault({ revision: 5 }));
    events.dismiss(events.records[0].key);
    events.stop();
    events.receive(fault({ revision: 5, data: { code: 0 } }));
    events.receive(fault({ revision: 4 }));
    expect(events.records).toHaveLength(1);
    expect(events.records[0]).toMatchObject({
      dismissed: true,
      needsCheck: true,
      event: { data: { code: 7 } },
    });
  });
  it.each([{ occurrenceID: undefined }, { revision: undefined }])(
    "does not infer deduplication or recovery without identity/order %j",
    (extra) => {
      const { events } = setup();
      events.receive(fault(extra));
      events.receive(fault(extra));
      events.receive(
        fault({
          ...extra,
          identifier: "FaultRecovery",
          revision: extra.revision === undefined ? undefined : 3,
        }),
      );
      expect(events.records).toHaveLength(3);
      expect(events.records.every((item) => item.state === "active")).toBe(true);
    },
  );
  it("new valid recovery property applies only explicitly configured conditions, retaining evidence", () => {
    const { events } = setup();
    events.receive(fault());
    events.properties({ full: false, reported: { Temperature: 0 } });
    events.properties({ full: true, reported: { fault_state: 1 } });
    expect(events.records[0].state).toBe("active");
    events.properties({ full: false, reported: { fault_state: 0 } });
    expect(events.records[0]).toMatchObject({
      state: "recovered",
      recovery: { reported: { fault_state: 0 }, full: false },
    });
  });
  it("ordinary zero properties cannot recover a profile with no recovery capability", () => {
    const { events } = setup(false);
    events.configure(context, { definitions: [{ identifier: "Fault", title: "设备故障" }] });
    events.receive(fault());
    events.properties({ full: true, reported: { fault_state: 0 } });
    events.receive(fault({ identifier: "FaultRecovery", revision: 2 }));
    expect(events.records[0].state).toBe("active");
  });
  it("different product/model context cannot apply new recovery rules to an earlier incident", () => {
    const { events, ledger } = setup();
    events.receive(fault());
    events.stop();
    const next = new EventControls(ledger);
    next.configure({ ...context, model: { ...context.model, version: "v2" } }, profile);
    next.properties({ full: true, reported: { fault_state: 0 } });
    next.receive(fault({ identifier: "FaultRecovery", revision: 3 }));
    expect(next.records[0]).toMatchObject({ state: "active", needsCheck: true });
  });
  it("closed controllers cannot alter records through stale events or dismiss callbacks", () => {
    const { events, stop } = setup();
    events.receive(fault());
    stop();
    events.dismiss(events.records[0].key);
    events.receive(fault({ identifier: "FaultRecovery", revision: 2 }));
    events.properties({ full: true, reported: { fault_state: 0 } });
    expect(events.records[0]).toMatchObject({
      state: "active",
      dismissed: false,
      needsCheck: true,
    });
  });
  it.each([
    { identifier: "" },
    { revision: -1 },
    { revision: 1.5 },
    { occurrenceID: "" },
    { data: { bad: NaN } },
    { data: { bad: undefined } },
  ])("rejects malformed normalized data %j", (extra) => {
    const { events } = setup();
    events.receive(fault(extra));
    expect(events.records).toHaveLength(0);
  });
  it.each([
    { definitions: [{ identifier: "missing", title: "x" }] },
    {
      definitions: [
        { identifier: "Fault", title: "x" },
        { identifier: "Fault", title: "y" },
      ],
    },
    { definitions: [{ identifier: "Fault", title: "x", recovery: { event: "Fault" } }] },
    {
      definitions: [
        {
          identifier: "Fault",
          title: "x",
          recovery: { property: { identifier: "missing", equals: 0 } },
        },
      ],
    },
  ])("fails closed for unpublished/ambiguous product mappings %j", (value) => {
    const { events } = setup(false);
    expect(() => events.configure(context, value)).toThrow(/未确认|冲突/);
  });
});
