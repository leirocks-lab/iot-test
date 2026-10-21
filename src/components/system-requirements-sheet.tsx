import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../ui/context";

export type SystemRequirement = "permission" | "bluetooth" | "wifi";

type Props = {
  visible: boolean;
  requirement: SystemRequirement;
  onCancel: () => void;
  onOpenSettings: () => void;
  error?: string;
  busy?: boolean;
};

const title: Record<SystemRequirement, string> = {
  permission: "\u6743\u9650\u4e0d\u8db3",
  bluetooth: "\u9700\u8981\u6253\u5f00\u84dd\u7259",
  wifi: "\u9700\u8981\u8fde\u63a5 Wi-Fi",
};
const description: Record<SystemRequirement, string> = {
  permission:
    "\u8bf7\u5728\u7cfb\u7edf\u8bbe\u7f6e\u4e2d\u5141\u8bb8\u5b9a\u4f4d\u548c\u84dd\u7259\u6743\u9650\u3002",
  bluetooth:
    "\u8bf7\u5728\u7cfb\u7edf\u8bbe\u7f6e\u4e2d\u6253\u5f00\u84dd\u7259\u540e\u8fd4\u56de\u7ee7\u7eed\u3002",
  wifi: "\u8bf7\u5728\u7cfb\u7edf\u8bbe\u7f6e\u4e2d\u8fde\u63a5 Wi-Fi \u540e\u8fd4\u56de\u7ee7\u7eed\u3002",
};

/** Placeholder sheet for settings controlled by the operating system. */
export function SystemRequirementsSheet({
  visible,
  requirement,
  onCancel,
  onOpenSettings,
  error,
  busy,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background.invert,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.handle} />
          <Text style={[styles.heading, { color: colors.font.title }]}>
            {"\u6743\u9650\u4e0e\u670d\u52a1"}
          </Text>
          <Text style={[styles.label, { color: colors.font.subtitle }]}>
            {title[requirement]}
          </Text>
          <Text style={[styles.copy, { color: colors.font.subtitle2 }]}>
            {description[requirement]}
          </Text>
          <View
            style={styles.placeholder}
            accessibilityLabel="system settings placeholder"
          />
          {!!error && (
            <Text
              accessibilityRole="alert"
              style={[styles.copy, { color: colors.font.danger }]}
            >
              {error}
            </Text>
          )}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={[
                styles.action,
                { backgroundColor: colors.background.split },
              ]}
            >
              <Text style={{ color: colors.font.subtitle }}>
                {"\u53d6\u6d88"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onOpenSettings}
              style={[
                styles.action,
                {
                  backgroundColor: colors.background.black,
                  opacity: busy ? 0.5 : 1,
                },
              ]}
            >
              <Text style={{ color: colors.font.base }}>
                {"\u53bb\u7cfb\u7edf\u8bbe\u7f6e"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  sheet: {
    minHeight: 330,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D5D5D5",
    marginBottom: 14,
  },
  heading: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 26,
  },
  label: { fontSize: 14, marginBottom: 12 },
  copy: { fontSize: 14, lineHeight: 21 },
  placeholder: { minHeight: 70, flexGrow: 1 },
  actions: { flexDirection: "row", gap: 16 },
  action: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
