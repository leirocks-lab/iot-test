import type { Runtime } from "./runtime";

export interface RuntimeState {
  runtime: Runtime | null;
  error: string;
}
type Listener = (state: RuntimeState) => void;

/** Owns one runtime across synchronous React Effect cleanup/setup replays. */
export function createRuntimeLifecycle(create: (signal: AbortSignal) => Promise<Runtime>) {
  let current:
    | {
        controller: AbortController;
        state: RuntimeState;
        listeners: Set<Listener>;
      }
    | undefined;
  return {
    subscribe(listener: Listener) {
      if (!current) {
        const run = {
          controller: new AbortController(),
          state: { runtime: null, error: "" } as RuntimeState,
          listeners: new Set<Listener>(),
        };
        current = run;
        void Promise.resolve()
          .then(() => create(run.controller.signal))
          .then((runtime) => {
            if (current !== run) {
              runtime.dispose();
              return;
            }
            run.state = { runtime, error: "" };
            for (const notify of run.listeners) notify(run.state);
          })
          .catch((error: unknown) => {
            if (current !== run) return;
            run.state = {
              runtime: null,
              error: error instanceof Error ? error.message : "App初始化失败，请核对通信配置",
            };
            for (const notify of run.listeners) notify(run.state);
          });
      }
      const run = current;
      // Each subscription owns its lease, even if callbacks happen to be identical.
      const notify: Listener = (state) => listener(state);
      run.listeners.add(notify);
      notify(run.state);
      return () => {
        run.listeners.delete(notify);
        // Fast Refresh and Strict Mode replay Effects synchronously. Let the next
        // setup retain ownership before treating cleanup as an actual unmount.
        queueMicrotask(() => {
          if (current !== run || run.listeners.size) return;
          current = undefined;
          run.controller.abort();
          run.state.runtime?.dispose();
        });
      };
    },
  };
}
