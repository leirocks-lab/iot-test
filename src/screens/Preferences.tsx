import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "../ui/context";
import { ErrorText, Input, useAction } from "../ui/kit";
import { EmailVerification } from "./Auth";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const lock = require("../../assets/images/find-password.png");
type Sheet = "nickname" | "email" | "delete" | null;
export default function Preferences() {
  const { runtime } = useApp();
  const action = useAction();
  const run = action.run;
  const [sheet, setSheet] = useState<Sheet>(null),
    [nickname, setNickname] = useState(""),
    [email, setEmail] = useState(""),
    [displayEmail, setDisplayEmail] = useState(""),
    [newEmail, setNewEmail] = useState(""),
    [password, setPassword] = useState(""),
    [verifyEmail, setVerifyEmail] = useState(""),
    [change, setChange] = useState(false),
    [logoutVisible, setLogoutVisible] = useState(false);
  useEffect(() => {
    if (!runtime) return;
    void run(async () => {
      const a = runtime.service.session?.userID ?? "";
      setEmail(a.includes("@") ? a : "");
      setDisplayEmail(a.includes("@") ? a : "");
      setNickname(a.split("@")[0] || a);
      const profile = await runtime.service.profile();
      setNickname(profile.nickname);
      setDisplayEmail(profile.emailMasked);
    });
  }, [runtime, run]);
  if (!runtime) return null;
  if (verifyEmail)
    return (
      <EmailVerification
        email={verifyEmail}
        password=""
        region=""
        purpose="changeEmail"
        onBack={() => setVerifyEmail("")}
        onVerified={(c) =>
          void action.run(async () => {
            await runtime.service.updateEmail(verifyEmail, c);
            setEmail(verifyEmail);
            setVerifyEmail("");
          })
        }
      />
    );
  if (change)
    return (
      <Password
        email={email}
        service={runtime.service}
        busy={action.busy}
        error={action.error}
        onDone={() => setChange(false)}
      />
    );
  const logout = () => setLogoutVisible(true);
  const confirmLogout = () =>
    void action.run(async () => {
      await runtime.service.logout();
      setLogoutVisible(false);
      router.replace("/auth");
    });
  return (
    <SafeAreaView style={s.mainSafe} edges={["top", "bottom"]}>
      <View style={s.mainHeader}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={s.mainBack}>
          <Image
            source={require("../../assets/images/back-icon.png")}
            style={s.mainBackImage}
            contentFit="contain"
          />
        </Pressable>
        <Text style={s.mainTitle}>个人信息</Text>
      </View>
      <View style={s.mainContent}>
        <View style={s.infoList}>
          <Row
            label="昵称"
            value={nickname || "未设置"}
            // onPress={() => setSheet("nickname")}
            onPress={() => setSheet(null)}
            first
          />
          <Row
            label="邮箱"
            value={displayEmail || "未设置"}
            // onPress={() => setSheet("email")}
            onPress={() => setSheet(null)}
          />
          <Row
            label="修改密码"
            value=""
            onPress={() => setSheet(null)}
            //   onPress={() => setChange(true)}
            last
          />
        </View>
        <View style={s.bottomActions}>
          <Pressable
            style={s.actionButton}
            //   onPress={() => setSheet("delete")}
            onPress={() => setSheet(null)}
          >
            <Text style={s.actionText}>注销账号</Text>
          </Pressable>
          <Pressable style={[s.actionButton, s.logoutButton]} onPress={logout}>
            <Text style={s.logoutText}>退出登录</Text>
          </Pressable>
        </View>
      </View>
      <ErrorText error={action.error} />
      <Modal
        transparent
        visible={logoutVisible}
        animationType="fade"
        onRequestClose={() => setLogoutVisible(false)}
      >
        <View style={s.logoutModalRoot}>
          <View style={s.logoutDialog}>
            <View style={s.logoutDialogText}>
              <Text style={s.logoutDialogTitle}>退出登录</Text>
              <Text style={s.logoutDialogMessage}>确认退出此账号吗？</Text>
            </View>
            <View style={s.logoutDialogActions}>
              <Pressable
                style={s.logoutDialogAction}
                disabled={action.busy}
                onPress={() => setLogoutVisible(false)}
              >
                <Text style={s.logoutCancelText}>取消</Text>
              </Pressable>
              <View style={s.logoutDivider} />
              <Pressable
                style={s.logoutDialogAction}
                disabled={action.busy}
                onPress={confirmLogout}
              >
                <Text style={s.logoutConfirmText}>退出</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <SheetView
        type={sheet}
        nickname={nickname}
        setNickname={setNickname}
        newEmail={newEmail}
        setNewEmail={setNewEmail}
        password={password}
        setPassword={setPassword}
        busy={action.busy}
        close={() => setSheet(null)}
        saveNick={() =>
          void action.run(async () => {
            await runtime.service.updateNickname(nickname.trim());
            setSheet(null);
          })
        }
        nextEmail={() => {
          if (EMAIL.test(newEmail.trim())) {
            setSheet(null);
            setVerifyEmail(newEmail.trim());
          }
        }}
        remove={() =>
          void action.run(async () => {
            await runtime.service.deleteAccount(password);
            router.replace("/auth");
          })
        }
      />
    </SafeAreaView>
  );
}
function Row(p: {
  label: string;
  value: string;
  onPress: () => void;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable style={[s.row, p.first && s.firstRow, p.last && s.lastRow]} onPress={p.onPress}>
      <Text style={s.label}>{p.label}</Text>
      {p.value ? <Text style={s.value}>{p.value}</Text> : null}
      <Image
        source={require("../assets/我的/chevron.png")}
        style={s.chevronImage}
        contentFit="contain"
      />
    </Pressable>
  );
}
function SheetView(p: any) {
  if (!p.type) return null;
  return (
    <Modal transparent animationType="slide" visible>
      <View style={s.root}>
        <Pressable style={s.backdrop} onPress={p.close} />
        <View style={s.sheet}>
          <Text style={s.title}>
            {p.type === "nickname" ? "修改昵称" : p.type === "email" ? "修改邮箱" : "注销账户"}
          </Text>
          {p.type === "nickname" && (
            <Input
              value={p.nickname}
              onChangeText={p.setNickname}
              placeholder="请输入昵称"
              clearable
            />
          )}
          {p.type === "email" && (
            <Input
              value={p.newEmail}
              onChangeText={p.setNewEmail}
              placeholder="请输入新的邮箱"
              keyboardType="email-address"
              clearable
            />
          )}
          {p.type === "delete" && (
            <Input
              value={p.password}
              onChangeText={p.setPassword}
              placeholder="请输入密码"
              secureTextEntry
              clearable
            />
          )}
          <Pressable
            style={s.confirm}
            onPress={
              p.type === "nickname" ? p.saveNick : p.type === "email" ? p.nextEmail : p.remove
            }
          >
            <Text style={{ color: "#fff" }}>{p.type === "email" ? "下一步" : "确认"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
function Password(p: any) {
  const [old, setOld] = useState(""),
    [next, setNext] = useState(""),
    [repeat, setRepeat] = useState(""),
    [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const verifyOld = async () => {
    setError("");
    try {
      await p.service.login(p.email, old, "password");
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "密码验证失败");
    }
  };
  const save = async () => {
    setError("");
    try {
      await p.service.changePassword(old, next);
      p.onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "修改密码失败");
    }
  };
  return (
    <SafeAreaView style={s.passwordSafe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={s.passwordFlex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            s.passwordHeader,
            {
              justifyContent: "space-between",
            },
          ]}
        >
          <Pressable accessibilityRole="button" onPress={p.onDone} style={s.passwordBack}>
            <Image
              source={require("../../assets/images/back-icon.png")}
              style={s.passwordBackImage}
              contentFit="contain"
            />
          </Pressable>
          <Text style={s.passwordTitle}>修改密码</Text>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.passwordContent}
          showsVerticalScrollIndicator={false}
        >
          <Image source={lock} style={s.image} contentFit="contain" />
          <Text style={s.heading}>{step ? "设置新密码" : "旧密码"}</Text>
          {!step ? (
            <>
              <Input
                value={old}
                onChangeText={setOld}
                placeholder="请输入您现在的密码"
                secureTextEntry
                clearable
                style={s.passwordInput}
              />
              {!!error && <Text style={s.passwordError}>{error}</Text>}
              <Pressable
                style={[s.next, (!old || p.busy) && s.disabled]}
                disabled={!old || p.busy}
                onPress={() => void verifyOld()}
              >
                <Text style={s.nextText}>下一步</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Input
                value={next}
                onChangeText={setNext}
                placeholder="请输入新密码"
                secureTextEntry
                clearable
                style={s.passwordInput}
              />
              <Input
                value={repeat}
                onChangeText={setRepeat}
                placeholder="请再次输入新密码"
                secureTextEntry
                clearable
                style={[s.passwordInput, s.repeatInput]}
              />
              {!!error && <Text style={s.passwordError}>{error}</Text>}
              <Pressable
                style={[s.next, (!next || next !== repeat || p.busy) && s.disabled]}
                disabled={!next || next !== repeat || p.busy}
                onPress={() => void save()}
              >
                <Text style={s.nextText}>确认</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  mainSafe: { flex: 1, backgroundColor: "#f2f2f2" },
  mainHeader: { height: 60, alignItems: "center", justifyContent: "center" },
  mainBack: {
    position: "absolute",
    left: 14,
    top: 4,
    width: 36,
    height: 48,
    justifyContent: "center",
  },
  mainBackImage: { width: 28, height: 28 },
  mainTitle: { color: "#000", fontSize: 17, lineHeight: 22, fontWeight: "600" },
  mainContent: { flex: 1, paddingHorizontal: 16 },
  infoList: { marginTop: 0, borderRadius: 12, overflow: "hidden" },
  firstRow: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  lastRow: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  bottomActions: { marginTop: "auto", marginBottom: 16 },
  actionButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { color: "#000", fontSize: 14, lineHeight: 14, fontWeight: "500" },
  logoutButton: { marginTop: 16 },
  logoutText: { color: "#f0534a", fontSize: 14, lineHeight: 14, fontWeight: "500" },
  logoutModalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutDialog: {
    width: 270,
    height: 133,
    borderRadius: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  logoutDialogText: { height: 90, alignItems: "center", paddingTop: 24 },
  logoutDialogTitle: { color: "#333", fontSize: 16, lineHeight: 16, fontWeight: "600" },
  logoutDialogMessage: { color: "#333", fontSize: 14, lineHeight: 14, marginTop: 12 },
  logoutDialogActions: {
    height: 43,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
    flexDirection: "row",
  },
  logoutDialogAction: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoutDivider: { width: StyleSheet.hairlineWidth, backgroundColor: "#eee" },
  logoutCancelText: { color: "#333", fontSize: 16, lineHeight: 17, fontWeight: "500" },
  logoutConfirmText: { color: "#f0534a", fontSize: 16, lineHeight: 17, fontWeight: "500" },
  row: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  label: { width: 96, fontSize: 16, lineHeight: 20, color: "#333" },
  value: { flex: 1, color: "#999", fontSize: 14, lineHeight: 16, textAlign: "right" },
  chevronImage: { width: 20, height: 20, marginLeft: 8 },
  logout: {
    height: 48,
    borderRadius: 9,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  delete: { alignItems: "center", padding: 18 },
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,.35)" },
  sheet: {
    backgroundColor: "#fff",
    padding: 20,
    paddingBottom: 34,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 18,
  },
  title: { textAlign: "center", fontSize: 18, fontWeight: "700" },
  confirm: {
    height: 46,
    borderRadius: 8,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  passwordSafe: { flex: 1, backgroundColor: "#f2f2f2" },
  passwordFlex: { flex: 1 },
  passwordHeader: { height: 48, alignItems: "center", justifyContent: "center" },
  passwordBack: {
    position: "absolute",
    left: 14,
    top: 0,
    width: 36,
    height: 48,
    justifyContent: "center",
  },
  passwordBackImage: { width: 28, height: 28 },
  passwordTitle: { color: "#000", fontSize: 17, fontWeight: "600", lineHeight: 22 },
  passwordContent: {
    alignItems: "center",
    paddingHorizontal: 47,
    paddingTop: 53,
    paddingBottom: 24,
  },
  image: { width: 160, height: 160 },
  heading: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    color: "#231916",
    marginTop: 16,
    marginBottom: 16,
  },
  passwordInput: {
    width: 280,
    minHeight: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
  },
  repeatInput: { marginTop: 12 },
  passwordError: { width: 280, color: "#ee9d31", fontSize: 12, marginTop: 8 },
  next: {
    width: 275,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  disabled: { backgroundColor: "rgba(0,0,0,0.23)" },
  nextText: { color: "#fff", fontSize: 16, lineHeight: 14, fontWeight: "600" },
});
