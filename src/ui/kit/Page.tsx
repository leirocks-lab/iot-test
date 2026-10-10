import { Image } from "expo-image";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp, useColors } from "../context";
import { translate } from "../i18n";
import { Label } from "./Label";
import { styles } from "./styles";

type PageProps = {
  title: string;
  children: ReactNode;
  back?: boolean;
  action?: ReactNode;
  wallpaper?: boolean;
};

export function Page({
  title,
  children,
  back = true,
  action,
  wallpaper = false,
}: PageProps) {
  const colors = useColors();
  const { runtime, settings } = useApp();
  const [failedImage, setFailedImage] = useState("");
  const image = wallpaper ? settings?.wallpaper?.image : undefined;
  const language = runtime?.service.language ?? "zh-CN";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {image && image !== failedImage && (
        <>
          <Image
            source={image}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
            onError={() => setFailedImage(image)}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.background, opacity: 0.88 },
            ]}
          />
        </>
      )}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          {back && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={styles.back}
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/home")
              }
            >
              <Image
                source={require("../../../assets/images/back-icon.png")}
                contentFit="cover"
                style={{ width: 28, height: 28 }}
              />
            </Pressable>
          )}
          <Text style={[styles.heading, { color: colors.text }]}>
            {translate(title, language)}
          </Text>
          {action}
        </View>
        {image === failedImage && !!image && (
          <Label muted>Wallpaper is unavailable</Label>
        )}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
