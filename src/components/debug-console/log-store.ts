import { diagnosticSnapshot } from "../../services/http-logging";

export type LogLevel = "log" | "debug" | "info" | "warn" | "error";
export type LogFilter = LogLevel | "all";
export interface LogEntry {
  readonly id: number;
  readonly timestamp: number;
  readonly level: LogLevel;
  readonly text: string;
}
interface Snapshot {
  readonly entries: readonly LogEntry[];
  readonly visible: boolean;
  readonly open: boolean;
}
const MAX_TEXT = 8192;
const TRUNCATED = "…[TRUNCATED]";
const bound = (text: string) =>
  text.length > MAX_TEXT ? text.slice(0, MAX_TEXT - TRUNCATED.length) + TRUNCATED : text;

function formatArgument(value: unknown): string {
  // HTTP/MQTT output is often a title followed by pretty-printed JSON.
  if (typeof value === "string") {
    const newline = value.indexOf("\n");
    for (const start of [0, ...(newline < 0 ? [] : [newline + 1])]) {
      if (!/^[\s]*[\[{]/.test(value.slice(start))) continue;
      if (value.length > 65536) return "[TRUNCATED JSON]";
      try {
        const prefix = start ? String(diagnosticSnapshot(value.slice(0, start))) : "";
        return bound(
          prefix + JSON.stringify(diagnosticSnapshot(JSON.parse(value.slice(start))), null, 2),
        );
      } catch {
        // Plain text that happens to start with a bracket remains readable.
      }
    }
    return bound(String(diagnosticSnapshot(value)));
  }
  if (value instanceof Error) {
    const descriptor = Object.getOwnPropertyDescriptor(value, "message");
    value = {
      error: "Error",
      message: descriptor && "value" in descriptor ? descriptor.value : "",
    };
  }
  return bound(JSON.stringify(diagnosticSnapshot(value), null, 2) ?? String(value));
}

export function createLogStore() {
  let snapshot: Snapshot = { entries: [], visible: true, open: false };
  let sequence = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const notify = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        /* Diagnostics must never break the app. */
      }
    }
  };
  const update = (change: Partial<Snapshot>) => {
    snapshot = { ...snapshot, ...change };
    notify();
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    append(level: LogLevel, args: readonly unknown[]) {
      let text: string;
      try {
        text = bound(args.slice(0, 30).map(formatArgument).join(" "));
      } catch {
        text = "[UNREADABLE]";
      }
      const entry: LogEntry = { id: ++sequence, timestamp: Date.now(), level, text };
      snapshot = { ...snapshot, entries: [...snapshot.entries.slice(-499), entry] };
      if (timer === undefined) timer = setTimeout(notify, 200);
    },
    clear: () => update({ entries: [] }),
    open: () => update({ visible: true, open: true }),
    close: () => update({ open: false }),
    hide: () => update({ visible: false, open: false }),
    show: () => update({ visible: true, open: false }),
  };
}
export type LogStore = ReturnType<typeof createLogStore>;

export function filterLogs(entries: readonly LogEntry[], level: LogFilter, query: string) {
  const keyword = query.trim().toLowerCase();
  return entries.filter(
    (entry) =>
      (level === "all" || entry.level === level) && entry.text.toLowerCase().includes(keyword),
  );
}
export function exportLogs(entries: readonly LogEntry[]) {
  return entries
    .map(
      (entry) =>
        `[${new Date(entry.timestamp).toISOString()}] [${entry.level.toUpperCase()}] ${entry.text}`,
    )
    .join("\n\n");
}

type ConsoleTarget = Pick<Console, LogLevel>;
const installations = new WeakMap<ConsoleTarget, () => void>();

/** Preserve original arguments/output; capturing is an isolated secondary sink. */
export function installConsoleCapture(target: ConsoleTarget, store: LogStore) {
  const installed = installations.get(target);
  if (installed) return installed;
  const originals = new Map<LogLevel, ConsoleTarget[LogLevel]>();
  const wrappers = new Map<LogLevel, ConsoleTarget[LogLevel]>();
  let recording = false;
  for (const level of ["log", "debug", "info", "warn", "error"] as const) {
    const original = target[level];
    originals.set(level, original);
    const wrapped = (...args: unknown[]) => {
      original.apply(target, args);
      if (recording) return;
      recording = true;
      try {
        store.append(level, args);
      } catch {
        /* Preserve the original console behavior. */
      } finally {
        recording = false;
      }
    };
    wrappers.set(level, wrapped);
    target[level] = wrapped;
  }
  const restore = () => {
    for (const [level, original] of originals) {
      if (target[level] === wrappers.get(level)) target[level] = original;
    }
    installations.delete(target);
  };
  installations.set(target, restore);
  return restore;
}
