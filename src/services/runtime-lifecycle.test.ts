import { expect, it, vi } from "vitest";
import type { Runtime } from "./runtime";
import { createRuntimeLifecycle, type RuntimeState } from "./runtime-lifecycle";

function fixture() {
  return { dispose: vi.fn() } as unknown as Runtime;
}
function pendingRuntime() {
  let resolve!: (runtime: Runtime) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Runtime>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

it("reuses pending initialization during Effect replay without aborting its signal", async () => {
  const pending = pendingRuntime();
  const create = vi.fn((_signal: AbortSignal) => pending.promise);
  const lifecycle = createRuntimeLifecycle(create);
  let state: RuntimeState = { runtime: null, error: "" };
  const release = lifecycle.subscribe((next) => {
    state = next;
  });
  await Promise.resolve();
  release();
  const releaseReplay = lifecycle.subscribe((next) => {
    state = next;
  });
  await Promise.resolve();
  expect(create).toHaveBeenCalledOnce();
  expect(create.mock.calls[0][0].aborted).toBe(false);
  const runtime = fixture();
  pending.resolve(runtime);
  await vi.waitFor(() => expect(state.runtime).toBe(runtime));
  releaseReplay();
  await Promise.resolve();
  expect(create.mock.calls[0][0].aborted).toBe(true);
  expect(runtime.dispose).toHaveBeenCalledOnce();
});

it("disposes a late runtime after unmount without notifying the removed subscriber", async () => {
  const pending = pendingRuntime();
  const lifecycle = createRuntimeLifecycle(() => pending.promise);
  const states: RuntimeState[] = [];
  const release = lifecycle.subscribe((state) => states.push(state));
  await Promise.resolve();
  release();
  await Promise.resolve();
  const runtime = fixture();
  pending.resolve(runtime);
  await vi.waitFor(() => expect(runtime.dispose).toHaveBeenCalledOnce());
  expect(states).toEqual([{ runtime: null, error: "" }]);
});

it("a stopped initialization cannot replace a newer runtime or report its error", async () => {
  for (const fail of [false, true]) {
    const pending = pendingRuntime();
    const runtime = fixture();
    const create = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValueOnce(runtime);
    const lifecycle = createRuntimeLifecycle(create);
    const release = lifecycle.subscribe(() => {});
    await Promise.resolve();
    release();
    await Promise.resolve();
    let state: RuntimeState = { runtime: null, error: "" };
    const releaseNew = lifecycle.subscribe((next) => {
      state = next;
    });
    await vi.waitFor(() => expect(state.runtime).toBe(runtime));
    const late = fixture();
    if (fail) pending.reject(new Error("old startup failed"));
    else pending.resolve(late);
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    await Promise.resolve();
    expect(state).toEqual({ runtime, error: "" });
    if (!fail) expect(late.dispose).toHaveBeenCalledOnce();
    releaseNew();
    await Promise.resolve();
  }
});

it("reports a current startup failure and clears it on a fresh lifecycle", async () => {
  const runtime = fixture();
  const create = vi
    .fn()
    .mockRejectedValueOnce(new Error("startup failed"))
    .mockResolvedValueOnce(runtime);
  const lifecycle = createRuntimeLifecycle(create);
  let state: RuntimeState = { runtime: null, error: "" };
  const release = lifecycle.subscribe((next) => {
    state = next;
  });
  await vi.waitFor(() => expect(state.error).toBe("startup failed"));
  release();
  await Promise.resolve();
  const releaseNew = lifecycle.subscribe((next) => {
    state = next;
  });
  expect(state).toEqual({ runtime: null, error: "" });
  await vi.waitFor(() => expect(state.runtime).toBe(runtime));
  releaseNew();
  await Promise.resolve();
});
