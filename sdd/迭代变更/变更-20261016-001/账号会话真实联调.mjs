import process from 'node:process';
import { writeFile } from 'node:fs/promises';
import { RowanService } from '../../../src/services/rowan.ts';
import { MemoryStorage } from '../../../src/services/store.ts';
import { RealHttpClient } from '../../../src/services/real-http.ts';

try { process.loadEnvFile('.env.local'); } catch { /* Environment may be supplied by the invoking process instead. */ }

const account = process.env.ROWAN_LOGIN_ACCOUNT;
const pin = process.env.ROWAN_LOGIN_PIN;
const tenantID = process.env.ROWAN_LOGIN_TENANT;
const verify = process.env.ROWAN_LOGIN_VERIFY ?? 'password';
const registrationID = Number(process.env.ROWAN_LOGIN_REGISTRATION_ID ?? '1');
const system = process.env.ROWAN_LOGIN_SYSTEM ?? 'ios';
const language = process.env.ROWAN_LOGIN_LANGUAGE ?? 'zh-CN';
if (!account || !pin || tenantID !== '1' || verify !== 'password' || !Number.isInteger(registrationID) || !['ios', 'android', 'huawei'].includes(system) || !['zh-CN', 'zh-TW', 'en'].includes(language)) {
  console.error('联调前置条件不满足：请检查本地忽略文件 .env.local 中的 ROWAN_LOGIN_* 配置。未发送请求。');
  process.exitCode = 2;
} else {
  const secrets = [account, pin];
  const clean = value => secrets.reduce((text, secret) => text.replaceAll(secret, '[redacted]'), String(value ?? ''));
  const requests = [];
  const fetcher = async (url, init) => {
    if (init?.method === 'POST' && new URL(url).pathname === '/app-api/session') {
      init = { ...init, body: JSON.stringify({ ...JSON.parse(init.body), registrationId: registrationID, system, language }) };
    }
    const response = await fetch(url, { ...init, redirect: 'error', signal: init?.signal ?? AbortSignal.timeout(20000) });
    let body;
    try { body = await response.clone().json(); } catch { body = null; }
    const data = body?.data;
    if (data && typeof data === 'object') {
      for (const key of ['accessToken', 'refreshToken']) if (typeof data[key] === 'string') secrets.push(data[key]);
    }
    requests.push({
      time: new Date().toISOString(),
      method: init?.method ?? 'GET',
      path: new URL(url).pathname,
      httpStatus: response.status,
      businessCode: body?.code,
      message: clean(body?.msg ?? body?.message),
      authenticated: Boolean(init?.headers?.Authorization),
      tenantHeader: init?.headers?.['tenant-id'] ?? 'omitted',
      responseFields: body && typeof body === 'object' ? Object.keys(body) : [],
      dataFields: data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : [],
    });
    return response;
  };

  const client = new RealHttpClient({
    environment: 'development', allowTestHttp: true,
    apiBaseUrl: 'http://47.107.80.36', iotApiBaseUrl: 'http://47.107.80.36/iot', tenantID,
  }, fetcher);
  const storage = new MemoryStorage();
  const loginService = new RowanService(client, storage);
  const report = {
    change: 'CHG-20261016-001',
    date: new Date().toISOString(),
    timeAsiaShanghai: `${new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).replace(' ', 'T')}+08:00`,
    environment: 'Windows Node / RowanService / RealHttpClient / development HTTP',
    account: clean(account),
    tenantHeader: '1',
    phases: {},
    requests,
    notes: ['Account and PIN are read from ignored .env.local or process environment.', 'Only response codes, messages, and field names are recorded; no passwords or token values are persisted.', 'Session storage is process-local MemoryStorage, not device SecureStore; no native UI acceptance is claimed.'],
  };

  try {
    await loginService.login(account, pin, verify);
    report.phases.AUTH_04 = { result: 'passed', sessionPersistedInProcess: Boolean(await storage.get('session')), settingsPresent: Boolean(loginService.session?.setting) };
  } catch (error) {
    report.phases.AUTH_04 = { result: 'failed', code: error?.code, message: clean(error?.message) };
  }

  if (loginService.session) {
    const restoreService = new RowanService(client, storage);
    await restoreService.restore();
    report.phases.AUTH_05 = { result: restoreService.session ? 'passed' : 'failed', restoredSessionPresent: Boolean(restoreService.session) };
    if (restoreService.session) {
      try {
        await restoreService.logout();
        report.phases.AUTH_06 = { result: 'passed', localSessionCleared: restoreService.session === null, persistedSessionCleared: !(await storage.get('session')) };
      } catch (error) {
        report.phases.AUTH_06 = { result: 'failed', code: error?.code, message: clean(error?.message), localSessionStillPresent: Boolean(restoreService.session) };
      }
    } else {
      report.phases.AUTH_06 = { result: 'blocked', reason: 'AUTH-05 restore did not produce a session' };
    }
  } else {
    report.phases.AUTH_05 = { result: 'blocked', reason: 'AUTH-04 did not establish a real session' };
    report.phases.AUTH_06 = { result: 'blocked', reason: 'AUTH-04 did not establish a real session' };
  }

  await writeFile('sdd/迭代变更/变更-20261016-001/账号会话联调.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}
