import { DevSettings, Platform } from "react-native";
import { createLogStore, installConsoleCapture, type LogStore } from "./log-store";

// Survive Fast Refresh without wrapping console again or registering duplicate menu items.
const globalState = globalThis as typeof globalThis & {
  __rowanDebugConsole?: { store: LogStore; menuRegistered: boolean; captureInstalled?: boolean };
};
const state = (globalState.__rowanDebugConsole ??= {
  store: createLogStore(),
  menuRegistered: false,
});

if (__DEV__) {
  // Install only once, even if this module is re-evaluated by Fast Refresh.
  if (!state.captureInstalled) {
    installConsoleCapture(console, state.store);
    state.captureInstalled = true;
  }
  if (Platform.OS !== "web" && !state.menuRegistered) {
    state.menuRegistered = true;
    // expo-dev-client uses its own menu. RN's menu is a fallback for plain debug clients.
    void import("expo-dev-client")
      .then(({ registerDevMenuItems }) =>
        registerDevMenuItems([
          { name: "显示日志控制台", callback: state.store.show, shouldCollapse: true },
        ]),
      )
      .catch(() => {
        try {
          DevSettings.addMenuItem("显示日志控制台", state.store.show);
        } catch {
          state.menuRegistered = false;
        }
      });
  }
}

export const logStore = state.store;
