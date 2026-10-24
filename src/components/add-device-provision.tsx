import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Linking,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import type { Product, Room } from "../services/models";
import type { WifiObservation } from "../services/network-policy";
import type { AddState } from "../services/onboarding";
import { Input } from "../ui/kit/Input";

type Props = {
  state: AddState;
  product?: Product;
  wifi?: WifiObservation;
  wifiBusy: boolean;
  ssid: string;
  password: string;
  nickname: string;
  busy: boolean;
  error?: string;
  wifiError?: string;
  onSsidChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onNicknameChange: (v: string) => void;
  onRefreshWifi: () => void;
  onProvision: () => void;
  onFinish: (v: string | null) => Promise<unknown> | void;
  onRetryProvision: () => void;
  onBack: () => void;
  onDone: () => void;
  service: {
    rooms: () => Promise<Room[]>;
    moveDevice: (id: string, roomID: string | null) => Promise<unknown>;
  };
};
const C = {
  bg: "#f5f5f5",
  text: "#171717",
  muted: "#a5a5a5",
  blue: "#2588c7",
  orange: "rgba(238, 157, 49, 1)",
};
const CONNECT_ICON = require("../../assets/images/connect-icon.png");
const CONNECT_ERROR = require("../../assets/images/connect-error.png");
const WIFI_ICON = require("../../assets/images/wifi.png");
const PASSWORD_ICON = require("../../assets/images/password-icon.png");
const ARC_LENGTH = Math.PI * 113;

function openWifiSettings() {
  void (async () => {
    try {
      if (Platform.OS === "android")
        await Linking.sendIntent("android.settings.WIFI_SETTINGS");
      else await Linking.openSettings();
    } catch {
      await Linking.openSettings();
    }
  })();
}
function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={s.header}>
      <Pressable onPress={onBack} style={s.back}>
        <Text style={s.backText}>{"‹"}</Text>
      </Pressable>
      <Text style={s.headerTitle}>{"添加设备"}</Text>
      <View style={s.back} />
    </View>
  );
}
function ActionButton({
  title,
  onPress,
  disabled = false,
  secondary = false,
  full = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  full?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        s.actionButton,
        full ? s.fullButton : s.splitButton,
        secondary && s.secondaryButton,
        disabled && s.disabledButton,
      ]}
    >
      <Text style={[s.actionText, secondary && s.secondaryText]}>{title}</Text>
    </Pressable>
  );
}
function useWifiWarnings(wifi?: WifiObservation) {
  const shown = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!wifi) return;
    const warning =
      wifi.connection !== "wifi"
        ? "offline"
        : wifi.band === "5"
          ? "5g"
          : undefined;
    if (!warning || warning === shown.current) return;
    shown.current = warning;
    Alert.alert(
      "未连接Wi-Fi",
      warning === "5g"
        ? "请不要使用5GHz的Wi-Fi网络"
        : "手机连接家庭Wi-Fi后才能添加设备",
      [
        { text: "取消", style: "cancel" },
        { text: "去连接", onPress: openWifiSettings },
      ],
    );
  }, [wifi]);
}

function WifiForm(p: Props) {
  const ssid = p.wifi?.ssid ?? p.ssid;
  const valid =
    !!ssid && !!p.password && !p.busy && !p.wifiBusy && p.wifi?.band !== "5";
  return (
    <View style={s.screen}>
      <View style={s.wifiHero}>
        <Image
          source={CONNECT_ICON}
          contentFit="contain"
          style={s.connectIcon}
        />
        <Text style={s.sectionTitle}>{"连接Wi-Fi网络"}</Text>
        <Text style={s.heroHint}>
          {"*注意：本产品仅支持2.4GHz的Wi-Fi网络，\n请勿开启5GHz频段。"}
        </Text>
      </View>
      <View style={s.form}>
        <View style={s.inputWrap}>
          <Input
            prefixIcon={WIFI_ICON}
            value={ssid}
            editable={!p.wifi?.ssid}
            onChangeText={p.onSsidChange}
            placeholder="请选择您的家庭Wi-Fi"
            clearable={false}
            style={s.input}
          />
          <Pressable onPress={p.onRefreshWifi} style={s.refreshButton}>
            <Text style={s.refreshText}>{"⇄"}</Text>
          </Pressable>
        </View>
        <Text
          style={[
            s.warning,
            p.wifi?.connection === "wifi" &&
              p.wifi.band !== "5" &&
              s.hiddenWarning,
          ]}
        >
          {p.wifiError ||
            (p.wifi?.band === "5"
              ? "请不要使用5GHz的Wi-Fi网络"
              : "没有连接到家庭Wi-Fi")}
        </Text>
        <Input
          prefixIcon={PASSWORD_ICON}
          value={p.password}
          onChangeText={p.onPasswordChange}
          placeholder="请输入Wi-Fi密码"
          secureTextEntry
          clearable
          style={s.input}
        />
        {p.error ? <Text style={s.errorText}>{p.error}</Text> : null}
      </View>
      <View style={s.wifiFooter}>
        <Text style={s.faqText}>{"FAQ"}</Text>
        <ActionButton
          full
          title="下一步"
          disabled={!valid}
          onPress={p.onProvision}
        />
      </View>
    </View>
  );
}

const STEPS = [
  "连接至设备热点",
  "发送Wi-Fi认证至设备",
  "连接至家庭Wi-Fi",
  "绑定设备",
];
function stepCount(state: AddState) {
  if (state.stage === "failed") {
    const step = state.deviceStep ?? "";
    if (step.includes("绑定")) return 4;
    if (step.includes("家庭") || step.includes("路由")) return 3;
    if (step.includes("认证") || step.includes("Wi-Fi")) return 2;
    return 1;
  }
  if (
    state.stage === "binding" ||
    state.stage === "bound" ||
    state.stage === "finishing" ||
    state.stage === "complete"
  )
    return 4;
  return state.stage === "provisioning" ? (state.deviceStep ? 2 : 1) : 1;
}
function Arc({ progress, failed }: { progress: number; failed: boolean }) {
  const path = "M 12 126 A 113 113 0 0 1 238 126";
  const [displayProgress, setDisplayProgress] = useState(() =>
    failed ? 0 : Math.min(1, Math.max(0, progress)),
  );
  const displayRef = useRef(displayProgress);
  const target = Math.min(1, Math.max(0, progress));
  useEffect(() => {
    const next = failed ? 0 : target;
    const start = displayRef.current;
    if (Math.abs(next - start) < 0.0001) return;
    const startedAt = Date.now();
    let frame: number | undefined;
    const animate = () => {
      const ratio = Math.min(1, (Date.now() - startedAt) / 240);
      const eased = 1 - (1 - ratio) ** 3;
      const value = start + (next - start) * eased;
      displayRef.current = value;
      setDisplayProgress(value);
      if (ratio < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [failed, target]);
  const strokeDashoffset = ARC_LENGTH * (1 - displayProgress);
  return (
    <View style={s.arcWrap}>
      <Svg width={250} height={136} viewBox="0 0 250 136">
        <Path d={path} fill="none" stroke="#e5e5e5" strokeWidth={3} />
        <Path
          d={path}
          fill="none"
          stroke={failed ? "#e5e5e5" : C.orange}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${ARC_LENGTH} ${ARC_LENGTH}`}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      <View style={s.arcCenter}>
        <Text style={s.percent}>
          {failed ? "0" : Math.round(progress * 100)}
          <Text style={s.percentUnit}>%</Text>
        </Text>
      </View>
    </View>
  );
}
function Progress({
  state,
  error,
  retry,
}: {
  state: AddState;
  error?: string;
  retry: () => void;
}) {
  const failed = state.stage === "failed";
  const progress = failed ? 0 : state.deviceProgress ?? 0;
  const count = stepCount(state);
  return (
    <View style={s.screen}>
      <View style={s.progressHero}>
        <Arc progress={progress} failed={failed} />
        {failed && (
          <Image
            source={CONNECT_ERROR}
            contentFit="contain"
            style={s.progressImage}
          />
        )}
        <Text style={[s.progressStatus, failed && s.failedStatus]}>
          {failed ? "添加失败" : "连接中..."}
        </Text>
      </View>
      <Text style={s.progressHint}>{"*请确保您的Wi-Fi网络信号良好"}</Text>
      <View style={s.stepList}>
        {STEPS.slice(0, count).map((label, i) => {
          const complete = !failed && i < count - 1;
          const current = !failed && i === count - 1;
          const failedStep = failed && i === count - 1;
          return (
            <View style={s.stepRow} key={label}>
              <Text style={s.stepLabel}>{label}</Text>
              <Text
                style={[
                  s.stepMark,
                  complete && s.completeMark,
                  failedStep && s.failedMark,
                ]}
              >
                {failedStep ? "×" : complete ? "✓" : current ? "◌" : "·"}
              </Text>
            </View>
          );
        })}
      </View>
      {error ? <Text style={s.errorText}>{error}</Text> : null}
      {failed && (
        <View style={s.retryFooter}>
          <ActionButton full title="再次配网" onPress={retry} />
        </View>
      )}
    </View>
  );
}

function Nickname(p: Props) {
  return (
    <View style={s.screen}>
      <View style={s.nicknameHead}>
        <Text style={s.nicknameTitle}>{"设备昵称"}</Text>
        <Text style={s.counter}>{[...p.nickname].length}/20</Text>
      </View>
      <Input
        value={p.nickname}
        maxLength={20}
        onChangeText={p.onNicknameChange}
        placeholder="请输入昵称"
        clearable
        style={s.nicknameInput}
      />
      <Text style={s.nicknameHint}>
        {"默认设备类型，可在此修改并设置设备名称"}
      </Text>
      <View style={s.nicknameFooter}>
        <ActionButton
          title="不设置，跳过"
          secondary
          disabled={p.busy}
          onPress={() => p.onFinish(null)}
        />
        <ActionButton
          title="下一步"
          disabled={p.busy}
          onPress={() => p.onFinish(p.nickname)}
        />
      </View>
    </View>
  );
}

function RoomSheet({
  visible,
  id,
  service,
  close,
  done,
}: {
  visible: boolean;
  id?: string;
  service: Props["service"];
  close: () => void;
  done: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selected, setSelected] = useState<string>();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!visible) return;
    void service
      .rooms()
      .then((v) => {
        setRooms(v);
        setSelected(v[0]?.id);
      })
      .catch(() => setRooms([]));
  }, [service, visible]);
  const confirm = async () => {
    if (id && selected) {
      setSaving(true);
      try {
        await service.moveDevice(id, selected);
      } finally {
        setSaving(false);
      }
    }
    done();
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <View style={s.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>{"使用场景"}</Text>
          {rooms.map((room) => (
            <Pressable
              key={room.id}
              onPress={() => setSelected(room.id)}
              style={[s.roomRow, selected === room.id && s.selectedRoom]}
            >
              <Text
                style={[s.roomName, selected === room.id && s.selectedRoomText]}
              >
                {room.name}
              </Text>
              {selected === room.id && <Text style={s.roomCheck}>{"✓"}</Text>}
            </Pressable>
          ))}
          <View style={s.sheetActions}>
            <ActionButton title="取消" secondary onPress={close} />
            <ActionButton
              title={saving ? "保存中" : "确定"}
              disabled={saving}
              onPress={() => void confirm()}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AddDeviceProvision(p: Props) {
  const [roomVisible, setRoomVisible] = useState(false);
  const [retrying, setRetrying] = useState(false);
  useWifiWarnings(p.wifi);
  const mode = useMemo(() => {
    if (retrying) return "wifi";
    if (p.state.binding && p.state.stage !== "complete") return "nickname";
    if (
      (p.busy &&
        ["selected", "provisioning", "binding"].includes(p.state.stage)) ||
      ["provisioning", "binding", "failed"].includes(p.state.stage)
    )
      return "progress";
    return "wifi";
  }, [p.busy, p.state.binding, p.state.stage, retrying]);
  const finish = async (v: string | null) => {
    await p.onFinish(v);
    setRoomVisible(true);
  };
  return (
    <View style={s.root}>
      <Header onBack={p.onBack} />
      {mode === "wifi" && (
        <WifiForm
          {...p}
          onProvision={() => {
            setRetrying(false);
            p.onProvision();
          }}
        />
      )}
      {mode === "progress" && (
        <Progress
          state={p.state}
          error={p.error}
          retry={() => {
            setRetrying(true);
            p.onRetryProvision();
          }}
        />
      )}
      {mode === "nickname" && <Nickname {...p} onFinish={finish} />}
      <RoomSheet
        visible={roomVisible}
        id={p.state.binding?.deviceID}
        service={p.service}
        close={() => setRoomVisible(false)}
        done={p.onDone}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: { width: 32, height: 42, justifyContent: "center" },
  backText: { fontSize: 34, color: C.text },
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  screen: { flex: 1, paddingHorizontal: 16, paddingBottom: 18 },
  wifiHero: { alignItems: "center", paddingTop: 42 },
  connectIcon: { width: 132, height: 108 },
  sectionTitle: {
    marginTop: 24,
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
  },
  heroHint: {
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
    fontSize: 13,
    color: C.muted,
  },
  form: { marginTop: 22, gap: 6 },
  inputWrap: { position: "relative" },
  input: {
    minHeight: 46,
    borderRadius: 9,
    backgroundColor: "#fff",
    borderWidth: 0,
  },
  refreshButton: {
    position: "absolute",
    right: 12,
    top: 8,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshText: { color: C.blue, fontSize: 22 },
  warning: { minHeight: 17, paddingLeft: 16, color: C.orange, fontSize: 12 },
  hiddenWarning: { color: "transparent" },
  wifiFooter: { flex: 1, justifyContent: "flex-end", gap: 26 },
  faqText: {
    textAlign: "center",
    color: C.blue,
    fontSize: 16,
    fontWeight: "600",
  },
  actionButton: {
    height: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  fullButton: { width: "100%" },
  splitButton: { flex: 1 },
  secondaryButton: { backgroundColor: "#fff" },
  disabledButton: { backgroundColor: "#c5c5c5" },
  actionText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryText: { color: "#777" },
  progressHero: { alignItems: "center", paddingTop: 22 },
  arcWrap: { width: 250, height: 136, position: "relative" },
  arcCenter: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 38,
    alignItems: "center",
  },
  percent: { fontSize: 22, fontWeight: "700", color: C.text },
  percentUnit: { fontSize: 12 },
  progressImage: { position: "absolute", top: 94, width: 62, height: 62 },
  progressStatus: { marginTop: 28, fontSize: 13, color: "#999" },
  failedStatus: { color: C.text, fontSize: 18, fontWeight: "700" },
  progressHint: { marginTop: 42, color: C.muted, fontSize: 12 },
  stepList: { marginTop: 20, gap: 12 },
  stepRow: {
    minHeight: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepLabel: { fontSize: 14, color: "#333" },
  stepMark: { color: "#bbb", fontSize: 20 },
  completeMark: { color: C.orange },
  failedMark: { color: "#ef5a5a", fontSize: 24 },
  errorText: { color: "#d33", fontSize: 12, marginTop: 14 },
  retryFooter: { marginTop: "auto" },
  nicknameHead: {
    marginTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nicknameTitle: { fontSize: 17, fontWeight: "700", color: "#333" },
  counter: { color: "#999", fontSize: 12 },
  nicknameInput: {
    minHeight: 46,
    backgroundColor: "#fff",
    borderWidth: 0,
  },
  nicknameHint: { marginTop: 10, color: C.muted, fontSize: 12 },
  nicknameFooter: { flexDirection: "row", gap: 10, marginTop: "auto" },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
    backgroundColor: "#fff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
    marginBottom: 4,
  },
  sheetTitle: {
    marginBottom: 12,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
  },
  roomRow: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedRoom: { backgroundColor: "#e7f3fb" },
  roomName: { fontSize: 14, color: "#333" },
  selectedRoomText: { color: C.blue, fontWeight: "600" },
  roomCheck: { color: C.blue, fontSize: 20 },
  sheetActions: { flexDirection: "row", gap: 12, marginTop: 10 },
});
