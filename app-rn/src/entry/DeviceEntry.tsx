import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Host from '../host/specs/NativeRowanHost';
import {
  DeviceSessionController,
  type DeviceSessionState,
} from '../host/adapter/DeviceSessionController';
import {
  DeviceReadController,
  type DeviceReadPage,
  type DeviceReadState,
} from '../host/adapter/DeviceReadController';
import {
  DeviceReadScreen,
  ReadAction,
} from '../features/device-readonly/DeviceReadScreen';
import {readBindingFromSession} from '../features/device-readonly/presentation';
import {deviceStatus} from './deviceStatus';
import {DeviceMoreScreen} from '../features/device-more/DeviceMoreScreen';
import {pushReadPage, popReadPage} from '../features/device-more/navigation';
import {
  DeviceSelfUnbindController,
  type SelfUnbindDisplay,
} from '../host/adapter/DeviceSelfUnbindController';
import {createNativePageClose} from '../host/adapter/NativePageClose';

/** Native owns observation/auth/HTTP/MQTT; RN navigation below is device-local and read-only. */
export function DeviceEntry({
  deviceId,
  pageSessionId,
}: {
  deviceId?: string;
  pageSessionId?: string;
}) {
  const pageClose = useMemo(
    () => createNativePageClose(Host, pageSessionId),
    [pageSessionId],
  );
  const [state, setState] = useState<DeviceSessionState>({
    loading: true,
    resyncing: false,
    error: '',
  });
  const [controller, setController] = useState<DeviceSessionController>();
  const [reader, setReader] = useState<DeviceReadController>();
  const [readState, setReadState] = useState<DeviceReadState>({
    requestKey: '',
    phase: 'idle',
    error: '',
  });
  const [selfUnbindState, setSelfUnbindState] = useState<SelfUnbindDisplay>({
    supported: false,
    loading: false,
    requesting: false,
    error: '',
  });
  const [selfUnbind, setSelfUnbind] = useState<DeviceSelfUnbindController>();
  const [pages, setPages] = useState<DeviceReadPage[]>([]);
  const page = pages.at(-1);
  useEffect(() => {
    const session = new DeviceSessionController(Host, deviceId ?? '', setState);
    setState(session.state);
    setController(session);
    session.start();
    return () => session.dispose();
  }, [deviceId]);
  useEffect(() => {
    const reads = new DeviceReadController(Host, setReadState);
    reads.setForeground(
      AppState.currentState !== 'background' &&
        AppState.currentState !== 'inactive',
    );
    setReadState(reads.state);
    setReader(reads);
    const subscription = AppState.addEventListener('change', (value) =>
      reads.setForeground(value === 'active'),
    );
    return () => {
      subscription.remove();
      reads.dispose();
    };
  }, []);
  useEffect(() => {
    const owner = new DeviceSelfUnbindController(Host, setSelfUnbindState);
    setSelfUnbind(owner);
    owner.setForeground(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (value) =>
      owner.setForeground(value === 'active'),
    );
    return () => {
      owner.dispose();
      subscription.remove();
    };
  }, []);
  const binding = readBindingFromSession(state, deviceId ?? '');
  const boundDeviceId = binding?.deviceId;
  const boundObservationId = binding?.observationId;
  const boundRevision = binding?.sessionRevision;
  useEffect(() => {
    const current =
      boundDeviceId && boundObservationId && boundRevision !== undefined
        ? {
            deviceId: boundDeviceId,
            observationId: boundObservationId,
            sessionRevision: boundRevision,
          }
        : undefined;
    if (page) {
      reader?.show(page, current);
    } else {
      reader?.hide();
    }
    // Unchanged observation identity does not refetch on each device event.
  }, [reader, page, boundDeviceId, boundObservationId, boundRevision]);
  const operationSnapshot = state.snapshot;
  const operationId = operationSnapshot?.observationId;
  const operationRevision = operationSnapshot?.sessionRevision;
  const operationValid =
    !!operationSnapshot &&
    operationSnapshot.deviceId === deviceId &&
    operationSnapshot.phase !== 'closed' &&
    !['session_changed', 'not_authenticated', 'closed'].includes(
      operationSnapshot.errorCode,
    );
  useEffect(() => {
    if (
      page?.feature === 'more' &&
      operationValid &&
      operationId &&
      operationRevision !== undefined
    ) {
      selfUnbind?.show(
        {observationId: operationId, sessionRevision: operationRevision},
        state.selfUnbindVersion === 1,
      );
    } else {
      selfUnbind?.hide();
    }
  }, [
    selfUnbind,
    page,
    operationValid,
    operationId,
    operationRevision,
    state.selfUnbindVersion,
  ]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!page) {
          return false;
        }
        selfUnbind?.hide();
        reader?.hide();
        setPages((stack) => popReadPage(stack));
        return true;
      },
    );
    return () => subscription.remove();
  }, [page, reader, selfUnbind]);
  const back = () => {
    selfUnbind?.hide();
    reader?.hide();
    setPages((stack) => popReadPage(stack));
  };
  const open = (next: DeviceReadPage) => {
    if (next.feature !== 'more') {
      selfUnbind?.hide();
    }
    if (!binding || !reader) {
      return;
    }
    reader.show(next, binding);
    setPages((stack) => pushReadPage(stack, next));
  };
  const status = deviceStatus(state);
  return (
    <View style={styles.root}>
      {page ? (
        page.feature === 'schedules' || page.feature === 'firmware' ? (
          <DeviceReadScreen
            page={page}
            binding={binding}
            state={readState}
            onBack={back}
            onRetry={() => reader?.retry()}
            onKind={(kind) => open({feature: 'firmware', kind})}
          />
        ) : (
          <DeviceMoreScreen
            canSelfUnbindHome={pageClose.canClose}
            selfUnbind={selfUnbindState}
            onSelfUnbind={() => selfUnbind?.request()}
            onSelfUnbindRefresh={() => selfUnbind?.refresh()}
            onSelfUnbindHome={() => {
              selfUnbind?.hide();
              pageClose.requestClose();
            }}
            page={page}
            binding={binding}
            state={readState}
            onBack={back}
            onRetry={() => reader?.retry()}
            onNavigate={open}
          />
        )
      ) : (
        <ScrollView contentContainerStyle={styles.page}>
          <View style={styles.content}>
            <Text style={styles.title} accessibilityRole="header">
              {status.title}
            </Text>
            {status.busy && <ActivityIndicator accessibilityLabel="加载中" />}
            <Text
              testID="rn-device-status"
              accessibilityRole="alert"
              style={styles.status}
            >
              {status.message}
            </Text>
            {status.canRetry && (
              <ReadAction
                testID="rn-device-retry"
                label="重试"
                disabled={status.busy}
                onPress={() => controller?.retry()}
              />
            )}
            <ReadAction
              testID="rn-open-more"
              label="更多"
              disabled={!binding || !reader}
              onPress={() => open({feature: 'more'})}
            />
            <ReadAction
              testID="rn-open-schedules"
              label="定时"
              disabled={!binding || !reader}
              onPress={() => open({feature: 'schedules'})}
            />
            <ReadAction
              testID="rn-open-firmware"
              label="固件信息"
              disabled={!binding || !reader}
              onPress={() => open({feature: 'firmware', kind: 'mcu'})}
            />
          </View>
        </ScrollView>
      )}
      <View style={styles.footer}>
        <ReadAction
          testID="rn-device-close"
          label="返回首页"
          disabled={!pageClose.canClose || state.error === 'INCOMPATIBLE_HOST'}
          onPress={() => {
            reader?.hide();
            pageClose.requestClose();
          }}
        />
        {!pageClose.canClose && (
          <Text style={styles.backHint}>请使用返回键或返回手势</Text>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#f1f1f1'},
  page: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  content: {gap: 24},
  title: {fontSize: 24, fontWeight: '600', color: '#17202a'},
  status: {fontSize: 17, lineHeight: 26, color: '#334155'},
  footer: {padding: 16, paddingBottom: 24},
  backHint: {
    fontSize: 14,
    lineHeight: 22,
    color: '#777',
    textAlign: 'center',
    marginTop: 8,
  },
});
