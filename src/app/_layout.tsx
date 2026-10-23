import { AppProvider, useApp, useColors } from "@/ui/context";
import { LoadingProvider } from "@/components/Loading";
import { Busy, ErrorText } from "@/ui/kit";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
function Routes() {
  const { runtime, error } = useApp(),
    c = useColors();
  if (!runtime)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.background.split,
          justifyContent: "center",
          padding: 24,
        }}
      >
        {error ? <ErrorText error={error} /> : <Busy />}
      </View>
    );
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="auth/region" />
        <Stack.Screen name="auth/agreement" />
        <Stack.Screen name="auth/reset" />
        <Stack.Protected guard={!!runtime.service.session}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="device" />
          <Stack.Screen name="add" />
          <Stack.Screen name="add-provision" />
          <Stack.Screen name="scan" />
          <Stack.Screen name="rooms" />
          <Stack.Screen name="add-room" />
          <Stack.Screen name="preferences" />
          <Stack.Screen name="help" />
        </Stack.Protected>
      </Stack>
      <StatusBar style={c.background.split === "#111C22" ? "light" : "dark"} />
    </>
  );
}
export default function RootLayout() {
  return (
    <AppProvider>
      <LoadingProvider>
        <Routes />
      </LoadingProvider>
    </AppProvider>
  );
}
