import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Linking, Platform, View } from 'react-native';
import { WifiStatus } from '../components/device/wifi-status';
import type { Product } from '../services/models';
import { matchesDiscoveredProduct } from '../services/onboarding';
import { withBudget } from '../protocol/device';
import { wifiGuidance, type WifiObservation } from '../services/network-policy';
import { useApp } from '../ui/context';
import { Busy, Button, Card, ErrorText, Field, Label, Page, styles, useAction } from '../ui/kit';
import { DeviceGlyph } from '../ui/device-glyph';

export default function Add() {
  const {runtime}=useApp();
  if(!runtime)return <Busy/>;
  return <AddContent key={runtime.service.sessionRevision} runtime={runtime}/>;
}
function AddContent({runtime}:{runtime:NonNullable<ReturnType<typeof useApp>['runtime']>}) {
  const action=useAction(),run=action.run;
  const {productID,boundDeviceID}=useLocalSearchParams<{productID?:string;boundDeviceID?:string}>();
  const flow=useMemo(()=>runtime.onboarding.acquire(),[runtime]);
  const qrFlow=useMemo(()=>runtime.scanner.acquire(),[runtime]);
  const qrState=useSyncExternalStore(qrFlow.subscribe,qrFlow.snapshot,qrFlow.snapshot);
  const qrPending=qrState.phase==='confirming'||qrState.phase==='unknown';
  const state=useSyncExternalStore(flow.subscribe,flow.snapshot,flow.snapshot);
  const [catalog,setCatalog]=useState<Product[]>([]),[choice,setChoice]=useState<Product|null>(null),[category,setCategory]=useState('all');
  const [ssid,setSsid]=useState(''),[password,setPassword]=useState(''),[showPassword,setShowPassword]=useState(false),[nickname,setNickname]=useState('');
  const focused=useRef(false),loadController=useRef<AbortController|null>(null);
  const wifiController=useRef<AbortController|null>(null),wifiRound=useRef(0);
  const [wifi,setWifi]=useState<WifiObservation>(),[wifiError,setWifiError]=useState(''),[wifiBusy,setWifiBusy]=useState(false);
  const refreshWifi=useCallback(async(requestPermission=false)=>{
    if(!runtime.wifi)return;
    wifiController.current?.abort();const controller=new AbortController(),round=++wifiRound.current;
    wifiController.current=controller;setWifi(undefined);setWifiError('');setWifiBusy(true);setPassword('');setShowPassword(false);
    const check=()=>focused.current&&!controller.signal.aborted&&round===wifiRound.current;
    try{const current=await withBudget(signal=>runtime.wifi!.read(signal,requestPermission),10000,'当前Wi-Fi读取超时',controller.signal);if(check())setWifi(current);}
    catch(error){if(check())setWifiError((error as Error).message);}
    finally{if(check())setWifiBusy(false);}
  },[runtime]);
  useFocusEffect(useCallback(()=>{
    focused.current=true;
    if(qrPending)return()=>{focused.current=false;flow.stop();setPassword('');setShowPassword(false);};
    const controller=new AbortController();loadController.current=controller;
    void run(async()=>{
      if(boundDeviceID && !flow.state.binding) {
        const view=await runtime.service.device(boundDeviceID,controller.signal);
        if(!focused.current || controller.signal.aborted)return;
        flow.adoptBinding({deviceID:view.device.id,userID:runtime.service.userID,bindingRole:view.bindingRole});
      }
      const groups=await runtime.service.products(controller.signal);
      if(!focused.current || controller.signal.aborted)return;
      const products=groups.flatMap(group=>group.products);
      if(products.every(product=>product.sort!==undefined))products.sort((a,b)=>a.sort!-b.sort!);
      setCatalog(products);
      if(productID){const product=await runtime.service.product(productID,controller.signal);if(!controller.signal.aborted && focused.current){flow.adoptProduct(product);setChoice(product);}}
      if(flow.state.candidate)await refreshWifi();
    });
    const subscription=AppState.addEventListener('change',status=>{
      if(status!=='active'){flow.stop();wifiController.current?.abort();setWifi(undefined);setPassword('');setShowPassword(false);}
      else if(focused.current)void refreshWifi();
    });
    return ()=>{focused.current=false;controller.abort();wifiController.current?.abort();loadController.current?.abort();subscription.remove();flow.stop();setPassword('');setShowPassword(false);};
  },[runtime,productID,boundDeviceID,run,flow,refreshWifi,qrPending]));
  const busy=state.busy || action.busy,product=state.product??choice;
  const wifiForm=!!state.candidate&&!state.binding&&state.stage!=='unknown';
  const nicknameForm=!!state.binding&&state.stage!=='complete'&&state.nickname==='pending';
  const error=action.error||state.error;
  const execute=(work:()=>Promise<unknown>)=>void run(work);
  const choose=(id:string)=>execute(async()=>{
    const controller=loadController.current;
    const selected=await runtime.service.product(id,controller?.signal);
    if(!focused.current || controller?.signal.aborted)return;
    flow.reset();setChoice(selected);setPassword('');
  });
  const scan=()=>execute(()=>flow.scan());
  const provision=()=>execute(async()=>{try{await flow.provision(runtime.config.deviceMode==='real'?wifi?.ssid??'':ssid,password);}finally{setPassword('');setShowPassword(false);}});
  const finish=(value:string|null)=>execute(()=>flow.finish(value));
  const stopCurrent=()=>{flow.stop();loadController.current?.abort();loadController.current=new AbortController();wifiController.current?.abort();++wifiRound.current;setWifiBusy(false);setPassword('');setShowPassword(false);};
  const returnHome=()=>{flow.stop();router.replace('/home');};
  if(qrPending)return <Page title="Add device"><Label>当前扫码绑定结果尚未完成，请先返回原扫码流程核对。</Label><Button title="返回扫码核对结果" onPress={()=>router.replace('/scan')}/></Page>;
  return <Page title="Add device">{!wifiForm&&!nicknameForm&&<ErrorText error={error}/>}
    {!state.binding&&<>
      <View style={styles.row}><Button title="Scan QR code" secondary disabled={busy||state.stage==='unknown'} onPress={()=>router.push('/scan')}/><Button title="Scan Bluetooth devices" disabled={busy||state.stage==='unknown'} onPress={scan}/></View>
      {!product&&<><Label large>Find your device</Label><View style={styles.row}><Button title="Recommended" secondary={category!=='all'} disabled={busy} onPress={()=>setCategory('all')}/>{[...new Set(catalog.map(p=>p.category))].map(c=><Button secondary={category!==c} disabled={busy} key={c} title={c} onPress={()=>setCategory(c)}/>)}</View>
        {catalog.filter(p=>category==='all'?p.recommended:p.category===category).map(p=><Card key={p.id}><DeviceGlyph humidity={p.category==='Dehumidifier'}/><Label large>{p.name}</Label><Label muted>{p.modelName}</Label><Button title="Select product" disabled={busy||state.stage==='unknown'} onPress={()=>choose(p.id)}/></Card>)}
        {catalog.length===0&&!busy&&<Card><Label muted>产品目录暂不可用，可返回重试；蓝牙发现仍可使用。</Label></Card>}
      </>}
      {product&&<Card><DeviceGlyph humidity={product.category==='Dehumidifier'}/><Label large>{product.name}</Label>{!wifiForm&&<Button secondary title="Pairing help" disabled={busy} onPress={()=>router.push({pathname:'/help',params:{id:product.id,product:'true'}})}/>}</Card>}
      {state.discovered.filter(device=>!choice||matchesDiscoveredProduct(device,choice)).map(device=><Button key={device.mac.toLowerCase()} secondary={state.candidate?.mac!==device.mac} title={`${device.model} · ${device.mac}`} disabled={busy||state.stage==='unknown'} onPress={()=>execute(async()=>{await flow.select(device,choice?.id);if(focused.current)await refreshWifi();})}/>)}
      {choice&&state.discovered.length>0&&!state.discovered.some(device=>matchesDiscoveredProduct(device,choice))&&<Label muted>未发现所选产品，可重新扫描或改选产品。</Label>}
      {(state.stage==='idle'||state.stage==='failed')&&!!state.message&&<View style={styles.row}><Button title="Retry" secondary disabled={busy} onPress={scan}/><Button title="手动 / 推荐产品" secondary disabled={busy} onPress={()=>{flow.reset();setChoice(null);setPassword('');}}/></View>}
      {(state.scanIssue==='permission'||state.scanIssue==='bluetooth')&&<><Label muted>{state.scanIssue==='permission'?'请在系统设置中允许蓝牙所需权限，再返回重新扫描。':'请在系统设置中打开蓝牙，再返回重新扫描。'}</Label><Button secondary title="打开系统设置" disabled={busy} onPress={()=>execute(()=>state.scanIssue==='bluetooth'&&Platform.OS==='android'?Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS'):Linking.openSettings())}/></>}
      {wifiForm&&<>
        <Label muted>Use a 2.4 GHz Wi-Fi network. Keep your device in pairing mode.</Label>
        <WifiStatus/>
        {runtime.config.deviceMode==='mock'?<Field label="模拟 Wi-Fi 名称" value={ssid} editable={!busy} onChangeText={setSsid}/>:<>
          <Label muted>{wifi?wifiGuidance(wifi):wifiBusy?'正在读取当前Wi-Fi':'请读取当前Wi-Fi后输入密码。'}</Label>
          <Field label="Current Wi-Fi name" value={wifi?.ssid??''} editable={false}/>
          <Button secondary title="Read current Wi-Fi" disabled={busy||wifiBusy} onPress={()=>void refreshWifi(true)}/>
          <ErrorText error={wifiError}/>
        </>}
        <Field label={runtime.config.deviceMode==='mock'?'模拟 Wi-Fi 密码':'Wi-Fi password'} secureTextEntry={!showPassword} value={password} editable={!busy} onChangeText={setPassword}/>
        <Button secondary title={showPassword?'隐藏密码':'显示密码'} disabled={busy} onPress={()=>setShowPassword(value=>!value)}/>
        <ErrorText error={error}/>
        <Button title={busy?'Pairing…':'Connect device'} disabled={busy||runtime.config.deviceMode==='real'&&(!wifi?.ssid||wifiBusy)} onPress={provision}/>
        {product&&<Button secondary title="Pairing help" disabled={busy} onPress={()=>router.push({pathname:'/help',params:{id:product.id,product:'true'}})}/>}
      </>}
      {state.stage==='unknown'&&<Button title="核对绑定结果" disabled={busy} onPress={()=>execute(()=>flow.reconcile())}/>}
      {product&&state.stage!=='unknown'&&<Button secondary disabled={busy} title="Choose another product" onPress={()=>{flow.reset();setChoice(null);setPassword('');}}/>}
    </>}
    {!!state.message&&<Card><Label>{state.message}</Label>{state.deviceStep&&(state.error||state.stage==='unknown')&&<Label muted>{state.deviceStep}</Label>}{busy&&<Busy/>}</Card>}
    {busy&&<Button secondary title="停止当前客户端操作" onPress={stopCurrent}/>}
    {state.binding&&state.stage!=='complete'&&<>
      <Label muted>绑定已确认；昵称或首页刷新失败不会重新配网。</Label>
      {state.nickname==='pending'&&<><Field label="Device nickname (optional)" value={nickname} editable={!busy&&!state.nicknameUnknown} onChangeText={setNickname}/><ErrorText error={error}/></>}
      <Button title={state.nicknameUnknown?'Check nickname result':state.nickname==='pending'?'Finish':'重试添加结果'} disabled={busy} onPress={()=>finish(state.nickname==='pending'?nickname:null)}/>
      {state.nickname==='pending'&&!state.nicknameUnknown&&<Button secondary title="Skip nickname" disabled={busy} onPress={()=>finish(null)}/>}
    </>}
    {state.binding&&state.realtime==='failed'&&<Card><ErrorText error={`设备已绑定，实时连接未完成：${state.realtimeError}`}/><Button secondary title="重试实时连接" disabled={busy||!state.visible} onPress={()=>execute(()=>flow.retryRealtime())}/></Card>}
    {state.stage==='complete'&&<Button title="返回首页" disabled={busy} onPress={returnHome}/>}
  </Page>;
}
