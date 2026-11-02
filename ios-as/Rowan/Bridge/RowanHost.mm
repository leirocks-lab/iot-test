#import "RowanHost.h"
#import "Rowan-Swift.h"

@interface RowanHost ()
@property(nonatomic, copy) NSString *rowanOwner;
@property(nonatomic, assign) BOOL rowanInvalidated;
@end

@implementation RowanHost
RCT_EXPORT_MODULE(NativeRowanHost)

- (NSString *)ownerOnMain {
  if (self.rowanInvalidated) return nil;
  if (self.rowanOwner == nil) {
    __weak RowanHost *weakSelf = self;
    self.rowanOwner = [[RowanHostServices shared] beginModule:^(NSDictionary *snapshot) {
      RowanHost *strongSelf = weakSelf;
      if (strongSelf != nil && !strongSelf.rowanInvalidated) [strongSelf emitOnDeviceChanged:snapshot];
    }];
  }
  return self.rowanOwner;
}
- (void)rejectObservation:(NSError *)error reject:(RCTPromiseRejectBlock)reject {
  NSString *code = error.userInfo[@"bridgeCode"] ?: @"unavailable";
  reject(code, @"设备观察暂不可用", nil);
}
- (void)getContext:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    if ([self ownerOnMain] == nil) { reject(@"closed", @"设备观察已释放", nil); return; }
    resolve([[RowanHostServices shared] context]);
  });
}
- (void)observeDevice:(NSString *)deviceId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    NSString *owner = [self ownerOnMain];
    if (owner == nil) { reject(@"closed", @"设备观察已释放", nil); return; }
    NSError *error = nil;
    NSDictionary *snapshot = [[RowanHostServices shared] observeDevice:deviceId owner:owner error:&error];
    if (snapshot != nil) resolve(snapshot); else [self rejectObservation:error reject:reject];
  });
}
- (void)getDeviceSnapshot:(NSString *)observationId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.rowanInvalidated || self.rowanOwner == nil) { reject(@"closed", @"设备观察已释放", nil); return; }
    NSError *error = nil;
    NSDictionary *snapshot = [[RowanHostServices shared] getDeviceSnapshot:observationId owner:self.rowanOwner error:&error];
    if (snapshot != nil) resolve(snapshot); else [self rejectObservation:error reject:reject];
  });
}
- (void)retryObservation:(NSString *)observationId {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (!self.rowanInvalidated && self.rowanOwner != nil) [[RowanHostServices shared] retryObservation:observationId owner:self.rowanOwner];
  });
}
- (void)getDeviceSchedules:(NSString *)observationId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.rowanInvalidated || self.rowanOwner == nil) { reject(@"closed", @"设备观察已释放", nil); return; }
    [[RowanHostServices shared] getDeviceSchedules:observationId owner:self.rowanOwner completion:^(id value, NSError *error) {
      if (value != nil) resolve(value); else [self rejectObservation:error reject:reject];
    }];
  });
}
- (void)getDeviceFirmware:(NSString *)observationId kind:(NSString *)kind resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.rowanInvalidated || self.rowanOwner == nil) { reject(@"closed", @"设备观察已释放", nil); return; }
    [[RowanHostServices shared] getDeviceFirmware:observationId kind:kind owner:self.rowanOwner completion:^(id value, NSError *error) {
      if (value != nil) resolve(value); else [self rejectObservation:error reject:reject];
    }];
  });
}
- (void)getDeviceMoreSummary:(NSString *)observationId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.rowanInvalidated || self.rowanOwner == nil) { reject(@"closed", @"设备观察已释放", nil); return; }
    [[RowanHostServices shared] getDeviceMoreSummary:observationId owner:self.rowanOwner completion:^(id value, NSError *error) {
      if (value != nil) resolve(value); else [self rejectObservation:error reject:reject];
    }];
  });
}
- (void)getDeviceMembers:(NSString *)observationId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.rowanInvalidated || self.rowanOwner == nil) { reject(@"closed", @"设备观察已释放", nil); return; }
    [[RowanHostServices shared] getDeviceMembers:observationId owner:self.rowanOwner completion:^(id value, NSError *error) {
      if (value != nil) resolve(value); else [self rejectObservation:error reject:reject];
    }];
  });
}
- (void)getDeviceHelp:(NSString *)observationId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.rowanInvalidated || self.rowanOwner == nil) { reject(@"closed", @"设备观察已释放", nil); return; }
    [[RowanHostServices shared] getDeviceHelp:observationId owner:self.rowanOwner completion:^(id value, NSError *error) {
      if (value != nil) resolve(value); else [self rejectObservation:error reject:reject];
    }];
  });
}
- (void)getDeviceLocation:(NSString *)observationId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.rowanInvalidated || self.rowanOwner == nil) { reject(@"closed", @"设备观察已释放", nil); return; }
    [[RowanHostServices shared] getDeviceLocation:observationId owner:self.rowanOwner completion:^(id value, NSError *error) {
      if (value != nil) resolve(value); else [self rejectObservation:error reject:reject];
    }];
  });
}
- (void)requestDeviceSelfUnbind:(NSString *)observationId attemptId:(NSString *)attemptId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.rowanInvalidated || self.rowanOwner == nil) { reject(@"closed", @"设备观察已释放", nil); return; }
    [[RowanHostServices shared] requestDeviceSelfUnbind:observationId attemptId:attemptId owner:self.rowanOwner completion:^(id value, NSError *error) {
      if (value != nil) resolve(value); else [self rejectObservation:error reject:reject];
    }];
  });
}
- (void)cancelDeviceSelfUnbindConfirmation:(NSString *)observationId attemptId:(NSString *)attemptId {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (!self.rowanInvalidated && self.rowanOwner != nil) [[RowanHostServices shared] cancelDeviceSelfUnbindConfirmation:observationId attemptId:attemptId owner:self.rowanOwner];
  });
}
- (void)getDeviceSelfUnbindState:(NSString *)observationId resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.rowanInvalidated || self.rowanOwner == nil) { reject(@"closed", @"设备观察已释放", nil); return; }
    [[RowanHostServices shared] getDeviceSelfUnbindState:observationId owner:self.rowanOwner completion:^(id value, NSError *error) {
      if (value != nil) resolve(value); else [self rejectObservation:error reject:reject];
    }];
  });
}
- (void)acknowledgeDeviceEvent:(NSString *)observationId revision:(double)revision {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (!self.rowanInvalidated && self.rowanOwner != nil) [[RowanHostServices shared] acknowledgeDeviceEvent:observationId revision:revision owner:self.rowanOwner];
  });
}
- (void)releaseObservation:(NSString *)observationId {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.rowanOwner != nil) [[RowanHostServices shared] releaseObservation:observationId owner:self.rowanOwner];
  });
}
- (void)closeDevice:(NSString *)pageSessionId {
  if (![pageSessionId isKindOfClass:[NSString class]] || pageSessionId.length == 0) return;
  dispatch_async(dispatch_get_main_queue(), ^{
    if (!self.rowanInvalidated) [[RowanHostServices shared] closeDevice:pageSessionId];
  });
}
- (void)invalidate {
  dispatch_async(dispatch_get_main_queue(), ^{
    self.rowanInvalidated = YES;
    if (self.rowanOwner != nil) [[RowanHostServices shared] endModule:self.rowanOwner];
    self.rowanOwner = nil;
  });
}
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeRowanHostSpecJSI>(params);
}
@end
