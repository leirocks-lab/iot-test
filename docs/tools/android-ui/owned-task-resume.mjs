// Restore only the isolated validation app through its actual system Recents card.
// No private-component start, task reparent, permission change or launcher reset.
const launcher='com.google.android.apps.nexuslauncher';
const decode=s=>s.replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
function tree(xml) {
  const stack=[],nodes=[];
  for(const match of xml.matchAll(/<\/?node\b[^>]*>/g)) {
    if(match[0].startsWith('</')) {stack.pop();continue;}
    const a=Object.fromEntries([...match[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(x=>[x[1],decode(x[2])]));
    const n={...a,parent:stack.at(-1),b:a.bounds?.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/)?.slice(1).map(Number)};
    nodes.push(n);if(!match[0].endsWith('/>'))stack.push(n);
  }
  return nodes;
}
const rect=b=>b?.length===4&&b[2]>b[0]&&b[3]>b[1];
const inside=(b,p)=>rect(b)&&rect(p)&&b[0]>=p[0]&&b[1]>=p[1]&&b[2]<=p[2]&&b[3]<=p[3];
export function recentsState(xml) {
  const ns=tree(xml),root=ns[0];
  if(root?.package!==launcher)return {launcher:false,overview:false,target:null};
  const overview=ns.some(n=>n['resource-id']===`${launcher}:id/overview_panel`);
  const candidates=ns.filter(n=>n['resource-id']===`${launcher}:id/snapshot`&&n['content-desc']==='ROWAN 验证'&&
    n.parent?.['resource-id']===`${launcher}:id/task_view_single`&&n.parent.clickable==='true'&&
    inside(n.b,n.parent.b)&&inside(n.b,root.b)&&n.b[2]-n.b[0]>=200);
  return {launcher:true,overview,target:overview&&candidates.length===1?candidates[0].b:null};
}
export async function resumeOwnTask({adb,rawScreen,isExpectedForeground}) {
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  if(isExpectedForeground())return;
  let state=recentsState(rawScreen());
  if(!state.launcher)throw Error('KNOWN_LAUNCHER_REQUIRED');
  if(!state.overview) {adb(['shell','input','keyevent','187']);await wait(300);}
  let previous=null,stable=0,target=null;
  for(let i=0;i<8;i++) {
    state=recentsState(rawScreen());
    if(!state.launcher)throw Error('KNOWN_RECENTS_REQUIRED');
    const key=state.target?.join(',');
    stable=key&&key===previous?stable+1:key?1:0;previous=key;
    if(stable>=2){target=state.target;break;}
    await wait(200);
  }
  if(!target)throw Error('UNIQUE_OWN_RECENTS_CARD_REQUIRED');
  const [l,t,r,b]=target;
  adb(['shell','input','tap',`${Math.floor((l+r)/2)}`,`${Math.floor((t+b)/2)}`]);
  for(let i=0;i<12;i++){if(isExpectedForeground())return;await wait(200);}
  throw Error('SAME_NATIVE_PAGE_NOT_RESTORED');
}
