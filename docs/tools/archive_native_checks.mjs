import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
const provenance=JSON.parse(await readFile(new URL('android-as/app/build/reports/verification/_app_testDevelopmentDebugUnitTest.provenance.json',root),'utf8'));
if(provenance.exitCode!==0||!provenance.sourceUnchangedDuringCheck)throw new Error('A successful unchanged-source check is required');
const runId=provenance.date.replaceAll(':','-');
const directory=new URL(`docs/测试报告/重构实施-20261101/android-unit-${runId}/`,root);
await mkdir(directory,{recursive:true});
const input=new URL('android-as/app/build/test-results/testDevelopmentDebugUnitTest/',root);
const suites=[];
for(const name of (await readdir(input)).filter(value=>/^TEST-.*\.xml$/.test(value)).sort()) {
  const xml=await readFile(new URL(name,input),'utf8');
  const tag=xml.match(/<testsuite\b[^>]*>/)?.[0];
  if(!tag)throw new Error('Missing test suite');
  const attrs=Object.fromEntries([...tag.matchAll(/(\w+)="([^"]*)"/g)].map(value=>[value[1],value[2]]));
  const suite={name:attrs.name,tests:Number(attrs.tests),failures:Number(attrs.failures),errors:Number(attrs.errors),skipped:Number(attrs.skipped),timestamp:attrs.timestamp};
  if([suite.tests,suite.failures,suite.errors,suite.skipped].some(value=>!Number.isSafeInteger(value)||value<0)||suite.failures||suite.errors||suite.skipped)throw new Error('Unaccepted suite');
  suites.push(suite);await copyFile(new URL(name,input),new URL(name,directory));
}
const summary={execution:'JVM public fixtures; not real HTTP/MQTT, UI, registration or hardware acceptance',
  provenance,totals:suites.reduce((value,suite)=>({tests:value.tests+suite.tests,failures:value.failures+suite.failures,errors:value.errors+suite.errors,skipped:value.skipped+suite.skipped}),{tests:0,failures:0,errors:0,skipped:0}),suites};
await writeFile(new URL('summary.json',directory),JSON.stringify(summary,null,2)+'\n');
console.log(`Archived ${suites.length} suites / ${summary.totals.tests} passed tests at android-unit-${runId}`);
