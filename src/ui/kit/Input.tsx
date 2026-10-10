import { TextInput, type TextInputProps } from "react-native";
import { useColors } from "../context";

export function Input({ style, ...props }: TextInputProps) {
  const colors = useColors();

  return (
    <TextInput
      {...props}
      placeholderTextColor={colors.font.subtitle2}
      style={[
        {
          minHeight: 48,
          borderRadius: 9,
          paddingHorizontal: 16,
          fontSize: 16,
        },
        style,
      ]}
    />
  );
}
