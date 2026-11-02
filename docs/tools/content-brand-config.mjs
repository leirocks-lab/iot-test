// Pure, non-secret configuration resolution; importing does not read env or perform I/O.
export function resolveContentBrand(environment) {
 const optional=value=>{
  if(value===undefined||value==='')return undefined;
  if(typeof value!=='string')throw Error('Invalid non-secret brand configuration');
  return value.trim().length===0?undefined:value;
 };
 const common=optional(environment.ROWAN_BRAND_ID),content=optional(environment.ROWAN_CONTENT_BRAND_ID);
 if(common!==undefined&&content!==undefined&&common!==content)throw Error('Conflicting non-secret content brand configuration');
 return content??common;
}
