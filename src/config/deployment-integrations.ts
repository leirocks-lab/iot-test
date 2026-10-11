import type { IntegrationRegistry } from '../services/runtime-integration';

/** Register only reviewed deployment adapters here. No production protocol has been provided yet.
 * Factories assemble typed functions; BLE resource creation belongs in createDeviceDriver.
 * Never register Mock profiles as real adapters or embed accounts, tokens or device secrets.
 */
export const deploymentIntegrations:IntegrationRegistry=Object.freeze({});
