import type { HttpClient, HttpRequest, HttpResponse } from '../lib/core';
import { ApiError, type ApiEnvelope, type DeviceView, type HomeGroup, type KeyValueStorage, type Language, type Product, type Room, type Schedule, type ScheduleInput, type Session, type Settings, type ThingModel } from './models';

export class RowanService {
  session: Session | null = null;
  private epoch = 0;
  private sessionListeners=new Set<()=>void>();
  onSessionChange(listener:()=>void){this.sessionListeners.add(listener);return ()=>{this.sessionListeners.delete(listener);};}
  private sessionChanged(){for(const listener of this.sessionListeners)listener();}
  async clearLocal(){await this.clear();}
  private refreshTask?: Promise<void>;
  private storageQueue: Promise<unknown> = Promise.resolve();
  private settingQueue: Promise<unknown> = Promise.resolve();
  constructor(private http: HttpClient, private storage: KeyValueStorage) {}
  get userID() { if(!this.session)throw new ApiError(401,'请先登录');return this.session.userID; }
  get language(): Language { return this.session?.setting.language??'zh-CN'; }
  private persist(work:()=>Promise<void>) {
    const result=this.storageQueue.then(work);this.storageQueue=result.catch(()=>undefined);return result;
  }
  async restore() {
    const round=this.epoch;
    try {
      const raw=await this.storage.get('session');
      if(round!==this.epoch)return;
      if(!raw)return;
      const session=JSON.parse(raw) as Session;
      if(!session.accessToken||!session.refreshToken||!session.userID)throw new ApiError(401,'会话不完整');
      this.session=session;await this.refresh();
    } catch { if(round===this.epoch)await this.clear(); }
  }
  private async response<T>(req:HttpRequest,retry=true):Promise<HttpResponse<ApiEnvelope<T>>> {
    const epoch=this.epoch;
    const response=await this.http.request<ApiEnvelope<T>>({...req,headers:{'Accept-Language':this.language,...(this.session?{Authorization:'Bearer '+this.session.accessToken}:{}),...req.headers}});
    if(epoch!==this.epoch||req.signal?.aborted)throw new ApiError(499,'操作已取消');
    const data=response.data;
    if((response.status===401||data.code===401)&&retry&&this.session){await this.refresh();return this.response<T>(req,false);}
    if(response.status>=400||!data.success||data.code!==0)throw new ApiError(data.code||response.status,data.message||'服务异常');
    return response;
  }
  async request<T>(req:HttpRequest,retry=true):Promise<T>{return (await this.response<T>(req,retry)).data.data;}
  private async save(session:Session,round:number) {
    if(round!==this.epoch)throw new ApiError(499,'操作已取消');
    await this.persist(async()=>{if(round!==this.epoch)throw new ApiError(499,'操作已取消');await this.storage.set('session',JSON.stringify(session));});
    if(round!==this.epoch)throw new ApiError(499,'操作已取消');
    this.session=session;this.sessionChanged();
  }
  async login(account:string,pin:string,verify:'password'|'captcha',signal?:AbortSignal) {
    if(!/^\S+@\S+\.\S+$/.test(account)||!pin)throw new ApiError(400,'请输入有效邮箱及密码/验证码');
    const round=++this.epoch;this.refreshTask=undefined;
    const response=await this.http.request<ApiEnvelope<Session>>({method:'POST',path:'/api/app/session',body:{account,pin,verify,language:this.language},signal});
    if(signal?.aborted||round!==this.epoch)throw new ApiError(499,'操作已取消');
    if(!response.data.success||response.status>=400)throw new ApiError(response.data.code,response.data.message);
    const session=response.data.data;
    if(!session.accessToken||!session.refreshToken||!session.userID)throw new ApiError(500,'会话响应不完整');
    await this.save(session,round);
  }
  cancelAuthentication() { this.epoch++;this.refreshTask=undefined; }
  async refresh() {
    if(this.refreshTask)return this.refreshTask;
    const current=this.session,round=this.epoch;if(!current)throw new ApiError(401,'请先登录');
    const task=(async()=>{
      const response=await this.http.request<ApiEnvelope<Partial<Session>>>({method:'PATCH',path:'/api/app/session',body:{userID:current.userID,refreshToken:current.refreshToken}});
      if(round!==this.epoch)throw new ApiError(499,'会话已变更');
      if(!response.data.success||response.status>=400){await this.clear();throw new ApiError(401,'登录已失效');}
      if(!response.data.data.accessToken||!response.data.data.refreshToken)throw new ApiError(500,'刷新响应不完整');
      await this.save({...current,...response.data.data,userID:current.userID},round);
    })();
    this.refreshTask=task;
    try { await task; } catch(error) { if(round===this.epoch)await this.clear();throw error; }
    finally { if(this.refreshTask===task)this.refreshTask=undefined; }
  }
  private async clear() { this.epoch++;this.refreshTask=undefined;this.session=null;this.sessionChanged();await this.persist(()=>this.storage.remove('session')); }
  async logout() { await this.request({method:'DELETE',path:'/api/app/session'},false);await this.clear(); }
  async sendCaptcha(account:string,captchaType:'register'|'login'|'forget') { return this.request({method:'GET',path:'/api/app/captcha',query:{account,accountType:'email',captchaType}}); }
  async checkCaptcha(account:string,code:string) { return this.request({method:'GET',path:'/api/app/captcha/'+encodeURIComponent(code),query:{account,accountType:'email'}}); }
  async register(account:string,password:string,captcha:string,regionCode:string) {
    await this.request({method:'PUT',path:'/api/app/user',body:{account,password,captcha,type:'email',regionCode,language:this.language}},false);
  }
  async resetPassword(account:string,password:string,captcha:string) { await this.request({method:'PATCH',path:'/api/app/user/password',body:{account,password,captcha}},false); }
  async config(platform:string) {return this.request<{configVersion:string}>({method:'GET',path:'/api/app/config',query:{brandId:'rowan',platform,appVersion:'1.0.0',language:this.language}});}
  async agreement(kind:'privacy'|'serviceTerms',regionCode:string) {return this.request<{type:string;content:string}>({method:'GET',path:'/api/app/'+kind,query:{type:'text',brandId:'rowan',regionCode}});}
  async home() {return this.request<HomeGroup[]>({method:'GET',path:'/api/app/devices'});}
  async device(id:string) {return this.request<DeviceView>({method:'GET',path:`/api/app/devices/${encodeURIComponent(id)}`});}
  async products() {return this.request<{category:string;products:Product[]}[]>({method:'GET',path:'/api/app/products',query:{brandId:'rowan'}});}
  async product(id:string) {return this.request<Product>({method:'GET',path:`/api/app/products/${encodeURIComponent(id)}`,query:{type:'text'}});}
  async model(productID:string) {return this.request<ThingModel>({method:'GET',path:`/api/app/products/${encodeURIComponent(productID)}/thing-model`});}
  async mqtt(id:string){return this.request<Record<string,string>>({method:'GET',path:`/api/app/devices/${encodeURIComponent(id)}/mqtt`});}
  async connection() {return this.request<Record<string,string>>({method:'GET',path:'/api/app/device/connection'});}
  async bindStatus(bindCode:string) {return this.request<{deviceID:string;userID:string;bindingRole:string}>({method:'GET',path:'/api/app/device/bindStatus',query:{bindCode}});}
  async renameDevice(id:string,nickname:string) {return this.request({method:'PATCH',path:`/api/app/devices/${id}`,body:{nickname}});}
  async unbind(id:string) {return this.request({method:'DELETE',path:`/api/app/devices/${id}/users/self`});}
  async rooms() {
    const response=await this.response<Room[]>({method:'GET',path:'/api/app/user/locations'});
    return {rooms:response.data.data,version:response.headers.etag??response.headers.ETag??''};
  }
  async createRoom(name:string) {return this.request({method:'POST',path:'/api/app/user/locations',body:{name}});}
  async renameRoom(id:string,name:string) {return this.request({method:'PATCH',path:`/api/app/user/locations/${id}`,body:{name}});}
  async saveRooms(rooms:Room[],version:string) {return this.request({method:'PUT',path:'/api/app/user/locations',body:{rooms:rooms.map(({id,name})=>({id,name}))},headers:{'If-Match':version}});}
  async moveDevice(id:string,roomID:string|null) {return this.request({method:'PUT',path:`/api/app/devices/${id}/location`,body:{id:roomID}});}
  async location(id:string) {return this.request<{id:string|null;name:string}>({method:'GET',path:`/api/app/devices/${id}/location`});}
  async settings() {return this.request<Settings>({method:'GET',path:'/api/app/user/setting'});}
  async updateSettings(patch:Partial<Settings>) {
    const round=this.epoch;
    const task=this.settingQueue.then(async()=>{
      if(round!==this.epoch)throw new ApiError(499,'会话已变更');
      await this.request({method:'PATCH',path:'/api/app/user/setting',body:patch});
      const setting=await this.settings();if(this.session)await this.save({...this.session,setting},round);return setting;
    });
    this.settingQueue=task.catch(()=>undefined);return task;
  }
  async schedules(id:string) {return this.request<Schedule[]>({method:'GET',path:`/api/app/devices/${id}/schedules`});}
  async saveSchedule(id:string,input:ScheduleInput) {
    const {id:scheduleID,nextExecutionAt:_,...body}=input;
    return this.request<Schedule>({method:scheduleID?'PATCH':'POST',path:`/api/app/devices/${id}/schedules${scheduleID?'/'+scheduleID:''}`,body});
  }
  async enableSchedule(id:string,scheduleID:string,enabled:boolean) {return this.request({method:'PUT',path:`/api/app/devices/${id}/schedules/${scheduleID}/enabled`,body:{enabled}});}
  async deleteSchedule(id:string,scheduleID:string) {return this.request({method:'DELETE',path:`/api/app/devices/${id}/schedules/${scheduleID}`});}
  async members(id:string) {return this.request<{userID:string;email:string;nickname:string;bindingRole:string}[]>({method:'GET',path:`/api/app/devices/${id}/users`});}
  async removeMember(id:string,userID:string) {return this.request({method:'DELETE',path:`/api/app/devices/${id}/users/${userID}`});}
  async share(id:string) {return this.request<{deviceID:string;bindCode:string}>({method:'GET',path:`/api/app/devices/${id}/bindCode`});}
  async acceptShare(id:string,bindCode:string) {return this.request({method:'PUT',path:`/api/app/device/${id}/user`,body:{bindCode}});}
  async help(id:string,product=false) {return this.request<{title:string;content:string}>({method:'GET',path:product?`/api/app/products/${id}/connectHelping`:`/api/app/devices/${id}/helping`,query:{type:'text'}});}
  async firmware(id:string,type:'mcu'|'wifi') {return this.request<{firmware:{id:string;version:string;remark:string}|null}>({method:'GET',path:`/api/app/devices/${id}/ota/${type}`});}
  async startOta(id:string,type:'mcu'|'wifi',firmwareID:string) {return this.request<{taskID:string}>({method:'PUT',path:`/api/app/devices/${id}/ota/task`,query:{type},body:{firmwareID}});}
  async otaTask(id:string,taskID:string) {return this.request<{result:'updating'|'success'|'failed'|'cancelled'}>({method:'GET',path:`/api/app/devices/${id}/ota/task/${taskID}`});}
  async cancelOta(id:string,taskID:string) {return this.request({method:'DELETE',path:`/api/app/devices/${id}/ota/task`,body:{taskID}});}
  async preference(key:string,value?:string) {const scoped=`${this.userID}.${key}`;if(value!==undefined)await this.storage.set(scoped,value);return this.storage.get(scoped);}
}
