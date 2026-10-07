import { getBrandConfig } from '@/config/brand';
import { rowanTheme } from '@/theme';
import Constants from 'expo-constants';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const extra = Constants.expoConfig?.extra;
const brand = getBrandConfig(extra?.brandId as string | undefined);
const environment = (extra?.environment as string | undefined) ?? 'development';
const androidPackage = (extra?.androidPackage as string | undefined) ?? 'Unavailable';
const iosBundleIdentifier =
  (extra?.iosBundleIdentifier as string | undefined) ?? 'Unavailable';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark} />
          <Text style={styles.brandName}>{brand.displayName}</Text>
          <View style={styles.environmentBadge}>
            <Text style={styles.environmentText}>{environment}</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>MOBILE FOUNDATION</Text>
          <Text style={styles.title}>Development Build Ready</Text>
          <Text style={styles.subtitle}>
            Expo Router, typed brand configuration, and application modules are connected.
          </Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Configuration active</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ANDROID</Text>
            <Text selectable style={styles.detailValue}>
              {androidPackage}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>IOS</Text>
            <Text selectable style={styles.detailValue}>
              {iosBundleIdentifier}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>React Native New Architecture · {Platform.OS}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const colors = rowanTheme.colors;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandMark: {
    width: 13,
    height: 13,
    marginRight: 10,
    backgroundColor: colors.primary,
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  brandName: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2.4,
  },
  environmentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderColor: colors.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
  },
  environmentText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  hero: {
    flex: 1,
    minHeight: 300,
    justifyContent: 'center',
    paddingVertical: 56,
  },
  eyebrow: {
    marginBottom: 14,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: {
    maxWidth: 520,
    color: colors.text,
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 46,
    letterSpacing: -1.4,
  },
  subtitle: {
    maxWidth: 540,
    marginTop: 18,
    color: colors.mutedText,
    fontSize: 16,
    lineHeight: 25,
  },
  statusCard: {
    padding: 20,
    backgroundColor: colors.surface,
    borderColor: '#DCE4E7',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    shadowColor: '#16383B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 9,
    height: 9,
    marginRight: 9,
    backgroundColor: colors.success,
    borderRadius: 999,
  },
  statusText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 18,
    backgroundColor: '#DCE4E7',
  },
  detailRow: {
    gap: 5,
    marginBottom: 15,
  },
  detailLabel: {
    color: colors.mutedText,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  detailValue: {
    color: colors.text,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    marginTop: 22,
    color: colors.mutedText,
    fontSize: 11,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
