// Run with node --env-file=<private local env> docs/tools/http_acceptance.mjs.
// Only explicit --authenticated performs a login. Never emits response bodies or identities.
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolveContentBrand} from './content-brand-config.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const platform = process.env.ROWAN_APP_API_BASE_URL;
const iot = process.env.ROWAN_IOT_API_BASE_URL;
const tenant = process.env.ROWAN_TENANT_ID;
if (!platform || !iot || !/^\d+$/.test(tenant ?? '')) {throw new Error('Configure API roots and tenant in a private environment');}
for (const rootUrl of [platform, iot]) {
  const url = new URL(rootUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {throw new Error('Invalid development API root');}
}
const results = [];
const runId=new Date().toISOString().replaceAll(':','-');
let token;
let refreshToken;
let userId;
async function check(id, base, path, options = {}, expectedDenial = false, redactedPath = null) {
  const start = Date.now();
  try {
    const response = await fetch(base.replace(/\/$/, '') + '/app-api/' + path, {
      ...options, redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: {'tenant-id': tenant, 'Accept-Language': 'zh-CN', 'Content-Type': 'application/json',
        ...(token ? {Authorization: `Bearer ${token}`} : {})},
    });
    const data = await response.json();
    const denied = response.status === 401 || data.code === 401;
    const passed = expectedDenial ? denied : response.ok && data.code === 0 && data.success !== false;
    results.push({id, method: options.method ?? 'GET', path: '/app-api/' + (redactedPath ?? path.split('?')[0]),
      authenticated: Boolean(token), httpStatus: response.status, businessCode: data.code,
      result: passed ? '通过' : '失败', expectation: expectedDenial ? '拒绝未认证访问' : '业务成功',
      dataType: Array.isArray(data.data) ? 'array' : data.data === null ? 'null' : typeof data.data,
      durationMs: Date.now() - start});
    return passed ? data.data : undefined;
  } catch {
    results.push({id, result: '阻塞', reason: '网络、重定向或响应解析失败', durationMs: Date.now() - start});
    return undefined;
  }
}
const contentQuery = new URLSearchParams({type: 'text'});
const contentBrand=resolveContentBrand(process.env);
if (contentBrand!==undefined) {contentQuery.set('brandId',contentBrand);}
if (process.env.ROWAN_REGION_CODE) {contentQuery.set('regionCode', process.env.ROWAN_REGION_CODE);}
await check('CONTENT-01', platform, `privacy?${contentQuery}`);
await check('CONTENT-02', platform, `serviceTerms?${contentQuery}`);
await check('HOME-01-denial', iot, 'devices', {}, true);
if (process.argv.includes('--authenticated')) {
  const account = process.env.ROWAN_LOGIN_ACCOUNT;
  const pin = process.env.ROWAN_LOGIN_PIN;
  if (!account || !pin) {results.push({id: 'AUTH-04', result: '阻塞', reason: '未配置测试凭据'});}
  else {
    const session = await check('AUTH-04', platform, 'session', {method: 'POST', body: JSON.stringify({account, pin, verify: process.env.ROWAN_LOGIN_VERIFY ?? 'password', language: 'zh-CN', system: 'android'})});
    if (typeof session?.accessToken === 'string' && typeof session.refreshToken === 'string' && typeof session.userID === 'string') {
      token = session.accessToken; refreshToken = session.refreshToken; userId = session.userID;
      const home = await check('HOME-01', iot, 'devices');
      if(process.argv.includes('--catalog-contract')) {
        const query=new URLSearchParams();
        if(process.env.ROWAN_PRODUCT_BRAND_ID)query.set('brandId',process.env.ROWAN_PRODUCT_BRAND_ID);
        const suffix=query.size?`?${query}`:'';
        const categories=await check('PAIR-03',iot,`products/category${suffix}`);
        if(Array.isArray(categories))results.push({id:'PAIR-03-field-shape',result:'通过',
          fields:[...new Set(categories.flatMap(value=>value&&typeof value==='object'?Object.keys(value):[]))].sort(),
          namesAreLocalizedObjects:categories.some(value=>value?.name&&typeof value.name==='object'),
          stableValuesPresent:categories.every(value=>typeof value?.value==='string'&&value.value.length>0),
          note:'只记录结构；未记录名称或品类值，原生筛选与语言显示未验收'});
        const catalog=await check('PAIR-01',iot,`products${suffix}`);
        if(Array.isArray(catalog)) {
          const groups=catalog.filter(value=>value&&typeof value==='object');
          const products=groups.flatMap(value=>Array.isArray(value.products)?value.products:[]).filter(value=>value&&typeof value==='object');
          results.push({id:'PAIR-01-field-shape',result:'通过',groupFields:[...new Set(groups.flatMap(Object.keys))].sort(),
            productFields:[...new Set(products.flatMap(Object.keys))].sort(),
            configTypeShapes:[...new Set(products.map(value=>Array.isArray(value.configType)?'array':typeof value.configType))].sort(),
            recommendedAlwaysPresent:products.length>0&&products.every(value=>typeof value.recommended==='boolean'),
            sortAlwaysPresent:products.length>0&&products.every(value=>typeof value.sort==='number'),
            note:'只读目录结构；不从型号猜推荐、顺序、连接或配网方式'});
          const first=products.find(value=>typeof value.id==='string'&&value.id.length>0);
          if(first) {
            const detail=await check('PAIR-02',iot,`products/${encodeURIComponent(first.id)}?type=text`,{},false,'products/{productID}');
            if(detail&&typeof detail==='object'&&!Array.isArray(detail))results.push({id:'PAIR-02-field-shape',result:'通过',fields:Object.keys(detail).sort(),
              requestedIDMatches:detail.id===first.id,configTypeShape:Array.isArray(detail.configType)?'array':typeof detail.configType,
              imageShape:Array.isArray(detail.image)?'array':typeof detail.image,parametersShape:Array.isArray(detail.parameters)?'array':typeof detail.parameters,
              note:'产品标识只取本次真实目录，不猜ID；配网与设备绑定均未执行'});
          }else results.push({id:'PAIR-02-catalog-prerequisite',result:'阻塞',reason:'本次目录没有有效产品标识，未猜测'});
        }
      }
      if(process.argv.includes('--device-contract')) {
        const owned=Array.isArray(home)?home.flatMap(group=>group&&Array.isArray(group.devices)?group.devices:[]).find(item=>item&&typeof item.device?.id==='string'&&item.device.id):null;
        if(owned) {
          const resource=encodeURIComponent(owned.device.id);
          const mqtt=await check('DEVICE-01',iot,`devices/${resource}/mqtt`,{},false,'devices/{deviceID}/mqtt');
          if(mqtt&&typeof mqtt==='object'&&!Array.isArray(mqtt)) {
            let transport=null;
            try {transport=new URL(mqtt.host).protocol;}catch{}
            results.push({id:'DEVICE-01-field-shape',result:'通过',note:'仅记录字段名/布尔，不记录MQTT地址、标识或凭据；不证明连接可用',
              fields:Object.keys(mqtt).sort(),transport,
              responseDeviceIDMatchesRequest:mqtt.deviceID===owned.device.id,
              credentialFieldsPresent:['clientID','username','password'].every(key=>typeof mqtt[key]==='string'&&mqtt[key].length>0),
              expiryFieldPresent:['expiresAt','expiresIn','expiration','ttl'].some(key=>Object.hasOwn(mqtt,key)),
              expiresAtType:typeof mqtt.expiresAt,
              expiresAtISO8601:typeof mqtt.expiresAt==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(mqtt.expiresAt)&&Number.isFinite(Date.parse(mqtt.expiresAt)),
              expiresWithin24HoursIfEpochMillis:typeof mqtt.expiresAt==='number'&&mqtt.expiresAt>Date.now()&&mqtt.expiresAt<Date.now()+86400000,
              expiresWithin24HoursIfEpochSeconds:typeof mqtt.expiresAt==='number'&&mqtt.expiresAt*1000>Date.now()&&mqtt.expiresAt*1000<Date.now()+86400000,
              explicitAuthModePresent:Object.hasOwn(mqtt,'authMode')});
          }
          const detail=await check('DEVICE-02',iot,`devices/${resource}`,{},false,'devices/{deviceID}');
          if(detail&&typeof detail==='object') results.push({id:'DEVICE-02-field-shape',result:'通过',
            fields:Object.keys(detail).sort(),productFields:Object.keys(detail.product??{}).sort(),
            note:'仅字段结构；角色、产品映射与运行状态仍须原生实现和联调'});
          const productID=detail?.product?.id??owned.product?.id;
          if(typeof productID==='string'||typeof productID==='number') {
            const model=await check('THING-01',iot,`products/${encodeURIComponent(String(productID))}/thing-model`,{},false,'products/{productID}/thing-model');
            if(model&&typeof model==='object') results.push({id:'THING-01-field-shape',result:'通过',fields:Object.keys(model).sort(),
              versionPresent:typeof model.version==='string',etagPresent:typeof model.etag==='string',
              attributes:Array.isArray(model.attributes)?model.attributes.map(attribute=>({identifier:attribute.identifier,dataType:attribute.dataType,access:attribute.access,fields:Object.keys(attribute).sort()})):null,
              note:'仅物模型结构/属性标识；无设备值、产品标识或个人数据，不能据属性名猜业务控件映射'});
          }
        } else results.push({id:'DEVICE-contract',result:'阻塞',reason:'没有可从HOME-01确认归属的设备，未猜测标识'});
      }
      if(process.argv.includes('--device-read-features')) {
        const owned=Array.isArray(home)?home.flatMap(group=>Array.isArray(group?.devices)?group.devices:[])
          .find(item=>typeof item?.device?.id==='string'&&item.device.id&&!['.','..'].includes(item.device.id)):null;
        if(!owned)results.push({id:'device-read-features-prerequisite',result:'阻塞',reason:'没有本次HOME确认归属的设备'});
        else {
          const resource=encodeURIComponent(owned.device.id);
          const rows=await check('TIMER-01',iot,`devices/${resource}/schedules`,{},false,'devices/{deviceID}/schedules');
          if(rows!==undefined)results.push({id:'TIMER-01-defined-shape',result:Array.isArray(rows)?'通过':'失败',
            isArray:Array.isArray(rows),count:Array.isArray(rows)?rows.length:null,
            allIdsValid:Array.isArray(rows)&&rows.every(row=>typeof row?.id==='string'&&row.id.length>0&&!['.','..'].includes(row.id)),
            note:'不记录日程名称、标识、动作或设备值；空列表不证明编辑/下发通过'});
          for(const kind of ['mcu','wifi']) {
            const offer=await check(`OTA-${kind}-candidate`,iot,`devices/${resource}/ota/${kind}`,{},false,`devices/{deviceID}/ota/${kind}`);
            if(offer!==undefined) {
              const valid=offer&&typeof offer==='object'&&!Array.isArray(offer)&&
                ['id','version'].every(key=>typeof offer.firmware?.[key]==='string'&&offer.firmware[key].trim().length>0)&&
                ['id','name','mac'].every(key=>typeof offer.device?.[key]==='string'&&offer.device[key].trim().length>0)&&
                offer.device.id===owned.device.id&&(offer.firmware.remark==null||typeof offer.firmware.remark==='string');
              results.push({id:`OTA-${kind}-defined-shape`,result:valid?'通过':'失败',
                firmwareFieldPresent:Object.hasOwn(offer??{},'firmware'),
                firmwareType:offer?.firmware===null?'null':Array.isArray(offer?.firmware)?'array':typeof offer?.firmware,
                deviceIdMatches:offer?.device?.id===owned.device.id,
                firmwareIdType:typeof offer?.firmware?.id,versionType:typeof offer?.firmware?.version,
                deviceIdType:typeof offer?.device?.id,deviceNameType:typeof offer?.device?.name,macType:typeof offer?.device?.mac,
                note:'只记录类型/布尔，无原始值；不推导hasUpdate、不创建或查询升级任务'});
            }
          }
        }
      }
      if(process.argv.includes('--device-more-reads')) {
        const owned=Array.isArray(home)?home.flatMap(group=>Array.isArray(group?.devices)?group.devices:[])
          .find(item=>typeof item?.device?.id==='string'&&item.device.id&&!['.','..'].includes(item.device.id)):null;
        if(!owned)results.push({id:'device-more-read-prerequisite',result:'阻塞',reason:'没有本次HOME确认归属的设备'});
        else {
          const resource=encodeURIComponent(owned.device.id);
          const detail=await check('MORE-summary-DEVICE02',iot,`devices/${resource}`,{},false,'devices/{deviceID}');
          if(detail!==undefined)results.push({id:'MORE-summary-shape',result:detail?.device?.id===owned.device.id&&
            typeof detail?.product==='object'&&detail.product!==null?'通过':'失败',
            deviceIdMatches:detail?.device?.id===owned.device.id,
            nicknameType:typeof detail?.deviceNickname,bindingRoleRecognized:['sa','mbr','obs'].includes(detail?.bindingRole),
            productPresent:typeof detail?.product==='object'&&detail.product!==null,
            note:'只记录结构，不记录昵称、设备名、MAC、账号或标识'});
          const members=await check('MORE-01-members',iot,`devices/${resource}/users`,{},false,'devices/{deviceID}/users');
          if(members!==undefined)results.push({id:'MORE-01-members-shape',result:Array.isArray(members)?'通过':'失败',
            isArray:Array.isArray(members),count:Array.isArray(members)?members.length:null,
            allUserIdStrings:Array.isArray(members)&&members.every(value=>typeof value?.userID==='string'),
            allRolesRecognized:Array.isArray(members)&&members.every(value=>['sa','mbr','obs'].includes(value?.bindingRole)),
            note:'不记录成员ID、昵称、邮箱、手机或原始正文'});
          const location=await check('ROOM-02-device-location',iot,`devices/${resource}/location`,{},false,'devices/{deviceID}/location');
          if(location!==undefined)results.push({id:'ROOM-02-location-shape',result:'通过',
            isNull:location===null,idType:typeof location?.id,nameType:typeof location?.name,
            note:'只记录类型；不修改或推导房间归属'});
          const articles=await check('MORE-05-text-help',iot,`devices/${resource}/helping?type=text`,{},false,'devices/{deviceID}/helping');
          if(articles!==undefined)results.push({id:'MORE-05-help-shape',result:Array.isArray(articles)?'通过':'失败',
            isArray:Array.isArray(articles),count:Array.isArray(articles)?articles.length:null,
            allTextFields:Array.isArray(articles)&&articles.every(value=>['id','title','content','createdAt'].every(key=>typeof value?.[key]==='string')),
            note:'不记录文章正文、URL、标识或标题；不请求type=url，不打开外部链接'});
        }
      }
      await check('USER-01', platform, 'user/setting');
      await check('ROOM-03', iot, 'user/locations');
      const next = await check('AUTH-05', platform, 'session', {method: 'PATCH', body: JSON.stringify({userID: userId, refreshToken})});
      if (typeof next?.accessToken === 'string') {token = next.accessToken;}
      await check('AUTH-06', platform, 'session', {method: 'DELETE'});
    } else if (session !== undefined) {
      results.push({id: 'AUTH-04-shape', result: '失败', reason: '会话缺少必要字段'});
    }
  }
}
token = undefined; refreshToken = undefined; userId = undefined;
const directory = new URL('../测试报告/重构实施-20261101/', import.meta.url);
await mkdir(directory, {recursive: true});
const report = {date: new Date().toISOString(),runId,scriptSha256:createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex'),
  commit: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(),
  contentQuery: Object.fromEntries(contentQuery),
  execution: 'Node real HTTP; does not prove native implementation or emulator acceptance',
  results, exclusions: ['MQTT', 'native HTTP implementation', 'UI', 'hardware']};
await writeFile(new URL(process.argv.includes('--authenticated') ? 'http-authenticated-service-probe.json' : 'http-public-service-probe.json', directory), JSON.stringify(report, null, 2) + '\n');
await writeFile(new URL(`http-service-${runId}.json`,directory),JSON.stringify(report,null,2)+'\n');
for (const item of results) {console.log(`${item.id}: ${item.result}; HTTP ${item.httpStatus ?? '-'}; code ${item.businessCode ?? '-'}`);}
if (results.some(item => !['通过'].includes(item.result))) {process.exitCode = 1;}
