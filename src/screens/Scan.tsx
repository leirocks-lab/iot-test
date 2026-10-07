import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { View } from 'react-native';
import { parseRowanCode, encodeProductCode, type RowanCode } from '../services/qr';
import { useApp } from '../ui/context';
import { Button, Card, ErrorText, Field, Label, Page, useAction } from '../ui/kit';
export default function Scan(){const {runtime}=useApp(),action=useAction(),[permission,requestPermission]=useCameraPermissions(),[active,setActive]=useState(false),[candidate,setCandidate]=useState<RowanCode|null>(null),[value,setValue]=useState(''),lock=useRef(false);
  useFocusEffect(useCallback(()=>{setActive(true);return ()=>{setActive(false);setCandidate(null);lock.current=false;};},[]));
  const decode=(data:string)=>{if(lock.current)return;lock.current=true;try{setCandidate(parseRowanCode(data));action.setError('');}catch(e){action.setError((e as Error).message);lock.current=false;}};
  return <Page title="Scan QR code"><ErrorText error={action.error}/>{active&&!candidate&&(permission?.granted?<View style={{height:280,borderRadius:18,overflow:'hidden'}}><CameraView style={{flex:1}} barcodeScannerSettings={{barcodeTypes:['qr']}} onBarcodeScanned={({data})=>decode(data)}/></View>:<Button title="Allow camera" onPress={()=>void requestPermission()}/>)}
    {runtime?.developer&&!candidate&&<Card><Field label="Mock QR content" multiline value={value} onChangeText={setValue}/><Button secondary title="Read code" onPress={()=>decode(value)}/><Button secondary title="Use product sample" onPress={()=>decode(encodeProductCode('prd_humidity'))}/></Card>}
    {candidate&&<Card><Label large>{candidate.type==='share'?'Confirm shared device':'Confirm product'}</Label><Label>{candidate.type==='share'?candidate.deviceID:candidate.productID}</Label><Button title="Confirm" disabled={action.busy} onPress={()=>void action.run(async()=>{if(candidate.type==='share'){await runtime!.service.acceptShare(candidate.deviceID,candidate.bindCode);router.replace('/home');}else {await runtime!.service.product(candidate.productID);router.replace({pathname:'/add',params:{productID:candidate.productID}});}})}/><Button secondary title="Scan again" onPress={()=>{setCandidate(null);lock.current=false;}}/></Card>}
  </Page>;
}
