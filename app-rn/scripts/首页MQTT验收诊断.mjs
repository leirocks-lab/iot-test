// Run: node scripts/首页MQTT验收诊断.mjs [output.json]
// Executes the real DeviceCard function with controlled Hook/native/session substitutes.
// No native rendering, network, credentials, or device commands are used.
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/screens/Home.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(`${source}\nexport { DeviceCard };`, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const element = (type, props) => ({ type, props: props ?? {} });
const device = {
  deviceNickname: "Audit device",
  bindingRole: "sa",
  bindingAt: "",
  online: false,
  device: { id: "dev_666666" },
  product: { id: "prd_100", name: "Audit product" },
};
const colors = new Proxy({}, { get: () => new Proxy({}, { get: () => "#audit" }) });
function harness({
  online = false,
  failConnect = false,
  sending = false,
  controls = true,
  realtimeOnline = true,
  confirmed = { ConnectType: "online", Power: "on" },
} = {}) {
  const slots = [],
    effects = [],
    lifecycle = [],
    navigation = [];
  let cursor = 0,
    connectCount = 0,
    closeCount = 0,
    commandCount = 0;
  const changeListeners = new Set();
  const session = {
    ready: true,
    connected: true,
    sending,
    confirmed,
    get online() {
      return this.ready && this.connected ? realtimeOnline : undefined;
    },
    error: "",
    onChange: (fn) => {
      changeListeners.add(fn);
      return () => changeListeners.delete(fn);
    },
    connect: async () => {
      connectCount++;
      if (failConnect) {
        session.ready = false;
        session.connected = false;
        session.error = "MQTT连接失败";
        throw new Error(session.error);
      }
    },
    close: () => {
      closeCount++;
      session.ready = false;
    },
    controls: controls
      ? {
          list: () => [{ kind: "power" }],
          isOn: () => true,
          reason: () => undefined,
          toggle: async () => {
            commandCount++;
          },
        }
      : undefined,
  };
  const runtime = { service: { session: { userID: "audit" } }, createDeviceSession: () => session };
  const native = {
    AppState: {
      currentState: "active",
      addEventListener: (_, cb) => {
        lifecycle.push(cb);
        return { remove() {} };
      },
    },
    StyleSheet: { create: (value) => value },
  };
  for (const name of [
    "ActivityIndicator",
    "Modal",
    "Pressable",
    "RefreshControl",
    "ScrollView",
    "Text",
    "View",
  ])
    native[name] = name;
  const mocks = {
    "react/jsx-runtime": { jsx: element, jsxs: element },
    react: {
      useState: (initial) => {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [
          slots[index],
          (value) => {
            slots[index] = typeof value === "function" ? value(slots[index]) : value;
          },
        ];
      },
      useCallback: (value) => value,
      useEffect() {},
      useRef: (value) => ({ current: value }),
    },
    "expo-image": { Image: "Image" },
    "expo-router": {
      router: { push: (value) => navigation.push(value) },
      useFocusEffect: (cb) => effects.push(cb),
    },
    "react-native": native,
    "../ui/context": { useApp: () => ({ runtime }), useColors: () => colors },
    "../ui/kit": { useAction: () => ({ error: "", run: (fn) => fn() }), Busy: "Busy" },
    "../ui/device-glyph": { DeviceGlyph: "DeviceGlyph" },
    "../protocol/device": {},
  };
  const exports = {};
  vm.runInNewContext(
    compiled,
    {
      exports,
      require: (name) => {
        if (Object.hasOwn(mocks, name)) return mocks[name];
        if (name.endsWith(".png")) return name;
        throw new Error(`Unmocked dependency: ${name}`);
      },
    },
    { filename: "Home.audit.cjs" },
  );
  const render = () => {
    cursor = 0;
    return exports.DeviceCard({
      device: { ...device, online },
      selected: false,
      editing: false,
      onSelect() {},
    });
  };
  let tree = render();
  const stop = effects[0]();
  return {
    session,
    notify: () => {
      for (const listener of changeListeners) listener();
    },
    navigation,
    render,
    stop,
    lifecycle,
    get tree() {
      return tree;
    },
    update() {
      tree = render();
    },
    get connectCount() {
      return connectCount;
    },
    get closeCount() {
      return closeCount;
    },
    get commandCount() {
      return commandCount;
    },
  };
}
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
const power = (h) =>
  nodes(h.tree).find(
    (n) => n.type === "Pressable" && /Turn (on|off)|未知/.test(n.props.accessibilityLabel ?? ""),
  );
const dot = (h) =>
  nodes(h.tree).find(
    (n) =>
      n.type === "View" &&
      Array.isArray(n.props.style) &&
      n.props.style[0]?.width === 8 &&
      n.props.style[0]?.height === 8,
  )?.props.style[1].backgroundColor;
const dotLabel = (h) =>
  nodes(h.tree).find(
    (n) => n.type === "View" && Array.isArray(n.props.style) && n.props.style[0]?.width === 8,
  )?.props.accessibilityLabel;
const hasText = (h, text) =>
  nodes(h.tree).some((n) => String(n.props?.children ?? "").includes(text));
const flush = async (h) => {
  await new Promise((resolve) => setImmediate(resolve));
  h.update();
};
const results = [];
async function check(id, requirement, run) {
  try {
    const { expected, actual, pass } = await run();
    results.push({ id, requirement, result: pass ? "PASS" : "FAIL", expected, actual });
  } catch (error) {
    results.push({ id, requirement, result: "ERROR", error: String(error) });
  }
}
await check("UI-01", "RF-0012-AC-003：MQTT在线值更新卡片在线标识", async () => {
  const h = harness();
  await flush(h);
  const actual = dot(h);
  return { expected: "#1CC787", actual, pass: actual === "#1CC787" };
});
await check("UI-02", "RF-0012-AC-004：实时状态未知时不能显示为已确认关机", async () => {
  const h = harness({ controls: false, confirmed: {} });
  await flush(h);
  const actual = power(h).props.accessibilityLabel;
  return { expected: "未知状态或最近确认值标识", actual, pass: /unknown|未知|最近/i.test(actual) };
});
await check("UI-03", "RF-0012异常流程：连接失败应展示状态不可确认", async () => {
  const h = harness({ failConnect: true });
  await flush(h);
  const pass = hasText(h, "MQTT连接失败") || hasText(h, "不可确认");
  return { expected: "显示连接错误或状态不可确认", actual: pass ? "显示错误" : "未显示错误", pass };
});
await check("UI-04", "RF-0013：MQTT在线且具备能力时不应被REST旧离线值阻断", async () => {
  const h = harness();
  await flush(h);
  return {
    expected: false,
    actual: power(h).props.disabled,
    pass: power(h).props.disabled === false,
  };
});
await check("UI-05", "RF-0013-AC-004：发送期间禁止再次点击", async () => {
  const baseline = harness({ online: true });
  await flush(baseline);
  const h = harness({ online: true, sending: true });
  await flush(h);
  return {
    expected: { idleDisabled: false, sendingDisabled: true },
    actual: {
      idleDisabled: power(baseline).props.disabled,
      sendingDisabled: power(h).props.disabled,
    },
    pass: power(baseline).props.disabled === false && power(h).props.disabled === true,
  };
});
await check("UI-06", "RF-0013-AC-004：发送期间可见等待指示", async () => {
  const h = harness({ online: true, sending: true });
  await flush(h);
  const pass = nodes(h.tree).some(
    (n) => n.type === "Busy" || n.type === "ActivityIndicator" || n.props.accessibilityState?.busy,
  );
  return { expected: "等待组件或busy语义", actual: pass ? "存在" : "只有禁用和透明度变化", pass };
});
await check("UI-07", "RF-0012-AC-005/006：离线卡片可进入正确设备页", async () => {
  const h = harness();
  await flush(h);
  nodes(h.tree)
    .find((n) => n.type === "Pressable" && n.props.accessibilityLabel === device.deviceNickname)
    .props.onPress();
  const actual = h.navigation[0];
  return {
    expected: "/device/[id], id=dev_666666",
    actual,
    pass: actual?.pathname === "/device/[id]" && actual.params.id === "dev_666666",
  };
});
await check("UI-08", "RF-0012-AC-012：首页离页及后台不关闭共享连接", async () => {
  const h = harness();
  await flush(h);
  for (const notify of h.lifecycle) {
    notify("background");
    notify("active");
  }
  h.stop();
  await flush(h);
  return {
    expected: "连接一次，离页及后台关闭次数为零",
    actual: { connectCount: h.connectCount, closeCount: h.closeCount },
    pass: h.connectCount === 1 && h.closeCount === 0,
  };
});
await check("UI-09", "RF-0012-AC-005：开关事件只调用控制，不触发跳转", async () => {
  const h = harness({ online: true });
  await flush(h);
  power(h).props.onPress();
  await flush(h);
  return {
    expected: { commands: 1, navigations: 0 },
    actual: { commands: h.commandCount, navigations: h.navigation.length },
    pass: h.commandCount === 1 && h.navigation.length === 0,
  };
});
await check("UI-10", "RF-0012-AC-007：MQTT断开后不继续呈现可确认在线", async () => {
  const h = harness({ online: true });
  await flush(h);
  h.session.ready = false;
  h.session.error = "设备通信中断，请重新同步";
  h.update();
  const actual = {
    color: dot(h),
    errorVisible: hasText(h, "设备通信中断"),
    disabled: power(h).props.disabled,
  };
  return {
    expected: "禁用控制并显示未知/通信中断，不继续显示绿色在线",
    actual,
    pass: actual.disabled && actual.color !== "#1CC787" && actual.errorVisible,
  };
});
await check(
  "UI-11",
  "CHG-20261027-003：无产品在线映射仍按reported.ConnectType显示绿点，不开放控制",
  async () => {
    const h = harness({ online: true, controls: false });
    // Simulate a session whose product has no confirmed online mapping.
    Object.defineProperty(h.session, "online", { get: () => undefined });
    await flush(h);
    const actual = {
      color: dot(h),
      disabled: power(h).props.disabled,
      label: dotLabel(h),
    };
    return {
      expected: "绿色、在线无障碍标签、禁止控制",
      actual,
      pass: actual.color === "#1CC787" && actual.disabled && actual.label === "在线",
    };
  },
);
await check("UI-12", "已确认离线覆盖REST在线缓存并禁止控制", async () => {
  const h = harness({
    online: true,
    realtimeOnline: false,
    confirmed: { ConnectType: "offline", Power: "on" },
  });
  await flush(h);
  const actual = {
    color: dot(h),
    disabled: power(h).props.disabled,
    offline: dotLabel(h) === "离线",
  };
  return {
    expected: "灰色、离线、禁止控制",
    actual,
    pass: actual.color === "#B9BDBE" && actual.disabled && actual.offline,
  };
});
await check("UI-13", "缺少或未知ConnectType、仅有旧Online时灰点且不开放控制", async () => {
  const actual = [];
  for (const confirmed of [
    {},
    { ConnectType: "invalid" },
    { ConnectType: true },
    { Online: "online" },
  ]) {
    const h = harness({ online: true, confirmed });
    await flush(h);
    actual.push({ color: dot(h), disabled: power(h).props.disabled, label: dotLabel(h) });
  }
  return {
    expected: "各场景灰色、禁用、未知无障碍标签",
    actual,
    pass: actual.every((v) => v.color === "#B9BDBE" && v.disabled && v.label === "状态未知"),
  };
});
await check("UI-14", "RF-0012-AC-011：圆点旁无可见状态文字", async () => {
  const actual = [];
  for (const confirmed of [{ ConnectType: "online" }, { ConnectType: "offline" }, {}]) {
    const h = harness({ confirmed });
    await flush(h);
    actual.push(
      nodes(h.tree).filter(
        (n) => n.type === "Text" && ["在线", "离线", "状态未知"].includes(n.props.children),
      ).length,
    );
  }
  return { expected: [0, 0, 0], actual, pass: actual.every((v) => v === 0) };
});
await check("UI-15", "RF-0012-AC-007：已同步但断连时忽略影子旧ConnectType", async () => {
  const h = harness();
  await flush(h);
  h.session.connected = false;
  h.update();
  const actual = { color: dot(h), disabled: power(h).props.disabled };
  return { expected: "灰色并禁用", actual, pass: actual.color === "#B9BDBE" && actual.disabled };
});
await check("UI-16", "共享会话自动恢复后清除首次连接错误", async () => {
  const h = harness({ failConnect: true });
  await flush(h);
  const initiallyVisible = hasText(h, "MQTT连接失败") || hasText(h, "设备状态不可确认");
  h.session.ready = true;
  h.session.connected = true;
  h.session.error = "";
  h.notify();
  await flush(h);
  const actual = {
    initiallyVisible,
    errorAfterRecovery: hasText(h, "MQTT连接失败") || hasText(h, "设备状态不可确认"),
    color: dot(h),
  };
  return {
    expected: "恢复后清除错误并显示绿点",
    actual,
    pass: initiallyVisible && !actual.errorAfterRecovery && actual.color === "#1CC787",
  };
});
await check("UI-17", "新旧在线字段冲突时只采用ConnectType", async () => {
  const cases = [
    { confirmed: { ConnectType: "online", Online: "offline" }, color: "#1CC787" },
    { confirmed: { ConnectType: "offline", Online: "online" }, color: "#B9BDBE" },
  ];
  const actual = [];
  for (const item of cases) {
    const h = harness({ confirmed: item.confirmed });
    await flush(h);
    actual.push(dot(h));
  }
  return {
    expected: cases.map((item) => item.color),
    actual,
    pass: actual.every((color, index) => color === cases[index].color),
  };
});
const report = {
  timestamp: new Date().toISOString(),
  source: "src/screens/Home.tsx (real DeviceCard function)",
  method:
    "TypeScript transpile + VM, controlled hooks/native/session substitutes; no native renderer or real broker",
  limits:
    "Does not verify React effect scheduling, actual native rendering, taps, or AWS delivery. UI-01/04 isolate component behavior with a control-capable session, not the deployed readonly profile.",
  summary: {
    passed: results.filter((r) => r.result === "PASS").length,
    failed: results.filter((r) => r.result === "FAIL").length,
    errors: results.filter((r) => r.result === "ERROR").length,
  },
  results,
};
console.log(JSON.stringify(report, null, 2));
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + "\n");
process.exitCode = report.summary.failed || report.summary.errors ? 1 : 0;
