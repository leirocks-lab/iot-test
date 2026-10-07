import Constants from 'expo-constants';
import { createContext, useContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import type { Runtime } from '../services/runtime';
import { createRuntime } from '../services/runtime';
import { communicationConfig, type CommunicationConfig } from '../services/config';
import type { Settings } from '../services/models';

const Context=createContext<{runtime:Runtime|null;error:string;settings:Settings|null;refreshSettings:()=>void;revision:number;navigationLocked:boolean;lockNavigation:(value:boolean)=>void}>({runtime:null,error:'',settings:null,refreshSettings:()=>undefined,revision:0,navigationLocked:false,lockNavigation:()=>undefined});
export function AppProvider({children}:{children:ReactNode}) {
  const [runtime,setRuntime]=useState<Runtime|null>(null),[error,setError]=useState(''),[revision,setRevision]=useState(0),[navigationLocked,setNavigationLocked]=useState(false);
  const lockNavigation=useCallback((value:boolean)=>setNavigationLocked(value),[]);
  useEffect(()=>{let active=true;let created:Runtime|undefined;const extra=Constants.expoConfig?.extra??{};
    Promise.resolve().then(()=>createRuntime(communicationConfig(extra as Partial<CommunicationConfig>))).then(r=>{created=r;if(active)setRuntime(r);else r.dispose();}).catch(e=>{if(active)setError(String(e.message));});
    return ()=>{active=false;created?.dispose();};
  },[]);
  useEffect(()=>runtime?.service.onSessionChange(()=>setRevision(r=>r+1)),[runtime]);
  const value=useMemo(()=>({runtime,error,settings:runtime?.service.session?.setting??null,refreshSettings:()=>setRevision(r=>r+1),revision,navigationLocked,lockNavigation}),[runtime,error,revision,navigationLocked,lockNavigation]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp(){return useContext(Context);}
export function useColors(){const {settings}=useApp(),system=useColorScheme();const dark=settings?.theme==='dark'||settings?.theme==='system'&&system==='dark';return dark?{background:'#111C22',surface:'#1D2C33',text:'#F1F7FA',muted:'#B2C3CA',primary:'#58B8F5',border:'#344850',danger:'#FF909A',onPrimary:'#0B2636'}:{background:'#F3F5F7',surface:'#FFFFFF',text:'#152838',muted:'#60717E',primary:'#1475BD',border:'#DCE5EB',danger:'#B82840',onPrimary:'#FFFFFF'};}
