/* eslint-disable react-hooks/refs */
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Modal, PanResponder, Pressable, Text, TextInput, View } from "react-native";
import DraggableFlatList, { type RenderItemParams } from "react-native-draggable-flatlist";
import { ApiError, type DeviceView, type HomeGroup, type Room } from "../services/models";
import { useApp, useColors } from "../ui/context";
import { DeviceGlyph } from "../ui/device-glyph";
import { Busy, ErrorText, Page, useAction, useToast } from "../ui/kit";

type RoomEntry = Room & { devices: DeviceView[]; expanded: boolean };
type Row =
  | { kind: "room"; id: string; room: RoomEntry }
  | { kind: "device"; id: string; roomId: string; device: DeviceView };

const flatten = (rooms: RoomEntry[]): Row[] =>
  rooms.flatMap((room) => [
    { kind: "room" as const, id: `room:${room.id}`, room },
    ...room.devices.map((device) => ({
      kind: "device" as const,
      id: `device:${device.device.id}`,
      roomId: room.id,
      device,
    })),
  ]);

const regroup = (rows: Row[]): RoomEntry[] => {
  const result: RoomEntry[] = [];
  let current: RoomEntry | undefined;
  for (const row of rows) {
    if (row.kind === "room") {
      current = { ...row.room, devices: [], expanded: true };
      result.push(current);
    } else if (current) current.devices.push(row.device);
  }
  return result;
};

function reorderRows(rows: Row[], from: number, to: number): Row[] {
  const source = rows[from];
  if (!source || from === to) return rows;
  if (source.kind === "room") {
    const block: Row[] = [source];
    let cursor = from + 1;
    while (cursor < rows.length && rows[cursor].kind === "device") block.push(rows[cursor++]);
    const remaining = rows.filter((_, index) => index < from || index >= cursor);
    const target = rows[to];
    if (!target || target.id === source.id) return rows;
    const roomId = target.kind === "room" ? target.room.id : target.roomId;
    const insertAt = remaining.findIndex((row) => row.kind === "room" && row.room.id === roomId);
    remaining.splice(insertAt < 0 ? remaining.length : insertAt, 0, ...block);
    return remaining;
  }
  const remaining = rows.filter((_, index) => index !== from);
  const target = rows[to];
  if (!target) return rows;
  if (target.kind === "room") {
    const index = remaining.findIndex(
      (row) => row.kind === "room" && row.room.id === target.room.id,
    );
    remaining.splice(index + 1, 0, source);
  } else {
    const index = remaining.findIndex((row) => row.id === target.id);
    remaining.splice(index < 0 ? remaining.length : index, 0, source);
  }
  return remaining;
}

function ExpandArrow({ expanded }: { expanded: boolean }) {
  const rotation = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(rotation, {
      toValue: expanded ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotation]);
  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Image
        source={require("../../assets/images/open-icon.png")}
        contentFit="contain"
        style={styles.openIcon}
      />
    </Animated.View>
  );
}

function SwipeToDelete({
  children,
  enabled,
  onDelete,
}: {
  children: ReactNode;
  enabled: boolean;
  onDelete: () => void;
}) {
  const offset = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        enabledRef.current &&
        Math.abs(gesture.dx) > 8 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        lastOffset.current = gesture.dx;
        offset.setValue(Math.max(-78, Math.min(0, gesture.dx)));
      },
      onPanResponderRelease: () =>
        Animated.spring(offset, {
          toValue: lastOffset.current < -34 ? -78 : 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start(),
    }),
  ).current;
  return (
    <View style={styles.swipeRoot}>
      <View style={styles.deleteBackground}>
        <Pressable onPress={onDelete} style={styles.deleteButton}>
          <Text style={styles.white}>删除</Text>
        </Pressable>
      </View>
      <Animated.View
        {...(enabled ? responder.panHandlers : {})}
        style={{ transform: [{ translateX: offset }] }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

function RoomHeader({
  room,
  colors,
  editing,
  onToggle,
  onRename,
  onDrag,
  onDelete,
}: {
  room: RoomEntry;
  colors: ReturnType<typeof useColors>;
  editing: boolean;
  onToggle: () => void;
  onRename: () => void;
  onDrag: () => void;
  onDelete: () => void;
}) {
  const count = room.devices.length || room.deviceCount || 0;
  const content = (
    <View style={[styles.roomRow, { backgroundColor: colors.background.invert }]}>
      {editing && (
        <Pressable onPress={onDelete} style={styles.deleteIconButton}>
          <Image source={require("../../assets/images/del-icon.png")} style={styles.deleteIcon} />
        </Pressable>
      )}
      <Pressable onPress={onToggle} style={styles.roomMain}>
        <View style={styles.roomText}>
          <Text style={{ color: colors.font.title, fontSize: 16 }}>{room.name}</Text>
          <Text style={{ color: colors.font.subtitle2, fontSize: 12 }}>{count} 个设备</Text>
        </View>
      </Pressable>
      <Pressable onPress={onRename} style={styles.iconButton}>
        <Image source={require("../../assets/images/edit-icon.png")} style={styles.editIcon} />
      </Pressable>
      {!editing && (
        <Pressable onPress={onToggle} style={styles.openButton}>
          <ExpandArrow expanded={room.expanded} />
        </Pressable>
      )}
      {editing && (
        <Pressable onLongPress={onDrag} style={styles.iconButton}>
          <Text style={styles.dragIcon}>☷</Text>
        </Pressable>
      )}
    </View>
  );
  return editing ? (
    <SwipeToDelete enabled onDelete={onDelete}>
      {content}
    </SwipeToDelete>
  ) : (
    content
  );
}

export default function Rooms() {
  const { runtime } = useApp();
  const colors = useColors();
  const action = useAction();
  const { toast, showToast } = useToast();
  const [rooms, setRooms] = useState<RoomEntry[]>([]);
  const roomsRef = useRef<RoomEntry[]>([]);
  const baseline = useRef<Room[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [renameRoom, setRenameRoom] = useState<RoomEntry | null>(null);
  const [draftName, setDraftName] = useState("");
  const originalLocations = useRef(new Map<string, string>());
  const updateRooms = useCallback((next: RoomEntry[]) => {
    roomsRef.current = next;
    setRooms(next);
  }, []);
  const load = useCallback(async () => {
    if (!runtime) return;
    setLoading(true);
    try {
      const [roomResult, groups] = await Promise.all([
        runtime.service.rooms(),
        runtime.service.home(),
      ]);
      const byRoom = new Map<string, DeviceView[]>();
      for (const group of groups as HomeGroup[])
        if (group.room?.id) byRoom.set(group.room.id, group.devices);
      const next = roomResult.rooms.map((room) => ({
        ...room,
        devices: byRoom.get(room.id) ?? [],
        expanded: roomsRef.current.find((item) => item.id === room.id)?.expanded ?? true,
      }));
      baseline.current = roomResult.rooms.map((room) => ({ ...room }));
      originalLocations.current = new Map(
        next.flatMap((room) => room.devices.map((device) => [device.device.id, room.id] as const)),
      );
      updateRooms(next);
    } finally {
      setLoading(false);
    }
  }, [runtime, updateRooms]);
  useFocusEffect(useCallback(() => void load(), [load]));
  const saveRooms = async (next: Room[]) => {
    try {
      await runtime!.service.saveRooms(next, baseline.current);
    } catch (error) {
      let reloaded = false;
      try {
        await load();
        reloaded = true;
      } catch {
        /* Preserve the original write error. */
      }
      if ((error as { code?: number }).code === 409)
        throw new ApiError(
          409,
          reloaded
            ? "房间已发生变化，请基于最新列表重新编辑"
            : "无法确认房间状态，请重新加载后再编辑",
        );
      throw error;
    }
  };
  const remove = (room: RoomEntry) => {
    if (
      room.isDefault ||
      room.deviceCount === undefined ||
      room.devices.length ||
      room.deviceCount > 0
    ) {
      showToast("当前房间还有设备无法删除");
      return;
    }
    void action.run(async () => {
      const next = roomsRef.current.filter((item) => item.id !== room.id);
      await saveRooms(next);
      await load();
    });
  };
  const finishEditing = () =>
    void action.run(async () => {
      if (!runtime) return;
      const current = roomsRef.current;
      await saveRooms(current);
      for (const room of current)
        for (const device of room.devices)
          if (originalLocations.current.get(device.device.id) !== room.id)
            await runtime.service.moveDevice(device.device.id, room.id);
      setEditing(false);
      await load();
    });
  const toggle = (id: string) =>
    updateRooms(
      roomsRef.current.map((room) =>
        room.id === id ? { ...room, expanded: !room.expanded } : room,
      ),
    );
  const openRename = (room: RoomEntry) => {
    setRenameRoom(room);
    setDraftName(room.name);
  };
  const renderRow = ({ item, drag, isActive }: RenderItemParams<Row>) =>
    item.kind === "room" ? (
      <RoomHeader
        room={item.room}
        colors={colors}
        editing
        onToggle={() => undefined}
        onRename={() => openRename(item.room)}
        onDrag={drag}
        onDelete={() => remove(item.room)}
      />
    ) : (
      <View
        style={[
          styles.deviceRow,
          { backgroundColor: colors.background.invert },
          isActive && styles.active,
        ]}
      >
        <DeviceGlyph size={28} />
        <Text style={{ flex: 1, color: colors.font.title }}>
          {item.device.deviceNickname || item.device.product?.name || "设备"}
        </Text>
        <Pressable onLongPress={drag} style={styles.iconButton}>
          <Text style={styles.dragIcon}>☷</Text>
        </Pressable>
      </View>
    );
  const data = flatten(rooms);
  return (
    <Page
      title="房间管理"
      action={
        <Pressable
          disabled={action.busy}
          onPress={editing ? finishEditing : () => setEditing(true)}
        >
          <Text style={{ color: colors.font.primary, fontSize: 16 }}>
            {editing ? "完成" : "编辑"}
          </Text>
        </Pressable>
      }
      footer={
        !editing && (
          <Pressable onPress={() => router.push("/add-room")} style={styles.addButton}>
            <Text style={styles.white}>添加房间</Text>
          </Pressable>
        )
      }
    >
      {(loading || action.busy) && <Busy />}
      <ErrorText error={action.error} />
      {!!toast && (
        <View pointerEvents="none" style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
      {!editing ? (
        <View style={styles.cardList}>
          {rooms.map((room) => (
            <View
              key={room.id}
              style={[styles.card, { backgroundColor: colors.background.invert }]}
            >
              <RoomHeader
                room={room}
                colors={colors}
                editing={false}
                onToggle={() => toggle(room.id)}
                onRename={() => openRename(room)}
                onDrag={() => undefined}
                onDelete={() => remove(room)}
              />
              {room.expanded &&
                room.devices.map((device) => (
                  <View key={device.device.id} style={styles.cardDevice}>
                    <DeviceGlyph size={28} />
                    <Text style={{ flex: 1, color: colors.font.title }}>
                      {device.deviceNickname || device.product?.name || "设备"}
                    </Text>
                  </View>
                ))}
            </View>
          ))}
        </View>
      ) : (
        <DraggableFlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          scrollEnabled={false}
          activationDistance={8}
          onDragEnd={({ from, to }) => updateRooms(regroup(reorderRows(data, from, to)))}
        />
      )}
      <Modal
        visible={!!renameRoom}
        transparent
        animationType="slide"
        onRequestClose={() => setRenameRoom(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setRenameRoom(null)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>房间名称</Text>
            <TextInput
              value={draftName}
              maxLength={20}
              onChangeText={setDraftName}
              style={styles.input}
              placeholder="请输入房间名称"
            />
            <View style={styles.actions}>
              <Pressable onPress={() => setRenameRoom(null)} style={styles.cancel}>
                <Text>取消</Text>
              </Pressable>
              <Pressable
                disabled={!draftName.trim() || action.busy}
                onPress={() =>
                  void action.run(async () => {
                    await runtime?.service.renameRoom(renameRoom!.id, draftName.trim());
                    setRenameRoom(null);
                    await load();
                  })
                }
                style={[styles.confirm, !draftName.trim() && { opacity: 0.5 }]}
              >
                <Text style={styles.white}>确认</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Page>
  );
}

const styles = {
  cardList: { gap: 14 },
  card: { borderRadius: 14, overflow: "hidden" as const },
  roomRow: {
    minHeight: 62,
    padding: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  roomMain: { flex: 1, justifyContent: "center" as const },
  roomText: { gap: 3 },
  openButton: {
    width: 38,
    height: 42,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  openIcon: { width: 20, height: 12 },
  editIcon: { width: 20, height: 20 },
  iconButton: { padding: 7, minWidth: 36, alignItems: "center" as const },
  dragIcon: { color: "#888", fontSize: 20 },
  cardDevice: {
    minHeight: 56,
    padding: 10,
    paddingLeft: 20,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f1f1",
  },
  deviceRow: {
    minHeight: 58,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  deleteIconButton: { width: 32, alignItems: "flex-start" as const },
  deleteIcon: { width: 20, height: 20 },
  active: {
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  swipeRoot: { position: "relative" as const },
  deleteBackground: {
    position: "absolute" as const,
    right: 0,
    top: 0,
    bottom: 0,
    width: 78,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#F0534A",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 14,
  },
  white: { color: "#fff" },
  addButton: {
    margin: 16,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#000",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  toast: {
    position: "absolute" as const,
    top: "48%" as const,
    alignSelf: "center" as const,
    minWidth: 124,
    maxWidth: "85%" as const,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 24,
    backgroundColor: "rgba(30,30,30,0.9)",
    alignItems: "center" as const,
    zIndex: 20,
  },
  toastText: { color: "#fff", fontSize: 14 },
  modalRoot: { flex: 1, justifyContent: "flex-end" as const },
  modalBackdrop: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: "#fff",
    padding: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetTitle: {
    textAlign: "center" as const,
    fontSize: 18,
    fontWeight: "700" as const,
    marginBottom: 18,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  actions: { flexDirection: "row" as const, gap: 16, marginTop: 20 },
  cancel: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#eee",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  confirm: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#000",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
};
