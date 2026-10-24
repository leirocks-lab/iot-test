import Constants from "expo-constants";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import type { CommunicationConfig } from "../services/config";
import type { Settings } from "../services/models";
import type { Runtime } from "../services/runtime";
import { createConfiguredRuntime } from "../services/app-runtime";

const Context = createContext<{
  runtime: Runtime | null;
  error: string;
  settings: Settings | null;
  refreshSettings: () => void;
  revision: number;
  navigationLocked: boolean;
  lockNavigation: (value: boolean) => void;
}>({
  runtime: null,
  error: "",
  settings: null,
  refreshSettings: () => undefined,
  revision: 0,
  navigationLocked: false,
  lockNavigation: () => undefined,
});
export function AppProvider({ children }: { children: ReactNode }) {
  const [runtime, setRuntime] = useState<Runtime | null>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [navigationLocked, setNavigationLocked] = useState(false);
  const lockNavigation = useCallback((value: boolean) => setNavigationLocked(value), []);
  useEffect(() => {
    let active = true;
    let created: Runtime | undefined;
    const controller = new AbortController();
    const extra = Constants.expoConfig?.extra ?? {};
    Promise.resolve()
      .then(() =>
        createConfiguredRuntime(extra as Partial<CommunicationConfig>, {
          signal: controller.signal,
        }),
      )
      .then((r) => {
        created = r;
        if (active) setRuntime(r);
        else r.dispose();
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "App初始化失败，请核对通信配置");
      });
    return () => {
      active = false;
      controller.abort();
      created?.dispose();
    };
  }, []);
  useEffect(() => runtime?.service.onSessionChange(() => setRevision((r) => r + 1)), [runtime]);
  const value = useMemo(
    () => ({
      runtime,
      error,
      settings: runtime?.service.session?.setting ?? null,
      refreshSettings: () => setRevision((r) => r + 1),
      revision,
      navigationLocked,
      lockNavigation,
    }),
    [runtime, error, revision, navigationLocked, lockNavigation],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp() {
  return useContext(Context);
}
export function useColors() {
  const { settings } = useApp(),
    system = useColorScheme();
  const dark = settings?.theme === "dark" || (settings?.theme === "system" && system === "dark");
  return dark
    ? {
        // background: "#111C22",
        // surface: "#1D2C33",
        // text: "#F1F7FA",
        // muted: "#B2C3CA",
        // primary: "#58B8F5",
        // border: "#344850",
        // danger: "#FF909A",
        // onPrimary: "#0B2636",

        brand: {
          blue: "#186DAF",
          yellow: "#EE9D31",
        },
        background: {
          invert: "#FFFFFF",
          split: "#F2F2F2",
          control: "#E5E5E5",
          primary: "#1677FF",
          primary_light: "#D9EBF9",
          warning: "#EE9D31",
          danger: "#F0534A",
          success: "#1CC787",
          black: "#000000",
        },
        font: {
          primary: "#1677FF",
          warning: "#EE9D31",
          danger: "#F0534A",
          success: "#1CC787",
          title: "#333333",
          subtitle: "#666666",
          subtitle2: "#999999",
          caption: "#CCCCCC",
          base: "#FFFFFF",
          supplement: "#332C2B",
          black: "#000000",
        },
        line: {
          primary: "#CCCCCC",
          secondary: "#E5E5E5",
        },
        overlay: {
          overlay: "#000000BF",
          overlay_light: "#00000080",
        },
        other: {
          purple: "#995EFC",
          violet: "#5D49FF",
          aqua: "#29C3FF",
          cyan: "#00CBB8",
          green: "#1CC787",
          orange: "#FFCD00",
          yellow: "#EE9D31",
          amber: "#EE9D31",
          orangeRed: "#FF6A4C",
          red: "#F0534A",
          magenta: "#FF2D84",
        },
      }
    : {
        // background: "#F3F5F7",
        // surface: "#FFFFFF",
        // text: "#152838",
        // muted: "#60717E",
        // primary: "#1475BD",
        // border: "#DCE5EB",
        // danger: "#B82840",
        // onPrimary: "#FFFFFF",

        brand: {
          blue: "#186DAF",
          yellow: "#EE9D31",
        },
        background: {
          invert: "#FFFFFF",
          split: "#F2F2F2",
          control: "#E5E5E5",
          primary: "#1677FF",
          primary_light: "#D9EBF9",
          warning: "#EE9D31",
          danger: "#F0534A",
          success: "#1CC787",
          black: "#000000",
        },
        font: {
          primary: "#1677FF",
          warning: "#EE9D31",
          danger: "#F0534A",
          success: "#1CC787",
          title: "#333333",
          subtitle: "#666666",
          subtitle2: "#999999",
          caption: "#CCCCCC",
          base: "#FFFFFF",
          supplement: "#332C2B",
          black: "#000000",
        },
        line: {
          primary: "#CCCCCC",
          secondary: "#E5E5E5",
        },
        overlay: {
          overlay: "#000000BF",
          overlay_light: "#00000080",
        },
        other: {
          purple: "#995EFC",
          violet: "#5D49FF",
          aqua: "#29C3FF",
          cyan: "#00CBB8",
          green: "#1CC787",
          orange: "#FFCD00",
          yellow: "#EE9D31",
          amber: "#EE9D31",
          orangeRed: "#FF6A4C",
          red: "#F0534A",
          magenta: "#FF2D84",
        },
      };
}
