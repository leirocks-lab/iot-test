import type { ReactNode } from "react";
import { Text } from "react-native";
import { useApp, useColors } from "../context";
import { translate } from "../i18n";

type LabelProps = {
  children: ReactNode;
  muted?: boolean;
  large?: boolean;
};

export function Label({ children, muted = false, large = false }: LabelProps) {
  const colors = useColors();
  const { runtime } = useApp();

  return (
    <Text
      style={{
        color: muted ? colors.font.subtitle : colors.font.title,
        fontSize: large ? 26 : 16,
        lineHeight: large ? 34 : 24,
        fontWeight: large ? "700" : "400",
      }}
    >
      {typeof children === "string"
        ? translate(children, runtime?.service.language ?? "zh-CN")
        : children}
    </Text>
  );
}
