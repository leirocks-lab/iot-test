import type { Room } from "../src/services/models";

export interface CleanupService {
  rooms(): Promise<{ rooms: Room[] }>;
  saveRooms(rooms: readonly Room[], baseline: readonly Room[]): Promise<{ rooms: Room[] }>;
}
export interface CleanupEvidence {
  result: "passed" | "failed";
  candidateNames: string[];
  removedIDs?: string[];
  remainingCandidateIDs?: string[];
  reason?: string;
}

// Reconcile by this run's unique candidate names even when the first post-write GET failed.
export async function cleanupTemporaryRooms(
  service: CleanupService,
  candidateNames: readonly string[],
  knownIDs: ReadonlySet<string>,
  original: readonly Room[],
): Promise<CleanupEvidence> {
  const ids = new Set(knownIDs);
  try {
    const fresh = await service.rooms();
    for (const name of candidateNames) {
      const matches = fresh.rooms.filter((room) => room.name === name);
      if (matches.length > 1) throw new Error("候选名称不唯一，需要人工核对");
      for (const room of matches) ids.add(room.id);
    }
    if (!ids.size) throw new Error("未确认未知创建结果；请按候选名称核对，禁止重试POST");
    for (const room of fresh.rooms.filter((room) => ids.has(room.id))) {
      if (
        original.some((value) => value.id === room.id) ||
        room.isDefault ||
        room.deviceCount !== 0
      )
        throw new Error("候选房间不是可安全删除的本轮空房间");
    }
    await service.saveRooms(
      fresh.rooms.filter((r) => !ids.has(r.id)),
      fresh.rooms,
    );
    const actual = await service.rooms();
    if (actual.rooms.some((room) => ids.has(room.id)))
      throw new Error("清理后仍有本轮房间，请人工核对");
    if (
      original.some(
        (room) => !actual.rooms.some((value) => value.id === room.id && value.name === room.name),
      )
    )
      throw new Error("原有房间发生变化，请人工核对");
    const originalIDs = new Set(original.map((room) => room.id));
    if (
      actual.rooms
        .filter((room) => originalIDs.has(room.id))
        .map((room) => room.id)
        .join("\0") !== original.map((room) => room.id).join("\0")
    )
      throw new Error("原有房间顺序变化，请人工核对");
    return { result: "passed", candidateNames: [...candidateNames], removedIDs: [...ids] };
  } catch (error) {
    return {
      result: "failed",
      candidateNames: [...candidateNames],
      remainingCandidateIDs: [...ids],
      reason: error instanceof Error ? error.message : "清理结果未知，请人工核对",
    };
  }
}
