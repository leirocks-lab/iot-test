import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import type { DeviceView, ThingModel } from '../services/models';
import { withBudget } from '../protocol/device';
import type { DeviceSession } from '../protocol/device-session';
import { translate } from '../ui/i18n';
import { useApp } from '../ui/context';
import { Busy, Button, Card, ErrorText, Field, Label, Page, confirm, styles, useAction } from '../ui/kit';
import { DeviceGlyph } from '../ui/device-glyph';
export default function DeviceScreen(){
  const {id}=useLocalSearchParams<{id:string}>(),{runtime}=useApp(),action=useAction(),run=action.run,[device,setDevice]=useState<DeviceView|null>(null),[model,setModel]=useState<ThingModel|null>(null),[shadow,setShadow]=useState<DeviceSession|null>(null),[,redraw]=useState(0),[draft,setDraft]=useState<Record<string,string>>({});
  const retryRef=useRef<()=>Promise<void>>(async()=>undefined);
  const [detailError,setDetailError]=useState('');
  const sessionRevision=runtime?.service.sessionRevision;
  useFocusEffect(useCallback(()=>{if(!runtime?.service.session||sessionRevision===undefined)return;let active=true,foreground=AppState.currentState===null||AppState.currentState==='active';const owner=runtime.service.userID;
    const current=()=>active&&foreground&&runtime.service.session?.userID===owner&&runtime.service.sessionRevision===sessionRevision;
    setDevice(null);setModel(null);setDraft({});setDetailError('');const session=runtime.createDeviceSession(id);setShadow(session);const unsub=session.onChange(()=>{if(active)redraw(n=>n+1);});
    let controller:AbortController|undefined,flight:Promise<void>|undefined;
    const stop=()=>{const previous=controller;controller=undefined;previous?.abort();flight=undefined;session.close();};
    const refresh=():Promise<void>=>{
      if(!current())return Promise.resolve();if(flight)return flight;
      const attempt=new AbortController();controller=attempt;setDetailError('');setModel(null);
      const valid=()=>current()&&!attempt.signal.aborted&&controller===attempt;
      const task=(async()=>{
        const data=await withBudget(signal=>runtime.service.device(id,signal),10000,'设备详情刷新超时，请重试',attempt.signal);
        if(!valid())return;setDevice(data);
        // A missing model must not hide metadata or manufacture realtime values.
        const modelTask=(async()=>{if(!data.product)throw new Error('产品信息尚未确认，不能开放控制');const m=await withBudget(signal=>runtime.service.model(data.product!.id,signal),10000,'物模型读取超时',attempt.signal);if(valid())setModel(m);})();
        const results=await Promise.allSettled([modelTask,session.connect(attempt.signal)]);
        if(valid()){const failure=results.find(result=>result.status==='rejected');if(failure?.status==='rejected')throw failure.reason;}
      })().catch(error=>{if(valid())setDetailError(error instanceof Error?error.message:String(error));}).finally(()=>{if(flight===task)flight=undefined;});
      flight=task;return task;
    };
    retryRef.current=refresh;void refresh();
    const app=AppState.addEventListener('change',state=>{foreground=state==='active';if(foreground)void refresh();else stop();});
    return ()=>{active=false;stop();unsub();app.remove();retryRef.current=async()=>undefined;};
  },[runtime,id,sessionRevision]));
  const values=shadow?.confirmed??{}, writable=!!shadow?.ready&&shadow?.canWrite!==false&&!shadow?.sending&&device?.bindingRole!=='obs';
  const temperature=(value:unknown,unit?:string)=>typeof value==='number'&&unit==='C'&&runtime?.service.session?.setting.temperatureUnit==='F'?`${Math.round(value*9/5+32)} °F`:`${String(value??'—')} ${unit??''}`;
  const send=(payload:Record<string,unknown>)=>action.run(()=>shadow!.command(payload));
  return <Page title={device?.deviceNickname??'Device'} action={<Button secondary title="More" onPress={()=>router.push({pathname:'/device/[id]/more',params:{id}})}/>}><ErrorText error={action.error}/><ErrorText error={detailError||shadow?.error||''}/>{!device?<><Busy/><Button secondary title="Retry" onPress={()=>void run(()=>retryRef.current())}/></>:<>
    <View style={{alignItems:'center',gap:12}}>{device.product?<DeviceGlyph humidity={device.product.category==='Dehumidifier'}/>:null}<Label large>{device.product?.name??'产品信息待确认'}</Label><Label muted>{shadow?.ready?'Synced':shadow?.connected?'通信已连接 · 属性待同步':'Not synced · Last confirmed values'}</Label></View>
    {!!values.Alarm&&<Card><ErrorText error={String(values.Alarm)}/><Label muted>Alarm is active until a recovery report arrives.</Label></Card>}
    <Card><View style={styles.row}>{model?.attributes.filter(a=>!a.writable&&a.identifier!=='CleanHours').map(a=><View key={a.identifier} style={{flex:1}}><Label muted>{a.identifier}</Label><Label large>{temperature(values[a.identifier],a.unit)}</Label></View>)}</View><Button title={shadow?.sending?'Waiting for device…':values.Power?'Turn off':'Turn on'} disabled={!writable} onPress={()=>void send({Power:values.Power?0:1})}/></Card>
    {model?.attributes.filter(a=>a.writable&&a.identifier!=='Power').map(a=><Card key={a.identifier}><Label>{a.identifier}</Label><Label large>{temperature(values[a.identifier],a.unit)}</Label>{a.type==='enum'?<View style={styles.row}>{a.values?.map(v=><Button key={v} secondary={values[a.identifier]!==v} title={v} disabled={!writable||values.ChildLock===1} onPress={()=>void send({[a.identifier]:v})}/>)}</View>:a.max===1?<Button secondary title={values[a.identifier]?'Disable':'Enable'} disabled={!writable||values.ChildLock===1&&a.identifier!=='ChildLock'} onPress={()=>void send({[a.identifier]:values[a.identifier]?0:1})}/>:<><Field label={`${translate(a.identifier,runtime?.service.language??'zh-CN')} (${a.unit==='C'&&runtime?.service.session?.setting.temperatureUnit==='F'?'°F':a.unit??''})`} keyboardType="decimal-pad" value={draft[a.identifier]??''} onChangeText={v=>setDraft(d=>({...d,[a.identifier]:v}))}/><Button secondary title="Apply" disabled={!writable||values.ChildLock===1} onPress={()=>void run(async()=>{let value=Number(draft[a.identifier]);if(!draft[a.identifier])throw new Error('请输入目标值');if(a.unit==='C'&&runtime?.service.session?.setting.temperatureUnit==='F')value=Math.round((value-32)*5/9);await shadow!.command({[a.identifier]:value});setDraft(d=>({...d,[a.identifier]:''}));})}/></>}</Card>)}
    <Card><Label>Cleaning timer</Label><Label large>{String(values.CleanHours??'—')} h</Label><Button secondary title="Reset cleaning timer" disabled={!writable} onPress={()=>confirm('Reset cleaning timer','确认重置设备清洁计时？',()=>void send({Service:'CleanReset'}))}/></Card>
    <Button secondary title="Schedules" onPress={()=>router.push({pathname:'/device/[id]/schedules',params:{id}})}/><Button secondary title="Synchronize" disabled={action.busy} onPress={()=>void run(()=>retryRef.current())}/>
  </>}</Page>;
}
