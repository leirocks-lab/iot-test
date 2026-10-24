import { Image } from "expo-image";
import { router } from "expo-router";
import { View } from "react-native";
import { Button, Page } from "../ui/kit";

export default function AuthLanding() {
  return (
    <Page title="" back={false}>
      <View style={{ flex: 1, justifyContent: "center", gap: 40 }}>
        <View style={{ alignItems: "center", gap: 16 }}>
          <Image
            source={require("../../assets/images/login-logo.png")}
            contentFit="contain"
            style={{ width: 150, height: 375, borderRadius: 28 }}
            accessibilityLabel="ROWAN logo"
          />
        </View>
        <View style={{ gap: 16, justifyContent: "center", alignItems: "center" }}>
          <Button title="Sign in" onPress={() => router.push("/auth/login")} />
          <Button secondary title="Create account" onPress={() => router.push("/auth/register")} />
        </View>
      </View>
    </Page>
  );
}
