import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { AppState, Linking, View } from 'react-native';
import { encodeProductCode } from '../services/qr';
import type { ScanDestination } from '../services/scan-flow';
import { useApp } from '../ui/context';
import { Busy, Button, Card, ErrorText, Field, Label, Page, useAction } from '../ui/kit';

export default function Scan() {
  const {runtime}=useApp();
  if(!runtime)return <Busy/>;
  return <ScanContent key={runtime.service.session?.userID??'signed-out'} runtime={runtime}/>;
}
function ScanContent({runtime}:{runtime:NonNullable<ReturnType<typeof useApp>['runtime']>}) {
  const action=useAction(),run=action.run,[permission,requestPermission,refreshPermission]=useCameraPermissions();
  const flow=useMemo(()=>runtime.scanner.acquire(),[runtime]);
  const addFlow=useMemo(()=>runtime.onboarding.acquire(),[runtime]);
  const addState=useSyncExternalStore(addFlow.subscribe,addFlow.snapshot,addFlow.snapshot);
  const state=useSyncExternalStore(flow.subscribe,flow.snapshot,flow.snapshot);
  const [active,setActive]=useState(false),[picking,setPicking]=useState(false),[value,setValue]=useState('');
  const focused=useRef(false),pickingRef=useRef(false),albumRound=useRef(0);
  useFocusEffect(useCallback(()=>{
    focused.current=true;setActive(AppState.currentState==='active');void refreshPermission();
    const subscription=AppState.addEventListener('change',status=>{setActive(status==='active');if(status!=='active'&&!pickingRef.current){albumRound.current++;flow.stop();}if(status==='active')void refreshPermission();});
    return ()=>{focused.current=false;albumRound.current++;setActive(false);flow.stop();subscription.remove();};
  },[flow,refreshPermission]));
  const navigate=(destination:ScanDestination)=>{
    if(!focused.current)return;
    if('binding' in destination)router.replace({pathname:'/add',params:{boundDeviceID:destination.binding.deviceID}});
    else router.replace({pathname:'/add',params:{productID:destination.productID}});
  };
  const pickPhoto=()=>void run(async()=>{
    const round=++albumRound.current;pickingRef.current=true;setPicking(true);
    try {
      // The system photo picker can select a single image without broad library permission.
      const photo=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsMultipleSelection:false,allowsEditing:false,quality:1});
      if(!focused.current||round!==albumRound.current||photo.canceled)return;
      const scanned=await Camera.scanFromURLAsync(photo.assets[0].uri,['qr']);
      if(focused.current&&round===albumRound.current)flow.read(scanned.map(code=>code.data));
    }finally{pickingRef.current=false;if(focused.current){setPicking(false);setActive(AppState.currentState==='active');}}
  });
  const confirming=state.phase==='confirming',idle=state.phase==='idle';
  if(addState.stage==='unknown'||addState.binding)return <Page title="Scan QR code"><Label>当前设备还有待完成的添加结果，请先处理当前事务。</Label><Button title="返回当前添加流程" onPress={()=>router.replace('/add')}/></Page>;
  return <Page title="Scan QR code"><ErrorText error={state.error||action.error}/>
    {active&&idle&&!picking&&(permission?.granted?<View style={{height:280,borderRadius:18,overflow:'hidden'}}><CameraView style={{flex:1}} barcodeScannerSettings={{barcodeTypes:['qr']}} onBarcodeScanned={({data})=>{if(focused.current&&!pickingRef.current)flow.read([data]);}} onMountError={({message})=>action.setError(message)}/></View>:<>
      <Label muted>{permission?.canAskAgain===false?'相机权限已关闭，可在系统设置中允许；也可以使用相册。':'允许相机后扫描设备二维码，也可以使用相册。'}</Label>
      <Button title={permission?.canAskAgain===false?'打开系统设置':'Allow camera'} disabled={action.busy} onPress={()=>void run(()=>permission?.canAskAgain===false?Linking.openSettings():requestPermission())}/>
    </>)}
    {idle&&<Button title={picking?'正在识别图片…':'使用相册'} secondary disabled={action.busy||picking} onPress={pickPhoto}/>}
    {runtime.developer&&idle&&<Card><Field label="Mock QR content" multiline value={value} editable={!action.busy} onChangeText={setValue}/><Button secondary title="Read code" disabled={action.busy} onPress={()=>flow.read([value])}/><Button secondary title="Use product sample" disabled={action.busy} onPress={()=>flow.read([encodeProductCode('prd_humidity')])}/></Card>}
    {state.choices.length>0&&<Card>
      <Label large>{state.choices.length>1?'选择一个有效二维码':'Confirm product'}</Label>
      {state.choices.map((choice,index)=><Button key={`${choice.type}-${choice.label}-${index}`} secondary={state.selected!==index} title={`${choice.type==='share'?'设备':'产品'} · ${choice.label}`} disabled={confirming||state.phase!=='choosing'} onPress={()=>flow.choose(index)}/>)}
      {state.phase==='choosing'&&<><Button title="Confirm" disabled={action.busy||state.selected===undefined} onPress={()=>void run(async()=>navigate(await flow.confirm()))}/><Button secondary title="Scan again" disabled={action.busy} onPress={()=>{flow.reset();action.setError('');}}/></>}
      {state.phase==='unknown'&&<><Label muted>绑定结果未知，请先核对；不会重复消耗绑定码。</Label><Button title="核对设备绑定结果" disabled={action.busy} onPress={()=>void run(async()=>navigate(await flow.reconcile()))}/></>}
      {confirming&&<Busy/>}
    </Card>}
    <Button secondary title="手动 / 蓝牙添加" disabled={confirming||state.phase==='unknown'||action.busy} onPress={()=>router.replace('/add')}/>
  </Page>;
}
