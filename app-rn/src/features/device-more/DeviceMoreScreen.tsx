import React from 'react';
import {SelfUnbindPanel} from './SelfUnbindPanel';
import type {SelfUnbindDisplay} from '../../host/adapter/DeviceSelfUnbindController';
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
import {ReadAction} from '../device-readonly/DeviceReadScreen';
import {
  locationLabel,
  memberCounts,
  memberName,
  moreLabels,
  roleLabel,
} from './presentation';

type Props = {
  page: DeviceReadPage;
  binding: DeviceReadBinding | undefined;
  state: DeviceReadState;
  onBack: () => void;
  onRetry: () => void;
  onNavigate: (page: DeviceReadPage) => void;
  selfUnbind?: SelfUnbindDisplay;
  onSelfUnbind?: () => void;
  onSelfUnbindRefresh?: () => void;
  onSelfUnbindHome?: () => void;
  canSelfUnbindHome?: boolean;
};
function Detail({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.detail}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}
function Row({
  label,
  testID,
  onPress,
}: {
  label: string;
  testID: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.row}
    >
      <Text style={styles.rowText}>{label}</Text>
      <Text style={styles.chevron} accessible={false}>
        ›
      </Text>
    </Pressable>
  );
}
const pageTitle = (feature: string) =>
  (
    ({
      more: '更多',
      members: '设备成员',
      help: '设备帮助',
      location: '所属房间',
    }) as Record<string, string>
  )[feature] ?? '更多';
function errorText(error: DeviceReadState['error']) {
  if (error === 'FORBIDDEN') {
    return '暂无此设备的访问权限，请返回';
  }
  if (error === 'EXPIRED') {
    return '设备访问已结束，请返回设备页面';
  }
  return '暂时无法读取，请重试或返回';
}
/** Read-only metadata. No relationship IDs, contact fallbacks, role-derived permissions or links. */
export function DeviceMoreScreen({
  page,
  binding,
  state,
  onBack,
  onRetry,
  onNavigate,
  selfUnbind,
  onSelfUnbind,
  onSelfUnbindRefresh,
  onSelfUnbindHome,
  canSelfUnbindHome,
}: Props) {
  const expected = readRequestKey(page, binding);
  const current: DeviceReadState =
    state.requestKey === expected
      ? state
      : {requestKey: expected, phase: 'loading', error: ''};
  const prefix = `rn-${page.feature}`;
  const ready = current.phase === 'ready';
  const labels = current.more && moreLabels(current.more);
  const counts = memberCounts(current.members ?? []);
  const retry =
    current.phase === 'error' &&
    !['FORBIDDEN', 'EXPIRED'].includes(current.error);
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Pressable
          testID="rn-feature-back"
          accessibilityRole="button"
          accessibilityLabel={page.feature === 'more' ? '返回设备' : '返回更多'}
          onPress={onBack}
          style={styles.back}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          {pageTitle(page.feature)}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      {page.feature === 'more' &&
        selfUnbind &&
        onSelfUnbind &&
        onSelfUnbindRefresh &&
        onSelfUnbindHome && (
          <SelfUnbindPanel
            canClose={canSelfUnbindHome === true}
            state={selfUnbind}
            onRequest={onSelfUnbind}
            onRefresh={onSelfUnbindRefresh}
            onHome={onSelfUnbindHome}
          />
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
          <Text accessibilityRole="alert" style={styles.notice}>
            {errorText(current.error)}
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
      {ready && page.feature === 'more' && labels && (
        <ScrollView
          testID="rn-more-loaded"
          contentContainerStyle={styles.content}
        >
          <View style={styles.card}>
            <Text style={styles.deviceTitle}>{labels.title}</Text>
            <Detail label="产品" value={labels.productName} />
            <Detail label="型号" value={labels.modelName} />
            <Detail label="系列" value={labels.seriesName} />
            <Detail label="类别" value={labels.category} />
            <Detail label="我的角色" value={labels.role} />
          </View>
          <View style={styles.card}>
            <Detail label="MCU 固件版本" value={labels.mcuVersion} />
            <Detail label="Wi-Fi 固件版本" value={labels.wifiVersion} />
          </View>
          <View style={styles.rowGroup}>
            <Row
              label="所属房间"
              testID="rn-more-open-location"
              onPress={() => onNavigate({feature: 'location'})}
            />
            <Row
              label="设备成员"
              testID="rn-more-open-members"
              onPress={() => onNavigate({feature: 'members'})}
            />
            <Row
              label="设备帮助"
              testID="rn-more-open-help"
              onPress={() => onNavigate({feature: 'help'})}
            />
          </View>
          <View style={styles.rowGroup}>
            <Row
              label="定时"
              testID="rn-more-open-schedules"
              onPress={() => onNavigate({feature: 'schedules'})}
            />
            <Row
              label="固件信息"
              testID="rn-more-open-firmware"
              onPress={() => onNavigate({feature: 'firmware', kind: 'mcu'})}
            />
          </View>
          <ReadAction
            testID="rn-more-retry"
            label="重新读取"
            onPress={onRetry}
          />
        </ScrollView>
      )}
      {ready && page.feature === 'members' && current.members && (
        <FlatList
          testID={current.members.length ? 'rn-members-loaded' : undefined}
          data={current.members}
          keyExtractor={(item) => item.itemKey}
          contentContainerStyle={[
            styles.content,
            !current.members.length && styles.empty,
          ]}
          ListHeaderComponent={
            current.members.length ? (
              <View style={styles.counts}>
                <Text style={styles.rowText}>
                  {counts.unknown ? '已识别成员' : '成员'} {counts.members} 人
                </Text>
                <Text style={styles.secondary}>
                  观察员 {counts.observers} 人，不计入成员人数
                </Text>
                {counts.unknown > 0 && (
                  <Text style={styles.secondary}>
                    另有 {counts.unknown} 项角色未知
                  </Text>
                )}
              </View>
            ) : null
          }
          renderItem={({item}) => (
            <View style={styles.memberCard}>
              <Text style={styles.rowText}>{memberName(item)}</Text>
              <Text style={styles.secondary}>
                {roleLabel(item.bindingRole)}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text testID="rn-members-empty" style={styles.notice}>
              暂无成员信息
            </Text>
          }
          ListFooterComponent={
            <ReadAction
              testID="rn-members-retry"
              label="重新读取"
              onPress={onRetry}
            />
          }
        />
      )}
      {ready && page.feature === 'help' && current.help && (
        <FlatList
          testID={current.help.length ? 'rn-help-loaded' : undefined}
          data={current.help}
          keyExtractor={(item) => item.itemKey}
          contentContainerStyle={[
            styles.content,
            !current.help.length && styles.empty,
          ]}
          renderItem={({item}) => (
            <View style={styles.article}>
              <Text accessibilityRole="header" style={styles.articleTitle}>
                {item.title || '使用帮助'}
              </Text>
              {!!item.createdAt && (
                <Text style={styles.secondary}>{item.createdAt}</Text>
              )}
              <Text selectable style={styles.body}>
                {item.content || '暂无正文'}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text testID="rn-help-empty" style={styles.notice}>
              暂无设备帮助
            </Text>
          }
          ListFooterComponent={
            <ReadAction
              testID="rn-help-retry"
              label="重新读取"
              onPress={onRetry}
            />
          }
        />
      )}
      {ready && page.feature === 'location' && current.location && (
        <ScrollView
          testID="rn-location-loaded"
          contentContainerStyle={styles.content}
        >
          <View style={styles.card}>
            <Text style={styles.rowText}>当前所属房间</Text>
            <Text
              testID={`rn-location-${current.location.assignment}`}
              style={styles.body}
            >
              {locationLabel(current.location)}
            </Text>
          </View>
          <ReadAction
            testID="rn-location-retry"
            label="重新读取"
            onPress={onRetry}
          />
        </ScrollView>
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
  headerSpacer: {width: 48},
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    color: '#111',
  },
  content: {flexGrow: 1, padding: 16, gap: 12, paddingBottom: 28},
  empty: {justifyContent: 'center'},
  center: {flex: 1, padding: 24, justifyContent: 'center', gap: 24},
  card: {backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 12},
  deviceTitle: {
    fontSize: 18,
    color: '#222',
    fontWeight: '600',
    marginBottom: 4,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
  },
  label: {fontSize: 14, lineHeight: 22, color: '#888', minWidth: 100},
  value: {
    flexGrow: 1,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
    textAlign: 'right',
  },
  rowGroup: {backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden'},
  row: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {flexShrink: 1, fontSize: 16, lineHeight: 24, color: '#333'},
  chevron: {marginLeft: 'auto', color: '#aaa', fontSize: 24},
  secondary: {fontSize: 14, lineHeight: 22, color: '#888'},
  body: {fontSize: 16, lineHeight: 26, color: '#555'},
  notice: {fontSize: 16, lineHeight: 25, color: '#777', textAlign: 'center'},
  counts: {gap: 8, marginBottom: 4},
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  article: {backgroundColor: '#fff', borderRadius: 12, padding: 20, gap: 16},
  articleTitle: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '600',
    color: '#222',
  },
});
