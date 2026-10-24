import type { IntegrationRegistry } from '../services/runtime-integration';
import { createClassicShadowResolver } from '../protocol/classic-shadow';

/** Register only explicit deployment adapters here.
 * Factories assemble typed functions; BLE resource creation belongs in createDeviceDriver.
 * Never register Mock profiles as real adapters or embed accounts, tokens or device secrets.
 */
export const deploymentIntegrations:IntegrationRegistry=Object.freeze({
  'rowan-v16-shadow':{
    environments:['development','preview'],
    // No product dictionary has been supplied: synchronization works, physical controls remain unavailable.
    create:()=>({contracts:{realtime:createClassicShadowResolver(),realtimeModelOptional:true}}),
  },
});
