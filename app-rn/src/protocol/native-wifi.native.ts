import NetInfo from "@react-native-community/netinfo";
import Constants from "expo-constants";
import { PermissionsAndroid, Platform } from "react-native";
import { ApiError } from "../services/models";
import { observeWifi, type WifiReader } from "../services/wifi";

export function createWifiReader(): WifiReader {
  return {
    supportsManualSSID: Platform.OS === "ios",
    read: async (signal, requestPermission = false) => {
      const check = () => {
        if (signal?.aborted) throw new ApiError(499, "网络读取已停止");
      };
      check();
      let granted = Platform.OS !== "android";
      if (Platform.OS === "android") {
        const permission = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
        granted = await PermissionsAndroid.check(permission);
        check();
        if (!granted && requestPermission) {
          granted =
            (await PermissionsAndroid.request(permission)) === PermissionsAndroid.RESULTS.GRANTED;
          check();
        }
      }
      if (Platform.OS === "ios") {
        if (Constants.expoConfig?.extra?.iosWifiInfoEnabled !== true)
          throw new ApiError(
            503,
            "当前 iOS 测试包未启用 Wi-Fi 信息能力，请使用支持该能力的开发者团队签名并重新安装",
          );
        const location = await import("expo-location");
        check();
        let permission = await location.getForegroundPermissionsAsync();
        check();
        if (!permission.granted && permission.canAskAgain && requestPermission) {
          permission = await location.requestForegroundPermissionsAsync();
          check();
        }
        granted = permission.granted && permission.ios?.accuracy === "full";
        NetInfo.configure({ shouldFetchWiFiSSID: granted });
      }
      const state = await NetInfo.fetch("wifi");
      check();
      const observation = observeWifi({
        type: state.type,
        isConnected: state.isConnected,
        details: state.type === "wifi" ? state.details : undefined,
      });
      if (!granted && observation.connection === "wifi")
        return { ...observation, ssid: undefined, ssidAccess: "denied" };
      return observation;
    },
  };
}
