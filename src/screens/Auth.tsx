import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, Switch, View } from 'react-native';
import { useApp } from '../ui/context';
import { Busy, Button, Card, ErrorText, Field, Label, Page, styles, useAction } from '../ui/kit';
import { digest } from '../services/store';
type Kind='privacy'|'serviceTerms';
export default function Auth(){
  const {mode:queryMode}=useLocalSearchParams<{mode?:string}>();
  const mode=queryMode==='register'||queryMode==='reset'?queryMode:'login';
  const {runtime,refreshSettings}=useApp(),action=useAction();
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[repeat,setRepeat]=useState(''),[captcha,setCaptcha]=useState(''),[useCode,setUseCode]=useState(false),[region,setRegion]=useState('US'),[regionSearch,setRegionSearch]=useState(''),[cooldown,setCooldown]=useState(0),[accepted,setAccepted]=useState(false);
  const [read,setRead]=useState<Partial<Record<Kind,string>>>({}),[agreement,setAgreement]=useState<{kind:Kind;content:string}|null>(null),[countdown,setCountdown]=useState(3),[bottom,setBottom]=useState(false);
  const abort=useRef(new AbortController()),submit=useRef(false);
  useEffect(()=>{const controller=new AbortController();abort.current=controller;return ()=>{controller.abort();runtime?.service.cancelAuthentication();};},[runtime,mode]);
  useEffect(()=>{if(!cooldown)return;const t=setTimeout(()=>setCooldown(c=>c-1),1000);return ()=>clearTimeout(t);},[cooldown]);
  useEffect(()=>{if(!agreement||!countdown)return;const t=setTimeout(()=>setCountdown(c=>c-1),1000);return ()=>clearTimeout(t);},[agreement,countdown]);
  if(!runtime)return <Busy/>;
  const service=runtime.service;
  const changeMode=(value:string)=>{service.cancelAuthentication();router.replace({pathname:'/auth',params:{mode:value}});};
  const openAgreement=(kind:Kind)=>action.run(async()=>{const response=await service.agreement(kind,region);if(response.type!=='text'||!response.content)throw new Error('协议正文不可用');setAgreement({kind,content:response.content});setBottom(false);setCountdown(3);});
  const send=()=>action.run(async()=>{await service.sendCaptcha(email,mode==='register'?'register':mode==='reset'?'forget':'login');setCooldown(60);});
  const commit=()=>action.run(async()=>{
    if(submit.current)return;submit.current=true;
    try{
      if(mode==='register'){
        if(!accepted||!read.privacy||!read.serviceTerms)throw new Error('请分别阅读两份协议并主动勾选同意');
        if(password!==repeat)throw new Error('两次密码不一致');
        await service.checkCaptcha(email,captcha);await service.register(email,password,captcha,region);changeMode('login');
      } else if(mode==='reset'){
        if(password!==repeat)throw new Error('两次密码不一致');
        await service.checkCaptcha(email,captcha);await service.resetPassword(email,password,captcha);changeMode('login');
      } else {await service.login(email,useCode?captcha:password,useCode?'captcha':'password',abort.current.signal);refreshSettings();router.replace('/home');}
    }finally{submit.current=false;}
  });
  return <Page title="ROWAN" back={false}>
    <View style={{paddingVertical:24,gap:8}}><Label large>{mode==='register'?'Create your account':mode==='reset'?'Reset your password':'Welcome back'}</Label><Label muted>One account. A connected home.</Label></View>
    {mode==='register'&&<Card><Field label="Search country or region" value={regionSearch} onChangeText={setRegionSearch}/><View style={styles.row}>{[{code:'US',name:'United States 美国 美國'},{code:'CN',name:'China 中国 中國'},{code:'TW',name:'Taiwan 台湾 台灣'}].filter(r=>r.name.toLowerCase().includes(regionSearch.toLowerCase())).map(r=><Button key={r.code} title={r.code+(region===r.code?' ✓':'')} secondary={region!==r.code} onPress={()=>{setRegion(r.code);setRead({});setAccepted(false);}}/>)}</View><Label muted>Region: {region}</Label></Card>}
    <Field label="Email" keyboardType="email-address" autoComplete="email" value={email} onChangeText={value=>{setEmail(value);setCaptcha('');setAccepted(false);}}/>
    {(mode!=='login'||!useCode)&&<Field label="Password" secureTextEntry autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChangeText={setPassword}/>}
    {mode!=='login'&&<Field label="Confirm password" secureTextEntry value={repeat} onChangeText={setRepeat}/>}
    {(mode!=='login'||useCode)&&<><Field label="Verification code" keyboardType="number-pad" maxLength={6} value={captcha} onChangeText={setCaptcha}/><Button secondary title={cooldown?`${cooldown}s`:'Send code'} disabled={action.busy||cooldown>0} onPress={send}/></>}
    {mode==='register'&&<Card><Button secondary title={'Privacy policy'+(read.privacy?' ✓':'')} onPress={()=>void openAgreement('privacy')}/><Button secondary title={'Terms of service'+(read.serviceTerms?' ✓':'')} onPress={()=>void openAgreement('serviceTerms')}/><View style={styles.row}><Switch accessibilityLabel="Agree to both agreements" value={accepted} disabled={!read.privacy||!read.serviceTerms} onValueChange={setAccepted}/><Label>I agree to both agreements</Label></View></Card>}
    <ErrorText error={action.error}/><Button title={action.busy?'Please wait…':mode==='register'?'Register':mode==='reset'?'Reset password':'Sign in'} disabled={action.busy||mode==='register'&&!accepted} onPress={()=>void commit()}/>
    {mode==='login'&&<><Button secondary title={useCode?'Use password':'Use verification code'} onPress={()=>{setUseCode(v=>!v);service.cancelAuthentication();}}/><View style={styles.row}><Button secondary title="Create account" onPress={()=>changeMode('register')}/><Button secondary title="Forgot password" onPress={()=>changeMode('reset')}/></View></>}
    {mode!=='login'&&<Button secondary title="Back to sign in" onPress={()=>changeMode('login')}/>}
    {runtime.developer&&<Label muted>Mock account: rowan@example.com / Rowan@123{ '\n' }Mock verification code: 123456</Label>}
    <Modal visible={!!agreement} animationType="slide" onRequestClose={()=>setAgreement(null)}><Page title={agreement?.kind==='privacy'?'Privacy policy':'Terms of service'} back={false}><ScrollView style={{height:280}} onContentSizeChange={(_,height)=>{if(height<=280)setBottom(true);}} onScroll={({nativeEvent:e})=>{if(e.contentOffset.y+e.layoutMeasurement.height>=e.contentSize.height-8)setBottom(true);}} scrollEventThrottle={100}><Label>{agreement?.content}</Label></ScrollView><Label muted>{countdown?`Read for ${countdown}s`:'Scroll to the end to finish reading'}</Label><Button title="Reading complete" disabled={countdown>0||!bottom} onPress={()=>{if(agreement)setRead(r=>({...r,[agreement.kind]:digest(region+agreement.content)}));setAccepted(false);setAgreement(null);}}/><Button secondary title="Cancel" onPress={()=>setAgreement(null)}/></Page></Modal>
  </Page>;
}
