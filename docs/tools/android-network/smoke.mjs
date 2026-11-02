// Only public local UDP fixtures at 127.0.0.2:53; never queries real DNS or an AVD.
import dgram from 'node:dgram';
import assert from 'node:assert/strict';
import {startLoopbackDnsRelay, DnsRelayError} from './loopback-dns-relay.mjs';
const upstream=dgram.createSocket('udp4'),a=dgram.createSocket('udp4'),b=dgram.createSocket('udp4');
let relay,automatic;
const bind=(socket,address,port=0)=>new Promise((resolve,reject)=>{socket.once('error',reject);socket.bind(port,address,()=>{socket.off('error',reject);resolve();});});
const close=socket=>new Promise(resolve=>{try{socket.close(resolve);}catch{resolve();}});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const packet=type=>{const name=Buffer.from([7,...Buffer.from('fixture'),7,...Buffer.from('invalid'),0]);const value=Buffer.alloc(12+name.length+4);value.writeUInt16BE(0x1234,0);value.writeUInt16BE(0x0100,2);value.writeUInt16BE(1,4);name.copy(value,12);value.writeUInt16BE(type,12+name.length);value.writeUInt16BE(1,14+name.length);return value;};
const receive=socket=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.off('message',done);reject(new Error());},1500);const done=value=>{clearTimeout(timer);resolve(value);};socket.once('message',done);});
for(const socket of [upstream,a,b])socket.on('error',()=>undefined);
let failure=false,stage='BIND_FIXTURE';
try{
  await bind(upstream,'127.0.0.2',53);await bind(a,'127.0.0.1');await bind(b,'127.0.0.1');
  stage='START_RELAY';relay=await startLoopbackDnsRelay({upstream:'127.0.0.2',maxDurationMs:6000});
  stage='OCCUPIED_BIND';await assert.rejects(startLoopbackDnsRelay({upstream:'127.0.0.2'}),e=>e instanceof DnsRelayError&&e.code==='BIND_FAILED');
  assert.equal(relay.snapshot().running,true);
  const captured=[];
  upstream.on('message',(query,peer)=>{
    captured.push({query:Buffer.from(query),peer});
    if(captured.length!==2)return;
    assert.notEqual(captured[0].query.readUInt16BE(0),captured[1].query.readUInt16BE(0));
    for(const item of captured.slice().reverse()){
      const correct=Buffer.from(item.query);correct.writeUInt16BE(0x8180,2);
      const mismatched=Buffer.from(correct);mismatched.writeUInt16BE(15,mismatched.length-4);
      upstream.send(mismatched,item.peer.port,item.peer.address); // Wrong question must not consume pending.
      upstream.send(item.query,item.peer.port,item.peer.address); // QR=0 cannot be a response.
      upstream.send(correct,item.peer.port,item.peer.address);
    }
  });
  stage='MAPPING';const first=receive(a),second=receive(b);
  const qa=packet(1),qb=packet(28);
  a.send(qa,53,'127.0.0.1');b.send(qb,53,'127.0.0.1');
  const [ra,rb]=await Promise.all([first,second]);
  const ea=Buffer.from(qa);ea.writeUInt16BE(0x8180,2);const eb=Buffer.from(qb);eb.writeUInt16BE(0x8180,2);
  assert.equal(ra.equals(ea),true);assert.equal(rb.equals(eb),true);
  // Let send completion counters settle, then expire a deliberately unanswered local request.
  stage='COUNTERS';await pause(30);assert.equal(relay.snapshot().forwardedReplies,2);assert.ok(relay.snapshot().rejectedReplies>=4);
  stage='TTL';a.send(packet(1),53,'127.0.0.1');await pause(2700);
  assert.equal(relay.snapshot().pending,0);assert.equal(relay.snapshot().expired,1);
  stage='CLOSE';await Promise.all([relay.close(),relay.close()]);
  assert.equal(relay.snapshot().state,'closed');
  const duration=relay.snapshot().durationMs;await pause(20);assert.equal(relay.snapshot().durationMs,duration);
  stage='AUTOCLOSE';automatic=await startLoopbackDnsRelay({upstream:'127.0.0.2',maxDurationMs:30});await pause(100);assert.equal(automatic.snapshot().state,'closed');
  console.log(JSON.stringify({code:'LOCAL_SOCKET_SMOKE_OK',scope:'loopback-fixture-only',forwardedReplies:2,rejectedReplyChecks:4,ttlExpired:1,idempotentClose:true,automaticClose:true}));
}catch{failure=true;console.log(JSON.stringify({code:'LOCAL_SOCKET_SMOKE_FAILED',stage,stats:relay?.snapshot(),scope:'loopback-fixture-only'}));}
finally{await relay?.close();await automatic?.close();await Promise.all([close(upstream),close(a),close(b)]);}
if(failure)process.exitCode=1;

