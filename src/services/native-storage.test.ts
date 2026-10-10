import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockFileStorage } from './native-storage';
import { MockDatabase } from './store';

const native=vi.hoisted(()=>({files:new Map<string,string>(),writes:vi.fn(),moves:vi.fn(),platform:{OS:'android'}}));
vi.mock('react-native',()=>({Platform:native.platform}));
vi.mock('expo-secure-store',()=>({}));
vi.mock('expo-file-system',()=>{
  class File {
    uri:string;
    constructor(_directory:unknown,name:string){this.uri=name;}
    get exists(){return native.files.has(this.uri);}
    async text(){return native.files.get(this.uri)!;}
    write(value:string){native.writes(this.uri,value);native.files.set(this.uri,value);}
    async move(target:File,options:unknown){
      await native.moves(this.uri,target.uri,options);
      if(!native.files.has(this.uri))throw new Error('NoSuchFileException');
      native.files.set(target.uri,native.files.get(this.uri)!);native.files.delete(this.uri);this.uri=target.uri;
    }
    delete(){native.files.delete(this.uri);}
  }
  return {File,Paths:{document:{uri:'test-documents'}}};
});

function gate(){let release!:()=>void;const wait=new Promise<void>(resolve=>{release=resolve;});return {wait,release};}
const stored='rowan-mock-database.json';
beforeEach(()=>{native.files.clear();native.moves.mockReset();native.writes.mockReset();native.platform.OS='android';});

describe('native Mock persistence with asynchronous file moves',()=>{
  it('does not report saved before the native move finishes',async()=>{
    const pending=gate();native.moves.mockReturnValueOnce(pending.wait);
    let saved=false;const write=new MockFileStorage().set('database','new').then(()=>{saved=true;});
    await vi.waitFor(()=>expect(native.moves).toHaveBeenCalledOnce());
    expect(saved).toBe(false);expect(native.files.has(stored)).toBe(false);
    pending.release();await write;expect(saved).toBe(true);expect(native.files.get(stored)).toBe('new');
  });
  it('serializes concurrent writes across storage instances sharing a temporary file',async()=>{
    const pending=gate();native.moves.mockReturnValueOnce(pending.wait);
    const first=new MockFileStorage().set('database','first');
    const second=new MockFileStorage().set('database','second');
    await vi.waitFor(()=>expect(native.moves).toHaveBeenCalledOnce());
    expect(native.writes).toHaveBeenCalledTimes(1);
    pending.release();await Promise.all([first,second]);
    expect(native.files.get(stored)).toBe('second');expect(native.moves).toHaveBeenCalledTimes(2);
  });
  it('reads the completed write rather than stale data while a move is pending',async()=>{
    native.files.set(stored,'old');const pending=gate();native.moves.mockReturnValueOnce(pending.wait);
    const write=new MockFileStorage().set('database','new');let read=false;
    const value=new MockFileStorage().get('database').then(result=>{read=true;return result;});
    await vi.waitFor(()=>expect(native.moves).toHaveBeenCalledOnce());expect(read).toBe(false);
    pending.release();await write;expect(await value).toBe('new');
  });
  it('orders removal after pending writes so a late move cannot recreate deleted data',async()=>{
    const pending=gate();native.moves.mockReturnValueOnce(pending.wait);
    const storage=new MockFileStorage(),write=storage.set('database','new'),remove=new MockFileStorage().remove('database');
    await vi.waitFor(()=>expect(native.moves).toHaveBeenCalledOnce());pending.release();
    await Promise.all([write,remove]);expect(await storage.get('database')).toBeNull();
  });
  it('propagates move failures, keeps the old target and allows subsequent writes',async()=>{
    native.files.set(stored,'old');native.moves.mockRejectedValueOnce(new Error('disk failure'));
    const storage=new MockFileStorage();await expect(storage.set('database','failed')).rejects.toThrow('disk failure');
    expect(await storage.get('database')).toBe('old');await storage.set('database','recovered');
    expect(await storage.get('database')).toBe('recovered');
  });
  it('recovers the operation queue after a synchronous write failure',async()=>{
    native.writes.mockImplementationOnce(()=>{throw new Error('write failure');});
    const storage=new MockFileStorage();await expect(storage.set('database','failed')).rejects.toThrow('write failure');
    await storage.set('database','recovered');expect(await storage.get('database')).toBe('recovered');
  });
  it('makes database transactions observe persistence failure and roll back before retry',async()=>{
    const storage=new MockFileStorage(),database=await MockDatabase.open(storage);
    const original=database.state.accounts[0].rooms[0].name;
    native.moves.mockRejectedValueOnce(new Error('disk failure'));
    await expect(database.transact(()=>{database.state.accounts[0].rooms[0].name='failed';})).rejects.toThrow('disk failure');
    expect(database.state.accounts[0].rooms[0].name).toBe(original);
    await database.transact(()=>{database.state.accounts[0].rooms[0].name='saved';});
    const reopened=await MockDatabase.open(new MockFileStorage());
    expect(reopened.state.accounts[0].rooms[0].name).toBe('saved');
  });
});
