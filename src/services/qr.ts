export type RowanCode={version:'rowan-mock-v1';type:'share';deviceID:string;bindCode:string}|{version:'rowan-mock-v1';type:'product';productID:string};
// Versioned mock codec boundary. Replace this codec when the real QR contract is frozen.
export function encodeShareCode(value:{deviceID:string;bindCode:string}) {
  const encoded=JSON.stringify({version:'rowan-mock-v1',type:'share',...value});
  parseRowanCode(encoded);return encoded;
}
export function encodeProductCode(productID:string){return JSON.stringify({version:'rowan-mock-v1',type:'product',productID});}
export function parseRowanCode(value:string):RowanCode {
  let parsed:Record<string,unknown>;try{parsed=JSON.parse(value);}catch{throw new Error('二维码无效');}
  const safe=(v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||parsed.version!=='rowan-mock-v1'||parsed.type==='share'&&(!safe(parsed.deviceID)||!safe(parsed.bindCode))||parsed.type==='product'&&!safe(parsed.productID)||!['share','product'].includes(String(parsed.type)))throw new Error('二维码类型或内容不支持');
  return parsed as RowanCode;
}

export function parseRowanCandidates(values: readonly string[]):RowanCode[] {
  const unique=new Map<string,RowanCode>();
  for(const value of values){try{const code=parseRowanCode(value);const key=code.type==='product'?`product:${code.productID}`:`share:${code.deviceID}:${code.bindCode}`;if(!unique.has(key))unique.set(key,code);}catch{/* A non-ROWAN barcode is not an eligible candidate. */}}
  if(!unique.size)throw new Error('图片中没有有效的 ROWAN 二维码');
  return [...unique.values()];
}
