import { Text } from "react-native";
import { useColors } from "../context";

export function ErrorText({ error }: { error: string }) {
  const colors = useColors();

  return error ? (
    <Text
      accessibilityRole="alert"
      style={{ color: colors.font.danger, fontSize: 15, lineHeight: 23 }}
    >
      {error}
    </Text>
  ) : null;
}
