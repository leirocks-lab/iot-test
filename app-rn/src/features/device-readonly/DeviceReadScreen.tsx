import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  readRequestKey,
  type DeviceReadBinding,
  type DeviceReadPage,
  type DeviceReadState,
} from '../../host/adapter/DeviceReadController';
import type {ReadSchedule} from '../../host/adapter/DeviceReadModels';
import {firmwareLabels, scheduleLabels} from './presentation';

type Props = {
  page: DeviceReadPage;
  binding: DeviceReadBinding | undefined;
  state: DeviceReadState;
  onBack: () => void;
  onRetry: () => void;
  onKind: (kind: 'mcu' | 'wifi') => void;
};
export function ReadAction({
  label,
  testID,
  onPress,
  disabled = false,
}: {
  label: string;
  testID: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, disabled && styles.disabled]}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}
function ScheduleCard({item}: {item: ReadSchedule}) {
  const value = scheduleLabels(item);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeading}>
        <Text style={styles.cardTitle}>{value.name}</Text>
        <Text style={styles.secondary}>{value.enabled}</Text>
      </View>
      <Text style={styles.time}>{value.startTime}</Text>
      <Text style={styles.body}>
        {value.type} · {value.repeat}
      </Text>
      <Text style={styles.secondary}>{value.weekdays}</Text>
      <Text style={styles.secondary}>时区：{value.timeZone}</Text>
      <Text style={styles.secondary}>
        云端下次执行：{value.nextExecutionAt}
      </Text>
    </View>
  );
}
function errorMessage(error: DeviceReadState['error']) {
  if (error === 'FORBIDDEN') {
    return '暂无此设备的访问权限，请返回';
  }
  if (error === 'EXPIRED') {
    return '设备访问已结束，请返回设备页面';
  }
  return '暂时无法读取，请重试或返回';
}
/** Controlled read presentation. No schedule switches, editors or upgrade/cancel actions. */
export function DeviceReadScreen({
  page,
  binding,
  state,
  onBack,
  onRetry,
  onKind,
}: Props) {
  const expected = readRequestKey(page, binding);
  // Hide prior page/observer data in the same render that changes navigation, before effects run.
  const current: DeviceReadState =
    state.requestKey === expected
      ? state
      : {requestKey: expected, phase: 'loading', error: ''};
  const schedules = page.feature === 'schedules';
  const prefix = schedules ? 'rn-schedules' : 'rn-firmware';
  const retry =
    current.phase === 'error' &&
    !['FORBIDDEN', 'EXPIRED'].includes(current.error);
  const kind = page.feature === 'firmware' ? page.kind : undefined;
  return (
    <View
      style={styles.page}
      testID={kind ? `rn-firmware-kind-${kind}` : undefined}
      collapsable={false}
    >
      <View style={styles.header}>
        <Pressable
          testID="rn-feature-back"
          accessibilityRole="button"
          accessibilityLabel="返回设备"
          onPress={onBack}
          style={styles.back}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          {schedules ? '定时' : '固件信息'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      {!schedules && (
        <View style={styles.tabs}>
          {(['mcu', 'wifi'] as const).map((value) => (
            <Pressable
              key={value}
              testID={`rn-firmware-${value}`}
              accessibilityRole="button"
              accessibilityState={{selected: kind === value}}
              onPress={() => onKind(value)}
              style={[styles.tab, kind === value && styles.selectedTab]}
            >
              <Text
                style={[
                  styles.tabText,
                  kind === value && styles.selectedTabText,
                ]}
              >
                {value === 'mcu' ? 'MCU 固件' : 'Wi-Fi 固件'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {current.phase === 'loading' && (
        <View
          style={styles.center}
          testID={`${prefix}-loading`}
          collapsable={false}
        >
          <ActivityIndicator accessibilityLabel="正在读取" />
          <Text style={styles.notice}>正在读取…</Text>
        </View>
      )}
      {current.phase === 'idle' && (
        <View style={styles.center}>
          <Text style={styles.notice}>返回前台后重新读取</Text>
        </View>
      )}
      {current.phase === 'error' && (
        <View
          style={styles.center}
          testID={`${prefix}-error`}
          collapsable={false}
        >
          <Text
            testID={kind ? `rn-firmware-error-${kind}` : undefined}
            accessibilityRole="alert"
            style={styles.notice}
          >
            {errorMessage(current.error)}
          </Text>
          {retry && (
            <ReadAction
              testID={`${prefix}-retry`}
              label="重试"
              onPress={onRetry}
            />
          )}
        </View>
      )}
      {current.phase === 'ready' && schedules && (
        <FlatList
          testID={current.schedules?.length ? 'rn-schedules-loaded' : undefined}
          data={current.schedules ?? []}
          keyExtractor={(item) => item.itemKey}
          renderItem={({item}) => <ScheduleCard item={item} />}
          contentContainerStyle={[
            styles.list,
            !current.schedules?.length && styles.emptyList,
          ]}
          ListHeaderComponent={
            current.schedules?.length ? (
              <Text style={styles.listLabel}>已保存的定时</Text>
            ) : null
          }
          ListEmptyComponent={
            <Text testID="rn-schedules-empty" style={styles.notice}>
              暂无定时
            </Text>
          }
        />
      )}
      {current.phase === 'ready' &&
        !schedules &&
        current.firmware &&
        current.firmware.kind === kind && (
          <ScrollView
            testID="rn-firmware-loaded"
            contentContainerStyle={styles.firmwareContent}
          >
            <View
              testID={`rn-firmware-result-${kind}`}
              collapsable={false}
              style={styles.firmwareCard}
            >
              <Text style={styles.secondary}>可用固件信息</Text>
              <Text style={styles.version}>
                {firmwareLabels(current.firmware).version}
              </Text>
              <Text style={styles.body}>
                {firmwareLabels(current.firmware).deviceName}
              </Text>
              <Text style={styles.remark}>
                {firmwareLabels(current.firmware).remark}
              </Text>
            </View>
          </ScrollView>
        )}
      {current.phase === 'ready' && (
        <View style={styles.reload}>
          <ReadAction
            testID={`${prefix}-retry`}
            label="重新读取"
            onPress={onRetry}
          />
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: '#f1f1f1', paddingTop: 44},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 8,
  },
  back: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {fontSize: 32, color: '#222'},
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    color: '#111',
    fontWeight: '500',
  },
  headerSpacer: {width: 48},
  tabs: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTab: {backgroundColor: '#222', borderColor: '#222'},
  tabText: {fontSize: 15, color: '#555'},
  selectedTabText: {color: '#fff'},
  center: {flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 24},
  notice: {fontSize: 16, lineHeight: 25, color: '#777', textAlign: 'center'},
  list: {padding: 16, gap: 12},
  emptyList: {flexGrow: 1, justifyContent: 'center'},
  listLabel: {fontSize: 14, color: '#777', marginBottom: 12},
  card: {backgroundColor: '#fff', borderRadius: 10, padding: 18, gap: 8},
  cardHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {fontSize: 17, color: '#222', flexShrink: 1},
  time: {fontSize: 26, color: '#222'},
  body: {fontSize: 16, lineHeight: 24, color: '#444'},
  secondary: {fontSize: 14, lineHeight: 22, color: '#777'},
  firmwareContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 44,
    paddingBottom: 32,
  },
  firmwareCard: {alignItems: 'center', gap: 20},
  version: {fontSize: 28, color: '#222', textAlign: 'center'},
  remark: {fontSize: 16, lineHeight: 25, color: '#888', textAlign: 'center'},
  action: {
    backgroundColor: '#111',
    minHeight: 46,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {fontSize: 16, color: '#fff', textAlign: 'center'},
  disabled: {opacity: 0.35},
  reload: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8},
});
