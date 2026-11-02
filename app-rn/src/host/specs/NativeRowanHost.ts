import type {TurboModule, CodegenTypes} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export type HostContext = {
  bridgeMajor: number;
  sessionRevision: number;
  authenticated: boolean;
  language: string;
  /** Additive contract support only; never write permission. */
  selfUnbindVersion?: number;
};
/** Major 3: page-bound close and display metadata only. No reported fields, credentials or URIs. */
export type DeviceSnapshot = {
  deviceId: string;
  observationId: string;
  sessionRevision: number;
  revision: number;
  authorityRevision: number;
  connectionEpoch: number;
  title: string;
  productCategory: string;
  phase: string;
  online: string;
  stale: boolean;
  snapshotAvailable: boolean;
  errorCode: string;
};
/** Local display key and read metadata only: never schedule action/mode or write authority. */
export type DeviceScheduleSummary = {
  itemKey: string;
  name: string;
  type: string;
  startTime: string;
  repeatType: string;
  weekdays: Array<number>;
  timeZone: string;
  nextExecutionAt: string;
  enabledState: string;
};
/** Available firmware, not current device version, hasUpdate, progress or an upgrade permit. */
export type DeviceFirmwareOffer = {
  kind: string;
  version: string;
  remark: string;
  deviceName: string;
};
/** Read metadata only. Empty text is unknown; role is not an operation permit. */
export type DeviceMoreSummary = {
  deviceNickname: string;
  deviceName: string;
  productName: string;
  productCategory: string;
  seriesName: string;
  modelName: string;
  mcuVersion: string;
  wifiVersion: string;
  bindingRole: string;
};
/** Local presentation key only; no user identity or contact fields. */
export type DeviceMemberSummary = {
  itemKey: string;
  nickname: string;
  bindingRole: string;
};
/** Native requests type=text. Contents are plain text and never an open-link command. */
export type DeviceHelpArticle = {
  itemKey: string;
  title: string;
  content: string;
  createdAt: string;
};
export type DeviceLocationSummary = {
  assignment: string;
  roomName: string;
};
/** Per-native-observation state only. No operation ID, owner identity or write capability. */
export type DeviceSelfUnbindState = {
  observationId: string;
  sessionRevision: number;
  revision: number;
  status: string;
  errorCode: string;
  canRequest: boolean;
};
export interface Spec extends TurboModule {
  getContext(): Promise<HostContext>;
  observeDevice(deviceId: string): Promise<DeviceSnapshot>;
  getDeviceSnapshot(observationId: string): Promise<DeviceSnapshot>;
  getDeviceSchedules(
    observationId: string,
  ): Promise<Array<DeviceScheduleSummary>>;
  getDeviceFirmware(
    observationId: string,
    kind: string,
  ): Promise<DeviceFirmwareOffer>;
  getDeviceMoreSummary(observationId: string): Promise<DeviceMoreSummary>;
  getDeviceMembers(observationId: string): Promise<Array<DeviceMemberSummary>>;
  getDeviceHelp(observationId: string): Promise<Array<DeviceHelpArticle>>;
  getDeviceLocation(observationId: string): Promise<DeviceLocationSummary>;
  requestDeviceSelfUnbind(
    observationId: string,
    attemptId: string,
  ): Promise<DeviceSelfUnbindState>;
  cancelDeviceSelfUnbindConfirmation(
    observationId: string,
    attemptId: string,
  ): void;
  getDeviceSelfUnbindState(
    observationId: string,
  ): Promise<DeviceSelfUnbindState>;
  retryObservation(observationId: string): void;
  acknowledgeDeviceEvent(observationId: string, revision: number): void;
  releaseObservation(observationId: string): void;
  closeDevice(pageSessionId: string): void;
  readonly onDeviceChanged: CodegenTypes.EventEmitter<DeviceSnapshot>;
}
export default TurboModuleRegistry.getEnforcing<Spec>('NativeRowanHost');
