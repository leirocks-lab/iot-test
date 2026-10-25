import { memo, useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { exportLogs, filterLogs, type LogEntry, type LogFilter } from "./log-store";
import { logStore } from "./runtime";

const colors = {
  all: "#A8BECE",
  log: "#C5D5DF",
  debug: "#84B8F8",
  info: "#79D9BB",
  warn: "#F4CA72",
  error: "#FF9299",
};
const levels: LogFilter[] = ["all", "log", "debug", "info", "warn", "error"];
const SIZE = 52;

function Action({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [s.action, { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 }]}
    >
      <Text style={s.actionText}>{label}</Text>
    </Pressable>
  );
}

const LogRow = memo(function LogRow({ entry }: { entry: LogEntry }) {
  return (
    <View style={[s.row, { borderLeftColor: colors[entry.level] }]}>
      <Text style={[s.meta, { color: colors[entry.level] }]}>
        {new Date(entry.timestamp).toLocaleTimeString(undefined, { hour12: false })} ·{" "}
        {entry.level.toUpperCase()}
      </Text>
      <Text selectable style={s.body}>
        {entry.text}
      </Text>
    </View>
  );
});

export default function FloatingConsole() {
  const snapshot = useSyncExternalStore(
    logStore.subscribe,
    logStore.getSnapshot,
    logStore.getSnapshot,
  );
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [position, setPosition] = useState({ x: width - SIZE - 12, y: height * 0.65 });
  const [level, setLevel] = useState<LogFilter>("all");
  const [query, setQuery] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [copying, setCopying] = useState(false);
  const dragStart = useRef(position);
  const positionRef = useRef(position);
  const moved = useRef(false);
  const clamp = useCallback(
    (point: { x: number; y: number }) => ({
      x: Math.max(insets.left + 8, Math.min(point.x, width - insets.right - SIZE - 8)),
      y: Math.max(insets.top + 8, Math.min(point.y, height - insets.bottom - SIZE - 8)),
    }),
    [width, height, insets.left, insets.right, insets.top, insets.bottom],
  );
  const currentPosition = clamp(position);
  const responder = useMemo(
    () =>
      // PanResponder stores these event callbacks; it does not read refs during creation.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragStart.current = clamp(positionRef.current);
          moved.current = false;
        },
        onPanResponderMove: (_, gesture) => {
          if (Math.abs(gesture.dx) + Math.abs(gesture.dy) > 6) moved.current = true;
          if (moved.current) {
            const next = clamp({
              x: dragStart.current.x + gesture.dx,
              y: dragStart.current.y + gesture.dy,
            });
            positionRef.current = next;
            setPosition(next);
          }
        },
        onPanResponderRelease: () => {
          if (!moved.current) logStore.open();
        },
        onPanResponderTerminationRequest: () => true,
      }),
    [clamp],
  );
  // Newest first avoids forced auto-scrolling while someone is inspecting older entries.
  const entries = useMemo(
    () => filterLogs(snapshot.entries, level, query).reverse(),
    [snapshot.entries, level, query],
  );

  const copy = async () => {
    setCopying(true);
    try {
      // Lazy import lets an older dev client still open the panel before it is rebuilt.
      const clipboard = await import("expo-clipboard");
      const success = await clipboard.setStringAsync(exportLogs([...entries].reverse()));
      setCopyStatus(success ? `已复制 ${entries.length} 条` : "复制失败，可长按正文复制");
    } catch {
      setCopyStatus("剪贴板不可用；可长按正文复制，或重新构建开发版");
    } finally {
      setCopying(false);
    }
  };

  if (!snapshot.visible) return null;
  return (
    <>
      {!snapshot.open && (
        <View pointerEvents="box-none" style={s.overlay}>
          <View
            {...responder.panHandlers}
            accessible
            accessibilityRole="button"
            accessibilityLabel="打开日志控制台，可拖动"
            accessibilityActions={[
              { name: "activate", label: "打开日志控制台" },
              { name: "hide", label: "隐藏日志入口" },
            ]}
            onAccessibilityAction={(event) =>
              event.nativeEvent.actionName === "hide" ? logStore.hide() : logStore.open()
            }
            style={[s.fab, { left: currentPosition.x, top: currentPosition.y }]}
          >
            <Text style={s.fabLabel}>LOG</Text>
            <Text style={s.fabCount}>{snapshot.entries.length}</Text>
          </View>
        </View>
      )}
      <Modal
        visible={snapshot.open}
        animationType="slide"
        onRequestClose={logStore.close}
        presentationStyle="fullScreen"
        supportedOrientations={["portrait", "landscape"]}
      >
        <KeyboardAvoidingView
          style={s.screen}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[
              s.panel,
              {
                paddingTop: insets.top + 8,
                paddingBottom: insets.bottom,
                paddingLeft: insets.left,
                paddingRight: insets.right,
              },
            ]}
          >
            <View style={s.header}>
              <View style={s.titleBlock}>
                <Text style={s.eyebrow}>ROWAN / DEV</Text>
                <Text style={s.title}>日志控制台</Text>
              </View>
              <Action label="收起" onPress={logStore.close} />
              <Action label="隐藏入口" onPress={logStore.hide} />
            </View>
            <Text style={s.description}>最近 500 条 · 仅内存 · 最新在前</Text>
            <TextInput
              accessibilityLabel="搜索日志"
              placeholder="搜索 HTTP、MQTT、蓝牙或关键词"
              placeholderTextColor="#7E95A8"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              style={s.search}
            />
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filters}
                keyboardShouldPersistTaps="handled"
              >
                {levels.map((item) => (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: level === item }}
                    onPress={() => setLevel(item)}
                    style={[s.chip, level === item && s.selectedChip]}
                  >
                    <Text style={{ color: colors[item], fontSize: 12, fontWeight: "700" }}>
                      {item === "all" ? "全部" : item.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={s.toolbar}>
              <Text style={s.count}>
                {entries.length} / {snapshot.entries.length} 条
              </Text>
              <Action
                label={copying ? "复制中…" : "复制筛选结果"}
                onPress={() => {
                  void copy();
                }}
                disabled={!entries.length || copying}
              />
              <Action
                label="清空"
                onPress={() => {
                  logStore.clear();
                  setCopyStatus("");
                }}
                disabled={!snapshot.entries.length}
              />
            </View>
            {!!copyStatus && (
              <Text accessibilityLiveRegion="polite" style={s.feedback}>
                {copyStatus}
              </Text>
            )}
            <FlatList
              data={entries}
              keyExtractor={(entry) => String(entry.id)}
              renderItem={({ item }) => <LogRow entry={item} />}
              style={s.list}
              contentContainerStyle={s.listContent}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={5}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListEmptyComponent={
                <View style={s.empty}>
                  <Text style={s.emptyTitle}>
                    {snapshot.entries.length ? "没有匹配的日志" : "等待日志输出"}
                  </Text>
                  <Text style={s.description}>操作 App 后回来查看，或调整筛选条件</Text>
                </View>
              }
            />
            <Text style={s.footer}>隐藏后可从开发菜单「显示日志控制台」恢复</Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10000,
    elevation: 10000,
  },
  fab: {
    position: "absolute",
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: "#122735",
    borderWidth: 1,
    borderColor: "#6CCCB0",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },
  fabLabel: { color: "#8DE2C7", fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  fabCount: { color: "#B4CBD7", fontSize: 10 },
  screen: { flex: 1, backgroundColor: "#0B141D" },
  panel: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 4 },
  titleBlock: { flex: 1 },
  eyebrow: { color: "#79D9BB", fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  title: { color: "#ECF4F8", fontSize: 22, fontWeight: "700", marginTop: 4 },
  description: { color: "#8BA3B4", fontSize: 12, marginHorizontal: 16, marginVertical: 10 },
  action: { minHeight: 44, justifyContent: "center", paddingHorizontal: 10 },
  actionText: { color: "#B8DCD2", fontSize: 12, fontWeight: "600" },
  search: {
    color: "#E4EFF5",
    backgroundColor: "#152431",
    borderWidth: 1,
    borderColor: "#2A4050",
    borderRadius: 10,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    minHeight: 44,
    fontSize: 14,
  },
  filters: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 13,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#233745",
  },
  selectedChip: { backgroundColor: "#223C46", borderColor: "#79D9BB" },
  toolbar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
  count: { flex: 1, color: "#8BA3B4", fontSize: 12 },
  feedback: { color: "#F4CA72", fontSize: 12, paddingHorizontal: 16, paddingBottom: 8 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  row: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#121F2B",
    borderRadius: 6,
    borderLeftWidth: 2,
  },
  meta: { fontSize: 11, marginBottom: 7, fontWeight: "600" },
  body: {
    color: "#D4E1E9",
    fontSize: 12,
    lineHeight: 19,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },
  empty: { paddingVertical: 56, alignItems: "center" },
  emptyTitle: { color: "#C8D9E5", fontSize: 16, fontWeight: "600" },
  footer: { color: "#8BA3B4", textAlign: "center", fontSize: 11, padding: 12 },
});
