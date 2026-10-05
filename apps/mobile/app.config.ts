import type { ConfigContext, ExpoConfig } from 'expo/config';

import { getAppIdentity } from '@rowan/brand-config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const identity = getAppIdentity(process.env.APP_BRAND, process.env.APP_ENV);

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
      environment: identity.environment,
      androidPackage: identity.androidPackage,
      iosBundleIdentifier: identity.iosBundleIdentifier,
      themeId: identity.themeId,
    },
  };
};
