import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const bluetoothImage = require("../../assets/images/bluetooth-white.png");
const searchImage = require("../../assets/images/search-devices.png");

export interface SearchDevicesLoadingProps {
  /** Diameter of the rotating search graphic, in points. Defaults to 240. */
  readonly size?: number;
  /** Whether the radar should keep rotating. */
  readonly active?: boolean;
}

/** Bluetooth search animation with a fixed center icon and rotating radar. */
export function SearchDevicesLoading({
  size = 240,
  active = true,
}: SearchDevicesLoadingProps) {
  const rotation = useSharedValue(0);
  const centerSize = size >= 100 ? size / 4 : size;
  const iconSize = centerSize * 0.58;

  useEffect(() => {
    if (!active) {
      cancelAnimation(rotation);
      rotation.value = 0;
      return;
    }
    rotation.value = withRepeat(
      withTiming(-360, { duration: 1800, easing: Easing.linear }),
      -1,
      false,
    );

    return () => cancelAnimation(rotation);
  }, [active, rotation]);

  const rotatingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View
      accessibilityLabel={active ? "正在搜索蓝牙设备" : "蓝牙设备搜索"}
      accessibilityRole={active ? "progressbar" : "image"}
      style={[styles.container, { width: size, height: size }]}
    >
      <Animated.Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={searchImage}
        style={[
          styles.searchImage,
          { width: size, height: size, opacity: 0.48 },
          rotatingStyle,
        ]}
      />
      <View
        style={[
          styles.center,
          {
            width: centerSize,
            height: centerSize,
            borderRadius: centerSize / 2,
          },
        ]}
      >
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={bluetoothImage}
          style={{ width: iconSize, height: iconSize }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  searchImage: {
    position: "absolute",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    borderWidth: 7,
    borderColor: "#FFFFFF",
  },
});

export default SearchDevicesLoading;
