import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../ui/context';
import type { HelpArticle } from '../services/models';
import { Button, Card, ErrorText, Label, Page, useAction } from '../ui/kit';
export default function Help(){const {id,product}=useLocalSearchParams<{id:string;product?:string}>(),{runtime}=useApp(),action=useAction(),run=action.run,[content,setContent]=useState<HelpArticle[]|null>(null);const load=useCallback(()=>run(async()=>setContent(await runtime!.service.help(id,product==='true'))),[runtime,id,product,run]);useEffect(()=>{if(runtime)void load();},[runtime,load]);return <Page title="Help"><ErrorText error={action.error}/>{content?.map((article,index)=><Card key={`${article.id??'help'}-${index}`}><Label large>{article.title}</Label><Label>{article.content}</Label></Card>)}{content?.length===0&&<Label muted>暂无帮助内容</Label>}<Button secondary title="Retry" disabled={action.busy} onPress={()=>void load()}/></Page>;}
