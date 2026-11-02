// Non-secret API configuration may come from node --env-file; credentials are never build fields.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sourceFingerprint} from '../../docs/tools/source_fingerprint.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const task = process.argv[2] ?? ':app:assembleDevelopmentDebug';
const lockTask=task===':resolveAndLockAll';
if (!lockTask&&!/^:app:(assemble|test|lint|generateCodegen)[A-Za-z]+$/.test(task)) {throw new Error('Unsupported build task');}
if(process.argv.slice(3).some(value=>!lockTask||value!=='--write-locks'))throw new Error('Unsupported build argument');
const args = ['-classpath', fileURLToPath(new URL('../gradle/wrapper/gradle-wrapper.jar', import.meta.url)),
  'org.gradle.wrapper.GradleWrapperMain', task, '--console=plain', '-PreactNativeArchitectures=x86_64'];
if(lockTask&&process.argv.includes('--write-locks'))args.push('--write-locks');
for (const [key, env] of [['rowanPlatformUrl', 'ROWAN_APP_API_BASE_URL'], ['rowanIotUrl', 'ROWAN_IOT_API_BASE_URL'], ['rowanTenantId', 'ROWAN_TENANT_ID'], ['rowanProductBrandId','ROWAN_PRODUCT_BRAND_ID'], ['rowanBrandId','ROWAN_BRAND_ID']]) {
  const value = process.env[env];
  if (value) {args.push(`-P${key}=${value}`);}
}
if (process.env.ROWAN_ISOLATED_VALIDATION === '1') {args.push('-ProwanIsolatedValidation=true');}
const buildEnvironment = {...process.env};
for (const key of Object.keys(buildEnvironment)) {
  if (/^ROWAN_(LOGIN_|TEST_)/.test(key)) {delete buildEnvironment[key];}
}
const sourceBefore = sourceFingerprint(['android-as', 'app-rn']);
const result = spawnSync('java', args, {cwd: root, env: buildEnvironment, stdio: 'inherit', shell: false});
if (result.error) {throw result.error;}
if(/^:app:(test|lint)/.test(task)) {
  const reportDirectory=fileURLToPath(new URL('../app/build/reports/verification/',import.meta.url));
  mkdirSync(reportDirectory,{recursive:true});
  const sourceAfter=sourceFingerprint(['android-as','app-rn']);
  writeFileSync(reportDirectory+task.replaceAll(':','_')+'.provenance.json',JSON.stringify({date:new Date().toISOString(),task,
    exitCode:result.status,sourceBefore,sourceAfter,
    sourceUnchangedDuringCheck:sourceBefore.sourceSha256===sourceAfter.sourceSha256},null,2)+'\n');
}
if (result.status === 0 && [':app:assembleDevelopmentRelease',':app:assembleDevelopmentReleaseAndroidTest'].includes(task)) {
  const instrumentation=task.endsWith('AndroidTest');
  const artifact = fileURLToPath(new URL(instrumentation
    ? '../app/build/outputs/apk/androidTest/development/release/app-development-release-androidTest.apk'
    : '../app/build/outputs/apk/development/release/app-development-release.apk', import.meta.url));
  if (existsSync(artifact)) {
    const sourceAfter = sourceFingerprint(['android-as', 'app-rn']);
    let targetArtifactSha256=null;
    if(instrumentation) {
      const target=fileURLToPath(new URL('../app/build/outputs/apk/development/release/app-development-release.apk',import.meta.url));
      const targetProof=JSON.parse(readFileSync(target+'.provenance.json','utf8'));
      targetArtifactSha256=createHash('sha256').update(readFileSync(target)).digest('hex');
      if(targetProof.artifactSha256!==targetArtifactSha256||!targetProof.sourceUnchangedDuringBuild||
        targetProof.sourceBefore.sourceSha256!==sourceAfter.sourceSha256||targetProof.sourceAfter.sourceSha256!==sourceAfter.sourceSha256)
        throw new Error('Build the matching native Release before recording its instrumentation APK');
    }
    writeFileSync(artifact + '.provenance.json', JSON.stringify({date:new Date().toISOString(),task,
      artifactSha256:createHash('sha256').update(readFileSync(artifact)).digest('hex'),
      artifactRole:instrumentation?'sdk-instrumentation-test-only':'native-application',targetArtifactSha256,
      sourceBefore,sourceAfter,sourceUnchangedDuringBuild:sourceBefore.sourceSha256===sourceAfter.sourceSha256,
      architecture:'x86_64',signing:'development debug key',isolatedValidation:process.env.ROWAN_ISOLATED_VALIDATION==='1'},null,2)+'\n');
  }
}
process.exitCode = result.status ?? 1;
