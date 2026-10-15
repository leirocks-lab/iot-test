import { withAndroidManifest, type ConfigPlugin } from 'expo/config-plugins';

// CNG applies this only to a newly generated native project. JS restricts the API roots.
const withDevelopmentHttp:ConfigPlugin<{enabled:boolean}>=(config,{enabled})=>withAndroidManifest(config,mod=>{
  const app=mod.modResults.manifest.application?.[0];
  if(app)app.$['android:usesCleartextTraffic']=enabled?'true':'false';
  return mod;
});
export default withDevelopmentHttp;
