import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState, View } from 'react-native';
import { useApp } from '../ui/context';
import { Button, Card, ErrorText, Label, Page, confirm, styles, useAction } from '../ui/kit';
export default function Ota(){
  const {id}=useLocalSearchParams<{id:string}>(),{runtime}=useApp(),action=useAction(),run=action.run,[type,setType]=useState<'mcu'|'wifi'>('mcu'),[firmware,setFirmware]=useState<{id:string;version:string;remark:string}|null>(null),[checked,setChecked]=useState(false),[taskID,setTaskID]=useState(''),[result,setResult]=useState('');
  useFocusEffect(useCallback(()=>{if(!runtime)return;let active=true;
    void run(async()=>{const saved=await runtime.service.preference('ota.'+id);if(saved&&active){setTaskID(saved);const task=await runtime.service.otaTask(id,saved);if(active)setResult(task.result);}});
    const timer=setInterval(()=>{if(taskID&&result==='updating'&&AppState.currentState==='active')void run(async()=>{const task=await runtime.service.otaTask(id,taskID);if(active)setResult(task.result);});},5000);
    return ()=>{active=false;clearInterval(timer);};
  },[runtime,id,taskID,result,run]));
  return <Page title="Firmware updates"><View style={styles.row}>{(['mcu','wifi'] as const).map(value=><Button key={value} title={value==='mcu'?'MCU':'Wi-Fi'} secondary={type!==value} disabled={result==='updating'} onPress={()=>{setType(value);setChecked(false);setFirmware(null);}}/>)}</View><ErrorText error={action.error}/>
    <Button title="Check for updates" disabled={action.busy} onPress={()=>void run(async()=>{const response=await runtime!.service.firmware(id,type);setFirmware(response.firmware);setChecked(true);})}/>
    {checked&&<Card>{firmware?<><Label large>{firmware.version}</Label><Label>{firmware.remark}</Label><Button title="Start update" disabled={action.busy||result==='updating'} onPress={()=>confirm('Start update','升级期间请保持设备电源和网络连接。',()=>void run(async()=>{const task=await runtime!.service.startOta(id,type,firmware.id);await runtime!.service.preference('ota.'+id,task.taskID);setTaskID(task.taskID);setResult('updating');}))}/></>:<Label>Already up to date</Label>}</Card>}
    {!!taskID&&<Card><Label>Task: {taskID}</Label><Label large>{result}</Label>{result==='updating'&&<Button secondary title="Cancel update" disabled={action.busy} onPress={()=>confirm('Cancel update','安装开始后无法取消。确认请求取消？',()=>void run(async()=>{await runtime!.service.cancelOta(id,taskID);setResult((await runtime!.service.otaTask(id,taskID)).result);}))}/>}</Card>}
  </Page>;
}
