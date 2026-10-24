import { ApiError, type Attribute, type DeviceView, type Role, type ThingModel } from './models';

export type PropertyValue = number|string|boolean;
export const controlKinds=['power','temperature','humidity','mode','light','brightness','childLock','mute'] as const;
export type ControlKind=typeof controlKinds[number];
export interface ControlBinding {
  identifier:string;
  roles:readonly Role[];
  switch?:{on:PropertyValue;off:PropertyValue};
  whenLocked?:'allowed'|'blocked';
  conditions?:readonly {identifier:string;equals:PropertyValue}[];
  allowWhenLightOff?:boolean;
  unitless?:true;
}
/** Business semantics and product conditions are explicit; identifiers never imply a capability. */
export interface ControlProfile {bindings:Partial<Record<ControlKind,ControlBinding>>}
export type ControlProfileResolver=(context:{device:DeviceView;model:ThingModel},signal:AbortSignal)=>Promise<ControlProfile>;
export interface ControlState {ready:boolean;sending:boolean;canWrite?:boolean;confirmed:Record<string,PropertyValue>}
export interface ControlView {kind:ControlKind;attribute:Attribute;variant:'switch'|'enum'|'number';reason:string;value:PropertyValue|undefined}
const fail=(message:string):never=>{throw new ApiError(400,message);};
function numericBounds(attribute:Attribute){
  const {min,max,step}=attribute;
  return typeof min==='number'&&Number.isFinite(min)&&typeof max==='number'&&Number.isFinite(max)&&typeof step==='number'&&Number.isFinite(step)&&min<=max&&step>0;
}
export function validateAttributeValue(attribute:Attribute,value:unknown):PropertyValue {
  if(attribute.type==='boolean'){if(typeof value!=='boolean')return fail('属性必须使用布尔值');return value;}
  if(attribute.type==='enum'){
    if(!attribute.values?.length||new Set(attribute.values).size!==attribute.values.length||attribute.values.some(item=>typeof item!=='string'))return fail('枚举能力尚未完整提供');
    if(typeof value!=='string'||!attribute.values.includes(value))return fail('属性枚举值不支持');return value;
  }
  if(attribute.type!=='number'||!numericBounds(attribute))return fail('属性范围或步长尚未确认');
  if(typeof value!=='number'||!Number.isFinite(value))return fail('请输入有效数值');
  const min=attribute.min!,max=attribute.max!,step=attribute.step!,ratio=(value-min)/step;
  const tolerance=Math.min(1e-7,Number.EPSILON*8*Math.max(1,Math.abs(ratio),Math.abs(value/step),Math.abs(min/step)));
  if(!Number.isFinite(ratio)||ratio<-tolerance||value>max+step*tolerance)return fail('属性值超出产品范围');
  if(Math.abs(ratio-Math.round(ratio))>tolerance)return fail('属性值不符合产品步长');
  // Canonicalize binary floating point noise only, after a legal native-grid value has been proved.
  const grid=min+Math.round(ratio)*step,normalized=Number(grid.toPrecision(15));
  return Math.abs((normalized-min)/step-Math.round(ratio))<=tolerance?normalized:grid;
}
export function numericDraft(attribute:Attribute,kind:ControlKind,input:string,temperatureUnit:'C'|'F'):number {
  const cleaned=input.trim().replace(',','.');
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(cleaned))return fail('请输入有效数值');
  let value=Number(cleaned);
  if(kind==='temperature'){
    if(attribute.unit!=='C'&&attribute.unit!=='F')return fail('温度原生单位尚未确认');
    if(attribute.unit!==temperatureUnit)value=attribute.unit==='C'?(value-32)*5/9:value*9/5+32;
  }
  return validateAttributeValue(attribute,value) as number;
}
export function displayNumber(value:PropertyValue|undefined,unit:string|undefined,temperatureUnit:'C'|'F'){
  if(typeof value!=='number')return String(value??'—');
  const converted=(unit==='C'||unit==='F')&&unit!==temperatureUnit?(unit==='C'?value*9/5+32:(value-32)*5/9):value;
  return `${Number(converted.toPrecision(12))}${unit?` ${unit==='C'||unit==='F'?`°${temperatureUnit}`:unit}`:''}`;
}

/** The same policy serves the controls and the command entry point, including callers that bypass the UI. */
export class PropertyControls {
  private busy=false;
  private attributes:Map<string,Attribute>;
  constructor(readonly model:ThingModel,private profile:ControlProfile,private role:Role,private state:()=>ControlState,
    private publish:(properties:Record<string,PropertyValue>)=>Promise<void>,private changed:()=>void=()=>undefined){
    this.attributes=new Map(model.attributes.map(attribute=>[attribute.identifier,attribute]));
    const bindings=Object.values(profile.bindings);
    if(!model.version||model.attributes.some(attribute=>typeof attribute.identifier!=='string'||!attribute.identifier)||this.attributes.size!==model.attributes.length||new Set(bindings.map(binding=>binding.identifier)).size!==bindings.length)throw new ApiError(503,'产品属性映射不唯一或版本未确认');
    if(bindings.some(binding=>!this.attributes.has(binding.identifier)))throw new ApiError(503,'控制属性不在当前物模型中');
    for(const binding of bindings){const reason=this.conditionsReason(binding);if(reason)throw new ApiError(503,reason);}
  }
  private conditionsReason(binding:ControlBinding){
    if(binding.conditions===undefined)return '';
    return !Array.isArray(binding.conditions)||binding.conditions.some(condition=>{
      if(!condition||typeof condition.identifier!=='string'||!Object.hasOwn(condition,'equals'))return true;
      const attribute=this.attributes.get(condition.identifier),value=condition.equals;if(!attribute)return true;
      return attribute.type==='number'?typeof value!=='number'||!Number.isFinite(value):attribute.type==='boolean'?typeof value!=='boolean':attribute.type!=='enum'||typeof value!=='string'||!attribute.values?.includes(value);
    })?'产品操作条件尚未完整确认或不在当前物模型中':'';
  }
  private binding(kind:ControlKind){const binding=this.profile.bindings[kind];if(!binding)throw new ApiError(503,'当前产品未提供此控制能力');return binding;}
  private attribute(kind:ControlKind){const attribute=this.attributes.get(this.binding(kind).identifier);if(!attribute)throw new ApiError(503,'控制属性不在当前物模型中');return attribute;}
  private switchValue(kind:ControlKind){
    const binding=this.binding(kind),value=this.state().confirmed[binding.identifier];
    if(!binding.switch||value!==binding.switch.on&&value!==binding.switch.off)return undefined;
    return value===binding.switch.on;
  }
  isOn(kind:ControlKind){return this.switchValue(kind);}
  reason(kind:ControlKind):string {
    try{
      const binding=this.binding(kind),attribute=this.attribute(kind),state=this.state();
      if(!attribute.writable)return '当前属性只读';
      if(!Array.isArray(binding.roles)||binding.roles.some(role=>!['sa','mbr','obs'].includes(role)))return '产品控制权限尚未完整确认';
      if(this.role==='obs'||!binding.roles?.includes(this.role)||state.canWrite!==true)return '当前账号没有此属性控制权限';
      if(!state.ready)return '设备属性尚未同步';
      if(state.sending||this.busy)return '正在等待设备回报';
      if(kind==='temperature'&&attribute.unit!=='C'&&attribute.unit!=='F')return '温度原生单位尚未确认';
      if((kind==='humidity'||kind==='brightness')&&!attribute.unit&&!binding.unitless)return '属性单位尚未确认';
      if(kind==='mode'&&binding.conditions===undefined)return '模式冲突规则尚未确认';
      const conditionReason=this.conditionsReason(binding);if(conditionReason)return conditionReason;
      for(const condition of binding.conditions??[])if(state.confirmed[condition.identifier]!==condition.equals)return '当前设备状态不满足产品操作条件';
      if(['power','light','childLock','mute'].includes(kind)){
        if(!binding.switch||binding.switch.on===binding.switch.off)return '开关值域尚未确认';
        validateAttributeValue(attribute,binding.switch.on);validateAttributeValue(attribute,binding.switch.off);
        if(this.switchValue(kind)===undefined)return '当前开关值未知，不能推断目标';
      }else{
        if((kind==='mode'&&attribute.type!=='enum')||(kind!=='mode'&&attribute.type!=='number'))return '属性类型与控制能力不一致';
        validateAttributeValue(attribute,state.confirmed[attribute.identifier]);
      }
      if(kind!=='childLock'&&this.profile.bindings.childLock){
        const locked=this.switchValue('childLock');
        if(binding.whenLocked!=='allowed'&&locked!==false)return locked===true?(binding.whenLocked==='blocked'?'请先解除童锁':'童锁冲突规则尚未确认'):'童锁状态未知';
      }
      if(kind==='brightness'&&binding.allowWhenLightOff!==true&&this.switchValue('light')!==true)return binding.allowWhenLightOff===false?'请先开启灯光':'关灯亮度规则尚未确认';
      return '';
    }catch(error){return error instanceof Error?error.message:'控制能力尚未确认';}
  }
  list():ControlView[]{
    return controlKinds.filter(kind=>this.profile.bindings[kind]&&this.attributes.has(this.profile.bindings[kind]!.identifier)).map(kind=>({
      kind,attribute:this.attribute(kind),variant:['power','light','childLock','mute'].includes(kind)?'switch':kind==='mode'?'enum':'number',
      reason:this.reason(kind),value:this.state().confirmed[this.binding(kind).identifier],
    }));
  }
  async command(properties:Record<string,unknown>){
    const entries=Object.entries(properties);if(entries.length!==1)throw new ApiError(400,'一次仅提交一个明确控制目标');
    const [identifier,value]=entries[0],kind=controlKinds.find(kind=>this.profile.bindings[kind]?.identifier===identifier);
    if(!kind)throw new ApiError(400,'当前产品未授权此控制属性');
    const reason=this.reason(kind);if(reason)throw new ApiError(409,reason);
    const attribute=this.attribute(kind),binding=this.binding(kind),validated=validateAttributeValue(attribute,value);
    if(binding.switch&&validated!==binding.switch.on&&validated!==binding.switch.off)throw new ApiError(400,'开关目标值不支持');
    if(this.state().confirmed[identifier]===validated)return;
    this.busy=true;this.changed();
    try{await this.publish({[identifier]:validated});}finally{this.busy=false;this.changed();}
  }
  async toggle(kind:ControlKind){const binding=this.binding(kind),on=this.switchValue(kind);if(on===undefined)throw new ApiError(409,'当前开关值未知');await this.command({[binding.identifier]:on?binding.switch!.off:binding.switch!.on});}
  async choose(kind:ControlKind,value:string){await this.command({[this.binding(kind).identifier]:value});}
  async submit(kind:ControlKind,input:string,temperatureUnit:'C'|'F'){
    await this.command({[this.binding(kind).identifier]:numericDraft(this.attribute(kind),kind,input,temperatureUnit)});
  }
}

