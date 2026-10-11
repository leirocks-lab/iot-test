import NetInfo from '@react-native-community/netinfo';
import { PermissionsAndroid, Platform } from 'react-native';
import { ApiError } from '../services/models';
import { observeWifi, type WifiReader } from '../services/wifi';

export function createWifiReader():WifiReader {
  return {read:async(signal,requestPermission=false)=>{
    const check=()=>{if(signal?.aborted)throw new ApiError(499,'网络读取已停止');};check();
    let granted=Platform.OS!=='android';
    if(Platform.OS==='android'){
      const permission=PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
      granted=await PermissionsAndroid.check(permission);check();
      if(!granted&&requestPermission){granted=await PermissionsAndroid.request(permission)===PermissionsAndroid.RESULTS.GRANTED;check();}
    }
    // iOS SSID entitlement/location conditions are not yet available: do not enable shouldFetchWiFiSSID.
    const state=await NetInfo.fetch('wifi');check();
    const observation=observeWifi({type:state.type,isConnected:state.isConnected,details:state.type==='wifi'?state.details:undefined});
    if(!granted&&observation.connection==='wifi')return {...observation,ssid:undefined,ssidAccess:'denied'};
    return observation;
  }};
}
