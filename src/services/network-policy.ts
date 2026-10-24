export interface WifiObservation {
  connection:'wifi'|'other'|'offline'|'unknown';
  ssid?:string;
  band:'2.4'|'5'|'unknown';
  source:'system';
  ssidAccess?:'denied';
}
export function observeNetwork(input:{type?:string;isConnected?:boolean}):WifiObservation {
  // UNKNOWN / VPN does not prove that Wi-Fi is disconnected, nor expose SSID or band.
  const type=input.type;
  const connection=!type||['UNKNOWN','VPN','OTHER','BLUETOOTH'].includes(type)?'unknown':type==='NONE'||input.isConnected===false?'offline':type==='WIFI'?'wifi':'other';
  return {connection,band:'unknown',source:'system'};
}
export function wifiGuidance(network:WifiObservation) {
  if(network.connection==='wifi'&&network.ssidAccess==='denied')return '已连接 Wi-Fi，SSID读取权限尚未授予；请允许权限或在系统设置中检查。';
  if(network.band==='5')return '当前网络为5GHz，请切换至设备支持的2.4GHz网络。';
  if(network.connection==='offline'||network.connection==='other')return '当前未检测到 Wi-Fi 连接，请在系统设置中连接2.4GHz网络。';
  if(network.connection==='wifi'&&!network.ssid)return '已连接 Wi-Fi，当前系统能力无法读取SSID；请在系统设置中核对2.4GHz网络。';
  return '无法确定当前网络频段，请使用2.4GHz网络；未知频段不作为失败依据。';
}
