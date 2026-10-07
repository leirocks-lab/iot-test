import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { encodeShareCode } from '../services/qr';
import { View } from 'react-native';
import { useApp } from '../ui/context';
import { Button, Card, ErrorText, Label, Page, useAction } from '../ui/kit';
export default function Share(){const {id}=useLocalSearchParams<{id:string}>(),{runtime}=useApp(),action=useAction(),[code,setCode]=useState(''),[remaining,setRemaining]=useState(0);
  const generate=()=>action.run(async()=>{const result=await runtime!.service.share(id);setCode(encodeShareCode(result));setRemaining(300);});
  useFocusEffect(useCallback(()=>{const timer=setInterval(()=>setRemaining(r=>Math.max(0,r-1)),1000);return ()=>{clearInterval(timer);setCode('');setRemaining(0);};},[]));
  return <Page title="Share device"><ErrorText error={action.error}/><Label muted>Only one account can accept this code. It expires after five minutes.</Label>{!!code&&remaining>0&&<Card><View style={{padding:20,alignSelf:'center',backgroundColor:'#FFFFFF'}}><QRCode value={code} size={220}/></View><Label>{remaining}s</Label><Label muted>{code}</Label></Card>}<Button title="Generate new code" disabled={action.busy} onPress={()=>void generate()}/></Page>;
}
