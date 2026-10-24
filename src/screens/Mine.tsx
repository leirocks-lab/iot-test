import { router } from 'expo-router';
import { useState } from 'react';
import { useApp } from '../ui/context';
import { Button, Card, ErrorText, Label, Page, confirm, useAction } from '../ui/kit';
import { IntegrationStatusView } from '../components/device/integration-status';
export default function Mine(){const {runtime,refreshSettings}=useApp(),action=useAction(),[developer,setDeveloper]=useState(false);
  return <Page title="Mine" back={false}><Card><Label large>Make it yours</Label><Label muted>{runtime?.service.session?.userID}</Label><Button title="Preferences" onPress={()=>router.push('/preferences')}/></Card><Button secondary danger title="Sign out" disabled={action.busy} onPress={()=>confirm('Sign out','退出当前账号？',()=>void action.run(async()=>{await runtime!.service.logout();refreshSettings();router.replace('/auth');}))}/><ErrorText error={action.error}/>{runtime&&runtime.config.environment!=='production'&&<><Button secondary title="Developer tools" onPress={()=>setDeveloper(v=>!v)}/>{developer&&<Card><IntegrationStatusView status={runtime.integration}/></Card>}</>}</Page>;
}
