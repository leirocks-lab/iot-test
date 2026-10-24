// node --import tsx scripts/AWS连接实测.mjs
// Uses local login configuration and the App's actual WSS transport. No publish/subscribe.
import { mkdir, writeFile } from 'node:fs/promises';

const moduleExports = async path => {
  const loaded = await import(path);
  return loaded.default ?? loaded;
};
const { RowanService } = await moduleExports('../src/services/rowan.ts');
const { RealHttpClient } = await moduleExports('../src/services/real-http.ts');
const { MemoryStorage } = await moduleExports('../src/services/memory-storage.ts');
const { createMqttConnection } = await moduleExports('../src/protocol/mqtt-browser.ts');
try { process.loadEnvFile('.env.local'); } catch (error) {
  if (error.code !== 'ENOENT') throw new Error('本地环境文件无法读取');
}

const report = {
  time: new Date().toISOString(),
  environment: 'Windows Node / RowanService / RealHttpClient / App MqttConnection',
  scope: 'DEVICE-01 credentials and MQTT CONNACK only; no subscriptions or device commands',
  stages: [],
};
const record = value => { report.stages.push(value); console.log(JSON.stringify(value)); };
const fetcher = async (url, init) => {
  const response = await fetch(url, {
    ...init, redirect: 'error', signal: init?.signal ?? AbortSignal.timeout(15000),
  });
  const body = await response.clone().json();
  record({ stage: 'http', path: new URL(url).pathname, status: response.status, code: body.code });
  return response;
};
let service, connection, stage = 'configuration';
try {
  const env = process.env;
  if (!env.ROWAN_LOGIN_ACCOUNT || !env.ROWAN_LOGIN_PIN || !env.ROWAN_APP_API_BASE_URL || !env.ROWAN_IOT_API_BASE_URL) {
    throw Object.assign(new Error(), { code: 'MISSING_LOCAL_CONFIGURATION' });
  }
  service = new RowanService(new RealHttpClient({
    environment: 'development', apiBaseUrl: env.ROWAN_APP_API_BASE_URL,
    iotApiBaseUrl: env.ROWAN_IOT_API_BASE_URL,
    tenantID: env.ROWAN_TENANT_ID ?? env.ROWAN_LOGIN_TENANT,
  }, fetcher), new MemoryStorage());
  stage = 'login';
  await service.login(env.ROWAN_LOGIN_ACCOUNT, env.ROWAN_LOGIN_PIN, 'password');
  stage = 'home';
  const groups = await service.home();
  const ids = [...new Set(groups.flatMap(group => group.devices.map(item => item.device.id)))];
  record({ stage, deviceCount: ids.length });
  const id = env.ROWAN_MQTT_TEST_DEVICE_ID ?? ids[0];
  if (!id || !ids.includes(id)) throw Object.assign(new Error(), { code: 'NO_AUTHORIZED_DEVICE' });
  stage = 'credentials';
  const credentials = await service.mqtt(id);
  const url = new URL(credentials.host);
  record({ stage, deviceID: id, hostname: url.hostname, path: url.pathname,
    fields: Object.keys(credentials), usernamePresent: !!credentials.username,
    passwordPresent: !!credentials.password,
    sigv4SignaturePresent: [...url.searchParams.keys()].some(key => key.toLowerCase() === 'x-amz-signature'),
    authorizerNameInUsername: /x-amz-customauthorizer-name/i.test(credentials.username ?? ''),
  });
  stage = 'mqtt';
  connection = createMqttConnection();
  await connection.connect(credentials, id, AbortSignal.timeout(15000));
  report.connected = connection.isConnected;
  record({ stage, connected: connection.isConnected, evidence: 'MQTT connect event / successful CONNACK' });
} catch (error) {
  report.connected = false;
  // Never persist raw errors: third-party errors can contain signed URLs or credentials.
  record({ stage, result: 'failed', code: typeof error.code === 'number' || /^[A-Z_0-9]+$/.test(error.code ?? '') ? error.code : null,
    causeCode: /^[A-Z_0-9]+$/.test(error.cause?.code ?? '') ? error.cause.code : null,
    errorName: ['Error', 'TypeError', 'TimeoutError', 'AbortError', 'ApiError'].includes(error.name) ? error.name : 'Error',
  });
  process.exitCode = 1;
} finally {
  connection?.close();
  if (service?.session) {
    try { await service.logout(); record({ stage: 'logout', result: 'passed' }); }
    catch { record({ stage: 'logout', result: 'failed' }); process.exitCode = 1; }
  }
  const directory = 'sdd/迭代变更/变更-20261022-001';
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/连接实测结果.json`, JSON.stringify(report, null, 2) + '\n');
}
