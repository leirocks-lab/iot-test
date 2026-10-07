import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Provisioner } from '../protocol/device';
import type { DiscoveredDevice } from '../protocol/ble';
import type { Product } from '../services/models';
import { useApp } from '../ui/context';
import { Busy, Button, Card, ErrorText, Field, Label, Page, styles, useAction } from '../ui/kit';
import { DeviceGlyph } from '../ui/device-glyph';
export default function Add(){
  const {runtime}=useApp(),action=useAction(),run=action.run,{productID}=useLocalSearchParams<{productID?:string}>(),[catalog,setCatalog]=useState<Product[]>([]),[product,setProduct]=useState<Product|null>(null),[results,setResults]=useState<DiscoveredDevice[]>([]),[candidate,setCandidate]=useState<DiscoveredDevice|null>(null),[ssid,setSsid]=useState(''),[password,setPassword]=useState(''),[nickname,setNickname]=useState(''),[status,setStatus]=useState(''),[bound,setBound]=useState<string|null>(null),[category,setCategory]=useState('all');
  const abort=useRef(new AbortController()),transaction=useRef<string>('');
  useEffect(()=>{if(!runtime)return;const controller=new AbortController();abort.current=controller;void run(async()=>{const groups=await runtime.service.products();const products=groups.flatMap(g=>g.products).sort((a,b)=>a.sort-b.sort);setCatalog(products);if(productID)setProduct(products.find(p=>p.id===productID)??null);});return ()=>controller.abort();},[runtime,productID,run]);
  if(!runtime)return <Busy/>;
  const scan=()=>action.run(async()=>{setStatus('Scanning…');setResults(await runtime.devices.scan(abort.current.signal));setStatus('Scan complete');});
  const provision=()=>action.run(async()=>{
    if(!candidate||!product)return;
    if(!ssid||!password)throw new Error('请输入 Wi-Fi 名称及密码');
    if(!transaction.current)transaction.current=`bind-${runtime.service.userID}-${Date.now()}`;
    const urls=await runtime.service.connection();
    const input={userID:runtime.service.userID,mac:candidate.mac,model:candidate.model,ssid,password,token:runtime.service.session!.accessToken,bindCode:transaction.current,productID:product.id,seriesName:product.seriesName,modelID:product.modelName,urls};
    const result=await new Provisioner(runtime.devices).run(input,setStatus,abort.current.signal);
    const confirmed=await runtime.service.bindStatus(input.bindCode);
    if(confirmed.deviceID!==result.deviceID)throw new Error('绑定结果不一致');
    setBound(confirmed.deviceID);setPassword('');setStatus('Device added');
  });
  return <Page title="Add device"><ErrorText error={action.error}/>
    {!product?<><Label large>Find your device</Label><View style={styles.row}><Button title="Recommended" secondary={category!=='all'} onPress={()=>setCategory('all')}/>{[...new Set(catalog.map(p=>p.category))].map(c=><Button secondary={category!==c} key={c} title={c} onPress={()=>setCategory(c)}/>)}</View>{catalog.filter(p=>category==='all'?p.recommended:p.category===category).map(p=><Card key={p.id}><DeviceGlyph humidity={p.category==='Dehumidifier'}/><Label large>{p.name}</Label><Label muted>{p.modelName}</Label><Button title="Select product" onPress={()=>setProduct(p)}/></Card>)}</>:<>
      <Card><DeviceGlyph humidity={product.category==='Dehumidifier'}/><Label large>{product.name}</Label><Button secondary title="Pairing help" onPress={()=>router.push({pathname:'/help',params:{id:product.id,product:'true'}})}/></Card>
      {!bound&&<><Label muted>Use a 2.4 GHz Wi-Fi network. Keep your device in pairing mode.</Label><Button title="Scan Bluetooth devices" disabled={action.busy} onPress={()=>void scan()}/>{results.filter(d=>d.model===product.modelName).map(d=><Button key={d.mac} secondary={candidate?.mac!==d.mac} title={`${d.model} · ${d.mac}`} disabled={action.busy} onPress={()=>{setCandidate(d);transaction.current='';}}/>)}{results.length>0&&!results.some(d=>d.model===product.modelName)&&<Label muted>No matching devices. Check pairing mode and retry.</Label>}
      <Field label="Wi-Fi name" value={ssid} onChangeText={setSsid}/><Field label="Wi-Fi password" secureTextEntry value={password} onChangeText={setPassword}/><Button title={action.busy?'Pairing…':'Connect device'} disabled={!candidate||action.busy} onPress={()=>void provision()}/></>}
      {!!status&&<Card><Label>{status}</Label>{action.busy&&<Busy/>}</Card>}
      {bound&&<><Field label="Device nickname (optional)" maxLength={20} value={nickname} onChangeText={setNickname}/><Button title="Finish" disabled={action.busy} onPress={()=>void run(async()=>{if(nickname.trim())await runtime.service.renameDevice(bound,nickname);router.replace('/home');})}/><Button secondary title="Skip nickname" onPress={()=>router.replace('/home')}/></>}
      {!bound&&<Button secondary disabled={action.busy} title="Choose another product" onPress={()=>{setProduct(null);setResults([]);setCandidate(null);setPassword('');}}/>}
    </>}
  </Page>;
}
