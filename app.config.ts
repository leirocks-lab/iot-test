import 'tsx/cjs';

import type { ConfigContext, ExpoConfig } from 'expo/config';

import { getAppIdentity } from './src/config/brand';
import { communicationConfig } from './src/services/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const identity = getAppIdentity(process.env.APP_BRAND, process.env.APP_ENV);
  const communication = communicationConfig({ environment: identity.environment,
    httpMode: process.env.ROWAN_HTTP_MODE as 'mock' | 'real' | undefined,
    deviceMode: process.env.ROWAN_DEVICE_MODE as 'mock' | 'real' | undefined,
    apiBaseUrl: process.env.ROWAN_APP_API_BASE_URL });

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
      'expo-router',
      'expo-dev-client',
      'expo-secure-store',
      ['expo-camera', { cameraPermission: '允许 ROWAN 扫描设备及分享二维码', recordAudioAndroid: false }],
      'expo-notifications',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#208AEF',
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
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
