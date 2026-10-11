import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useColors } from '../context';
import { styles } from './styles';

export function Card({ children }: { children: ReactNode }) {
  const colors = useColors();

  return <View style={[styles.card, { backgroundColor: colors.background.invert }]}>{children}</View>;
}
