// Package operations and UID-wide overrides are different state. Never write one as the other.
export function parseCameraAppOps(output) {
  const lines=output.replaceAll('\r','').split('\n').map(line=>line.trim()).filter(Boolean);
  let appOp=null,uidAppOp=null,empty=false;
  for(const line of lines) {
    if(/^No operations\.?$/.test(line)){empty=true;continue;}
    const uid=line.match(/^Uid mode:\s*CAMERA:\s*(allow|deny|ignore|default|foreground)(?=;|\s|$)/);
    if(uid){if(uidAppOp!==null)return null;uidAppOp=uid[1];continue;}
    const app=line.match(/^CAMERA:\s*(allow|deny|ignore|default|foreground)(?=;|\s|$)/);
    if(app){if(appOp!==null)return null;appOp=app[1];continue;}
    return null;
  }
  if(!empty&&appOp===null&&uidAppOp===null)return null;
  if(empty&&appOp!==null)return null;
  return {appOp:appOp??'default',uidAppOp,packageEntryPresent:appOp!==null};
}

// Android16 CAMERA's op default is MODE_ALLOWED. Resetting this one package op can
// leave an explicit allow/history row where none existed; UID restrictions remain separate.
export function cameraAppOpsEquivalent(a,b) {
  const effective=value=>value.appOp==='default'&&value.packageEntryPresent===false?'allow':value.appOp;
  return effective(a)===effective(b)&&a.uidAppOp===b.uidAppOp;
}
