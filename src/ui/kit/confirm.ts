import { Alert, Platform } from 'react-native';

export function confirm(title: string, body: string, work: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(body)) work();
    return;
  }

  Alert.alert(title, body, [
    { text: '取消', style: 'cancel' },
    { text: '确认', style: 'destructive', onPress: work },
  ]);
}
