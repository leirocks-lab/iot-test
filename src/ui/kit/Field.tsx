import { View, type TextInputProps } from "react-native";
import { useApp, useColors } from "../context";
import { translate } from "../i18n";
import { Input } from "./Input";
import { Label } from "./Label";

type FieldProps = TextInputProps & {
  label: string;
};

export function Field({ label, ...props }: FieldProps) {
  const colors = useColors();
  const { runtime } = useApp();
  const language = runtime?.service.language ?? "zh-CN";

  return (
    <View style={{ gap: 6 }}>
      <Label muted>{label}</Label>
      <Input
        accessibilityLabel={translate(label, language)}
        placeholderTextColor={colors.font.subtitle2}
        autoCapitalize="none"
        {...props}
        style={[
          {
            color: colors.font.black,
            backgroundColor: colors.background.invert,
            borderWidth: 0,
          },
          props.style,
        ]}
      />
    </View>
  );
}
