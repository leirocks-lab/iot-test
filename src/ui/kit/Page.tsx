import { Image } from "expo-image";
import { router } from "expo-router";
import { useState, type ReactElement, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type RefreshControlProps,
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
  header?: ReactNode;
  footer?: ReactNode;
  loadingContent?: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
};

export function Page({
  title,
  children,
  back = true,
  action,
  wallpaper = false,
  header,
  footer,
  loadingContent,
  refreshControl,
}: PageProps) {
  const colors = useColors();
  const { runtime, settings } = useApp();
  const [failedImage, setFailedImage] = useState("");
  const image = wallpaper ? settings?.wallpaper?.image : undefined;
  const language = runtime?.service.language ?? "zh-CN";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.split }}>
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
              { backgroundColor: colors.background.split, opacity: 0.88 },
            ]}
          />
        </>
      )}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {header ?? (
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
            <Text style={[styles.heading, { color: colors.font.title }]}>
              {translate(title, language)}
            </Text>
            {action}
          </View>
        )}
        {image === failedImage && !!image && (
          <Label muted>Wallpaper is unavailable</Label>
        )}
        {loadingContent}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
