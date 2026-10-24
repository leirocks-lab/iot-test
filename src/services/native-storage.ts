import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { KeyValueStorage } from './models';
import { MemoryStorage } from './memory-storage';

// Web previews do not persist bearer credentials in localStorage.
const webSession = new MemoryStorage();
export class SessionStorage implements KeyValueStorage {
  constructor(private namespace:string|(()=>string)) {}
  private key(key:string){return (typeof this.namespace==='function'?this.namespace():this.namespace)+'.'+key;}
  async get(key:string){return Platform.OS==='web'?webSession.get(this.key(key)):SecureStore.getItemAsync(this.key(key));}
  async set(key:string,value:string){if(Platform.OS==='web')await webSession.set(this.key(key),value);else await SecureStore.setItemAsync(this.key(key),value);}
  async remove(key:string){if(Platform.OS==='web')await webSession.remove(this.key(key));else await SecureStore.deleteItemAsync(this.key(key));}
}
