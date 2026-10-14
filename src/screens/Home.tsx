import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ShadowSession, withBudget } from "../protocol/device";
import type { DeviceView, HomeGroup } from "../services/models";
import { useApp, useColors } from "../ui/context";
import { DeviceGlyph } from "../ui/device-glyph";
import {
  Busy,
  Button,
  Card,
  Empty,
  ErrorText,
  Page,
  confirm,
  useAction,
} from "../ui/kit";

const homeLogo = require("../../assets/images/home-logo.png");
const powerOn = require("../../assets/images/poweron-icon.png");
const powerOff = require("../../assets/images/poweroff-icon.png");
const choice = require("../../assets/images/multiple-choice.png");
const choiceSelected = require("../../assets/images/multiple-choice-selected.png");

function DeviceCard({
  device,
  selected,
  editing,
  onSelect,
}: {
  device: DeviceView;
  selected: boolean;
  editing: boolean;
  onSelect: () => void;
}) {
  const { runtime } = useApp();
  const colors = useColors();
  const action = useAction();
  const [shadow, setShadow] = useState<ShadowSession | null>(null);
  const [, rerender] = useState(0);
  useEffect(() => {
    if (!runtime?.service.session) return;
    let active = true;
    const session = new ShadowSession(
      runtime.devices,
      device.device.id,
      runtime.service.userID,
    );
    const unsub = session.onChange(() => {
      if (active) rerender((n) => n + 1);
    });
    runtime.service
      .mqtt(device.device.id)
      .then(() => session.connect())
      .then(() => {
        if (active) setShadow(session);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      unsub();
      session.close();
    };
  }, [runtime, device.device.id]);
  const powered =
    shadow?.confirmed.Power === 1 || shadow?.confirmed.Power === true;
  const canControl =
    !!shadow?.ready &&
    !shadow.sending &&
    device.online !== false &&
    device.bindingRole !== "obs";
  return (
    <View style={styles.cardWrap}>
      <View
        style={[
          styles.deviceCard,
          { backgroundColor: colors.background.invert },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={device.deviceNickname}
          onLongPress={onSelect}
          onPress={() =>
            editing
              ? onSelect()
              : router.push({
                  pathname: "/device/[id]",
                  params: { id: device.device.id },
                })
          }
          style={styles.cardPress}
        >
          <View style={styles.cardTop}>
            <View
              style={[
                styles.onlineDot,
                { backgroundColor: device.online ? "#1CC787" : "#B9BDBE" },
              ]}
            />
            {editing && (
              <Image
                source={selected ? choiceSelected : choice}
                style={styles.choice}
                contentFit="contain"
              />
            )}
          </View>
          {device.product?.image ? (
            <Image
              source={{ uri: device.product.image }}
              contentFit="contain"
              style={styles.productImage}
            />
          ) : (
            <DeviceGlyph
              humidity={device.product?.category === "Dehumidifier"}
              size={78}
            />
          )}
          <Text
            numberOfLines={1}
            style={[styles.productName, { color: colors.font.title }]}
          >
            {device.product?.name || device.deviceNickname || "Air Conditioner"}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.productModel, { color: colors.font.subtitle2 }]}
          >
            {device.product?.modelName || "RW-400PRO"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={powered ? "Turn off" : "Turn on"}
          disabled={editing || !canControl}
          onPress={() =>
            void action.run(async () => {
              await shadow!.command({ Power: powered ? 0 : 1 });
            })
          }
          style={[
            styles.powerButton,
            { opacity: !canControl || editing ? 0.45 : 1 },
          ]}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              backgroundColor: powered
                ? colors.brand.blue
                : colors.background.control,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              source={powered ? powerOn : powerOff}
              style={styles.powerIcon}
              contentFit="contain"
            />
          </View>
        </Pressable>
        {!!action.error && <Text style={styles.error}>{action.error}</Text>}
      </View>
    </View>
  );
}

export default function Home() {
  const { runtime, lockNavigation } = useApp();
  const action = useAction();
  const [groups, setGroups] = useState<HomeGroup[] | null>(null);
  const [room, setRoom] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const colors = useColors();
  const refreshRef = useRef<AbortController | null>(null),
    focused = useRef(false),
    readOwner = useRef("");
  const sessionRevision = runtime?.service.sessionRevision;
  useEffect(() => {
    lockNavigation(editing);
    return () => lockNavigation(false);
  }, [editing, lockNavigation]);
  const load = useCallback(async () => {
    if (
      !runtime?.service.session ||
      sessionRevision === undefined ||
      !focused.current
    )
      return;
    const userID = runtime.service.userID,
      context = `${userID}:${sessionRevision}`;
    if (readOwner.current !== context) {
      readOwner.current = context;
      setGroups(null);
      setSelected([]);
      setEditing(false);
      setRoom("all");
    }
    refreshRef.current?.abort();
    const controller = new AbortController();
    refreshRef.current = controller;
    const current = () =>
      focused.current &&
      !controller.signal.aborted &&
      refreshRef.current === controller &&
      runtime.service.session?.userID === userID &&
      runtime.service.sessionRevision === sessionRevision;
    setLoading(true);
    setLoadError("");
    try {
      const data = await withBudget(
        (signal) => runtime.service.home(signal),
        10000,
        "首页刷新超时，请重试",
        controller.signal,
      );
      const saved = await withBudget(
        () => runtime.service.preference("homeRoom"),
        10000,
        "首页房间选择读取超时",
        controller.signal,
      );
      if (!current()) return;
      setGroups(data);
      setRoom(
        saved && data.some((group) => group.room?.id === saved) ? saved : "all",
      );
    } catch (error) {
      if (current())
        setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      if (current()) {
        setLoading(false);
        refreshRef.current = null;
      }
    }
  }, [runtime, sessionRevision]);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      void load();
      const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") void load();
      });
      return () => {
        focused.current = false;
        refreshRef.current?.abort();
        refreshRef.current = null;
        sub.remove();
      };
    }, [load]),
  );
  const devices = groups?.flatMap((group) => group.devices) ?? [],
    visible =
      room === "all"
        ? devices
        : (groups?.find((group) => group.room?.id === room)?.devices ?? []);
  const toggle = (id: string) => {
    setEditing(true);
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };
  const exitEditing = () => {
    setSelected([]);
    setEditing(false);
  };
  const remove = () => {
    if (!selected.length) return;
    confirm(
      "删除设备",
      "仅解除你与所选设备的绑定，不删除设备或其他成员。",
      () =>
        void action.run(async () => {
          const failures: string[] = [];
          for (const id of selected) {
            try {
              await runtime!.service.unbind(id);
            } catch {
              failures.push(id);
            }
          }
          setSelected(failures);
          await load();
          if (failures.length)
            throw new Error("部分设备解绑未确认，请刷新核对后重试");
        }),
    );
  };
  const header = (
    <View style={styles.header}>
      {editing ? (
        <>
          <Pressable onPress={exitEditing} style={styles.headerAction}>
            <Text style={styles.cancel}>取消</Text>
          </Pressable>
          <Text style={styles.selectionTitle}>
            已选中 {selected.length} 个设备
          </Text>
          <Pressable onPress={exitEditing} style={styles.headerAction}>
            <Text style={styles.done}>完成</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Image source={homeLogo} style={styles.logo} contentFit="contain" />
          <Pressable
            onPress={() => setMenu((value) => !value)}
            style={styles.menuButton}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </Pressable>
        </>
      )}
    </View>
  );
  const footer = editing ? (
    <View style={styles.selectionFooter}>
      <Pressable
        disabled={!selected.length || action.busy}
        onPress={remove}
        style={{ opacity: selected.length ? 1 : 0.35 }}
      >
        <Text style={styles.trash}>▣</Text>
        <Text style={styles.deleteText}>删除设备</Text>
      </Pressable>
    </View>
  ) : undefined;
  return (
    <Page
      title="ROWAN"
      wallpaper
      back={false}
      header={header}
      footer={footer}
      loadingContent={
        (action.busy || loading) && !editing ? (
          <View style={styles.loadingRegion}>
            <Busy />
          </View>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={loading && !editing}
          onRefresh={() => {
            if (!editing) void load();
          }}
          tintColor={colors.font.subtitle2}
          colors={[colors.font.subtitle2]}
        />
      }
    >
      {menu && !editing && (
        <Card>
          <Button
            title="添加设备"
            onPress={() => {
              setMenu(false);
              router.push("/add");
            }}
          />
          <Button
            secondary
            title="扫一扫"
            onPress={() => {
              setMenu(false);
              router.push("/scan");
            }}
          />
        </Card>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rooms}
      >
        <Pressable
          disabled={editing}
          onPress={() => {
            setRoom("all");
            void runtime?.service.preference("homeRoom", "all");
          }}
          style={styles.roomTab}
        >
          <Text
            style={[styles.roomText, room === "all" && styles.roomTextActive]}
          >
            全屋
          </Text>
          {room === "all" && <View style={styles.tabLine} />}
        </Pressable>
        {groups
          ?.filter((group) => group.room?.id)
          .map((group) => {
            const id = group.room!.id!;
            return (
              <Pressable
                key={id}
                disabled={editing}
                onPress={() => {
                  setRoom(id);
                  void runtime?.service.preference("homeRoom", id);
                }}
                style={styles.roomTab}
              >
                <Text
                  style={[
                    styles.roomText,
                    room === id && styles.roomTextActive,
                  ]}
                >
                  {group.room!.name}
                </Text>
                {room === id && <View style={styles.tabLine} />}
              </Pressable>
            );
          })}
      </ScrollView>
      <ErrorText error={loadError} />
      {groups && devices.length === 0 && (
        <>
          <Empty text="No devices yet. Add your first device." />
          <Button
            title="添加设备"
            disabled={editing}
            onPress={() => router.push("/add")}
          />
        </>
      )}
      {groups && devices.length > 0 && visible.length === 0 && (
        <Empty text="No devices in this room" />
      )}
      <View style={styles.grid}>
        {visible.map((device) => (
          <DeviceCard
            key={device.device.id}
            device={device}
            selected={selected.includes(device.device.id)}
            editing={editing}
            onSelect={() => toggle(device.device.id)}
          />
        ))}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 62,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { width: 180, height: 38 },
  menuButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIcon: { color: "#999", fontSize: 24 },
  headerAction: { minWidth: 56, paddingVertical: 12 },
  cancel: { color: "#777", fontSize: 16 },
  done: { color: "#1677FF", fontSize: 16, textAlign: "right" },
  selectionTitle: { color: "#111", fontSize: 17, fontWeight: "700" },
  rooms: { gap: 22, alignItems: "flex-start" },
  roomTab: { paddingBottom: 8, alignItems: "center", minWidth: 32 },
  roomText: { color: "#777", fontSize: 15 },
  roomTextActive: { color: "#111", fontWeight: "700" },
  tabLine: {
    height: 3,
    width: 12,
    borderRadius: 2,
    backgroundColor: "#222",
    marginTop: 5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  cardWrap: { width: "48.5%" },
  deviceCard: {
    borderRadius: 12,
    padding: 10,
    minHeight: 202,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardPress: { width: "100%", alignItems: "center" },
  cardTop: {
    width: "100%",
    height: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  choice: { width: 26, height: 26 },
  productImage: { width: 76, height: 76, marginTop: 3, marginBottom: 4 },
  productName: { fontSize: 15, fontWeight: "600", maxWidth: "100%" },
  productModel: { fontSize: 13, marginTop: 2 },
  powerButton: {
    width: 38,
    height: 38,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  powerIcon: { width: 20, height: 20 },
  error: { color: "#F0534A", fontSize: 11, marginTop: 3 },
  loadingRegion: { height: 56, alignItems: "center", justifyContent: "center" },
  selectionFooter: {
    height: 76,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
  },
  trash: { color: "#F0534A", fontSize: 18, textAlign: "center" },
  deleteText: { color: "#F0534A", fontSize: 13, marginTop: 3 },
});
