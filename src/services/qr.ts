export type CodeIdentity={type:'share';deviceID:string;bindCode:string}|{type:'product';productID:string};
export type RowanCodeParser=(value:string)=>CodeIdentity;

export function parseRowanCandidates(values: readonly string[],parser:RowanCodeParser):CodeIdentity[] {
  const unique=new Map<string,CodeIdentity>();
  for(const value of values){try{
    const code=parser(value);
    if(!code||(code.type==='product'?typeof code.productID!=='string'||!code.productID:code.type!=='share'||typeof code.deviceID!=='string'||!code.deviceID||typeof code.bindCode!=='string'||!code.bindCode))continue;
    const key=JSON.stringify(code.type==='product'?['product',code.productID]:['share',code.deviceID,code.bindCode]);
    if(!unique.has(key))unique.set(key,code);
  }catch{/* A non-ROWAN barcode is not an eligible candidate. */}}
  if(!unique.size)throw new Error('图片中没有有效的 ROWAN 二维码');
  return [...unique.values()];
}
