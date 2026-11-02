// Test harness only. Native applications must own their own credential and transport adapters.
// AWS IoT differs from some AWS services: append STS token after signing the canonical query.
import {createHash,createHmac} from 'node:crypto';
const encode=value=>encodeURIComponent(value).replace(/[!'()*]/g,c=>`%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const hash=value=>createHash('sha256').update(value).digest('hex');
const hmac=(key,value)=>createHmac('sha256',key).update(value).digest();
export function signIoTWebSocket(credentials,now=new Date(),includeDefaultPort=false) {
  const url=new URL(credentials.host);
  const region=/^[a-z0-9-]+\.iot\.([a-z]{2}(?:-[a-z]+)+-\d)\.amazonaws\.com(?:\.cn)?$/.exec(url.hostname)?.[1];
  if(!region||url.protocol!=='wss:'||url.username||url.password||url.hash||url.search||url.pathname!=='/mqtt'||url.port||
      !['username','password','sessionToken'].every(key=>typeof credentials[key]==='string'&&credentials[key].length>0)||!Number.isFinite(now.getTime())) {
    throw new Error('UNSUPPORTED_STS_CONFIGURATION');
  }
  const authority=url.hostname+(includeDefaultPort?':443':'');
  const time=now.toISOString().replace(/[:-]|\.\d{3}/g,''),date=time.slice(0,8),scope=`${date}/${region}/iotdevicegateway/aws4_request`;
  const query=[['X-Amz-Algorithm','AWS4-HMAC-SHA256'],['X-Amz-Credential',`${credentials.username}/${scope}`],['X-Amz-Date',time],['X-Amz-Expires','900'],['X-Amz-SignedHeaders','host']]
    .map(([key,value])=>`${key}=${encode(value)}`).join('&');
  const canonical=['GET','/mqtt',query,`host:${authority}\n`,'host',hash('')].join('\n');
  let key=hmac(`AWS4${credentials.password}`,date);
  for(const part of [region,'iotdevicegateway','aws4_request'])key=hmac(key,part);
  const signature=hmac(key,['AWS4-HMAC-SHA256',time,scope,hash(canonical)].join('\n')).toString('hex');
  return `wss://${authority}/mqtt?${query}&X-Amz-Signature=${signature}&X-Amz-Security-Token=${encode(credentials.sessionToken)}`;
}
