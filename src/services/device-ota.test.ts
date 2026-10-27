import { afterEach, describe, expect, it, vi } from "vitest";
import { DeviceOtaFlow } from "./device-ota";
import { RowanService } from "./rowan";
import type { DeviceView, OtaTask } from "./models";
import { MemoryStorage, defaultSettings } from "../test-support/settings-fixture";

const flows: DeviceOtaFlow[] = [];
afterEach(() => {
  for (const flow of flows.splice(0)) flow.stop();
  vi.restoreAllMocks();
});
async function setup() {
  const service = new RowanService(
    { request: vi.fn().mockRejectedValue(new Error("Unexpected HTTP request")) },
    new MemoryStorage(),
  );
  service.session = {
    userID: "actual-user",
    accessToken: "access-fixture",
    refreshToken: "refresh-fixture",
    expiresIn: 3600,
    tokenType: "bearer",
    setting: defaultSettings(),
  };
  const view: DeviceView = {
    deviceNickname: "Actual device",
    bindingRole: "sa",
    bindingAt: "",
    online: true,
    device: { id: "actual-device" },
    product: { id: "actual-product" },
  };
  vi.spyOn(service, "device").mockResolvedValue(view);
  vi.spyOn(service, "firmware").mockResolvedValue({
    hasUpdate: true,
    firmware: { id: "issued-firmware", version: "actual-version", remark: "Backend release" },
    deviceID: view.device.id,
  });
  const taskID = "issued-task";
  const task: OtaTask = {
    result: "updating",
    status: "downloading",
    progress: 30,
    startedAt: "2026-10-27T00:00:00Z",
  };
  const start = vi.spyOn(service, "startOta").mockResolvedValue({ taskID });
  const read = vi.spyOn(service, "otaTask").mockResolvedValue(task);
  const cancel = vi.spyOn(service, "cancelOta").mockResolvedValue(undefined);
  const flow = new DeviceOtaFlow(service, view.device.id);
  flows.push(flow);
  flow.start();
  await vi.waitFor(() => expect(flow.state.busy).toBe(false));
  return { service, view, task, taskID, flow, start, read, cancel };
}
describe("real OTA flow with endpoint doubles", () => {
  it("displays returned progress, restores a known task and does not create another task", async () => {
    const { service, flow, start, read, task, taskID } = await setup();
    await flow.check();
    await flow.create();
    expect(flow.state.task).toEqual(task);
    expect(start).toHaveBeenCalledOnce();
    flow.stop();
    const restored = new DeviceOtaFlow(service, "actual-device");
    flows.push(restored);
    restored.start();
    await vi.waitFor(() => expect(restored.state.taskID).toBe(taskID));
    await restored.create();
    expect(start).toHaveBeenCalledOnce();
    expect(read).toHaveBeenCalled();
  });
  it("persists a lost create response and blocks resubmission across route instances", async () => {
    const { service, flow, start } = await setup();
    start.mockRejectedValue(new Error("response lost"));
    await flow.check();
    await flow.create();
    expect(flow.state.unknown).toBe(true);
    await flow.create();
    flow.stop();
    const restored = new DeviceOtaFlow(service, "actual-device");
    flows.push(restored);
    restored.start();
    await vi.waitFor(() => expect(restored.state.busy).toBe(false));
    await restored.check();
    await restored.create();
    expect(restored.state.unknown).toBe(true);
    expect(start).toHaveBeenCalledOnce();
  });
  it("requires a terminal readback before clearing an uncertain cancellation", async () => {
    const { flow, cancel, read, task } = await setup();
    await flow.check();
    await flow.create();
    cancel.mockRejectedValue(new Error("response lost"));
    await flow.cancel();
    expect(flow.state.cancelPending).toBe(true);
    await flow.cancel();
    expect(cancel).toHaveBeenCalledOnce();
    read.mockResolvedValue({ ...task, result: "cancelled", status: "cancelled" });
    await flow.poll();
    expect(flow.state.cancelPending).toBe(false);
    expect(flow.state.task?.result).toBe("cancelled");
    await flow.cancel();
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("blocks offline devices before submitting OTA and does not synthesize success", async () => {
    const { flow, service, view, start } = await setup();
    await flow.check();
    vi.mocked(service.device).mockResolvedValue({ ...view, online: false });
    await flow.create();
    expect(start).not.toHaveBeenCalled();
    expect(flow.state.task).toBeUndefined();
    expect(flow.state.error).toContain("离线");
  });
});
