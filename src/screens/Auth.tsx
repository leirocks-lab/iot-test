import { useLoading } from "@/components/Loading";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp, useColors } from "../ui/context";
import { Busy, Button, ErrorText, Field, Page, useAction, useToast } from "../ui/kit";

type AuthProps = { forcedMode: "login" | "register" | "reset" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Auth({ forcedMode }: AuthProps) {
  if (forcedMode === "register") return <Register />;
  if (forcedMode === "login") return <Login />;
  return <ForgotPassword />;
}

function Login() {
  const { runtime, refreshSettings } = useApp();
  const colors = useColors();
  const action = useAction();
  const loading = useLoading();
  const params = useLocalSearchParams<{
    agreed?: string;
    region?: string;
    regionName?: string;
  }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(
    params.agreed === "privacy" || params.agreed === "serviceTerms",
  );
  const region = params.region ?? "US";
  const regionName = params.regionName ?? "美国";
  const emailError = email.length > 0 && !EMAIL.test(email) ? "请输入正确的邮箱格式" : "";
  const valid = EMAIL.test(email) && password.length > 0 && accepted;
  if (!runtime) return <Busy />;
  const submit = () => {
    action.run(async () => {
      if (!valid) return;
      loading.show();
      try {
        await runtime.service.login(email, password, "password");
        refreshSettings();
        router.replace("/home");
      } finally {
        loading.hide();
      }
    });
  };

  return (
    <Page title="" back>
      <View style={loginStyles.container}>
        <Text style={[loginStyles.title, { color: colors.font.title }]}>登录</Text>
        <Field
          label=""
          placeholder="请输入您的邮箱账号"
          prefixIcon={require("../../assets/images/email-icon.png")}
          clearable
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={emailError ? loginStyles.invalid : undefined}
        />
        {!!emailError && <Text style={loginStyles.error}>{emailError}</Text>}
        <Field
          label=""
          placeholder="请输入您的密码"
          prefixIcon={require("../../assets/images/password-icon.png")}
          clearable
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <View style={loginStyles.agreement}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="阅读并同意隐私政策与用户协议"
            accessibilityState={{ checked: accepted }}
            onPress={() => setAccepted((value) => !value)}
            hitSlop={10}
            style={registerStyles.checkboxTouch}
          >
            <View style={[registerStyles.checkbox, accepted && registerStyles.checkboxChecked]}>
              {accepted && <Text style={registerStyles.checkmark}>✓</Text>}
            </View>
          </Pressable>
          <Text style={registerStyles.agreementText}>阅读并同意 </Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/auth/agreement",
                params: {
                  kind: "privacy",
                  region,
                  regionName,
                  returnTo: "/auth/login",
                },
              })
            }
          >
            <Text style={registerStyles.link}>隐私政策</Text>
          </Pressable>
          <Text style={registerStyles.agreementText}> 与 </Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/auth/agreement",
                params: {
                  kind: "serviceTerms",
                  region,
                  regionName,
                  returnTo: "/auth/login",
                },
              })
            }
          >
            <Text style={registerStyles.link}>用户协议</Text>
          </Pressable>
        </View>
        <ErrorText error={action.error} />
        <Button title="登录" disabled={!valid || action.busy} onPress={() => void submit()} />
        <Pressable style={loginStyles.forgot} onPress={() => router.push("/auth/reset")}>
          <Text style={loginStyles.forgotText}>忘记密码</Text>
        </Pressable>
      </View>
    </Page>
  );
}

function Register() {
  const { runtime } = useApp();
  const colors = useColors();
  const action = useAction();
  const params = useLocalSearchParams<{
    region?: string;
    regionName?: string;
    agreed?: string;
  }>();
  const [region] = useState(params.region ?? "US");
  const [regionName] = useState(params.regionName ?? "美国");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [accepted, setAccepted] = useState(
    params.agreed === "privacy" || params.agreed === "serviceTerms",
  );
  const submit = useRef(false);
  const [verification, setVerification] = useState<{
    email: string;
    password: string;
    region: string;
  } | null>(null);

  if (!runtime) return <Busy />;
  if (verification) {
    return <EmailVerification {...verification} onBack={() => setVerification(null)} />;
  }
  const emailError = email.length > 0 && !EMAIL.test(email) ? "请输入正确的邮箱格式" : "";
  const passwordError =
    password.length > 0 && !/^\S{8,12}$/.test(password) ? "8-12个字符，包括数字和英文" : "";
  const repeatError = repeat.length > 0 && repeat !== password ? "两次输入的密码不一致" : "";
  const valid = Boolean(
    region && EMAIL.test(email) && /^\S{8,12}$/.test(password) && password === repeat && accepted,
  );
  const commit = () =>
    action.run(async () => {
      if (!valid || submit.current) return;
      submit.current = true;
      try {
        setVerification({ email: email.trim(), password, region });
      } finally {
        submit.current = false;
      }
    });

  return (
    <Page title="" back>
      <View style={registerStyles.container}>
        <Text style={[registerStyles.title, { color: colors.font.title }]}>注册</Text>
        <Pressable
          style={registerStyles.inputRow}
          onPress={() =>
            router.push({
              pathname: "/auth/region",
              params: { selected: region },
            })
          }
        >
          <Text style={registerStyles.icon}>◉</Text>
          <Text style={registerStyles.value}>{regionName}</Text>
          <Text style={registerStyles.chevron}>›</Text>
        </Pressable>
        <Field
          label=""
          placeholder="请输入您的邮箱"
          prefixIcon={require("../../assets/images/email-icon.png")}
          clearable
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={emailError ? registerStyles.invalid : undefined}
        />
        {!!emailError && <Text style={registerStyles.error}>{emailError}</Text>}
        <Field
          label=""
          placeholder="请设置您的密码"
          prefixIcon={require("../../assets/images/password-icon.png")}
          clearable
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={passwordError ? registerStyles.invalid : undefined}
        />
        {!!passwordError && <Text style={registerStyles.error}>{passwordError}</Text>}
        <Field
          label=""
          placeholder="请再次确认密码"
          prefixIcon={require("../../assets/images/password-icon.png")}
          clearable
          secureTextEntry
          value={repeat}
          onChangeText={setRepeat}
          style={repeatError ? registerStyles.invalid : undefined}
        />
        {!!repeatError && <Text style={registerStyles.error}>{repeatError}</Text>}
        <View style={registerStyles.agreement}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="阅读并同意隐私政策与用户协议"
            accessibilityState={{ checked: accepted }}
            onPress={() => setAccepted((value) => !value)}
            hitSlop={10}
            style={registerStyles.checkboxTouch}
          >
            <View style={[registerStyles.checkbox, accepted && registerStyles.checkboxChecked]}>
              {accepted && <Text style={registerStyles.checkmark}>✓</Text>}
            </View>
          </Pressable>
          <Text style={registerStyles.agreementText}>阅读并同意 </Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/auth/agreement",
                params: {
                  kind: "privacy",
                  region,
                  regionName,
                  returnTo: "/auth/register",
                },
              })
            }
          >
            <Text style={registerStyles.link}>隐私政策</Text>
          </Pressable>
          <Text style={registerStyles.agreementText}> 与 </Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/auth/agreement",
                params: {
                  kind: "serviceTerms",
                  region,
                  regionName,
                  returnTo: "/auth/register",
                },
              })
            }
          >
            <Text style={registerStyles.link}>用户协议</Text>
          </Pressable>
        </View>
        <ErrorText error={action.error} />
        <Button title="注册" disabled={!valid || action.busy} onPress={() => void commit()} />
      </View>
    </Page>
  );
}

function EmailVerification({
  email,
  password,
  region,
  onBack,
  purpose = "register",
  onVerified,
}: {
  email: string;
  password: string;
  region: string;
  onBack: () => void;
  purpose?: "register" | "forget";
  onVerified?: (code: string) => void;
}) {
  const { runtime } = useApp();
  const [code, setCode] = useState("");
  const [remaining, setRemaining] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(true);
  const { toast, showToast } = useToast();
  const inputRef = useRef<TextInput>(null);
  const sendLock = useRef(false);
  const submitLock = useRef(false);

  useEffect(() => {
    if (!runtime) return;
    let active = true;
    sendLock.current = true;
    void runtime.service
      .sendCaptcha(email, purpose)
      .then(() => {
        if (!active) return;
        setRemaining(60);
        showToast("发送成功");
      })
      .catch((error: unknown) => {
        if (active) showToast(error instanceof Error ? error.message : "发送失败");
      })
      .finally(() => {
        if (active) {
          sendLock.current = false;
          setSending(false);
        }
      });
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => {
      active = false;
      clearTimeout(focusTimer);
    };
  }, [runtime, email, purpose, showToast]);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => Math.max(value - 1, 0)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const resend = async () => {
    if (!runtime || remaining > 0 || sendLock.current) return;
    sendLock.current = true;
    setSending(true);
    try {
      await runtime.service.sendCaptcha(email, purpose);
      setCode("");
      setInvalid(false);
      setRemaining(60);
      showToast("发送成功");
      inputRef.current?.focus();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "发送失败");
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  };

  const confirm = async () => {
    if (!runtime || code.length !== 6 || submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    try {
      await runtime.service.checkCaptcha(email, code);
      if (purpose === "forget") onVerified?.(code);
      else {
        await runtime.service.register(email, password, code, region);
        router.replace("/auth/login");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "注册失败";
      if (/验证码|captcha/i.test(message)) {
        setInvalid(true);
        showToast("验证码错误，请重新发送验证");
      } else {
        showToast(message);
      }
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  };

  const changeCode = (value: string) => {
    setCode(value.replace(/\D/g, "").slice(0, 6));
    setInvalid(false);
  };

  return (
    <SafeAreaView style={verifyStyles.safeArea}>
      <KeyboardAvoidingView
        style={verifyStyles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={verifyStyles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="返回注册"
            onPress={onBack}
            style={verifyStyles.backButton}
          >
            <Text style={verifyStyles.backIcon}>‹</Text>
          </Pressable>
          <Text style={verifyStyles.headerTitle}>邮箱验证</Text>
          <View style={verifyStyles.backButton} />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={verifyStyles.content}
        >
          <View style={verifyStyles.illustration}>
            <Image
              source={require("../../assets/images/email-send.png")}
              style={{ width: 160, height: 160 }}
            />
          </View>
          <View style={verifyStyles.message}>
            <Text style={verifyStyles.messageTitle}>验证码已发送到您的邮箱</Text>
            <View style={verifyStyles.emailLine}>
              <Text style={verifyStyles.emailText}>{email}</Text>
              <Text style={verifyStyles.instruction}> 请输入验证码进行验证</Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel="输入六位邮箱验证码"
            onPress={() => inputRef.current?.focus()}
            style={verifyStyles.codeRow}
          >
            {Array.from({ length: 6 }, (_, index) => (
              <View
                key={index}
                style={[
                  verifyStyles.codeCell,
                  index === code.length &&
                    code.length < 6 &&
                    !invalid &&
                    verifyStyles.codeCellActive,
                  invalid && verifyStyles.codeCellInvalid,
                ]}
              >
                <Text style={verifyStyles.codeDigit}>{code[index] ?? ""}</Text>
                {index === code.length && code.length < 6 && !invalid && (
                  <View style={verifyStyles.caret} />
                )}
              </View>
            ))}
            <TextInput
              ref={inputRef}
              accessibilityLabel="邮箱验证码"
              value={code}
              onChangeText={changeCode}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={6}
              caretHidden
              selectionColor="transparent"
              style={verifyStyles.nativeInput}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: code.length !== 6 || busy }}
            disabled={code.length !== 6 || busy || sending}
            onPress={() => void confirm()}
            style={[
              verifyStyles.confirmButton,
              (code.length !== 6 || busy || sending) && verifyStyles.confirmDisabled,
            ]}
          >
            <Text style={verifyStyles.confirmText}>确认</Text>
          </Pressable>
          <View style={verifyStyles.resendRow}>
            <Text style={verifyStyles.resendLabel}>没收到验证码？</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: remaining > 0 || sending }}
              disabled={remaining > 0 || sending}
              onPress={() => void resend()}
            >
              <Text
                style={[
                  verifyStyles.resendAction,
                  remaining === 0 && !sending && verifyStyles.resendEnabled,
                ]}
              >
                {sending ? "发送中" : remaining > 0 ? `${remaining}S 重新发送` : "重新发送"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {!!toast && (
        <View pointerEvents="none" style={verifyStyles.toast}>
          <Text style={verifyStyles.toastText}>{toast}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const verifyStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f3f3f3" },
  flex: { flex: 1 },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  backButton: {
    width: 38,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 34,
    lineHeight: 38,
    color: "#252525",
    fontWeight: "300",
  },
  headerTitle: {
    position: "absolute",
    left: 52,
    right: 52,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: "#222",
  },
  content: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 24 },
  illustration: { marginTop: 42, width: 160, height: 160 },
  message: { alignItems: "center", marginTop: 16 },
  messageTitle: { fontSize: 15, lineHeight: 22, color: "#555" },
  emailLine: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 1,
  },
  emailText: {
    color: "#2485bd",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
  instruction: { color: "#555", fontSize: 14, lineHeight: 21 },
  codeRow: {
    position: "relative",
    width: "100%",
    maxWidth: 280,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 42,
  },
  codeCell: {
    width: 38,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  codeCellActive: { borderColor: "#d9d9d9" },
  codeCellInvalid: { borderColor: "#e4ae39" },
  codeDigit: { fontSize: 22, fontWeight: "600", color: "#333", lineHeight: 28 },
  caret: {
    position: "absolute",
    width: 1.5,
    height: 22,
    backgroundColor: "#1685cf",
  },
  nativeInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0.01,
    color: "transparent",
    fontSize: 18,
  },
  confirmButton: {
    width: "100%",
    maxWidth: 280,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  confirmDisabled: { backgroundColor: "#c4c4c4" },
  confirmText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 15,
  },
  resendLabel: { color: "#555", fontSize: 14 },
  resendAction: { color: "#aaa", fontSize: 14 },
  resendEnabled: { color: "#2885b8" },
  toast: {
    position: "absolute",
    top: "48%",
    alignSelf: "center",
    minWidth: 124,
    maxWidth: "85%",
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 24,
    backgroundColor: "rgba(30,30,30,0.9)",
    alignItems: "center",
  },
  toastText: { color: "#fff", fontSize: 14 },
});

function ForgotPassword() {
  const { runtime } = useApp();
  const [step, setStep] = useState<"email" | "verify" | "password">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const { toast, showToast } = useToast();
  const [busy, setBusy] = useState(false);
  if (!runtime) return <Busy />;
  const findAccount = async () => {
    const account = email.trim();
    setError("");
    if (!EMAIL.test(account)) {
      setError("此账号无效或不受支持");
      return;
    }
    setBusy(true);
    try {
      setStep("verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : "查询失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!/^\S{8,12}$/.test(password) || password !== repeat) {
      setError("两次输入的密码不一致或密码格式错误");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await runtime.service.resetPassword(email, password, code);
      showToast("新密码设置成功");
      setTimeout(() => router.replace("/auth/login"), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "重置失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  };
  if (step === "verify")
    return (
      <EmailVerification
        email={email}
        password=""
        region=""
        purpose="forget"
        onBack={() => setStep("email")}
        onVerified={(verifiedCode) => {
          setCode(verifiedCode);
          setStep("password");
        }}
      />
    );
  if (step === "password")
    return (
      <Page title="找回密码" back>
        <View style={forgotStyles.container}>
          <Image
            source={require("../../assets/images/find-password.png")}
            style={forgotStyles.illustration}
          />
          <Text style={forgotStyles.heading}>请输入新的密码</Text>
          <Field
            label=""
            placeholder="请输入新密码"
            prefixIcon={require("../../assets/images/password-icon.png")}
            secureTextEntry
            clearable
            value={password}
            onChangeText={setPassword}
          />
          <Field
            label=""
            placeholder="请再次输入新密码"
            prefixIcon={require("../../assets/images/password-icon.png")}
            secureTextEntry
            clearable
            value={repeat}
            onChangeText={setRepeat}
          />
          {!!error && <Text style={forgotStyles.error}>{error}</Text>}
          <Button
            title="确定"
            disabled={busy || !password || !repeat}
            onPress={() => void reset()}
          />
          {!!toast && <Text style={forgotStyles.toast}>{toast}</Text>}
        </View>
      </Page>
    );
  return (
    <Page title="找回密码" back>
      <View style={forgotStyles.container}>
        <Image
          source={require("../../assets/images/find-password.png")}
          style={forgotStyles.illustration}
        />
        <Text style={forgotStyles.heading}>通过邮箱找回</Text>
        <Field
          label=""
          placeholder="请输入您的邮箱账号"
          prefixIcon={require("../../assets/images/email-icon.png")}
          keyboardType="email-address"
          clearable
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError("");
          }}
          style={error ? forgotStyles.invalid : undefined}
        />
        {!!error && <Text style={forgotStyles.error}>{error}</Text>}
        <Button title="下一步" disabled={busy || !email} onPress={() => void findAccount()} />
        <Pressable style={forgotStyles.forgot} onPress={() => router.back()}>
          <Text style={loginStyles.forgotText}>忘记账号</Text>
        </Pressable>
      </View>
    </Page>
  );
}

const registerStyles = {
  container: { paddingTop: 22, gap: 16, padding: 28 } as const,
  title: { fontSize: 36, fontWeight: "400", marginBottom: 22 } as const,
  inputRow: {
    minHeight: 48,
    borderRadius: 9,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  } as const,
  icon: { fontSize: 16, color: "#222", marginRight: 12 } as const,
  value: { flex: 1, fontSize: 16, color: "#222" } as const,
  chevron: { fontSize: 30, color: "#aaa", lineHeight: 30 } as const,
  invalid: { borderColor: "#ee9d31" } as const,
  error: {
    color: "#ee9d31",
    fontSize: 12,
    marginTop: -10,
    paddingLeft: 16,
  } as const,
  agreement: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 26,
    paddingHorizontal: 18,
  } as const,
  checkboxTouch: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  } as const,
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 2,
    borderColor: "#aaa",
    alignItems: "center",
    justifyContent: "center",
  } as const,
  checkboxChecked: {
    backgroundColor: "#111",
    borderColor: "#111",
  } as const,
  checkmark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
  } as const,
  agreementText: { color: "#333", fontSize: 13 } as const,
  link: { color: "#1677aa", fontSize: 13 } as const,
};

const loginStyles = {
  container: { paddingTop: 22, gap: 16, padding: 28, flex: 1 } as const,
  title: { fontSize: 36, fontWeight: "400", marginBottom: 22 } as const,
  invalid: { borderColor: "#ee9d31" } as const,
  error: {
    color: "#ee9d31",
    fontSize: 12,
    marginTop: -10,
    paddingLeft: 16,
  } as const,
  agreement: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 26,
    paddingHorizontal: 18,
  } as const,
  forgot: {
    marginTop: "auto",
    alignItems: "center",
    paddingVertical: 12,
  } as const,
  forgotText: { color: "#1677aa", fontSize: 17 } as const,
};

const forgotStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f3f3f3",
  },
  illustration: { width: 160, height: 160, marginTop: 28, marginBottom: 18 },
  heading: { fontSize: 17, fontWeight: "600", color: "#333", marginBottom: 18 },
  invalid: { borderWidth: 1, borderColor: "#ee9d31" },
  error: {
    alignSelf: "stretch",
    color: "#ee9d31",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 10,
    paddingLeft: 16,
  },
  toast: {
    marginTop: 20,
    color: "#fff",
    backgroundColor: "rgba(30,30,30,.9)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  forgot: { marginTop: "auto", paddingVertical: 12, alignItems: "center" },
});
