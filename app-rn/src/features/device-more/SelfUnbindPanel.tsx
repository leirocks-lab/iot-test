import React from 'react';
import {Text, View, StyleSheet} from 'react-native';
import {ReadAction} from '../device-readonly/DeviceReadScreen';
import {
  selfUnbindMessage,
  type SelfUnbindDisplay,
} from '../../host/adapter/DeviceSelfUnbindController';

export function SelfUnbindPanel({
  state,
  onRequest,
  onRefresh,
  onHome,
  canClose,
}: {
  state: SelfUnbindDisplay;
  onRequest: () => void;
  onRefresh: () => void;
  onHome: () => void;
  canClose: boolean;
}) {
  const status = state.snapshot?.status;
  const pending =
    !!status &&
    [
      'unknown',
      'preparing',
      'sending',
      'checking',
      'confirmed_cleanup_pending',
      'already_absent_cleanup_pending',
    ].includes(status);
  return (
    <View style={styles.panel}>
      <Text
        testID="rn-self-unbind-status"
        accessibilityLiveRegion="polite"
        style={styles.text}
      >
        {!state.supported
          ? '当前版本暂不支持在此解除关联'
          : state.requesting
            ? '正在等待确认…'
            : state.error
              ? '解绑状态暂不可用，请查询或返回'
              : state.loading && !status
                ? '正在查询解绑状态…'
                : state.snapshot?.errorCode === 'busy'
                  ? '另一项操作正在处理中，请稍后查询'
                  : status
                    ? selfUnbindMessage(status)
                    : '等待设备状态'}
      </Text>
      {state.supported && (
        <>
          {state.snapshot?.canRequest &&
            !state.error &&
            !state.loading &&
            !state.requesting && (
              <ReadAction
                testID="rn-more-self-unbind"
                label="解除此账号关联"
                onPress={onRequest}
              />
            )}
          {!state.requesting && (
            <ReadAction
              testID="rn-self-unbind-query"
              label="查询状态"
              onPress={onRefresh}
            />
          )}
          {(pending ||
            [
              'confirmed',
              'already_absent',
              'historical_confirmed',
              'historical_already_absent',
            ].includes(status ?? '')) && (
            <ReadAction
              disabled={!canClose}
              testID="rn-self-unbind-home"
              label="返回首页查看"
              onPress={onHome}
            />
          )}
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    margin: 16,
  },
  text: {fontSize: 14, lineHeight: 22, color: '#777'},
});
