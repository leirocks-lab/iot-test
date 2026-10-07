import { File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { KeyValueStorage } from './models';
import { MemoryStorage } from './store';

// Web previews do not persist bearer credentials in localStorage.
const webSession = new MemoryStorage();
export class SessionStorage implements KeyValueStorage {
  constructor(private namespace:string|(()=>string)) {}
  private key(key:string){return (typeof this.namespace==='function'?this.namespace():this.namespace)+'.'+key;}
  async get(key:string){return Platform.OS==='web'?webSession.get(this.key(key)):SecureStore.getItemAsync(this.key(key));}
  async set(key:string,value:string){if(Platform.OS==='web')await webSession.set(this.key(key),value);else await SecureStore.setItemAsync(this.key(key),value);}
  async remove(key:string){if(Platform.OS==='web')await webSession.remove(this.key(key));else await SecureStore.deleteItemAsync(this.key(key));}
}
export class MockFileStorage implements KeyValueStorage {
  async get(key:string) {
    if(Platform.OS==='web')return globalThis.localStorage?.getItem('rowan.mock-v1.'+key)??null;
    const file=new File(Paths.document,'rowan-mock-'+key+'.json');return file.exists?file.text():null;
  }
  async set(key:string,value:string) {
    if(Platform.OS==='web'){globalThis.localStorage.setItem('rowan.mock-v1.'+key,value);return;}
    const tmp=new File(Paths.document,'rowan-mock-'+key+'.tmp');tmp.write(value);
    const target=new File(Paths.document,'rowan-mock-'+key+'.json');tmp.move(target,{overwrite:true});
  }
  async remove(key:string){if(Platform.OS==='web')globalThis.localStorage.removeItem('rowan.mock-v1.'+key);else {const file=new File(Paths.document,'rowan-mock-'+key+'.json');if(file.exists)file.delete();}}
}
