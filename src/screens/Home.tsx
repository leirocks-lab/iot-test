import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, ScrollView, Text, View } from "react-native";
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
  Label,
  Page,
  confirm,
  styles,
  useAction,
} from "../ui/kit";

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
  const { runtime } = useApp(),
    c = useColors(),
    action = useAction(),
    run = action.run,
    [shadow, setShadow] = useState<ShadowSession | null>(null),
    [, rerender] = useState(0);
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
  return (
    <View style={{ width: "48%", marginBottom: 14 }}>
      <Card>
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
          style={{
            alignItems: "center",
            gap: 8,
            opacity: device.online ? 1 : 0.55,
          }}
        >
          <View
            style={{ alignSelf: "flex-start", flexDirection: "row", gap: 6 }}
          >
            <Text
              style={{ color: device.online ? "#25987C" : c.font.subtitle }}
            >
              ●
            </Text>
            {editing && <Label>{selected ? "☑" : "□"}</Label>}
          </View>
          {device.product ? (
            <DeviceGlyph
              humidity={device.product.category === "Dehumidifier"}
            />
          ) : (
            <Label muted>产品信息待确认</Label>
          )}
          <Label>{device.deviceNickname}</Label>
          <Label muted>
            {device.online === false
              ? "Offline"
              : shadow?.confirmed.Power === undefined
                ? "状态待同步"
                : shadow.confirmed.Power
                  ? "Powered on"
                  : "Powered off"}
          </Label>
        </Pressable>
        <Button
          title={
            shadow?.sending
              ? "Waiting…"
              : shadow?.confirmed.Power
                ? "Turn off"
                : "Turn on"
          }
          secondary
          disabled={
            editing ||
            !shadow?.ready ||
            shadow.sending ||
            device.bindingRole === "obs"
          }
          onPress={() =>
            void run(async () => {
              await shadow!.command({ Power: shadow!.confirmed.Power ? 0 : 1 });
            })
          }
        />
        <ErrorText error={action.error} />
      </Card>
    </View>
  );
}
export default function Home() {
  const { runtime, lockNavigation } = useApp(),
    action = useAction(),
    run = action.run,
    [groups, setGroups] = useState<HomeGroup[] | null>(null),
    [room, setRoom] = useState("all"),
    [selected, setSelected] = useState<string[]>([]),
    [menu, setMenu] = useState(false);
  useEffect(() => {
    lockNavigation(selected.length > 0);
    return () => lockNavigation(false);
  }, [selected.length, lockNavigation]);
  const [loading, setLoading] = useState(false),
    [loadError, setLoadError] = useState("");
  const refreshRef = useRef<AbortController | null>(null),
    focused = useRef(false),
    readOwner = useRef("");
  const sessionRevision = runtime?.service.sessionRevision;
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
  const devices = groups?.flatMap((g) => g.devices) ?? [],
    visible =
      room === "all"
        ? devices
        : (groups?.find((g) => g.room?.id === room)?.devices ?? []);
  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((v) => v !== id) : [...s, id],
    );
  const remove = () =>
    confirm(
      "Remove devices",
      "只解除你与所选设备的绑定，不恢复出厂或删除其他成员。",
      () =>
        void run(async () => {
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
            throw new Error("部分设备解绑未确认，请刷新核对后再试");
        }),
    );
  return (
    <Page
      title="ROWAN"
      wallpaper
      back={false}
      action={
        <Button
          title="＋"
          disabled={!!selected.length}
          onPress={() => setMenu((v) => !v)}
        />
      }
    >
      {menu && (
        <Card>
          <Button title="Scan QR code" onPress={() => router.push("/scan")} />
          <Button
            secondary
            title="Add device"
            onPress={() => router.push("/add")}
          />
        </Card>
      )}
      <View style={styles.row}>
        <Label large>Your home</Label>
        <Button
          secondary
          title="Rooms"
          disabled={!!selected.length}
          onPress={() => router.push("/rooms")}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          <Button
            title="All rooms"
            secondary={room !== "all"}
            disabled={!!selected.length}
            onPress={() => {
              setRoom("all");
              void runtime?.service.preference("homeRoom", "all");
            }}
          />
          {groups
            ?.filter((g) => g.room?.id)
            .map((g) => (
              <Button
                key={g.room?.id}
                title={g.room?.name ?? ""}
                secondary={room !== g.room?.id}
                disabled={!!selected.length}
                onPress={() => {
                  setRoom(g.room?.id!);
                  void runtime?.service.preference("homeRoom", g.room?.id!);
                }}
              />
            ))}
        </View>
      </ScrollView>
      <ErrorText error={action.error} />
      <ErrorText error={loadError} />
      {(action.busy || loading) && <Busy />}
      {groups && devices.length === 0 && (
        <>
          <Empty text="No devices yet. Add your first device." />
          <Button
            title="Add device"
            disabled={!!selected.length}
            onPress={() => setMenu(true)}
          />
        </>
      )}
      {groups && devices.length > 0 && visible.length === 0 && (
        <Empty text="No devices in this room" />
      )}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        {visible.map((d) => (
          <DeviceCard
            key={d.device.id}
            device={d}
            selected={selected.includes(d.device.id)}
            editing={!!selected.length}
            onSelect={() => toggle(d.device.id)}
          />
        ))}
      </View>
      {selected.length > 0 ? (
        <Card>
          <Label>{selected.length} selected</Label>
          <Button
            title="Remove selected"
            danger
            disabled={action.busy}
            onPress={remove}
          />
          <Button
            secondary
            title="Cancel selection"
            onPress={() => setSelected([])}
          />
        </Card>
      ) : (
        <Button
          secondary
          title="Refresh"
          disabled={action.busy || loading}
          onPress={() => void load()}
        />
      )}
    </Page>
  );
}
