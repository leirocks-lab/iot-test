import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, View } from 'react-native';
import { WifiStatus } from '../components/device/wifi-status';
import type { Product } from '../services/models';
import { useApp } from '../ui/context';
import { Busy, Button, Card, ErrorText, Field, Label, Page, styles, useAction } from '../ui/kit';
import { DeviceGlyph } from '../ui/device-glyph';

export default function Add() {
  const {runtime}=useApp();
  if(!runtime)return <Busy/>;
  return <AddContent key={runtime.service.session?.userID??'signed-out'} runtime={runtime}/>;
}
function AddContent({runtime}:{runtime:NonNullable<ReturnType<typeof useApp>['runtime']>}) {
  const action=useAction(),run=action.run;
  const {productID,boundDeviceID}=useLocalSearchParams<{productID?:string;boundDeviceID?:string}>();
  const flow=useMemo(()=>runtime.onboarding.acquire(),[runtime]);
  const state=useSyncExternalStore(flow.subscribe,flow.snapshot,flow.snapshot);
  const [catalog,setCatalog]=useState<Product[]>([]),[choice,setChoice]=useState<Product|null>(null),[category,setCategory]=useState('all');
  const [ssid,setSsid]=useState(''),[password,setPassword]=useState(''),[showPassword,setShowPassword]=useState(false),[nickname,setNickname]=useState('');
  const focused=useRef(false),loadController=useRef<AbortController|null>(null);
  useFocusEffect(useCallback(()=>{
    focused.current=true;
    const controller=new AbortController();loadController.current=controller;
    void run(async()=>{
      if(boundDeviceID && !flow.state.binding) {
        const view=await runtime.service.device(boundDeviceID,controller.signal);
        if(!focused.current || controller.signal.aborted)return;
        flow.adoptBinding({deviceID:view.device.id,userID:runtime.service.userID,bindingRole:view.bindingRole});
      }
      const groups=await runtime.service.products(controller.signal);
      if(!focused.current || controller.signal.aborted)return;
      setCatalog(groups.flatMap(group=>group.products).sort((a,b)=>a.sort-b.sort));
      if(productID){const product=await runtime.service.product(productID,controller.signal);if(!controller.signal.aborted && focused.current)setChoice(product);}
    });
    const subscription=AppState.addEventListener('change',status=>{
      if(status!=='active'){flow.stop();setPassword('');setShowPassword(false);}
    });
    return ()=>{focused.current=false;controller.abort();loadController.current?.abort();subscription.remove();flow.stop();setPassword('');setShowPassword(false);};
  },[runtime,productID,boundDeviceID,run,flow]));
  const busy=state.busy || action.busy,product=state.product??choice;
  const execute=(work:()=>Promise<unknown>)=>void run(work);
  const choose=(id:string)=>execute(async()=>{
    const controller=loadController.current;
    const selected=await runtime.service.product(id,controller?.signal);
    if(!focused.current || controller?.signal.aborted)return;
    flow.reset();setChoice(selected);setPassword('');
  });
  const scan=()=>execute(()=>flow.scan());
  const provision=()=>execute(async()=>{try{await flow.provision(ssid,password);}finally{setPassword('');setShowPassword(false);}});
  const finish=(value:string|null)=>execute(()=>flow.finish(value));
  const stopCurrent=()=>{flow.stop();loadController.current?.abort();loadController.current=new AbortController();setPassword('');setShowPassword(false);};
  const returnHome=()=>{flow.stop();router.replace('/home');};
  return <Page title="Add device"><ErrorText error={state.error||action.error}/>
    {!state.binding&&<>
      <View style={styles.row}><Button title="Scan QR code" secondary disabled={busy||state.stage==='unknown'} onPress={()=>router.push('/scan')}/><Button title="Scan Bluetooth devices" disabled={busy||state.stage==='unknown'} onPress={scan}/></View>
      {!product&&<><Label large>Find your device</Label><View style={styles.row}><Button title="Recommended" secondary={category!=='all'} disabled={busy} onPress={()=>setCategory('all')}/>{[...new Set(catalog.map(p=>p.category))].map(c=><Button secondary={category!==c} disabled={busy} key={c} title={c} onPress={()=>setCategory(c)}/>)}</View>
        {catalog.filter(p=>category==='all'?p.recommended:p.category===category).map(p=><Card key={p.id}><DeviceGlyph humidity={p.category==='Dehumidifier'}/><Label large>{p.name}</Label><Label muted>{p.modelName}</Label><Button title="Select product" disabled={busy||state.stage==='unknown'} onPress={()=>choose(p.id)}/></Card>)}
        {catalog.length===0&&!busy&&<Card><Label muted>产品目录暂不可用，可返回重试；蓝牙发现仍可使用。</Label></Card>}
      </>}
      {product&&<Card><DeviceGlyph humidity={product.category==='Dehumidifier'}/><Label large>{product.name}</Label><Button secondary title="Pairing help" disabled={busy} onPress={()=>router.push({pathname:'/help',params:{id:product.id,product:'true'}})}/></Card>}
      {state.discovered.filter(device=>!choice||device.productID===choice.id).map(device=><Button key={device.mac.toLowerCase()} secondary={state.candidate?.mac!==device.mac} title={`${device.model} · ${device.mac}`} disabled={busy||state.stage==='unknown'} onPress={()=>execute(()=>flow.select(device))}/>)}
      {choice&&state.discovered.length>0&&!state.discovered.some(device=>device.productID===choice.id)&&<Label muted>未发现所选产品，可重新扫描或改选产品。</Label>}
      {(state.stage==='idle'||state.stage==='failed')&&!!state.message&&<View style={styles.row}><Button title="Retry" secondary disabled={busy} onPress={scan}/><Button title="手动 / 推荐产品" secondary disabled={busy} onPress={()=>{flow.reset();setChoice(null);setPassword('');}}/></View>}
      {state.candidate&&state.stage!=='unknown'&&<>
        <Label muted>Use a 2.4 GHz Wi-Fi network. Keep your device in pairing mode.</Label>
        <WifiStatus/>
        {runtime.config.deviceMode==='mock'?<Field label="模拟 Wi-Fi 名称" value={ssid} editable={!busy} onChangeText={setSsid}/>:<Label muted>真实 SSID 读取与设备驱动尚未接入，暂无法继续真实配网。</Label>}
        <Field label={runtime.config.deviceMode==='mock'?'模拟 Wi-Fi 密码':'Wi-Fi password'} secureTextEntry={!showPassword} value={password} editable={!busy} onChangeText={setPassword}/>
        <Button secondary title={showPassword?'隐藏密码':'显示密码'} disabled={busy} onPress={()=>setShowPassword(value=>!value)}/>
        <Button title={busy?'Pairing…':'Connect device'} disabled={busy||runtime.config.deviceMode!=='mock'} onPress={provision}/>
      </>}
      {state.stage==='unknown'&&<Button title="核对绑定结果" disabled={busy} onPress={()=>execute(()=>flow.reconcile())}/>}
      {product&&state.stage!=='unknown'&&<Button secondary disabled={busy} title="Choose another product" onPress={()=>{flow.reset();setChoice(null);setPassword('');}}/>}
    </>}
    {!!state.message&&<Card><Label>{state.message}</Label>{state.deviceStep&&(state.error||state.stage==='unknown')&&<Label muted>{state.deviceStep}</Label>}{busy&&<Busy/>}</Card>}
    {busy&&<Button secondary title="停止当前客户端操作" onPress={stopCurrent}/>}
    {state.binding&&state.stage!=='complete'&&<>
      <Label muted>绑定已确认；昵称或首页刷新失败不会重新配网。</Label>
      {state.nickname==='pending'&&<Field label="Device nickname (optional)" maxLength={20} value={nickname} editable={!busy} onChangeText={setNickname}/>}
      <Button title={state.nickname==='pending'?'Finish':'重试添加结果'} disabled={busy} onPress={()=>finish(state.nickname==='pending'?nickname:null)}/>
      {state.nickname==='pending'&&<Button secondary title="Skip nickname" disabled={busy} onPress={()=>finish(null)}/>}
    </>}
    {state.binding&&state.realtime==='failed'&&<Card><ErrorText error={`设备已绑定，实时连接未完成：${state.realtimeError}`}/><Button secondary title="重试实时连接" disabled={busy||!state.visible} onPress={()=>execute(()=>flow.retryRealtime())}/></Card>}
    {state.stage==='complete'&&<Button title="返回首页" disabled={busy} onPress={returnHome}/>}
  </Page>;
}
