import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cancelTarget,safeTarget,packageId} from './self-unbind-cancel-guard.mjs';
const node=(id,text,extra='')=>`<node package="${packageId}" resource-id="${id}" text="${text}" enabled="true" clickable="true" bounds="[10,20][100,80]" ${extra}/>`;
const xml=node('title','解除设备关联')+node('message','是否解除当前账号与“公开测试设备”的关联？')+node('android:id/button1','解除关联')+node('android:id/button2','取消');
test('only the known negative action is returned',()=>assert.deepEqual(cancelTarget(xml),{x:55,y:50}));
for(const [label,value] of [
 ['unknown package',xml.replace(`package="${packageId}"`,'package="com.android.systemui"')],
 ['wrong dialog',xml.replace('解除设备关联','其他确认')],
 ['missing positive',xml.replace('android:id/button1','other')],
 ['duplicate negative',xml+node('android:id/button2','取消')],
 ['ANR',xml+node('android:id/aerr_wait','等待')],
 ['wrong message',xml.replace('是否解除当前账号','未知操作')],
 ['disabled negative',xml.replace('text="取消" enabled="true"','text="取消" enabled="false"')],
 ['invalid bounds',xml.replace('text="取消" enabled="true" clickable="true" bounds="[10,20][100,80]"','text="取消" enabled="true" clickable="true" bounds="[100,80][10,20]"')],
 ])test(label,()=>assert.throws(()=>cancelTarget(value)));
test('positive is refused independently',()=>assert.throws(()=>safeTarget({package:packageId,enabled:'true',clickable:'true','resource-id':'android:id/button1',bounds:'[0,0][10,10]'})));
