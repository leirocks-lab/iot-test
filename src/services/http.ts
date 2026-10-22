import type { HttpClient, HttpRequest, HttpResponse } from "../lib/core";
import { ApiError, type Attribute, type Schedule } from "./models";
import { MockDatabase, defaultSettings, digest, products } from "./store";
import { nextExecution, validateSchedule } from "./scheduler";
import { validateAttributeValue } from "./device-controls";
import { validateApiBaseUrl } from './api-transport';
import {
  mockProductCategories,
  mockProductDetail,
  mockProductGroups,
} from "./mock-product-catalog";
import { mockDeviceHelp } from "./mock-device-help";


export function requestUrl(base: string, req: HttpRequest) {
  const url = new URL(base.replace(/\/$/,'')+req.path);
  for(const [key,value] of Object.entries(req.query??{}))if(value!==undefined)url.searchParams.set(key,String(value));
  return url.toString();
}
export type HttpFetcher=(url:string,init?:RequestInit)=>Promise<Response>;
export class FetchHttpClient implements HttpClient {
  constructor(private base: string, private fetcher: HttpFetcher = (url, init) => globalThis.fetch(url, init), environment?: string) {
    validateApiBaseUrl(base, environment);
  }
  async request<T>(req: HttpRequest): Promise<HttpResponse<T>> {
    const response=await this.fetcher(requestUrl(this.base,req),{method:req.method, headers:{Accept:'application/json',...(req.body!==undefined?{'Content-Type':'application/json'}:{}),...req.headers}, body:req.body===undefined?undefined:JSON.stringify(req.body), signal:req.signal});
    const data=response.status===204 ? {success:true,code:0,message:'',data:{}} : await response.json();
    return {status:response.status,data:data as T,headers:Object.fromEntries(response.headers.entries())};
  }
}
export type HttpFault = 'none' | 'offline' | 'server' | 'timeout';
export class MockHttpClient implements HttpClient {
  fault: HttpFault = 'none';
  constructor(public db: MockDatabase) {}
  async request<T>(req: HttpRequest): Promise<HttpResponse<T>> {
    if(req.signal?.aborted)throw new DOMException('Cancelled','AbortError');
    if(this.fault==='offline')throw new ApiError(0,'网络不可用');
    if(this.fault==='timeout')throw new ApiError(0,'请求结果未知，请刷新核对');
    if(this.fault==='server')return {status:500,data:{success:false,code:500,message:'服务暂不可用',data:{}} as T,headers:{}};
    try {
      const {data,headers} = await this.db.transact(()=>this.route(req));
      if(req.signal?.aborted)throw new DOMException('Cancelled','AbortError');
      return {status:200,data:{success:true,code:0,message:'成功',data} as T,headers:headers??{}};
    } catch(error) {
      if(!(error instanceof ApiError))throw error;
      return {status:error.code>=400&&error.code<=599?error.code:400,data:{success:false,code:error.code,message:error.message,data:{}} as T,headers:{}};
    }
  }
  private route(req: HttpRequest): {data: unknown; headers?: Record<string,string>} {
    const {method,path,query={}}=req, b=(req.body??{}) as Record<string, unknown>, now=Date.now();
    const state=this.db.state, ok=(data: unknown={})=>({data});
    const text=(key:string)=>String(b[key]??'');
    if(path==='/api/app/config')return ok({configVersion:'mock-v1',features:{},minVersion:'1.0.0',thirdPartyProviders:[],support:{}});
    if(['/api/app/privacy','/api/app/serviceTerms'].includes(path))return ok({type:'text',content:`ROWAN ${path.endsWith('privacy')?'隐私政策':'用户协议'} · Mock 文本\n\n仅用于开发模拟。地区 ${query.regionCode??'US'}。请分别阅读到末尾后确认同意。`});
    if(path==='/api/app/captcha'&&method==='GET') {
      const email=String(query.account??''), kind=String(query.captchaType??'');
      if(!/^\S+@\S+\.\S+$/.test(email))throw new ApiError(400,'邮箱格式错误');
      const previous=state.captchas[email];if(previous&&now-previous.sentAt<60000)throw new ApiError(429,'请稍后再发送');
      state.captchas[email]={code:'123456',kind,expiresAt:now+300000,sentAt:now};return ok();
    }
    if(path.startsWith('/api/app/captcha/')&&method==='GET') { this.captcha(String(query.account),path.split('/').pop()!);return ok(); }
    if(path==='/api/app/user'&&method==='PUT') {
      this.captcha(text('account'),text('captcha'),'register');
      if(state.accounts.some(a=>a.email===text('account')))throw new ApiError(409,'无法注册此账号');
      if(text('password').length<8)throw new ApiError(400,'模拟注册密码至少8位');
      if(!['US','CN','TW'].includes(text('regionCode')))throw new ApiError(400,'请选择地区');
      const account={id:this.db.id('user'),email:text('account'),passwordHash:digest('mock-v1:'+text('password')),regionCode:text('regionCode'),setting:defaultSettings(),rooms:[],roomVersion:1};
      state.accounts.push(account);delete state.captchas[account.email];return ok(this.issue(account.id));
    }
    if(path==='/api/app/session'&&method==='POST') {
      const account=state.accounts.find(a=>a.email===text('account'));
      if(text('verify')==='captcha')this.captcha(text('account'),text('pin'),'login');
      else if(text('verify')!=='password'||!account||account.passwordHash!==digest('mock-v1:'+text('pin')))throw new ApiError(401,'账号或密码错误');
      if(!account)throw new ApiError(401,'账号或密码错误');
      if(text('verify')==='captcha')delete state.captchas[account.email];return ok(this.issue(account.id));
    }
    if(path==='/api/app/session'&&method==='PATCH') {
      const token=state.tokens[text('refreshToken')];
      if(!token||!token.refresh||token.userID!==text('userID')||token.expiresAt<now)throw new ApiError(401,'登录已失效');
      delete state.tokens[text('refreshToken')];return ok(this.issue(token.userID));
    }
    if(path==='/api/app/user/password'&&method==='PATCH') {
      this.captcha(text('account'),text('captcha'),'forget');
      const account=state.accounts.find(a=>a.email===text('account'));
      if(!account||text('password').length<8)throw new ApiError(400,'无法重置密码');
      account.passwordHash=digest('mock-v1:'+text('password'));for(const [key,value] of Object.entries(state.tokens))if(value.userID===account.id)delete state.tokens[key];delete state.captchas[account.email];return ok();
    }
    const productPath = path.match(
      /^\/api\/app\/products\/([^/]+)(?:\/(.*))?$/,
    );
    if (productPath?.[2] === "thing-model") {
      const product = products.find((product) => product.id === productPath[1]);
      if (!product) throw new ApiError(404, "产品不存在");
      return ok(thingModel(product.id));
    }
    if(productPath?.[2]==='connectHelping'&&!req.headers?.Authorization?.startsWith('Bearer '))throw new ApiError(401,'登录已失效');
    const catalogRequest = method === "GET" && (
      path === "/api/app/products/category" || path === "/api/app/products"
      || !!productPath && !productPath[2]
    );
    if (catalogRequest && !req.headers?.Authorization?.startsWith("Bearer ")) {
      throw new ApiError(401, "登录已失效");
    }
    const tokenValue=req.headers?.Authorization?.replace(/^Bearer /,''), token=tokenValue?state.tokens[tokenValue]:undefined;
    if(!token||token.refresh||token.expiresAt<now)throw new ApiError(401,'登录已失效');
    const userID=token.userID, account=this.db.account(userID);
    if (method === "GET" && path.startsWith("/api/app/products")) {
      const requestedLanguage = req.headers?.["Accept-Language"];
      const language =
        requestedLanguage === "en" || requestedLanguage === "zh-TW"
          ? requestedLanguage
          : "zh-CN";
      if (path === "/api/app/products/category") {
        return ok(mockProductCategories(products, language));
      }
      if (path === "/api/app/products") {
        return ok(mockProductGroups(products));
      }
      if (productPath && !productPath[2]) {
        const product = products.find(
          (product) => product.id === decodeURIComponent(productPath[1]),
        );
        if (!product) throw new ApiError(1091, "产品不存在");
        if (query.type !== "text")
          throw new ApiError(400, "模拟目录仅提供文本介绍");
        return ok(mockProductDetail(product, language));
      }
    }
    if(productPath?.[2]==='connectHelping'&&method==='GET') {
      if(!products.some(product=>product.id===productPath[1]))throw new ApiError(404,'产品不存在');
      const language=req.headers?.['Accept-Language'];
      const help=language==='en'
        ? {title:'Pairing help',content:'Put the device in pairing mode. Select a 2.4 GHz network, keep Bluetooth on, and follow the connection steps.'}
        : language==='zh-TW'
          ? {title:'配網幫助',content:'開啟裝置配網模式。選擇 2.4 GHz 網路，保持藍牙開啟，依照步驟連線。'}
          : {title:'配网帮助',content:'开启设备配网模式。选择 2.4 GHz 网络，保持蓝牙开启，按步骤连接。'};
      return ok({id:'help_pair',...help});
    }
    if(path==='/api/app/session'&&method==='DELETE') { for(const [key,value]of Object.entries(state.tokens))if(value.userID===userID)delete state.tokens[key];return ok(); }
    if(path==='/api/app/devices') {
      const devices=state.devices.filter(d=>d.members[userID]);
      return ok([...account.rooms.map(room=>({room:{id:room.id,name:room.name},devices:devices.filter(d=>d.members[userID].roomID===room.id).map(d=>this.db.view(d,userID))})),{room:{id:null,name:'未分房'},devices:devices.filter(d=>!d.members[userID].roomID).map(d=>this.db.view(d,userID))}]);
    }
    if(path==='/api/app/device/connection')return ok({certificationURL:'https://mock.rowan.invalid/device/certification',activationURL:'https://mock.rowan.invalid/device/activation',bindingURL:'https://mock.rowan.invalid/enduser/bindDevice/',otaURL:'https://mock.rowan.invalid/ota/updatecheck/'});
    if(path==='/api/app/device/bindStatus') {
      const result=state.binds[String(query.bindCode)];if(!result||result.userID!==userID)throw new ApiError(1123,'绑定码不存在或已过期');return ok(result);
    }
    const binding=path.match(/^\/api\/app\/device\/([^/]+)\/user$/);
    if (binding && method === "PUT") {
      const bindingDeviceID = decodeURIComponent(binding[1]);
      const device = state.devices.find((item) => item.id === bindingDeviceID);
      if (!device) throw new ApiError(1132, "绑定设备不存在");
      const code = text("bindCode");
      const share = state.shares[code];
      if (!share || share.expiresAt <= now || share.usedBy) {
        throw new ApiError(1133, "绑定码不存在或已过期");
      }
      if (share.deviceID !== bindingDeviceID) {
        throw new ApiError(1131, "绑定码与设备不匹配");
      }
      const existing = device.members[userID];
      if (!existing) {
        device.members[userID] = {
          role: Object.keys(device.members).length === 0 ? "sa" : "mbr",
          nickname: device.name,
          roomID: null,
        };
      }
      delete state.shares[code];
      return ok({
        userID,
        deviceID: device.id,
        bindingRole: device.members[userID].role,
      });
    }
    if(path==='/api/app/user/setting') {
      if(method==='GET')return ok(account.setting);
      const allowed=['language','notification','theme','temperatureUnit','measurementSystem'];
      for(const k of Object.keys(b))if(!allowed.includes(k))throw new ApiError(400,'未定义的偏好选项');
      if(b.language&&!['zh-CN','zh-TW','en'].includes(String(b.language))||b.theme&&!['system','light','dark'].includes(String(b.theme))||b.temperatureUnit&&!['C','F'].includes(String(b.temperatureUnit))||b.measurementSystem&&!['metric','imperial'].includes(String(b.measurementSystem)))throw new ApiError(400,'偏好值无效');
      if(b.notification!==undefined&&typeof b.notification!=='boolean')throw new ApiError(400,'通知值无效');
      Object.assign(account.setting,b);return ok();
    }
    if(path==='/api/app/user/locations') {
      if(method==='GET')return {data:account.rooms.map(r=>({...r,version:account.roomVersion,updatedAt:new Date(account.roomVersion*1000).toISOString(),deviceCount:state.devices.filter(d=>d.members[userID]?.roomID===r.id).length}))};
      if(method==='POST') { const name=this.roomName(text('name'),userID);account.rooms.push({id:this.db.id('room'),name,isDefault:false});account.roomVersion++;return ok(); }
      if(method==='PUT') {
        const rooms=b.rooms as {id:string;name:string;version:number;updatedAt:string}[];if(!Array.isArray(rooms))throw new ApiError(400,'房间列表无效');
        if(rooms.some(r=>r.version!==account.roomVersion||r.updatedAt!==new Date(account.roomVersion*1000).toISOString()))throw new ApiError(409,'房间已变化，请刷新后重新编辑');
        if(new Set(rooms.map(r=>r.id)).size!==rooms.length||rooms.some(r=>!account.rooms.some(a=>a.id===r.id)))throw new ApiError(400,'房间标识无效');
        const names=rooms.map(r=>r.name.trim());if(names.some(n=>!n)||new Set(names).size!==names.length)throw new ApiError(1432,'房间名称不可为空或重复');
        for(const r of account.rooms)if(!rooms.some(x=>x.id===r.id)&&(r.isDefault||state.devices.some(d=>d.members[userID]?.roomID===r.id)))throw new ApiError(409,'房间内仍有设备或为默认房间');
        account.rooms=rooms.map(r=>({...account.rooms.find(x=>x.id===r.id)!,name:r.name.trim()}));account.roomVersion++;return ok();
      }
    }
    const room=path.match(/^\/api\/app\/user\/locations\/([^/]+)$/);
    if(room&&method==='PATCH') { const r=account.rooms.find(r=>r.id===room[1]);if(!r)throw new ApiError(1431,'房间已失效');r.name=this.roomName(text('name'),userID,r.id);account.roomVersion++;return ok(); }
    const dev=path.match(/^\/api\/app\/devices\/([^/]+)(?:\/(.*))?$/);
    if(!dev)throw new ApiError(404,'Mock 未定义此接口');
    const deviceID = decodeURIComponent(dev[1]);
    const suffix = dev[2] ?? "";
    let d: ReturnType<MockDatabase["device"]>;
    try {
      d = this.db.device(
        deviceID,
        userID,
        method !== "GET" && suffix !== "users/self" && !suffix.startsWith("ota/"),
      );
    } catch (error) {
      if (
        error instanceof ApiError &&
        (suffix === "users" || suffix.startsWith("users/"))
      ) {
        const memberList = suffix === "users";
        const selfUnbind = suffix === "users/self";
        if (error.code === 404) {
          throw new ApiError(
            selfUnbind ? 1361 : memberList ? 1351 : 1371,
            "设备不存在",
          );
        }
        if (error.code === 403) {
          throw new ApiError(
            selfUnbind ? 1362 : memberList ? 1352 : 1372,
            selfUnbind ? "您没有绑定这台设备" : "没有设备成员权限",
          );
        }
      }
      if (suffix === "helping" && error instanceof ApiError) {
        if (error.code === 404) {
          throw new ApiError(1451, "设备不存在");
        }
        if (error.code === 403) {
          throw new ApiError(1452, "您没有绑定这台设备");
        }
      }
      if (suffix === "bindCode" && error instanceof ApiError) {
        if (error.code === 404) throw new ApiError(1461, "设备不存在");
        if (error.code === 403) throw new ApiError(1462, "您没有绑定这台设备");
      }
      throw error;
    }
    const member = d.members[userID];
    const admin=()=>{if(member.role!=='sa')throw new ApiError(403,'仅管理员可执行');};
    if(!suffix) { if(method==='PATCH'){ if(!text('nickname').trim()||text('nickname').length>20)throw new ApiError(400,'昵称需1～20字符');member.nickname=text('nickname');return ok(); }return ok(this.db.view(d,userID)); }
    if(suffix==='mqtt')return ok({host:'wss://mock.rowan.invalid/mqtt',endpoint:'mock.rowan.invalid',path:'/mqtt',clientID:this.db.id('mqtt'),username:userID,password:'mock-temporary',deviceID:d.id});
    if(suffix==='users/self'&&method==='DELETE'){delete d.members[userID];return ok();}
    if (suffix === "users" && method === "GET") {
      return ok(
        Object.entries(d.members).map(([id, binding]) => ({
          userID: id,
          nickname: null,
          bindingRole: binding.role,
        })),
      );
    }
    if (suffix.startsWith("users/") && method === "DELETE") {
      if (member.role !== "sa") {
        throw new ApiError(1372, "您不是这台设备的管理员");
      }
      const targetID = decodeURIComponent(suffix.slice(6));
      if (!d.members[targetID]) {
        throw new ApiError(1373, "该用户没有绑定这台设备");
      }
      if (d.members[targetID].role !== "mbr") {
        throw new ApiError(403, "只能移除普通成员");
      }
      delete d.members[targetID];
      return ok();
    }
    if (suffix === "bindCode" && method === "GET") {
      admin();
      const code = this.db.id("share");
      const expiresAt = now + 600000;
      state.shares[code] = { deviceID: d.id, expiresAt };
      return ok({
        deviceID: d.id,
        bindCode: code,
        expiresAt: new Date(expiresAt).toISOString(),
      });
    }
    if(suffix==='location') {
      if(method==='PUT'){const id=text('id')||null;if(id&&!account.rooms.some(r=>r.id===id))throw new ApiError(1431,'房间已失效');member.roomID=id;}
      return ok(account.rooms.find(r=>r.id===member.roomID)??{id:null,name:'未分房'});
    }
    if (suffix === "helping" && method === "GET") {
      if (query.type !== "text") {
        throw new ApiError(400, "模拟设备帮助仅提供文本内容");
      }
      const requestedLanguage = req.headers?.["Accept-Language"];
      const language =
        requestedLanguage === "en" || requestedLanguage === "zh-TW"
          ? requestedLanguage
          : "zh-CN";
      return ok(mockDeviceHelp(language));
    }
    if (suffix.startsWith('ota/')) {
      const type = (query.type ?? suffix.split('/')[1]) as 'mcu' | 'wifi';
      if ((suffix === 'ota/mcu' || suffix === 'ota/wifi') && method === 'GET') {
        const hasUpdate = d[type === 'mcu' ? 'mcuVersion' : 'wifiVersion'] !== '2.0.0';
        return ok({
          hasUpdate,
          firmware: hasUpdate
            ? { id: `fw_${type}_2`, version: '2.0.0', remark: 'Mock 固件更新' }
            : null,
          device: { id: d.id, name: d.name, mac: d.mac },
        });
      }
      if (suffix === 'ota/task' && method === 'PUT') {
        if (!d.online) throw new ApiError(1512, '设备离线');
        if (!['mcu', 'wifi'].includes(type) || text('firmwareID') !== `fw_${type}_2`) {
          throw new ApiError(1515, '固件不匹配');
        }
        const running = Object.entries(state.tasks).find(([, task]) =>
          task.deviceID === d.id && task.result === 'updating');
        if (running) {
          if (running[1].type !== type) throw new ApiError(409, '设备已有其他类型升级任务');
          return ok({ taskID: running[0] });
        }
        const taskID = this.db.id('ota');
        state.tasks[taskID] = {
          deviceID: d.id,
          type,
          firmwareID: text('firmwareID'),
          result: 'updating',
          polls: 0,
          startedAt: new Date(now).toISOString(),
        };
        return ok({ taskID });
      }
      const task = state.tasks[method === 'DELETE' ? text('taskID') : suffix.split('/')[2]];
      if (!task || task.deviceID !== d.id) throw new ApiError(1533, '升级任务不存在');
      if (method === 'DELETE') {
        if (task.result !== 'updating') throw new ApiError(400, '任务已结束，无法取消');
        task.result = 'cancelled';
        task.finishedAt = new Date(now).toISOString();
        return ok();
      }
      if (method !== 'GET') throw new ApiError(405, '不支持的升级操作');
      if (task.result === 'updating' && ++task.polls >= 3) {
        task.result = 'success';
        task.finishedAt = new Date(now).toISOString();
        d[task.type === 'mcu' ? 'mcuVersion' : 'wifiVersion'] = '2.0.0';
      }
      const status = task.result === 'updating'
        ? task.polls === 0 ? 'waiting' : task.polls === 1 ? 'downloading' : 'upgrading'
        : task.result;
      return ok({
        result: task.result,
        status,
        progress: task.result === 'success' ? 100 : task.result === 'updating' ? task.polls * 30 : 0,
        startedAt: task.startedAt ?? new Date(now).toISOString(),
        ...(task.finishedAt ? { finishedAt: task.finishedAt } : {}),
        updatedAt: new Date(now).toISOString(),
      });
    }
    if(suffix.startsWith('schedules')) {
      const list=state.schedules[d.id]??(state.schedules[d.id]=[]), parts=suffix.split('/');
      if(parts.length===1&&method==='GET')return ok(list);
      const existing=list.find(s=>s.id===parts[1]);
      if(parts.length>1&&!existing)throw new ApiError(404,'日程不存在');
      if(method==='DELETE'){state.schedules[d.id]=list.filter(s=>s!==existing);return ok();}
      if(parts[2]==='enabled'){if(typeof b.enabled!=='boolean')throw new ApiError(400,'状态无效');existing!.enabled=b.enabled;existing!.nextExecutionAt=nextExecution(existing!);return ok({enabled:b.enabled});}
      const schedule={enabled:true,name:'',weekdays:[],...existing,...b,id:existing?.id??this.db.id('schedule')} as Schedule;
      if(existing&&schedule.timeZone!==existing.timeZone)throw new ApiError(400,'创建后不可修改日程时区');
      schedule.weekdays=[...new Set(schedule.weekdays)].sort();validateSchedule(schedule);
      validateProperties(d.productID,schedule.action);
      schedule.nextExecutionAt=nextExecution(schedule);
      if(existing)Object.assign(existing,schedule);else list.push(schedule);return ok(schedule);
    }
    throw new ApiError(404,'Mock 未定义此接口');
  }
  private issue(userID:string) {
    const accessToken=this.db.id('access'),refreshToken=this.db.id('refresh'),now=Date.now();
    this.db.state.tokens[accessToken]={userID,expiresAt:now+3600000,refresh:false};this.db.state.tokens[refreshToken]={userID,expiresAt:now+604800000,refresh:true};
    return {accessToken,refreshToken,expiresIn:604800,tokenType:'bearer',userID,setting:this.db.account(userID).setting};
  }
  private captcha(email:string,code:string,kind?:string) {
    const c=this.db.state.captchas[email];if(!c||c.code!==code||c.expiresAt<Date.now()||kind&&c.kind!==kind)throw new ApiError(400,'验证码无效或已过期');
  }
  private roomName(name:string,userID:string,except?:string) {
    name=name.trim();if(!name||this.db.account(userID).rooms.some(r=>r.id!==except&&r.name===name))throw new ApiError(1432,'房间名称不可为空或重复');return name;
  }
}
export function thingModel(productID:string) {
  const humidity=productID==='prd_humidity';
  return {version:'mock-v1',attributes:[
    {identifier:'Power',type:'number',writable:true,min:0,max:1,step:1},
    {identifier:humidity?'TargetHumidity':'TargetTemperature',type:'number',writable:true,min:humidity?30:5,max:humidity?80:22,step:1,unit:humidity?'%':'C'},
    {identifier:humidity?'CurrentHumidity':'CurrentTemperature',type:'number',writable:false,unit:humidity?'%':'C'},
    {identifier:'Mode',type:'enum',writable:true,values:['normal','sleep','auto']},
    {identifier:'Light',type:'number',writable:true,min:0,max:1,step:1},
    {identifier:'Brightness',type:'number',writable:true,min:0,max:100,step:1},
    {identifier:'ChildLock',type:'number',writable:true,min:0,max:1,step:1},
    {identifier:'Mute',type:'boolean',writable:true},
    {identifier:'CleanHours',type:'number',writable:false,unit:'h'},
  ],services:[{identifier:'CleanReset'}],events:[{identifier:'Alarm',level:'warning'},{identifier:'AlarmRecovered',level:'info'}]};
}
export function validateProperties(productID:string,values:Record<string,unknown>) {
  for(const [key,value]of Object.entries(values)) {
    const a=thingModel(productID).attributes.find(a=>a.identifier===key);
    if(!a?.writable)throw new ApiError(400,'未知或只读属性');
    validateAttributeValue(a as Attribute,value);
  }
}
