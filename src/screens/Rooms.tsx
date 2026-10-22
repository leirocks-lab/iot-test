import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View } from 'react-native';
import { ApiError, type Room } from '../services/models';
import { useApp } from '../ui/context';
import { Button, Card, Empty, ErrorText, Field, Label, Page, confirm, styles, useAction } from '../ui/kit';

export default function Rooms(){
  const {runtime}=useApp(),action=useAction(),run=action.run;
  const [rooms,setRooms]=useState<Room[]>([]),[baseline,setBaseline]=useState<Room[]>([]);
  const [name,setName]=useState(''),[editing,setEditing]=useState<string|null>(null),[draft,setDraft]=useState(''),[dirty,setDirty]=useState(false);
  const apply=useCallback((value:Room[])=>{setRooms(value);setBaseline(value.map(room=>({...room})));setDirty(false);},[]);
  const load=useCallback(async()=>{apply((await runtime!.service.rooms()).rooms);},[runtime,apply]);
  useFocusEffect(useCallback(()=>{if(runtime)void run(load);},[runtime,load,run]));
  const save=async(next:Room[])=>{
    try{apply((await runtime!.service.saveRooms(next,baseline)).rooms);}
    catch(error){
      // Re-read conflicts and unknown write results; never repeat a write.
      let reloaded=false;
      try{await load();reloaded=true;}catch{/* Keep the original failure and allow explicit reload. */}
      if((error as {code?:number}).code===409)throw new ApiError(409,reloaded?'Rooms changed. Review the latest list and edit again.':'Unable to verify rooms. Reload before editing again.');
      throw error;
    }
  };
  const swap=(index:number,direction:number)=>{const next=rooms.slice(),to=index+direction;if(to<0||to>=next.length)return;[next[index],next[to]]=[next[to],next[index]];setRooms(next);setDirty(true);};
  return <Page title="Rooms"><ErrorText error={action.error}/>{!rooms.length&&<Empty text="No rooms yet"/>}{rooms.map((room,index)=><Card key={room.id}>
    <Label large>{room.name}</Label><Label muted>{room.deviceCount===undefined?'Device count unavailable':`${room.deviceCount} devices`}</Label>
    {editing===room.id?<><Field label="Room name" value={draft} onChangeText={setDraft}/><Button title="Save name" disabled={action.busy} onPress={()=>void run(async()=>{try{await runtime!.service.renameRoom(room.id,draft);setEditing(null);await load();}catch(error){if((error as {code?:number}).code===1431){setEditing(null);await load();}throw error;}})}/><Button secondary title="Cancel" disabled={action.busy} onPress={()=>setEditing(null)}/></>:<View style={styles.row}>
      <Button secondary title="Rename" disabled={action.busy||dirty||editing!==null} onPress={()=>{setEditing(room.id);setDraft(room.name);}}/>
      <Button secondary title="↑" disabled={action.busy||editing!==null||index===0} onPress={()=>swap(index,-1)}/>
      <Button secondary title="↓" disabled={action.busy||editing!==null||index===rooms.length-1} onPress={()=>swap(index,1)}/>
      <Button secondary danger title="Delete" disabled={action.busy||dirty||editing!==null||room.isDefault||room.deviceCount===undefined||room.deviceCount>0} onPress={()=>confirm('Delete room',room.name,()=>void run(()=>save(rooms.filter(r=>r.id!==room.id))))}/>
    </View>}
  </Card>)}{dirty&&<><Button title="Save order" disabled={action.busy} onPress={()=>void run(()=>save(rooms))}/><Button secondary title="Discard and reload" disabled={action.busy} onPress={()=>void run(load)}/></>}
    <Button secondary title="Reload rooms" disabled={action.busy} onPress={()=>void run(load)}/>
    <Card><Field label="New room name" value={name} onChangeText={setName}/><Button title="Add room" disabled={action.busy||dirty||editing!==null} onPress={()=>void run(async()=>{await runtime!.service.createRoom(name);setName('');await load();})}/></Card>
  </Page>;
}
