import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../ui/context';
import { Button, Card, ErrorText, Label, Page, useAction } from '../ui/kit';
export default function Help(){const {id,product}=useLocalSearchParams<{id:string;product?:string}>(),{runtime}=useApp(),action=useAction(),run=action.run,[content,setContent]=useState<{title:string;content:string}|null>(null);const load=useCallback(()=>run(async()=>setContent(await runtime!.service.help(id,product==='true'))),[runtime,id,product,run]);useEffect(()=>{if(runtime)void load();},[runtime,load]);return <Page title="Help"><ErrorText error={action.error}/>{content&&<Card><Label large>{content.title}</Label><Label>{content.content}</Label></Card>}<Button secondary title="Retry" disabled={action.busy} onPress={()=>void load()}/></Page>;}
