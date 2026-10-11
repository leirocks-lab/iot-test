import { ActivityIndicator } from 'react-native';

export function Busy() {
  return <ActivityIndicator accessibilityLabel="Loading" size="large" style={{ padding: 24 }} />;
}
