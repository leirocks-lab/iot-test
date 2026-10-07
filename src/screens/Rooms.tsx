import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import type { Room } from '../services/models';
import { useApp } from '../ui/context';
import { Button, Card, Empty, ErrorText, Field, Label, Page, confirm, styles, useAction } from '../ui/kit';
export default function Rooms(){
  const {runtime}=useApp(),action=useAction(),run=action.run,[rooms,setRooms]=useState<Room[]>([]),[version,setVersion]=useState(''),[name,setName]=useState(''),[editing,setEditing]=useState<string|null>(null),[draft,setDraft]=useState(''),[dirty,setDirty]=useState(false);
  const load=useCallback(async()=>{const response=await runtime!.service.rooms();setRooms(response.rooms);setVersion(response.version);setDirty(false);},[runtime]);
  useFocusEffect(useCallback(()=>{if(runtime)void run(load);},[runtime,load,run]));
  const swap=(index:number,direction:number)=>{const next=rooms.slice(),to=index+direction;if(to<0||to>=next.length)return;[next[index],next[to]]=[next[to],next[index]];setRooms(next);setDirty(true);};
  return <Page title="Rooms"><ErrorText error={action.error}/>{!rooms.length&&<Empty text="No rooms yet"/>}{rooms.map((room,index)=><Card key={room.id}>
    <Label large>{room.name}</Label><Label muted>{room.deviceCount===undefined?'Device count unavailable':`${room.deviceCount} devices`}</Label>
    {editing===room.id?<><Field label="Room name" value={draft} onChangeText={setDraft}/><Button title="Save name" disabled={action.busy} onPress={()=>void run(async()=>{try{await runtime!.service.renameRoom(room.id,draft);setEditing(null);await load();}catch(error){if((error as {code?:number}).code===1431){setEditing(null);await load();}throw error;}})}/><Button secondary title="Cancel" onPress={()=>setEditing(null)}/></>:<View style={styles.row}><Button secondary title="Rename" disabled={dirty} onPress={()=>{setEditing(room.id);setDraft(room.name);}}/><Button secondary title="↑" disabled={index===0} onPress={()=>swap(index,-1)}/><Button secondary title="↓" disabled={index===rooms.length-1} onPress={()=>swap(index,1)}/><Button secondary danger title="Delete" disabled={action.busy||room.isDefault||room.deviceCount===undefined||room.deviceCount>0} onPress={()=>confirm('Delete room',room.name,()=>void run(async()=>{await runtime!.service.saveRooms(rooms.filter(r=>r.id!==room.id),version);await load();}))}/></View>}
  </Card>)}{dirty&&<><Button title="Save order" disabled={action.busy} onPress={()=>void run(async()=>{await runtime!.service.saveRooms(rooms,version);await load();})}/><Button secondary title="Discard and reload" onPress={()=>void run(load)}/></>}<Card><Field label="New room name" value={name} onChangeText={setName}/><Button title="Add room" disabled={action.busy||dirty} onPress={()=>void run(async()=>{await runtime!.service.createRoom(name);setName('');await load();})}/></Card></Page>;
}
