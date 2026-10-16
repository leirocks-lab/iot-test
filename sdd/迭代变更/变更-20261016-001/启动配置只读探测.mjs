import { writeFile } from 'node:fs/promises';
import { RowanService } from '../src/services/rowan.ts';
import { MemoryStorage } from '../src/services/store.ts';
import { RealHttpClient } from '../src/services/real-http.ts';

const captured = {};
const fetcher = async (url, init) => {
  const response = await fetch(url, {
    ...init,
    redirect: 'error',
    signal: init?.signal ?? AbortSignal.timeout(20000),
  });
  let body;
  try { body = await response.clone().json(); } catch { body = null; }
  const data = body?.data;
  captured.request = {
    method: init?.method ?? 'GET',
    url,
    httpStatus: response.status,
    businessCode: body?.code,
    message: body?.msg ?? body?.message,
    dataFields: data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : [],
  };
  return response;
};

const service = new RowanService(new RealHttpClient({
  environment: 'development',
  allowTestHttp: true,
  apiBaseUrl: 'http://47.107.80.36',
  iotApiBaseUrl: 'http://47.107.80.36/iot',
  tenantID: '1',
}, fetcher), new MemoryStorage());

let result = 'passed';
let error;
try {
  const config = await service.startupConfig('android');
  captured.resultFields = Object.keys(config ?? {});
  captured.configurationAvailable = config !== null;
  result = captured.configurationAvailable ? 'passed' : 'degraded';
} catch (e) {
  result = 'failed';
  error = { code: e?.code, message: e?.message ?? String(e) };
}

const report = {
  change: 'CHG-20261016-001',
  date: new Date().toISOString(),
  timeAsiaShanghai: `${new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).replace(' ', 'T')}+08:00`,
  environment: 'Windows Node / RowanService / RealHttpClient / development HTTP',
  account: null,
  tenantHeader: '1',
  operation: 'APP-01 GET /api/app/config',
  result,
  ...(error ? { error } : {}),
  request: captured.request,
  responseDataFields: captured.request?.dataFields ?? [],
  configurationAvailable: captured.configurationAvailable ?? false,
  startupFallback: captured.configurationAvailable ? 'not-needed' : 'no-valid-cache; returned null without blocking account entry',
  notes: ['Read-only unauthenticated startup config request.', 'No credentials or tokens used or persisted.'],
};

await writeFile('sdd/迭代变更/变更-20261016-001/联调结果.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
