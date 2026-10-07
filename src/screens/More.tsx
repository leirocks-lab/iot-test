import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import type { DeviceView, Room } from '../services/models';
import { useApp } from '../ui/context';
import { Button, Card, ErrorText, Field, Label, Page, confirm, useAction } from '../ui/kit';
export default function More(){
  const {id}=useLocalSearchParams<{id:string}>(),{runtime}=useApp(),action=useAction(),run=action.run,[device,setDevice]=useState<DeviceView|null>(null),[rooms,setRooms]=useState<Room[]>([]),[location,setLocation]=useState<string|null>(null),[name,setName]=useState(''),[members,setMembers]=useState<{userID:string;email:string;nickname:string;bindingRole:string}[]>([]);
  const load=useCallback(async()=>{const [d,r,m,l]=await Promise.all([runtime!.service.device(id),runtime!.service.rooms(),runtime!.service.members(id),runtime!.service.location(id)]);setDevice(d);setName(d.deviceNickname);setRooms(r.rooms);setMembers(m);setLocation(l.id);},[runtime,id]);
  useFocusEffect(useCallback(()=>{if(runtime)void run(load);},[runtime,load,run]));
  return <Page title="Device settings"><ErrorText error={action.error}/>{device&&<>
    <Card><Field label="Device nickname" maxLength={20} value={name} onChangeText={setName}/><Button title="Save name" disabled={action.busy||device.bindingRole==='obs'} onPress={()=>void run(async()=>{await runtime!.service.renameDevice(id,name);await load();})}/><Label muted>{device.device.mac}</Label></Card>
    <Card><Label large>Room</Label><Button secondary={location!==null} title="Unassigned" disabled={action.busy||device.bindingRole==='obs'} onPress={()=>void run(async()=>{await runtime!.service.moveDevice(id,null);await load();})}/>{rooms.map(r=><Button secondary={location!==r.id} title={r.name} key={r.id} disabled={action.busy||device.bindingRole==='obs'} onPress={()=>void run(async()=>{await runtime!.service.moveDevice(id,r.id);await load();})}/>)}</Card>
    <Card><Label large>Members</Label><Label muted>{members.filter(m=>m.bindingRole==='mbr').length} members</Label>{members.map(m=><Card key={m.userID}><Label>{m.email||m.nickname}</Label><Label muted>{m.bindingRole}</Label>{device.bindingRole==='sa'&&m.bindingRole==='mbr'&&<Button secondary danger title="Remove member" disabled={action.busy} onPress={()=>confirm('Remove member',m.email||m.nickname,()=>void run(async()=>{await runtime!.service.removeMember(id,m.userID);await load();}))}/>}</Card>)}{device.bindingRole==='sa'&&<Button title="Share device" onPress={()=>router.push({pathname:'/device/[id]/share',params:{id}})}/>}</Card>
    <Button secondary title="Device manual & FAQ" onPress={()=>router.push({pathname:'/help',params:{id}})}/><Button secondary title="Firmware updates" onPress={()=>router.push({pathname:'/device/[id]/ota',params:{id}})}/>
    <Button danger title="Remove my binding" disabled={action.busy} onPress={()=>confirm('Remove my binding','仅解除本人绑定，不清除设备或其他用户。',()=>void run(async()=>{await runtime!.service.unbind(id);router.replace('/home');}))}/>
  </>}</Page>;
}
