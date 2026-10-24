import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, extname, relative, join } from 'node:path';
import ts from 'typescript';

const root=resolve(import.meta.dirname,'..');
const visited=new Set();
const removed=/MockHttpClient|MockDeviceTransport|MockDeviceSession|MockCloud|MockDatabase|rowan-mock-v1|AT\+MOCK_PROPERTY|Reset Mock data|模拟 Wi-Fi|rowan@example\.com|\b(?:user_demo|dev_wine|prd_wine)\b/;
function visit(path){
  if(visited.has(path))return;
  visited.add(path);
  if(/(?:test-support|\.test\.|\.spec\.)/.test(path))throw new Error(`Test fixture reachable from runtime: ${relative(root,path)}`);
  const source=readFileSync(path,'utf8');
  if(removed.test(source))throw new Error(`Removed simulation remains in runtime: ${relative(root,path)}`);
  for(const item of ts.preProcessFile(source,true,true).importedFiles){
    if(!item.fileName.startsWith('.')&&!item.fileName.startsWith('@/'))continue;
    const base=item.fileName.startsWith('@/')?resolve(root,'src',item.fileName.slice(2)):resolve(dirname(path),item.fileName);
    for(const candidate of [base,...['.ts','.tsx','.native.ts','.native.tsx','/index.ts','/index.tsx'].map(suffix=>base+suffix)]){
      if(existsSync(candidate)&&['.ts','.tsx'].includes(extname(candidate)))visit(candidate);
    }
  }
}
function files(path){return readdirSync(path,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(path,entry.name)):[join(path,entry.name)]);}
for(const entry of files(resolve(root,'src/app')))if(/\.tsx?$/.test(entry))visit(entry);
visit(resolve(root,'app.config.ts'));
for(const directory of process.argv.slice(2)){
  const absolute=resolve(root,directory);
  if(!existsSync(absolute))throw new Error(`Bundle directory missing: ${directory}`);
  for(const file of files(absolute))if(/\.(?:js|hbc|map)$/.test(file)&&removed.test(readFileSync(file,'utf8')))throw new Error(`Removed simulation remains in bundle: ${relative(root,file)}`);
}
console.log(`Real-only runtime verified: ${visited.size} reachable source modules; ${process.argv.length-2} bundle directories.`);
