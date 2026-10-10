import { Pressable, Text } from "react-native";
import { useApp, useColors } from "../context";
import { translate } from "../i18n";
import { styles } from "./styles";

type ButtonProps = {
  title: string;
  width?: number | string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
};

export function Button({
  title,
  onPress,
  width,
  disabled = false,
  secondary = false,
  danger = false,
}: ButtonProps) {
  const colors = useColors();
  const { runtime } = useApp();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary
            ? colors.background.invert
            : danger
              ? colors.background.danger
              : colors.background.black,
          borderColor: danger
            ? colors.background.danger
            : colors.background.control,
          opacity: disabled ? 0.2 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text
        style={{
          fontSize: 16,
          color: secondary ? colors.font.supplement : colors.font.base,
        }}
      >
        {translate(title, runtime?.service.language ?? "zh-CN")}
      </Text>
    </Pressable>
  );
}
