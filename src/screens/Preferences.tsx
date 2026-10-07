import { useEffect, useState } from 'react';
import { Linking, Platform, Switch, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useApp } from '../ui/context';
import { Button, Card, ErrorText, Label, Page, styles, useAction } from '../ui/kit';
import type { Settings } from '../services/models';
export default function Preferences(){const {runtime,refreshSettings}=useApp(),action=useAction(),run=action.run,[setting,setSetting]=useState<Settings|null>(null),[permission,setPermission]=useState('Unavailable');
  useEffect(()=>{if(runtime)void run(async()=>{setSetting(await runtime.service.settings());if(Platform.OS!=='web'){const status=await Notifications.getPermissionsAsync();setPermission(status.status);}});},[runtime,run]);
  const update=(patch:Partial<Settings>)=>action.run(async()=>{const confirmed=await runtime!.service.updateSettings(patch);setSetting(confirmed);refreshSettings();});
  return <Page title="Preferences"><ErrorText error={action.error}/>{setting&&<>
    <Card><Label large>Language</Label><View style={styles.row}>{(['zh-CN','zh-TW','en'] as const).map(value=><Button secondary={setting.language!==value} key={value} title={{'zh-CN':'简体中文','zh-TW':'繁體中文',en:'English'}[value]} disabled={action.busy} onPress={()=>void update({language:value})}/>)}</View></Card>
    <Card><Label large>Notifications</Label><View style={styles.row}><Switch accessibilityLabel="Notification preference" value={setting.notification} disabled={action.busy} onValueChange={v=>void update({notification:v})}/><Label>Notification preference</Label></View><Label muted>System permission: {permission}</Label>{permission==='undetermined'&&<Button secondary title="Allow notifications" onPress={()=>void run(async()=>{const r=await Notifications.requestPermissionsAsync();setPermission(r.status);})}/>}<Button secondary title="Open system settings" onPress={()=>void run(()=>Linking.openSettings())}/></Card>
    <Card><Label large>Appearance</Label><View style={styles.row}>{(['system','light','dark'] as const).map(theme=><Button secondary={setting.theme!==theme} key={theme} title={theme} disabled={action.busy} onPress={()=>void update({theme})}/>)}</View></Card>
    <Card><Label large>Units</Label><View style={styles.row}>{(['C','F'] as const).map(temperatureUnit=><Button secondary={setting.temperatureUnit!==temperatureUnit} key={temperatureUnit} title={'°'+temperatureUnit} disabled={action.busy} onPress={()=>void update({temperatureUnit})}/>)}</View><View style={styles.row}>{(['metric','imperial'] as const).map(measurementSystem=><Button secondary={setting.measurementSystem!==measurementSystem} key={measurementSystem} title={measurementSystem} disabled={action.busy} onPress={()=>void update({measurementSystem})}/>)}</View></Card>
    <Card><Label>Wallpaper</Label><Label muted>{setting.wallpaper?.name?.[setting.language]??setting.wallpaper?.name?.en??'Wallpaper options are not yet defined'}</Label><Label>Home layout</Label><Label muted>Layout options are not yet defined</Label></Card>
  </>}</Page>;
}
