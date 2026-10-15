// Run with: node --import tsx scripts/公共账号首页联调.mjs
// Credentials are read only from the current process environment, never from source or a result file.
import { mkdir, writeFile } from 'node:fs/promises';
import { communicationConfig } from '../src/services/config.ts';
import { RealHttpClient } from '../src/services/real-http.ts';
import { RowanService } from '../src/services/rowan.ts';
import { MemoryStorage } from '../src/services/store.ts';

const config=communicationConfig({environment:'development',httpMode:'real',deviceMode:'mock',allowTestHttp:true,
  apiBaseUrl:'http://47.107.80.36',iotApiBaseUrl:'http://47.107.80.36/iot',tenantID:process.env.ROWAN_TENANT_ID});
const account=process.env.ROWAN_TEST_ACCOUNT??'zhanglei@verveso.com';
const password=process.env.ROWAN_TEST_PASSWORD;
const results=[];
let lastWire;
const fetcher=async(url,init)=>{
  const response=await fetch(url,{...init,signal:init?.signal??AbortSignal.timeout(20000),redirect:'error'});
  const body=await response.clone().json();
  lastWire={url,method:init?.method??'GET',httpStatus:response.status,code:body.code,
    message:password?String(body.message??body.msg??'').replaceAll(password,'[redacted]'):String(body.message??body.msg??''),
    authenticated:!!init?.headers?.Authorization,tenantHeader:config.tenantID??'omitted',responseFields:Object.keys(body),
    dataFields:body.data&&typeof body.data==='object'&&!Array.isArray(body.data)?Object.keys(body.data):undefined,
    dataCount:Array.isArray(body.data)?body.data.length:undefined};
  return response;
};
const service=new RowanService(new RealHttpClient(config,fetcher),new MemoryStorage());
async function run(api,work){
  lastWire=undefined;
  const started=Date.now();
  try{await work();results.push({api,time:new Date().toISOString(),durationMs:Date.now()-started,...lastWire,result:'passed'});return true;}
  catch(error){results.push({api,time:new Date().toISOString(),durationMs:Date.now()-started,...lastWire,result:'failed',errorCode:typeof error.code==='number'?error.code:undefined,errorMessage:password?error.message.replaceAll(password,'[redacted]'):error.message});return false;}
}
await run('APP-01',()=>service.config('android'));
await run('CONTENT-01',()=>service.agreement('privacy','CN'));
await run('CONTENT-02',()=>service.agreement('serviceTerms','CN'));
await run('HOME-01 unauthenticated',()=>service.home());
// Send exactly once per explicit invocation. A failed response is not proof that email was delivered.
if(process.env.ROWAN_SEND_REGISTER_CAPTCHA==='1')await run('AUTH-01 register',()=>service.sendCaptcha(account,'register'));
if(password){
  const loggedIn=await run('AUTH-04 password',()=>service.login(account,password,'password'));
  if(loggedIn){
    await run('USER-01',()=>service.settings());
    await run('HOME-01 authenticated',()=>service.home());
    await run('AUTH-05',()=>service.refresh());
    await run('AUTH-06',()=>service.logout());
  }
}
const target='sdd/迭代变更/变更-20261013-001/联调证据';
await mkdir(target,{recursive:true});
const report={change:'CHG-20261013-001',execution:'Windows Node / RowanService / RealHttpClient / actual fetch',
  environment:'development HTTP real / device mock',tenantConfigured:!!config.tenantID,
  notes:['No passwords, tokens or captcha values are persisted.','Unauthenticated HOME-01 denial is not a successful device-list acceptance.','Native mobile UI and MQTT were not exercised.'],results};
await writeFile(`${target}/App服务层实测.json`,JSON.stringify(report,null,2)+'\n','utf8');
for(const row of results)console.log(`${row.api}: ${row.result}; HTTP ${row.httpStatus??'-'}; code ${row.code??row.errorCode??'-'}; ${row.message??row.errorMessage??''}`);
