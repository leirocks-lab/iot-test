import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import type { DeviceView, ThingModel } from '../services/models';
import { ShadowSession, withBudget } from '../protocol/device';
import { translate } from '../ui/i18n';
import { useApp } from '../ui/context';
import { Busy, Button, Card, ErrorText, Field, Label, Page, confirm, styles, useAction } from '../ui/kit';
import { DeviceGlyph } from '../ui/device-glyph';
export default function DeviceScreen(){
  const {id}=useLocalSearchParams<{id:string}>(),{runtime}=useApp(),action=useAction(),run=action.run,[device,setDevice]=useState<DeviceView|null>(null),[model,setModel]=useState<ThingModel|null>(null),[shadow,setShadow]=useState<ShadowSession|null>(null),[,redraw]=useState(0),[draft,setDraft]=useState<Record<string,string>>({});
  const sessionRef=useRef<ShadowSession|null>(null);
  const [detailError,setDetailError]=useState('');
  const sessionRevision=runtime?.service.sessionRevision;
  useFocusEffect(useCallback(()=>{if(!runtime?.service.session||sessionRevision===undefined)return;let active=true;const controller=new AbortController(),owner=runtime.service.userID;const current=()=>active&&!controller.signal.aborted&&runtime.service.session?.userID===owner&&runtime.service.sessionRevision===sessionRevision;
    setDevice(null);setModel(null);setDraft({});setDetailError('');const session=new ShadowSession(runtime.devices,id,owner);sessionRef.current=session;setShadow(session);const unsub=session.onChange(()=>{if(current())redraw(n=>n+1);});
    let readRound=0;
    const readDetails=async()=>{
      const round=++readRound;
      const data=await withBudget(signal=>runtime.service.device(id,signal),10000,'设备详情刷新超时，请返回后重试',controller.signal);
      if(!current()||round!==readRound)return null;setDevice(data);setDetailError('');return data;
    };
    // Metadata refresh is independent of a previous control action or model load.
    void (async()=>{const data=await readDetails();if(!data)return;if(!data.product)throw new Error('产品信息尚未确认，不能开放控制');const m=await withBudget(signal=>runtime.service.model(data.product!.id,signal),10000,'物模型读取超时',controller.signal);if(!current())return;setModel(m);await withBudget(signal=>runtime.service.mqtt(id,signal),10000,'设备连接凭据读取超时',controller.signal);if(current())await session.connect();})().catch(error=>{if(current())setDetailError(error instanceof Error?error.message:String(error));});
    const app=AppState.addEventListener('change',s=>{if(s==='active')void readDetails().then(data=>{if(data&&current())void run(()=>session.connect());}).catch(error=>{if(current())setDetailError(error instanceof Error?error.message:String(error));});else session.close();});
    return ()=>{active=false;controller.abort();unsub();session.close();app.remove();};
  },[runtime,id,run,sessionRevision]));
  const values=shadow?.confirmed??{}, writable=!!shadow?.ready&&!shadow?.sending&&device?.bindingRole!=='obs';
  const temperature=(value:unknown,unit?:string)=>typeof value==='number'&&unit==='C'&&runtime?.service.session?.setting.temperatureUnit==='F'?`${Math.round(value*9/5+32)} °F`:`${String(value??'—')} ${unit??''}`;
  const send=(payload:Record<string,unknown>)=>action.run(()=>shadow!.command(payload));
  return <Page title={device?.deviceNickname??'Device'} action={<Button secondary title="More" onPress={()=>router.push({pathname:'/device/[id]/more',params:{id}})}/>}><ErrorText error={action.error}/><ErrorText error={detailError}/>{!device?<Busy/>:<>
    <View style={{alignItems:'center',gap:12}}>{device.product?<DeviceGlyph humidity={device.product.category==='Dehumidifier'}/>:null}<Label large>{device.product?.name??'产品信息待确认'}</Label><Label muted>{shadow?.ready?'Online · Synced':'Not synced · Last confirmed values'}</Label></View>
    {!!values.Alarm&&<Card><ErrorText error={String(values.Alarm)}/><Label muted>Alarm is active until a recovery report arrives.</Label></Card>}
    <Card><View style={styles.row}>{model?.attributes.filter(a=>!a.writable&&a.identifier!=='CleanHours').map(a=><View key={a.identifier} style={{flex:1}}><Label muted>{a.identifier}</Label><Label large>{temperature(values[a.identifier],a.unit)}</Label></View>)}</View><Button title={shadow?.sending?'Waiting for device…':values.Power?'Turn off':'Turn on'} disabled={!writable} onPress={()=>void send({Power:values.Power?0:1})}/></Card>
    {model?.attributes.filter(a=>a.writable&&a.identifier!=='Power').map(a=><Card key={a.identifier}><Label>{a.identifier}</Label><Label large>{temperature(values[a.identifier],a.unit)}</Label>{a.type==='enum'?<View style={styles.row}>{a.values?.map(v=><Button key={v} secondary={values[a.identifier]!==v} title={v} disabled={!writable||values.ChildLock===1} onPress={()=>void send({[a.identifier]:v})}/>)}</View>:a.max===1?<Button secondary title={values[a.identifier]?'Disable':'Enable'} disabled={!writable||values.ChildLock===1&&a.identifier!=='ChildLock'} onPress={()=>void send({[a.identifier]:values[a.identifier]?0:1})}/>:<><Field label={`${translate(a.identifier,runtime?.service.language??'zh-CN')} (${a.unit==='C'&&runtime?.service.session?.setting.temperatureUnit==='F'?'°F':a.unit??''})`} keyboardType="decimal-pad" value={draft[a.identifier]??''} onChangeText={v=>setDraft(d=>({...d,[a.identifier]:v}))}/><Button secondary title="Apply" disabled={!writable||values.ChildLock===1} onPress={()=>void run(async()=>{let value=Number(draft[a.identifier]);if(!draft[a.identifier])throw new Error('请输入目标值');if(a.unit==='C'&&runtime?.service.session?.setting.temperatureUnit==='F')value=Math.round((value-32)*5/9);await shadow!.command({[a.identifier]:value});setDraft(d=>({...d,[a.identifier]:''}));})}/></>}</Card>)}
    <Card><Label>Cleaning timer</Label><Label large>{String(values.CleanHours??'—')} h</Label><Button secondary title="Reset cleaning timer" disabled={!writable} onPress={()=>confirm('Reset cleaning timer','确认重置设备清洁计时？',()=>void send({Service:'CleanReset'}))}/></Card>
    <Button secondary title="Schedules" onPress={()=>router.push({pathname:'/device/[id]/schedules',params:{id}})}/><Button secondary title="Synchronize" disabled={action.busy} onPress={()=>void run(()=>sessionRef.current!.connect())}/>
  </>}</Page>;
}
