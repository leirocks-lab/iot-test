import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type ViewStyle,
} from "react-native";
import { useColors } from "../ui/context";

const LOADING_FRAMES: ImageSourcePropType[] = [
  require("../../assets/images/loading/loading_00000.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00001.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00002.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00003.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00004.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00005.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00006.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00007.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00008.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00009.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00010.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00011.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00012.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00013.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00014.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00015.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00016.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00017.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00018.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00019.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00020.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00021.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00022.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00023.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00024.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00025.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00026.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00027.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00028.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00029.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00030.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00031.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00032.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00033.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00034.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00035.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00036.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00037.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00038.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00039.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00040.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00041.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00042.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00043.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00044.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00045.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00046.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00047.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00048.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00049.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00050.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00051.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00052.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00053.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00054.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00055.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00056.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00057.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00058.png") as ImageSourcePropType,
  require("../../assets/images/loading/loading_00059.png") as ImageSourcePropType,
];

export type LoadingProps = {
  visible?: boolean;
  interval?: number;
  size?: number;
  style?: ViewStyle;
};

/** Displays the loading key-frame animation bundled with the app. */
export function Loading({
  visible = true,
  interval = 30,
  size = 48,
  style,
}: LoadingProps) {
  const [frame, setFrame] = useState(0);
  const [ready, setReady] = useState(false);
  const loadedFrames = useRef(new Set<number>());
  const color = useColors();

  const styles = StyleSheet.create({
    preload: {
      position: "absolute",
      width: 1,
      height: 1,
      opacity: 0,
    },
    preloadImage: {
      width: 1,
      height: 1,
    },
    container: {
      borderRadius: 12,
      padding: 5,
      boxShadow: "0px 0px 6px 2px rgba(0,0,0,0.05)",
      position: "fixed",
      left: "50%",
      top: "50%",
      transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
      zIndex: 9999,
      backgroundColor: color.background.invert,
      alignItems: "center",
      justifyContent: "center",
    },
  });

  const markFrameLoaded = (index: number) => {
    loadedFrames.current.add(index);
    if (loadedFrames.current.size === LOADING_FRAMES.length) setReady(true);
  };

  useEffect(() => {
    if (!visible || !ready || LOADING_FRAMES.length < 2) return;
    const timer = setInterval(
      () => setFrame((current) => (current + 1) % LOADING_FRAMES.length),
      interval,
    );
    return () => clearInterval(timer);
  }, [interval, ready, visible]);

  const preload = (
    <View pointerEvents="none" style={styles.preload}>
      {LOADING_FRAMES.map((source, index) => (
        <Image
          key={index}
          source={source}
          onLoadEnd={() => markFrameLoaded(index)}
          style={styles.preloadImage}
        />
      ))}
    </View>
  );

  if (!visible || !ready) return preload;
  return (
    <>
      {preload}
      <View
        accessibilityLabel="Loading"
        accessible
        style={[styles.container, style]}
      >
        <Image
          accessibilityIgnoresInvertColors
          source={LOADING_FRAMES[frame]}
          style={{ width: size, height: size }}
        />
      </View>
    </>
  );
}

type LoadingControls = {
  visible: boolean;
  loading: boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
};

const LoadingContext = createContext<LoadingControls | null>(null);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  const toggle = useCallback(() => setVisible((current) => !current), []);
  const controls = { visible, loading: visible, show, hide, toggle };

  return (
    <LoadingContext.Provider value={controls}>
      {children}
      <Loading visible={visible} />
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const controls = useContext(LoadingContext);
  if (!controls) {
    throw new Error("useLoading must be used inside LoadingProvider");
  }
  return controls;
}
