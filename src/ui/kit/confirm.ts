import { Alert, Platform } from 'react-native';

export function confirm(title: string, body: string, work: () => void, cancel?: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(body)) work();else cancel?.();
    return;
  }

  Alert.alert(title, body, [
    { text: '取消', style: 'cancel', onPress: cancel },
    { text: '确认', style: 'destructive', onPress: work },
  ]);
}
