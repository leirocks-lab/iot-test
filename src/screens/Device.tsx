import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import type { DeviceView, ThingModel } from '../services/models';
import { ShadowSession } from '../protocol/device';
import { translate } from '../ui/i18n';
import { useApp } from '../ui/context';
import { Busy, Button, Card, ErrorText, Field, Label, Page, confirm, styles, useAction } from '../ui/kit';
import { DeviceGlyph } from '../ui/device-glyph';
export default function DeviceScreen(){
  const {id}=useLocalSearchParams<{id:string}>(),{runtime}=useApp(),action=useAction(),run=action.run,[device,setDevice]=useState<DeviceView|null>(null),[model,setModel]=useState<ThingModel|null>(null),[shadow,setShadow]=useState<ShadowSession|null>(null),[,redraw]=useState(0),[draft,setDraft]=useState<Record<string,string>>({});
  const sessionRef=useRef<ShadowSession|null>(null);
  useFocusEffect(useCallback(()=>{if(!runtime?.service.session)return;let active=true;const session=new ShadowSession(runtime.devices,id,runtime.service.userID);sessionRef.current=session;setShadow(session);const unsub=session.onChange(()=>{if(active)redraw(n=>n+1);});
    void run(async()=>{const data=await runtime.service.device(id);const m=await runtime.service.model(data.product.id);if(!active)return;setDevice(data);setModel(m);await runtime.service.mqtt(id);await session.connect();});
    const app=AppState.addEventListener('change',s=>{if(s==='active')void run(()=>session.connect());else session.close();});
    return ()=>{active=false;unsub();session.close();app.remove();};
  },[runtime,id,run]));
  const values=shadow?.confirmed??{}, writable=!!shadow?.ready&&!shadow?.sending&&device?.bindingRole!=='obs';
  const temperature=(value:unknown,unit?:string)=>typeof value==='number'&&unit==='C'&&runtime?.service.session?.setting.temperatureUnit==='F'?`${Math.round(value*9/5+32)} °F`:`${String(value??'—')} ${unit??''}`;
  const send=(payload:Record<string,unknown>)=>action.run(()=>shadow!.command(payload));
  return <Page title={device?.deviceNickname??'Device'} action={<Button secondary title="More" onPress={()=>router.push({pathname:'/device/[id]/more',params:{id}})}/>}><ErrorText error={action.error}/>{!device?<Busy/>:<>
    <View style={{alignItems:'center',gap:12}}><DeviceGlyph humidity={device.product.category==='Dehumidifier'}/><Label large>{device.product.name}</Label><Label muted>{shadow?.ready?'Online · Synced':'Not synced · Last confirmed values'}</Label></View>
    {!!values.Alarm&&<Card><ErrorText error={String(values.Alarm)}/><Label muted>Alarm is active until a recovery report arrives.</Label></Card>}
    <Card><View style={styles.row}>{model?.attributes.filter(a=>!a.writable&&a.identifier!=='CleanHours').map(a=><View key={a.identifier} style={{flex:1}}><Label muted>{a.identifier}</Label><Label large>{temperature(values[a.identifier],a.unit)}</Label></View>)}</View><Button title={shadow?.sending?'Waiting for device…':values.Power?'Turn off':'Turn on'} disabled={!writable} onPress={()=>void send({Power:values.Power?0:1})}/></Card>
    {model?.attributes.filter(a=>a.writable&&a.identifier!=='Power').map(a=><Card key={a.identifier}><Label>{a.identifier}</Label><Label large>{temperature(values[a.identifier],a.unit)}</Label>{a.type==='enum'?<View style={styles.row}>{a.values?.map(v=><Button key={v} secondary={values[a.identifier]!==v} title={v} disabled={!writable||values.ChildLock===1} onPress={()=>void send({[a.identifier]:v})}/>)}</View>:a.max===1?<Button secondary title={values[a.identifier]?'Disable':'Enable'} disabled={!writable||values.ChildLock===1&&a.identifier!=='ChildLock'} onPress={()=>void send({[a.identifier]:values[a.identifier]?0:1})}/>:<><Field label={`${translate(a.identifier,runtime?.service.language??'zh-CN')} (${a.unit==='C'&&runtime?.service.session?.setting.temperatureUnit==='F'?'°F':a.unit??''})`} keyboardType="decimal-pad" value={draft[a.identifier]??''} onChangeText={v=>setDraft(d=>({...d,[a.identifier]:v}))}/><Button secondary title="Apply" disabled={!writable||values.ChildLock===1} onPress={()=>void run(async()=>{let value=Number(draft[a.identifier]);if(!draft[a.identifier])throw new Error('请输入目标值');if(a.unit==='C'&&runtime?.service.session?.setting.temperatureUnit==='F')value=Math.round((value-32)*5/9);await shadow!.command({[a.identifier]:value});setDraft(d=>({...d,[a.identifier]:''}));})}/></>}</Card>)}
    <Card><Label>Cleaning timer</Label><Label large>{String(values.CleanHours??'—')} h</Label><Button secondary title="Reset cleaning timer" disabled={!writable} onPress={()=>confirm('Reset cleaning timer','确认重置设备清洁计时？',()=>void send({Service:'CleanReset'}))}/></Card>
    <Button secondary title="Schedules" onPress={()=>router.push({pathname:'/device/[id]/schedules',params:{id}})}/><Button secondary title="Synchronize" disabled={action.busy} onPress={()=>void run(()=>sessionRef.current!.connect())}/>
  </>}</Page>;
}
