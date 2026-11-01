import { expect, it, vi } from "vitest";
import { cleanupTemporaryRooms } from "../../scripts/联调房间清理";

const original = { id: "existing", name: "Keep", deviceCount: 0 };
const temporary = { id: "temp", name: "unique-run-A", deviceCount: 0 };
it("discovers and removes the unique run room after POST succeeded but the first GET failed", async () => {
  const service = {
    rooms: vi
      .fn()
      .mockResolvedValueOnce({ rooms: [original, temporary] })
      .mockResolvedValueOnce({ rooms: [original] }),
    saveRooms: vi.fn().mockResolvedValue({ rooms: [original] }),
  };
  const result = await cleanupTemporaryRooms(service, ["unique-run-A"], new Set(), [original]);
  expect(service.saveRooms).toHaveBeenCalledWith([original], [original, temporary]);
  expect(result).toMatchObject({ result: "passed", removedIDs: ["temp"] });
});
it("records candidate names for manual recovery when the reconciliation GET fails", async () => {
  const service = {
    rooms: vi.fn().mockRejectedValue(new Error("network unavailable")),
    saveRooms: vi.fn(),
  };
  await expect(
    cleanupTemporaryRooms(service, ["unique-run-A"], new Set(), [original]),
  ).resolves.toMatchObject({ result: "failed", candidateNames: ["unique-run-A"] });
  expect(service.saveRooms).not.toHaveBeenCalled();
});
it("refuses to delete a candidate whose device count became nonzero", async () => {
  const service = {
    rooms: vi.fn().mockResolvedValue({ rooms: [original, { ...temporary, deviceCount: 1 }] }),
    saveRooms: vi.fn(),
  };
  expect(
    await cleanupTemporaryRooms(service, ["unique-run-A"], new Set(), [original]),
  ).toMatchObject({ result: "failed" });
  expect(service.saveRooms).not.toHaveBeenCalled();
});
it("does not report cleanup success until a subsequent GET confirms removal and original order", async () => {
  const service = {
    rooms: vi.fn().mockResolvedValue({ rooms: [original, temporary] }),
    saveRooms: vi.fn().mockResolvedValue({ rooms: [original] }),
  };
  expect(
    await cleanupTemporaryRooms(service, ["unique-run-A"], new Set(["temp"]), [original]),
  ).toMatchObject({ result: "failed" });
});
