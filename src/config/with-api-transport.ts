import { AndroidConfig, type ConfigPlugin, withAndroidManifest } from 'expo/config-plugins';
import { allowsHttpApi } from '../services/api-transport';

/** CNG owns the manifest. Apply to main so preview release builds also support HTTP. */
const withApiTransport: ConfigPlugin<{ environment: string }> = (config, { environment }) => {
  const allowHttp = allowsHttpApi(environment);
  return withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    application.$['android:usesCleartextTraffic'] = allowHttp ? 'true' : 'false';
    return mod;
  });
};

export default withApiTransport;
