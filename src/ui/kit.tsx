import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors, useApp } from './context';
import { translate } from './i18n';

export function Label({children,muted=false,large=false}:{children:ReactNode;muted?:boolean;large?:boolean}){const c=useColors(),{runtime}=useApp();return <Text style={{color:muted?c.muted:c.text,fontSize:large?26:16,lineHeight:large?34:24,fontWeight:large?'700':'400'}}>{typeof children==='string'?translate(children,runtime?.service.language??'zh-CN'):children}</Text>;}
export function Card({children}:{children:ReactNode}){const c=useColors();return <View style={[styles.card,{backgroundColor:c.surface}]}>{children}</View>;}
export function Page({title,children,back=true,action,wallpaper=false}:{title:string;children:ReactNode;back?:boolean;action?:ReactNode;wallpaper?:boolean}) {
  const c=useColors(),{runtime,settings}=useApp(),[failedImage,setFailedImage]=useState('');const image=wallpaper?settings?.wallpaper?.image:undefined;
  return <SafeAreaView style={{flex:1,backgroundColor:c.background}}>{image&&image!==failedImage&&<><Image source={image} contentFit="cover" style={StyleSheet.absoluteFill} onError={()=>setFailedImage(image)}/><View style={[StyleSheet.absoluteFill,{backgroundColor:c.background,opacity:.88}]}/></>}<KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <View style={styles.header}>{back&&<Pressable accessibilityRole="button" accessibilityLabel="Back" style={styles.back} onPress={()=>router.canGoBack()?router.back():router.replace('/home')}><Text style={{fontSize:28,color:c.text}}>‹</Text></Pressable>}<Text style={[styles.heading,{color:c.text}]}>{translate(title,runtime?.service.language??'zh-CN')}</Text>{action}</View>
    {runtime&&(runtime.config.httpMode==='mock'||runtime.config.deviceMode==='mock')&&<Text style={{color:c.muted,fontSize:12,textAlign:'center',paddingBottom:8}}>MOCK · 文档模拟环境</Text>}
    {image===failedImage&&!!image&&<Label muted>Wallpaper is unavailable</Label>}
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>{children}</ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
export function Button({title,onPress,disabled=false,secondary=false,danger=false}:{title:string;onPress:()=>void;disabled?:boolean;secondary?:boolean;danger?:boolean}){const c=useColors(),{runtime}=useApp();return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[styles.button,{backgroundColor:secondary?c.surface:danger?c.danger:c.primary,borderColor:danger?c.danger:c.border,borderWidth:secondary?1:0,opacity:disabled?.45:pressed?.75:1}]}><Text style={{fontSize:16,fontWeight:'600',color:secondary?c.text:c.onPrimary}}>{translate(title,runtime?.service.language??'zh-CN')}</Text></Pressable>;}
export function Field({label,...props}:TextInputProps&{label:string}){const c=useColors(),{runtime}=useApp();return <View style={{gap:6}}><Label muted>{label}</Label><TextInput accessibilityLabel={translate(label,runtime?.service.language??'zh-CN')} placeholderTextColor={c.muted} autoCapitalize="none" {...props} style={[styles.input,{color:c.text,backgroundColor:c.surface,borderColor:c.border},props.style]}/></View>;}
export function ErrorText({error}:{error:string}){const c=useColors();return error?<Text accessibilityRole="alert" style={{color:c.danger,fontSize:15,lineHeight:23}}>{error}</Text>:null;}
export function Busy(){return <ActivityIndicator accessibilityLabel="Loading" size="large" style={{padding:24}}/>;}
export function useAction(){const [busy,setBusy]=useState(false),[error,setError]=useState(''),lock=useRef(false);const run=useCallback(async(work:()=>Promise<unknown>)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await work();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{lock.current=false;setBusy(false);}},[]);return {busy,error,setError,run};}
export function confirm(title:string,body:string,work:()=>void){if(Platform.OS==='web'){if(globalThis.confirm(body))work();}else Alert.alert(title,body,[{text:'取消',style:'cancel'},{text:'确认',style:'destructive',onPress:work}]);}
export function Empty({text}:{text:string}){return <Card><Label muted>{text}</Label></Card>;}
export const styles=StyleSheet.create({header:{flexDirection:'row',alignItems:'center',gap:12,padding:20,paddingBottom:14},back:{minWidth:44,minHeight:44,justifyContent:'center',alignItems:'center'},heading:{fontSize:23,fontWeight:'700',flex:1},content:{padding:20,paddingTop:10,gap:16,maxWidth:640,width:'100%',alignSelf:'center',paddingBottom:40},card:{padding:20,borderRadius:18,gap:14},button:{minHeight:48,borderRadius:12,alignItems:'center',justifyContent:'center',paddingHorizontal:18,paddingVertical:12},input:{minHeight:52,borderWidth:1,borderRadius:12,padding:14,fontSize:16},row:{flexDirection:'row',gap:12,alignItems:'center',flexWrap:'wrap'}});
