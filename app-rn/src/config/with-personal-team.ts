import { type ConfigPlugin, withEntitlementsPlist } from "expo/config-plugins";

/** Personal Team provisioning cannot include APNs; keep other build modes unchanged. */
const withPersonalTeam: ConfigPlugin<{ enabled: boolean }> = (config, { enabled }) => {
  if (!enabled) return config;
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults["aps-environment"];
    return mod;
  });
};

export default withPersonalTeam;
