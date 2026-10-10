import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useApp, useColors } from "../ui/context";
import { Busy, Button, ErrorText, Field, Page, useAction } from "../ui/kit";

type AuthProps = { forcedMode: "login" | "register" | "reset" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Auth({ forcedMode }: AuthProps) {
  if (forcedMode === "register") return <Register />;
  if (forcedMode === "login") return <Login />;
  return <LegacyAuth mode={forcedMode} />;
}

function Login() {
  const { runtime, refreshSettings } = useApp();
  const colors = useColors();
  const action = useAction();
  const params = useLocalSearchParams<{ agreed?: string; region?: string; regionName?: string }>();
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
  const submit = () => action.run(async () => {
    if (!valid) return;
    await runtime.service.login(email, password, "password");
    refreshSettings();
    router.replace("/home");
  });
  return (
    <Page title="" back>
      <View style={loginStyles.container}>
        <Text style={[loginStyles.title, { color: colors.font.title }]}>登录</Text>
        <Field
          label=""
          placeholder="请输入您的邮箱账号"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={emailError ? loginStyles.invalid : undefined}
        />
        {!!emailError && <Text style={loginStyles.error}>{emailError}</Text>}
        <Field
          label=""
          placeholder="请输入您的密码"
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
          <Pressable onPress={() => router.push({ pathname: "/auth/agreement", params: { kind: "privacy", region, regionName, returnTo: "/auth/login" } })}>
            <Text style={registerStyles.link}>隐私政策</Text>
          </Pressable>
          <Text style={registerStyles.agreementText}> 与 </Text>
          <Pressable onPress={() => router.push({ pathname: "/auth/agreement", params: { kind: "serviceTerms", region, regionName, returnTo: "/auth/login" } })}>
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

  if (!runtime) return <Busy />;
  const emailError =
    email.length > 0 && !EMAIL.test(email) ? "请输入正确的邮箱格式" : "";
  const passwordError =
    password.length > 0 && !/^\S{8,12}$/.test(password)
      ? "8-12个字符，包括数字和英文"
      : "";
  const repeatError =
    repeat.length > 0 && repeat !== password ? "两次输入的密码不一致" : "";
  const valid = Boolean(
    region &&
    EMAIL.test(email) &&
    /^\S{8,12}$/.test(password) &&
    password === repeat &&
    accepted,
  );
  const commit = () =>
    action.run(async () => {
      if (!valid || submit.current) return;
      submit.current = true;
      try {
        await runtime.service.register(email.trim(), password, "", region);
        router.replace("/auth/login");
      } finally {
        submit.current = false;
      }
    });

  return (
    <Page title="" back>
      <View style={registerStyles.container}>
        <Text style={[registerStyles.title, { color: colors.font.title }]}>
          注册
        </Text>
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
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={emailError ? registerStyles.invalid : undefined}
        />
        {!!emailError && <Text style={registerStyles.error}>{emailError}</Text>}
        <Field
          label=""
          placeholder="请设置您的密码"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={passwordError ? registerStyles.invalid : undefined}
        />
        {!!passwordError && (
          <Text style={registerStyles.error}>{passwordError}</Text>
        )}
        <Field
          label=""
          placeholder="请再次确认密码"
          secureTextEntry
          value={repeat}
          onChangeText={setRepeat}
          style={repeatError ? registerStyles.invalid : undefined}
        />
        {!!repeatError && (
          <Text style={registerStyles.error}>{repeatError}</Text>
        )}
        <View style={registerStyles.agreement}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="阅读并同意隐私政策与用户协议"
            accessibilityState={{ checked: accepted }}
            onPress={() => setAccepted((value) => !value)}
            hitSlop={10}
            style={registerStyles.checkboxTouch}
          >
            <View
              style={[
                registerStyles.checkbox,
                accepted && registerStyles.checkboxChecked,
              ]}
            >
              {accepted && <Text style={registerStyles.checkmark}>✓</Text>}
            </View>
          </Pressable>
          <Text style={registerStyles.agreementText}>阅读并同意 </Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/auth/agreement",
                params: { kind: "privacy", region, regionName, returnTo: "/auth/register" },
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
                params: { kind: "serviceTerms", region, regionName, returnTo: "/auth/register" },
              })
            }
          >
            <Text style={registerStyles.link}>用户协议</Text>
          </Pressable>
        </View>
        <ErrorText error={action.error} />
        <Button
          title="注册"
          disabled={!valid || action.busy}
          onPress={() => void commit()}
        />
      </View>
    </Page>
  );
}

function LegacyAuth({ mode }: { mode: "login" | "reset" }) {
  const { runtime, refreshSettings } = useApp();
  const action = useAction();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [captcha, setCaptcha] = useState("");
  if (!runtime) return <Busy />;
  const submit = () =>
    action.run(async () => {
      if (mode === "reset") {
        await runtime.service.checkCaptcha(email, captcha);
        await runtime.service.resetPassword(email, password, captcha);
        router.replace("/auth/login");
      } else {
        await runtime.service.login(email, password, "password");
        refreshSettings();
        router.replace("/home");
      }
    });
  return (
    <Page title={mode === "reset" ? "找回密码" : "登录"} back>
      <View style={{ gap: 16 }}>
        <Field
          label="邮箱"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <Field
          label="密码"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {mode === "reset" && (
          <>
            <Field
              label="确认密码"
              value={repeat}
              onChangeText={setRepeat}
              secureTextEntry
            />
            <Field label="验证码" value={captcha} onChangeText={setCaptcha} />
          </>
        )}
        <ErrorText error={action.error} />
        <Button
          title={mode === "reset" ? "重置密码" : "登录"}
          disabled={
            action.busy ||
            !email ||
            !password ||
            (mode === "reset" && password !== repeat)
          }
          onPress={() => void submit()}
        />
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
  error: { color: "#ee9d31", fontSize: 12, marginTop: -10, paddingLeft: 16 } as const,
  agreement: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", marginTop: 26, paddingHorizontal: 18 } as const,
  forgot: { marginTop: "auto", alignItems: "center", paddingVertical: 12 } as const,
  forgotText: { color: "#1677aa", fontSize: 17 } as const,
};
