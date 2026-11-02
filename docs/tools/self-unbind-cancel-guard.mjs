// Only a known application confirmation may be cancelled. Positive actions are absent.
export const packageId='com.rowan.iot.dev.refactor';
export function nodes(xml){return [...xml.matchAll(/<node\b[^>]*>/g)].map(m=>Object.fromEntries([...m[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(a=>[a[1],a[2]])));}
export function cancelTarget(xml){
 const all=nodes(xml);
 if(all.some(n=>n['resource-id']==='android:id/aerr_wait')||all.some(n=>n.package&&n.package!==packageId))throw Error('UNKNOWN_SURFACE');
 if(all.filter(n=>n.text==='解除设备关联').length!==1||!all.some(n=>/^是否解除当前账号与“.+”的关联？$/.test(n.text??'')))throw Error('UNEXPECTED_CONFIRMATION');
 const positive=all.filter(n=>n['resource-id']==='android:id/button1'&&n.text==='解除关联');
 const negative=all.filter(n=>n['resource-id']==='android:id/button2'&&n.text==='取消');
 if(positive.length!==1||negative.length!==1)throw Error('UNEXPECTED_BUTTONS');
 return safeTarget(negative[0]);
}
export function safeTarget(node){
 if(!node||node.package!==packageId||node.enabled!=='true'||node.clickable!=='true'||node['resource-id']==='android:id/button1')throw Error('UNSAFE_ACTION');
 const b=node.bounds?.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/)?.slice(1).map(Number);
 if(!b||b[2]<=b[0]||b[3]<=b[1]||b.some(v=>v>10000))throw Error('INVALID_BOUNDS');
 return {x:Math.floor((b[0]+b[2])/2),y:Math.floor((b[1]+b[3])/2)};
}
