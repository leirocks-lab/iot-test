import 'tsx/cjs';

import type { ConfigContext, ExpoConfig } from 'expo/config';

import { getAppIdentity } from './src/config/brand';
import { communicationConfig, rejectRemovedMockModes } from './src/services/config';
import { allowsHttpApi } from './src/services/api-transport';

export default ({ config }: ConfigContext): ExpoConfig => {
  const identity = getAppIdentity(process.env.APP_BRAND, process.env.APP_ENV);
  rejectRemovedMockModes({httpMode:process.env.ROWAN_HTTP_MODE,deviceMode:process.env.ROWAN_DEVICE_MODE});
  const communication = communicationConfig({ environment: identity.environment,
    apiBaseUrl: process.env.ROWAN_APP_API_BASE_URL,
    iotApiBaseUrl: process.env.ROWAN_IOT_API_BASE_URL,
    tenantID: process.env.ROWAN_TENANT_ID,
    integrationProfile: process.env.ROWAN_INTEGRATION_PROFILE,
    httpLogLevel: process.env.ROWAN_HTTP_LOG_LEVEL as 'off' | 'error' | 'debug' | undefined,
    mqttLogLevel: process.env.ROWAN_MQTT_LOG_LEVEL as 'off' | 'error' | 'debug' | undefined });
  const usesDevBackendCertificate = identity.environment === 'development' &&
    [communication.apiBaseUrl, communication.iotApiBaseUrl].some(root => root && new URL(root).hostname === '47.107.80.36');

  return {
    ...config,
    name: identity.name,
    slug: identity.slug,
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: identity.scheme,
    userInterfaceStyle: 'automatic',
    ios: {
      icon: './assets/expo.icon',
      bundleIdentifier: identity.iosBundleIdentifier,
      infoPlist: {
        NSAppTransportSecurity: { NSAllowsArbitraryLoads: allowsHttpApi(identity.environment) },
      },
    },
    android: {
      package: identity.androidPackage,
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      ['./src/config/with-api-transport.ts', { environment: identity.environment }],
      ['./src/config/with-dev-backend-certificate.ts', { enabled: usesDevBackendCertificate }],
      'expo-router',
      'expo-dev-client',
      ['react-native-ble-plx', { isBackgroundEnabled: false, bluetoothAlwaysPermission: '允许 ROWAN 发现并连接配网设备' }],
      'expo-secure-store',
      ['expo-camera', { cameraPermission: '允许 ROWAN 扫描设备及分享二维码', recordAudioAndroid: false }],
      ['expo-image-picker', { photosPermission: '允许 ROWAN 识别所选图片中的设备二维码', microphonePermission: false }],
      'expo-notifications',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#186DAF',
          image: './assets/images/logo-white.png',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      ...config.extra,
      brandId: identity.brandId,
      androidPackage: identity.androidPackage,
      iosBundleIdentifier: identity.iosBundleIdentifier,
      themeId: identity.themeId,
      ...communication,
    },
  };
};
