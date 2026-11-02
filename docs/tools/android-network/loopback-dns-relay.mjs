import dgram from 'node:dgram';
import {isIPv4} from 'node:net';
import {createHash, randomInt} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const MAX_PENDING=128, MAX_BYTES=4096, TTL_MS=2500, MAX_DURATION_MS=600000;
export class DnsRelayError extends Error {
  constructor(code){super(code);this.name='DnsRelayError';this.code=code;}
}

// Hash the ordered questions only in memory. Names are case-insensitive; compression
// may differ in a legitimate response. No packet/name/hash enters snapshots or logs.
function questions(packet){
  const count=packet.readUInt16BE(4);
  if(count<1||count>128)return null;
  const hash=createHash('sha256');hash.update(packet.subarray(4,6));
  let cursor=12;
  for(let question=0;question<count;question++){
    let offset=cursor,end=-1,length=0,terminated=false;
    const visited=new Set(), name=[];
    for(let step=0;step<128;step++){
      if(offset>=packet.length||visited.has(offset))return null;
      visited.add(offset);
      const label=packet[offset];
      if(label===0){if(end<0)end=offset+1;name.push(0);length++;terminated=true;break;}
      if((label&0xc0)===0xc0){
        if(offset+1>=packet.length)return null;
        const target=((label&0x3f)<<8)|packet[offset+1];
        if(target<12||target>=packet.length)return null;
        if(end<0)end=offset+2;
        offset=target;continue;
      }
      if((label&0xc0)!==0||label>63||offset+1+label>packet.length)return null;
      length+=1+label;if(length>=255)return null;
      name.push(label);
      for(let n=offset+1;n<=offset+label;n++){const value=packet[n];name.push(value>=65&&value<=90?value+32:value);}
      offset+=1+label;
    }
    if(!terminated||end<0||end+4>packet.length)return null;
    hash.update(Buffer.from(name));hash.update(packet.subarray(end,end+4));cursor=end+4;
  }
  return hash.digest();
}

/**
 * Explicit test-environment UDP relay only. Never configures OS, firewall or AVD.
 * start resolves after both sockets are ready; close is asynchronous and idempotent.
 */
export async function startLoopbackDnsRelay({upstream,maxDurationMs=MAX_DURATION_MS}={}){
  if(typeof upstream!=='string'||!isIPv4(upstream)||upstream==='127.0.0.1'||upstream==='0.0.0.0'||Number(upstream.split('.')[0])>=224||
      !Number.isSafeInteger(maxDurationMs)||maxDurationMs<1||maxDurationMs>MAX_DURATION_MS)throw new DnsRelayError('INVALID_CONFIGURATION');
  const local=dgram.createSocket({type:'udp4',reuseAddr:false});
  const remote=dgram.createSocket({type:'udp4',reuseAddr:false});
  const pending=new Map();
  const counts={receivedQueries:0,forwardedQueries:0,forwardedReplies:0,expired:0,rejectedQueries:0,rejectedReplies:0,capacityDrops:0,sendErrors:0,socketErrors:0};
  let state='starting',lastError=null,closePromise=null,lifetime=null,ended=null,next=randomInt(65536);
  const started=performance.now();
  function snapshot(){return Object.freeze({upstream,bindAddress:'127.0.0.1',bindPort:53,running:state==='running',state,lastError,pending:pending.size,...counts,durationMs:Math.round((ended??performance.now())-started)});}
  function closeSocket(socket){return new Promise(resolve=>{try{socket.close(resolve);}catch{resolve();}});}
  function close(){
    if(closePromise)return closePromise;
    state='closing';clearTimeout(lifetime);
    for(const item of pending.values())clearTimeout(item.timer);
    pending.clear();
    closePromise=Promise.all([closeSocket(local),closeSocket(remote)]).then(()=>{ended=performance.now();state='closed';});
    return closePromise;
  }
  function socketFailure(code){if(state==='closing'||state==='closed')return;counts.socketErrors++;lastError=code;close();}
  local.on('error',()=>socketFailure('LOCAL_SOCKET_FAILED'));
  remote.on('error',()=>socketFailure('UPSTREAM_SOCKET_FAILED'));
  function ready(socket,event,start){return new Promise((resolve,reject)=>{
    const cleanup=()=>{socket.off(event,success);socket.off('error',failure);socket.off('close',closed);};
    const success=()=>{cleanup();resolve();};
    const failure=()=>{cleanup();reject(new DnsRelayError(event==='listening'?'BIND_FAILED':'UPSTREAM_SOCKET_FAILED'));};
    const closed=()=>{cleanup();reject(new DnsRelayError('START_FAILED'));};
    socket.once(event,success);socket.once('error',failure);socket.once('close',closed);
    try{start();}catch{failure();}
  });}
  local.on('message',(data,peer)=>{
    if(state!=='running')return;
    counts.receivedQueries++;
    if(peer.address!=='127.0.0.1'||data.length<12||data.length>MAX_BYTES||(data.readUInt16BE(2)&0x8000)!==0){counts.rejectedQueries++;return;}
    const digest=questions(data);if(!digest){counts.rejectedQueries++;return;}
    if(pending.size>=MAX_PENDING){counts.capacityDrops++;return;}
    while(pending.has(next))next=(next+1)&65535;
    const id=next;next=(next+1)&65535;
    const payload=Buffer.from(data);payload.writeUInt16BE(id,0);
    const item={port:peer.port,original:data.readUInt16BE(0),opcode:data.readUInt16BE(2)&0x7800,digest,deadline:performance.now()+TTL_MS,timer:null};
    item.timer=setTimeout(()=>{if(pending.get(id)===item){pending.delete(id);counts.expired++;}},TTL_MS);item.timer.unref();pending.set(id,item);
    remote.send(payload,error=>{
      if(state==='closed')return;
      if(error){counts.sendErrors++;if(pending.get(id)===item){clearTimeout(item.timer);pending.delete(id);}}
      else counts.forwardedQueries++;
    });
  });
  remote.on('message',(data,peer)=>{
    if(state!=='running')return;
    if(peer.address!==upstream||peer.port!==53||data.length<12||data.length>MAX_BYTES||(data.readUInt16BE(2)&0x8000)===0){counts.rejectedReplies++;return;}
    const id=data.readUInt16BE(0),item=pending.get(id);
    if(!item){counts.rejectedReplies++;return;}
    if(performance.now()>=item.deadline){clearTimeout(item.timer);pending.delete(id);counts.expired++;counts.rejectedReplies++;return;}
    const digest=questions(data);
    if((data.readUInt16BE(2)&0x7800)!==item.opcode||!digest||!digest.equals(item.digest)){counts.rejectedReplies++;return;}
    pending.delete(id);clearTimeout(item.timer);
    const payload=Buffer.from(data);payload.writeUInt16BE(item.original,0);
    local.send(payload,item.port,'127.0.0.1',error=>{if(state==='closed')return;if(error)counts.sendErrors++;else counts.forwardedReplies++;});
  });
  try{
    await ready(local,'listening',()=>local.bind({address:'127.0.0.1',port:53,exclusive:true}));
    await ready(remote,'connect',()=>remote.connect(53,upstream));
    if(state!=='starting')throw new DnsRelayError('START_FAILED');
    state='running';lifetime=setTimeout(()=>{close();},maxDurationMs);lifetime.unref();
    return Object.freeze({close,snapshot});
  }catch(error){await close();throw new DnsRelayError(error instanceof DnsRelayError?error.code:'START_FAILED');}
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  let relay;
  try{
    const value=process.argv.find(arg=>arg.startsWith('--upstream='))?.slice(11);
    relay=await startLoopbackDnsRelay({upstream:value});
    console.log(JSON.stringify({code:'DNS_RELAY_READY',...relay.snapshot()}));
    let stopped=false;
    const finish=async()=>{if(stopped)return;stopped=true;await relay.close();console.log(JSON.stringify({code:'DNS_RELAY_CLOSED',...relay.snapshot()}));};
    process.once('SIGINT',finish);process.once('SIGTERM',finish);
    // Poll metadata only so automatic expiration/socket failure also produces final counters.
    const monitor=setInterval(()=>{if(!relay.snapshot().running){clearInterval(monitor);finish();}},250);monitor.unref();
    process.once('beforeExit',async()=>{await finish();if(relay.snapshot().lastError)process.exitCode=1;});
  }catch(error){console.log(JSON.stringify({code:error instanceof DnsRelayError?error.code:'DNS_RELAY_START_FAILED'}));process.exitCode=1;}
}
