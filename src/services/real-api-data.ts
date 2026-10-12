import type { HttpRequest } from '../lib/core';
import { ApiError, type ApiEnvelope, type DeviceView, type HelpArticle, type HomeGroup, type Product, type ThingModel } from './models';

type ObjectValue = Record<string, unknown>;
function object(value:unknown):ObjectValue {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new ApiError(502,'服务端响应结构不完整');
  return value as ObjectValue;
}
function array(value:unknown):unknown[] {
  if(!Array.isArray(value))throw new ApiError(502,'服务端响应不是列表');
  return value;
}
function id(value:unknown):string {
  if(typeof value!=='string'||!value)throw new ApiError(502,'服务端响应缺少有效标识');
  return value;
}
const text=(value:unknown)=>typeof value==='string'?value:undefined;
function strings(value:unknown):string[] {
  if(!Array.isArray(value)||value.some(item=>typeof item!=='string'))throw new ApiError(502,'产品列表字段格式不支持');
  return value as string[];
}
function image(value:unknown):string {
  if(value===undefined||value===null)return '';
  return strings(value)[0]??'';
}

export function realEnvelope(value:unknown,status:number):ApiEnvelope<unknown> {
  const wire=object(value);
  const code=typeof wire.code==='number'&&Number.isFinite(wire.code)?wire.code:status>=400?status:undefined;
  if(code===undefined)throw new ApiError(502,'服务端响应缺少业务结果码');
  return {code,message:text(wire.message)??text(wire.msg)??'服务响应异常',
    success:status<400&&code===0&&wire.success!==false,data:wire.data};
}

function product(value:unknown,category?:string):Product {
  const wire=object(value),productID=id(wire.id);
  const configTypes=wire.configType===undefined?undefined:strings(wire.configType);
  return {id:productID,name:text(wire.name)??productID,category:text(wire.category)??category??'',
    seriesName:text(wire.seriesName)??'',modelName:text(wire.modelName)??'',image:image(wire.image),buyLink:text(wire.buyLink)??'',
    configTypes,connectType:text(wire.connectType),cloudPlatform:text(wire.cloudPlatform),
    ...(typeof wire.bluetooth==='boolean'?{bluetooth:wire.bluetooth}:{}),
    ...(typeof wire.recommended==='boolean'?{recommended:wire.recommended}:{}),
    ...(typeof wire.sort==='number'&&Number.isFinite(wire.sort)?{sort:wire.sort}:{}),};
}
function device(value:unknown):DeviceView {
  const wire=object(value),metadata=object(wire.device),deviceID=id(metadata.id);
  if(!['sa','mbr','obs'].includes(String(wire.bindingRole)))throw new ApiError(502,'设备绑定角色未确认');
  const p=wire.product===null||wire.product===undefined?null:object(wire.product);
  return {deviceNickname:text(wire.deviceNickname)??text(metadata.name)??deviceID,
    bindingRole:wire.bindingRole as DeviceView['bindingRole'],bindingAt:text(wire.bindingAt)??'',
    ...(typeof wire.online==='boolean'?{online:wire.online}:{}),
    device:{...metadata,id:deviceID},
    product:p?{id:id(p.id),...(text(p.name)!==undefined?{name:text(p.name)}:{}),category:text(p.category),
      seriesName:text(p.seriesName),modelName:text(p.modelName),image:image(p.image)}:null};
}
function home(value:unknown):HomeGroup[] {
  return array(value).map(item=>{const group=object(item);
    const room=group.room===null?null:object(group.room);
    if(room&&room.id!==null&&typeof room.id!=='string')throw new ApiError(502,'房间归属标识未确认');
    return {room:room?{id:room.id as string|null,name:text(room.name)??''}:null,devices:array(group.devices).map(device)};
  });
}
export function helpArticles(value:unknown):HelpArticle[] {
  const items=Array.isArray(value)?value:[value];
  return items.map(item=>{const wire=object(item);
    if(typeof wire.title!=='string'||typeof wire.content!=='string')throw new ApiError(502,'帮助内容格式不支持');
    return {title:wire.title,content:wire.content,id:text(wire.id),createdAt:text(wire.createdAt)};
  });
}
function thingModel(value:unknown):ThingModel {
  const wire=object(value);
  if(typeof wire.version!=='string')throw new ApiError(502,'物模型版本未确认');
  const attributes=array(wire.attributes).map(item=>{const a=object(item);
    if(typeof a.identifier!=='string'||!['number','boolean','enum'].includes(String(a.type))||typeof a.writable!=='boolean')
      throw new ApiError(503,'真实物模型属性格式尚未适配，不能开放控制');
    if(a.type==='enum'&&(!Array.isArray(a.values)||a.values.some(v=>typeof v!=='string')))
      throw new ApiError(503,'真实物模型枚举尚未适配');
    for(const key of ['min','max','step'])if(a[key]!==undefined&&(typeof a[key]!=='number'||!Number.isFinite(a[key])))
      throw new ApiError(503,'真实物模型数值约束尚未适配');
    return {...a} as unknown as ThingModel['attributes'][number];
  });
  const entries=(value:unknown)=>array(value).map(item=>{const entry=object(item);id(entry.identifier);return entry;});
  const services=entries(wire.services).map(s=>({identifier:s.identifier as string}));
  const events=entries(wire.events).map(e=>{
    if(typeof e.level!=='string')throw new ApiError(503,'真实物模型事件等级尚未适配');
    return {identifier:e.identifier as string,level:e.level};
  });
  return {version:wire.version,attributes,services,events};
}

export function realResponseData(req:HttpRequest,value:unknown):unknown {
  if(req.method!=='GET')return value;
  const path=req.path;
  if(path==='/api/app/products')return array(value).map(item=>{const group=object(item),category=text(group.category)??'';
    return {...group,category,products:array(group.products).map(p=>product(p,category))};});
  if(/^\/api\/app\/products\/[^/]+$/.test(path))return product(value);
  if(path==='/api/app/devices')return home(value);
  if(/^\/api\/app\/devices\/[^/]+$/.test(path))return device(value);
  if(path.endsWith('/connectHelping')||path.endsWith('/helping'))return helpArticles(value);
  if(path.endsWith('/thing-model'))return thingModel(value);
  if(path==='/api/app/user/locations')return array(value).map(item=>{
    const room=object(item);
    if(typeof room.name!=='string')throw new ApiError(502,'候选房间名称尚未确认');
    return {...room,id:id(room.id),name:room.name};
  });
  if(/^\/api\/app\/devices\/[^/]+\/location$/.test(path)){
    // The deployed GET contract explicitly omits data when no room is assigned.
    if(value===undefined)return {id:null,name:''};
    const room=object(value);
    if(room.id!==null&&typeof room.id!=='string')throw new ApiError(502,'设备房间归属尚未确认，请重试读取');
    return {...room,name:text(room.name)??''};
  }
  return value;
}
