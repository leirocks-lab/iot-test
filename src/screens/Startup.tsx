import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useApp } from '../ui/context';
import { Busy, Button, ErrorText, Label, Page } from '../ui/kit';
export default function Startup(){
  const {runtime,error:initialError,refreshSettings}=useApp(),[error,setError]=useState(''),[round,setRound]=useState(0);
  useEffect(()=>{if(!runtime)return;let active=true;
    runtime.service.config(Platform.OS==='ios'?'ios':'android').then(()=>{if(active){refreshSettings();router.replace(runtime.service.session?'/home':'/auth');}}).catch(e=>{if(active)setError(e.message);});
    return ()=>{active=false;};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[runtime,round]);
  return <Page title="ROWAN" back={false}><Label large>Welcome home.</Label><Label muted>Connecting your everyday spaces.</Label>{error||initialError?<><ErrorText error={error||initialError}/><Button title="Retry" onPress={()=>{setError('');setRound(r=>r+1);}}/></>:<Busy/>}</Page>;
}
