import type {ImageSourcePropType} from 'react-native';

// Static requires are bundled by Metro. Provenance and unchanged hashes: assets/sources.json.
export const wineAssets = {
  cabinet: require('./assets/cabinet.png') as ImageSourcePropType,
  front: require('./assets/cabinet-front.png') as ImageSourcePropType,
  shadow: require('./assets/cabinet-shadow.png') as ImageSourcePropType,
  glow: require('./assets/cabinet-glow.png') as ImageSourcePropType,
  led: require('./assets/cabinet-led.png') as ImageSourcePropType,
  back: require('./assets/back.png') as ImageSourcePropType,
  more: require('./assets/more.png') as ImageSourcePropType,
  light: require('./assets/light.png') as ImageSourcePropType,
  selection: require('./assets/selection-sun.png') as ImageSourcePropType,
  powerOn: require('./assets/power-on.png') as ImageSourcePropType,
  powerOff: require('./assets/power-off.png') as ImageSourcePropType,
  lockOn: require('./assets/lock-on.png') as ImageSourcePropType,
  lockOff: require('./assets/lock-off.png') as ImageSourcePropType,
};
