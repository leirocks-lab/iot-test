import type { HttpClient, HttpRequest, HttpResponse } from '../lib/core';
import { ApiError, type Schedule } from './models';
import { MockDatabase, defaultSettings, digest, products } from './store';
import { nextExecution, validateSchedule } from './scheduler';

export function requestUrl(base: string, req: HttpRequest) {
  const url = new URL(base.replace(/\/$/,'')+req.path);
  for(const [key,value] of Object.entries(req.query??{}))if(value!==undefined)url.searchParams.set(key,String(value));
  return url.toString();
}
export class FetchHttpClient implements HttpClient {
  constructor(private base: string, private fetcher: typeof fetch = fetch) {
    if(!/^https:\/\//.test(base))throw new Error('真实 API 必须配置 HTTPS 地址');
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
    if(path==='/api/app/products/category')return ok(products.map(p=>({name:p.category,value:p.category})));
    if(path==='/api/app/products')return ok(products.map(p=>({category:p.category,categoryName:{'zh-CN':p.category,'zh-TW':p.category,en:p.category},products:[p]})));
    const productPath=path.match(/^\/api\/app\/products\/([^/]+)(?:\/(.*))?$/);
    if(productPath) {
      const p=products.find(p=>p.id===productPath[1]);if(!p)throw new ApiError(404,'产品不存在');
      if(productPath[2]==='thing-model')return ok(thingModel(p.id));
      if(productPath[2]==='connectHelping')return ok({id:'help_pair',title:'配网帮助',content:'开启设备配网模式。选择 2.4 GHz 网络，保持蓝牙开启，按步骤连接。'});
      return ok({...p,parameters:{},introduction:'ROWAN 智能家居设备 · Mock 产品'});
    }
    const tokenValue=req.headers?.Authorization?.replace(/^Bearer /,''), token=tokenValue?state.tokens[tokenValue]:undefined;
    if(!token||token.refresh||token.expiresAt<now)throw new ApiError(401,'登录已失效');
    const userID=token.userID, account=this.db.account(userID);
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
    if(binding&&method==='PUT') {
      const share=state.shares[text('bindCode')];
      if(!share||share.deviceID!==binding[1]||share.expiresAt<now||share.usedBy&&share.usedBy!==userID)throw new ApiError(400,'分享码无效或已过期');
      const device=state.devices.find(d=>d.id===binding[1]);if(!device)throw new ApiError(404,'设备不存在');
      if(device.members[userID])return ok({userID,deviceID:device.id,bindingRole:device.members[userID].role});
      device.members[userID]={role:'mbr',nickname:device.name,roomID:null};share.usedBy=userID;return ok({userID,deviceID:device.id,bindingRole:'mbr'});
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
      if(method==='GET')return {data:account.rooms.map(r=>({...r,deviceCount:state.devices.filter(d=>d.members[userID]?.roomID===r.id).length})),headers:{etag:String(account.roomVersion)}};
      if(method==='POST') { const name=this.roomName(text('name'),userID);account.rooms.push({id:this.db.id('room'),name,isDefault:false});account.roomVersion++;return ok(); }
      if(method==='PUT') {
        if(req.headers?.['If-Match']!==String(account.roomVersion))throw new ApiError(409,'房间已变化，请刷新后重新编辑');
        const rooms=b.rooms as {id:string;name:string}[];if(!Array.isArray(rooms))throw new ApiError(400,'房间列表无效');
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
    const d=this.db.device(dev[1],userID,method!=='GET'&&dev[2]!=='users/self'), suffix=dev[2]??'', member=d.members[userID];
    const admin=()=>{if(member.role!=='sa')throw new ApiError(403,'仅管理员可执行');};
    if(!suffix) { if(method==='PATCH'){ if(!text('nickname').trim()||text('nickname').length>20)throw new ApiError(400,'昵称需1～20字符');member.nickname=text('nickname');return ok(); }return ok(this.db.view(d,userID)); }
    if(suffix==='mqtt')return ok({host:'wss://mock.rowan.invalid/mqtt',endpoint:'mock.rowan.invalid',path:'/mqtt',clientID:this.db.id('mqtt'),username:userID,password:'mock-temporary',deviceID:d.id});
    if(suffix==='users/self'&&method==='DELETE'){delete d.members[userID];return ok();}
    if(suffix==='users')return ok(Object.entries(d.members).map(([id,m])=>({userID:id,email:state.accounts.find(a=>a.id===id)?.email?.replace(/^(.).+(@.*)$/,'$1***$2')??'',nickname:id,bindingRole:m.role})));
    if(suffix.startsWith('users/')&&method==='DELETE'){admin();const id=suffix.slice(6);if(d.members[id]?.role!=='mbr')throw new ApiError(403,'只能移除普通成员');delete d.members[id];return ok();}
    if(suffix==='bindCode'){admin();const code=this.db.id('share');state.shares[code]={deviceID:d.id,expiresAt:now+300000};return ok({deviceID:d.id,bindCode:code});}
    if(suffix==='location') {
      if(method==='PUT'){const id=text('id')||null;if(id&&!account.rooms.some(r=>r.id===id))throw new ApiError(1431,'房间已失效');member.roomID=id;}
      return ok(account.rooms.find(r=>r.id===member.roomID)??{id:null,name:'未分房'});
    }
    if(suffix==='helping')return ok({id:'help_device',title:'设备手册与 FAQ',content:'保持设备通风。控制成功以设备回报为准。配网需 2.4 GHz Wi-Fi。清洁前关闭电源。'});
    if(suffix.startsWith('ota/')) {
      admin();const type=(query.type??suffix.split('/')[1]) as 'mcu'|'wifi';
      if(suffix==='ota/mcu'||suffix==='ota/wifi')return ok({firmware:d[type==='mcu'?'mcuVersion':'wifiVersion']==='2.0.0'?null:{id:`fw_${type}_2`,version:'2.0.0',remark:'Mock 固件更新'},device:{id:d.id,name:d.name,mac:d.mac}});
      if(suffix==='ota/task'&&method==='PUT') {
        if(!['mcu','wifi'].includes(type)||text('firmwareID')!==`fw_${type}_2`)throw new ApiError(400,'固件不匹配');
        if(Object.values(state.tasks).some(t=>t.deviceID===d.id&&t.result==='updating'))throw new ApiError(409,'已有升级任务');
        const taskID=this.db.id('ota');state.tasks[taskID]={deviceID:d.id,type,firmwareID:text('firmwareID'),result:'updating',polls:0};return ok({taskID});
      }
      const task=state.tasks[method==='DELETE'?text('taskID'):suffix.split('/')[2]];
      if(!task||task.deviceID!==d.id)throw new ApiError(404,'升级任务不存在');
      if(method==='DELETE'){if(task.result!=='updating'||task.polls>=2)throw new ApiError(409,'当前状态不可取消');task.result='cancelled';return ok();}
      if(task.result==='updating'&&++task.polls>=3){task.result='success';d[task.type==='mcu'?'mcuVersion':'wifiVersion']='2.0.0';}
      return ok({result:task.result});
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
    {identifier:'CleanHours',type:'number',writable:false},
  ],services:[{identifier:'CleanReset'}],events:[{identifier:'Alarm',level:'warning'}]};
}
export function validateProperties(productID:string,values:Record<string,unknown>) {
  for(const [key,value]of Object.entries(values)) {
    const a=thingModel(productID).attributes.find(a=>a.identifier===key);
    if(!a?.writable)throw new ApiError(400,'未知或只读属性');
    if(a.type==='enum'&&!a.values?.includes(String(value)))throw new ApiError(400,'模式不支持');
    if(a.type==='number'&&(typeof value!=='number'||!Number.isFinite(value)||value<a.min!||value>a.max!||(value-a.min!) % a.step! !== 0))throw new ApiError(400,'属性值超出范围或步长');
  }
}
