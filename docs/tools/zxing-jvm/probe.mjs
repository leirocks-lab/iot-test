import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const tool=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(tool,'../../..');
const args=process.argv.slice(2);
if(args.some(x=>x!=='--download'&&!x.startsWith('--jdk=')))throw new Error('Only --download and --jdk=<Java17 directory> are supported');
const jdk=args.find(x=>x.startsWith('--jdk='))?.slice(6)??'D:/Android/Java/jdk-17.0.20.1+1';
const java=path.join(jdk,'bin',process.platform==='win32'?'java.exe':'java');
const javaInfo=spawnSync(java,['-version'],{encoding:'utf8',timeout:10000,windowsHide:true});
if(javaInfo.status!==0||!/(?:version|openjdk)\s+"?17[.\s"]/.test(javaInfo.stderr+javaInfo.stdout))throw new Error('An explicit Java17 runtime is required');
const cache=path.join(root,'.cache/refactor/zxing-jvm');
const deps=path.join(cache,'deps');await fs.mkdir(deps,{recursive:true});
const sha=(data,algorithm='sha256')=>createHash(algorithm).update(data).digest('hex');
const jars=[];
for(const artifact of ['core','javase']) {
  const name=`${artifact}-3.5.4.jar`,target=path.join(deps,name);
  const url=`https://repo.maven.apache.org/maven2/com/google/zxing/${artifact}/3.5.4/${name}`;
  if(args.includes('--download')) {
    for(const [remote,local] of [[url,target],[`${url}.sha1`,`${target}.sha1`]]) {
      const result=await fetch(remote,{redirect:'error',signal:AbortSignal.timeout(20000)});
      if(!result.ok)throw new Error(`Official Maven artifact download failed (${result.status})`);
      const body=Buffer.from(await result.arrayBuffer());
      if(body.length>2*1024*1024)throw new Error('Artifact exceeded bounded download size');
      await fs.writeFile(local,body);
    }
  }
  const bytes=await fs.readFile(target),expected=(await fs.readFile(`${target}.sha1`,'utf8')).trim();
  if(!/^[a-fA-F0-9]{40}$/.test(expected)||sha(bytes,'sha1')!==expected.toLowerCase())throw new Error('Official Maven sidecar mismatch');
  jars.push({artifact:`com.google.zxing:${artifact}:3.5.4`,file:target,url,sha256:sha(bytes),sha1:sha(bytes,'sha1'),bytes:bytes.length,usage:artifact==='javase'?'JVM fixture tooling only':'JVM decoder spike'});
}
const runId=new Date().toISOString().replaceAll(':','-');
const out=path.join(cache,`run-${runId}`);await fs.mkdir(out,{recursive:true});
const source=path.join(tool,'QrDecoderPoc.java');
const before={script:sha(await fs.readFile(fileURLToPath(import.meta.url))),source:sha(await fs.readFile(source))};
const execution=spawnSync(java,['-Xmx96m','-Djava.awt.headless=true','-cp',jars.map(x=>x.file).join(path.delimiter),source,out],
  {encoding:'utf8',timeout:60000,maxBuffer:16384,windowsHide:true});
const after={script:sha(await fs.readFile(fileURLToPath(import.meta.url))),source:sha(await fs.readFile(source))};
let poc=null;try {poc=JSON.parse(await fs.readFile(path.join(out,'poc.json'),'utf8'));}catch {}
const report={runId,version:'3.5.4',jdk:javaInfo.stderr.trim(),jvmHeapLimitMiB:96,sourceBefore:before,sourceAfter:after,
  jars:jars.map(({file,...rest})=>({...rest,file:path.relative(root,file).replaceAll('\\','/')})),
  exitCode:execution.status,passed:execution.status===0&&before.script===after.script&&before.source===after.source&&poc?.checks.every(x=>x.passed)===true,
  scope:'Standalone Java17 public fixtures only; no Android/CameraX/PhotoPicker/API36/production QR/binding acceptance',
  result:poc};
// Only the fixed fixture harness runs; decoded contents are never printed.
await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({report:path.relative(root,path.join(out,'summary.json')).replaceAll('\\','/'),passed:report.passed,checks:poc?.checks.length??0,exitCode:execution.status}));
if(!report.passed) {console.error(execution.stderr||'Fixture harness did not complete');process.exitCode=1;}
