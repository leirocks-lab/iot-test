import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

/** Missing catalog artwork stays a neutral placeholder, never another product's image. */
export function ProductThumbnail({
  source,
  name,
  style,
}: {
  source?: string;
  name: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [failed, setFailed] = useState("");
  return (
    <View style={[styles.frame, style]}>
      {source?.startsWith("https://") && source !== failed ? (
        <Image
          source={source}
          accessibilityLabel={name}
          contentFit="contain"
          recyclingKey={source}
          style={StyleSheet.absoluteFill}
          onError={() => setFailed(source)}
        />
      ) : (
        <Svg width={32} height={44} viewBox="0 0 32 44" accessibilityLabel={`${name}，暂无图片`}>
          <Rect x={5} y={2} width={22} height={38} rx={3} fill="#F2F2F2" stroke="#CCCCCC" />
          <Path
            d="M9 9h14M9 13h14M9 17h14M9 36h14M9 40v3m14-3v3"
            stroke="#C1C1C1"
            strokeWidth={1.5}
          />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: "center", justifyContent: "center" },
});
