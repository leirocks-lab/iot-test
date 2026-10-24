import type { IntegrationRegistry } from '../services/runtime-integration';

/** Public development BLE parameters; device responses and cloud data remain authoritative. */
export const deploymentIntegrations:IntegrationRegistry=Object.freeze({
  'rowan-ble-dual':{
    environments:['development','preview'],
    create:()=>({contracts:{onboarding:{
      // App writes 0x8F with empty DATA after validating firmware challenge 0x0F.
      profile:{factoryReply:new Uint8Array(),stageTimeout:120000},
      deviceToken:(accessToken:string)=>accessToken,
      bindingTimeout:60000,
      operationTimeout:240000,
    }}}),
  },
});
