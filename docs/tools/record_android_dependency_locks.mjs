// Record generated lock state; this is not a substitute for a normal locked build.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url);
const releaseAndroidTest=process.argv.length===3&&process.argv[2]==='--release-android-test';
if(process.argv.length>2&&!releaseAndroidTest)throw new Error('Unsupported argument');
const paths=['android-as/buildscript-gradle.lockfile','android-as/settings-gradle.lockfile','android-as/app/gradle.lockfile'];
const locks=[];
for(const path of paths){
  const bytes=await readFile(new URL(path,root));
  const entries=bytes.toString('utf8').split(/\r?\n/).filter(line=>line&&!line.startsWith('#'));
  const modules=entries.filter(line=>!line.startsWith('empty='));
  if(modules.some(line=>!/^([^:=]+:){2}[^=+]+=[^=]+$/.test(line)))throw new Error('Unexpected lock entry');
  locks.push({path,sha256:createHash('sha256').update(bytes).digest('hex'),modules:modules.length,
    configurations:[...new Set(entries.flatMap(line=>line.slice(line.indexOf('=')+1).split(',')).filter(Boolean))].sort()});
}
const app=locks.find(lock=>lock.path==='android-as/app/gradle.lockfile');
for(const flavor of ['development','preview','production'])for(const type of ['Debug','Release'])for(const graph of ['CompileClasspath','RuntimeClasspath'])
  if(!app.configurations.includes(flavor+type+graph))throw new Error('Missing native variant lock graph');
if(releaseAndroidTest)for(const flavor of ['development','preview','production']) {
  const variant=flavor+'ReleaseAndroidTest';
  for(const graph of ['CompileClasspath','RuntimeClasspath'])
    if(!app.configurations.includes(variant+graph))throw new Error('Missing Release AndroidTest lock graph');
  if(!app.configurations.includes('kotlinCompilerPluginClasspath'+variant[0].toUpperCase()+variant.slice(1)))
    throw new Error('Missing Release AndroidTest Kotlin plugin graph');
}
const report={date:new Date().toISOString(),locks,
  generationLog:releaseAndroidTest?'android-release-androidtest-dependency-locks.log':'android-dependency-locks.log',
  normalLockedCheck:releaseAndroidTest?null:'android-scan-locked-lint-provenance.json',
  releaseAndroidTestGraphsVerified:releaseAndroidTest,
  limits:['Graph locks do not prove all variant artifacts were built or signed.','Common Kotlin metadata configurations are excluded from generation; native compile/runtime graphs are required.','Included RN Gradle plugin source is pinned by the RN pnpm lock; iOS Pods still require a macOS resolution.']};
const output=new URL('docs/测试报告/重构实施-20261101/'+(releaseAndroidTest?'android-release-androidtest-dependency-locks.json':'android-dependency-locks.json'),root);
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(`Recorded ${locks.length} lockfiles; ${app.modules} app modules / ${app.configurations.length} app configurations.`);
