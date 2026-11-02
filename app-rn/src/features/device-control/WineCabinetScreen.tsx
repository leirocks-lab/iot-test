import React from 'react';
import {ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {wineAssets} from './assets';
import {ChoiceControl, ControlFeedback, DockControl, NumericControl, ToggleControl} from './controls';
import {buildWineCabinetViewModel, createControlIntent, nextNumericTarget, sameContext} from './view-model';
import type {ControlId, TemperatureUnit, WineCabinetScreenProps} from './types';

/** Unwired controlled feature. Native owns reported state, pending command ownership and every side effect. */
export function WineCabinetScreen({input, actions, insets, confirmingCleaningReset}: WineCabinetScreenProps) {
  const vm = buildWineCabinetViewModel(input);
  const send = (control: ControlId, value: unknown) => {
    const intent = createControlIntent(input, control, value, confirmingCleaningReset ?? undefined);
    if (intent) {actions.onControl(intent);}
  };
  const numeric = (control: ControlId, label: string, currentText?: string) => <NumericControl label={label} currentText={currentText}
    model={vm.controls[control]} lowerTarget={nextNumericTarget(input, control, -1)} upperTarget={nextNumericTarget(input, control, 1)}
    onChange={value => send(control, value)} />;
  const inactive = input.connection !== 'online' || vm.controls.power.value !== true;
  return <View style={[styles.root, {paddingTop: Math.max(0, insets.top)}]}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={actions.onBack} style={styles.headerButton}>
        <Image source={wineAssets.back} style={styles.backIcon} />
      </Pressable>
      <Text style={styles.title} numberOfLines={2}>{vm.title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="设备更多设置" onPress={actions.onMore} style={styles.headerButton}>
        <Image source={wineAssets.more} style={styles.moreIcon} />
      </Pressable>
    </View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.statusRow} accessibilityLiveRegion="polite">
        <View style={styles.statusPill}>
          {input.loading || input.connection === 'connecting' ? <ActivityIndicator size="small" color="#999999" /> :
            <View style={[styles.statusDot, inactive && styles.statusDotInactive]} />}
          <Text style={styles.statusText}>{vm.statusLabel}</Text>
        </View>
      </View>
      <CabinetImage lit={vm.lit} />
      {vm.mappingWarning && <Text accessibilityRole="alert" style={styles.notice}>{vm.mappingWarning}</Text>}
      {input.errorMessage && <Text accessibilityRole="alert" style={styles.notice}>{input.errorMessage}</Text>}
      {input.connection !== 'online' && actions.onReconnect && <Pressable accessibilityRole="button" accessibilityLabel="重新连接设备"
        disabled={input.loading || input.connection === 'connecting'} onPress={actions.onReconnect} style={styles.reconnect}>
        <Text style={styles.link}>重新连接</Text>
      </Pressable>}
      {vm.alarms.map(alarm => <View key={alarm.id} style={styles.alarm} accessibilityRole="alert">
        <Text style={styles.alarmTitle}>{alarm.code} · {alarm.message}</Text>
        <Text style={styles.caption}>{alarm.occurredAt} · {alarm.active === true ? '告警中' : alarm.active === false ? '已恢复' : '恢复状态未知'}</Text>
      </View>)}
      <View style={styles.card}>
        <View style={styles.unitSwitch} accessibilityRole="radiogroup" accessibilityLabel="温度显示单位">
          {(['C', 'F'] as const).map(unit => <Pressable key={unit} accessibilityRole="radio" accessibilityLabel={unit === 'C' ? '摄氏度' : '华氏度'}
            accessibilityState={{checked: input.temperatureUnit === unit, disabled: !vm.canChangeTemperatureUnit}}
            disabled={!vm.canChangeTemperatureUnit} onPress={() => actions.onTemperatureUnitChange(unit as TemperatureUnit)}
            style={[styles.unitOption, input.temperatureUnit === unit && styles.unitOptionSelected, !vm.canChangeTemperatureUnit && styles.dim]}>
            <Text style={[styles.unitText, input.temperatureUnit === unit && styles.unitTextSelected]}>°{unit}</Text>
          </Pressable>)}
        </View>
        {numeric('leftTemperature', '左温区温度设置', vm.currentTemperature.left)}
        <View style={styles.divider} />
        {numeric('rightTemperature', '右温区温度设置', vm.currentTemperature.right)}
      </View>
      <View style={[styles.card, styles.lightCard]}>
        <ToggleControl label="灯光" icon={wineAssets.light} model={vm.controls.light} onChange={value => send('light', value)} />
        <View style={styles.colorOptions}><ChoiceControl label="灯色" model={vm.controls.lightColor} colored onChange={value => send('lightColor', value)} /></View>
        {vm.controls.brightness.capability?.kind === 'number' ? numeric('brightness', '灯光亮度') :
          <ChoiceControl label="灯光亮度" model={vm.controls.brightness} onChange={value => send('brightness', value)} />}
      </View>
      {input.capabilities?.targetHumidity && <View style={styles.card}>{numeric('targetHumidity', '目标湿度')}</View>}
      {input.capabilities?.mode && <View style={[styles.card, styles.extraCard]}><ChoiceControl label="运行模式" model={vm.controls.mode} onChange={value => send('mode', value)} /></View>}
      {input.capabilities?.mute && <View style={[styles.card, styles.extraCard]}><ToggleControl label="静音" model={vm.controls.mute} onChange={value => send('mute', value)} /></View>}
      {(input.cleaningUsage || input.capabilities?.cleaningReset) && <View style={[styles.card, styles.extraCard]}>
        {input.cleaningUsage && <Text style={styles.rowLabel}>{input.cleaningUsage.label} · {vm.cleaningUsageText}</Text>}
        {input.capabilities?.cleaningReset && <>
          <Pressable accessibilityRole="button" accessibilityState={{disabled: vm.controls.cleaningReset.disabled || vm.controls.cleaningReset.busy}}
            disabled={vm.controls.cleaningReset.disabled || vm.controls.cleaningReset.busy}
            onPress={() => actions.onRequestCleaningResetConfirmation({...input.context})} style={styles.resetButton}>
            <Text style={styles.link}>清洁重置</Text>
          </Pressable>
          <ControlFeedback model={vm.controls.cleaningReset} />
        </>}
      </View>}
    </ScrollView>
      <View style={[styles.dock, {paddingBottom: Math.max(8, insets.bottom)}]}>
        <DockControl label="开关" model={vm.controls.power} onIcon={wineAssets.powerOn} offIcon={wineAssets.powerOff} onChange={value => send('power', value)} />
        <DockControl label="童锁" model={vm.controls.childLock} onIcon={wineAssets.lockOn} offIcon={wineAssets.lockOff} onChange={value => send('childLock', value)} />
      </View>
    <Modal visible={!!confirmingCleaningReset && sameContext(confirmingCleaningReset, input.context)} transparent animationType="fade" onRequestClose={actions.onCancelCleaningResetConfirmation}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard} accessibilityViewIsModal>
          <Text style={styles.modalTitle}>确认清洁重置？</Text>
          <Text style={styles.caption}>仅在已完成清洁后操作。发送后等待设备结果，结果未知时不要自动重复重置。</Text>
          <View style={styles.modalActions}>
            <Pressable accessibilityRole="button" onPress={actions.onCancelCleaningResetConfirmation} style={styles.modalButton}><Text style={styles.caption}>取消</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{disabled: vm.controls.cleaningReset.disabled || vm.controls.cleaningReset.busy}}
              disabled={vm.controls.cleaningReset.disabled || vm.controls.cleaningReset.busy} onPress={() => send('cleaningReset', 'trigger')} style={styles.modalButton}>
              <Text style={styles.link}>确认重置</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </View>;
}

function CabinetImage({lit}: {lit: boolean}) {
  return <View style={styles.hero} accessible accessibilityLabel="酒柜外观示意图，实际状态以设备回报为准">
    <Image source={wineAssets.cabinet} style={styles.heroBase} />
    <Image source={wineAssets.shadow} style={styles.heroShadow} />
    <Image source={wineAssets.front} style={styles.heroFront} />
    {lit && <>
      <Image source={wineAssets.led} style={styles.ledLeft} /><Image source={wineAssets.led} style={styles.ledRight} />
      <Image source={wineAssets.glow} style={styles.glowLeft} /><Image source={wineAssets.glow} style={styles.glowRight} />
    </>}
  </View>;
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F2F2F2'}, scroll: {flex: 1}, content: {paddingHorizontal: 16},
  header: {minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4},
  headerButton: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  backIcon: {width: 13, height: 13}, moreIcon: {width: 28, height: 24},
  title: {fontSize: 16, lineHeight: 22, fontWeight: '600', color: '#231916', textAlign: 'center', flex: 1},
  statusRow: {alignItems: 'center', marginTop: 12}, statusPill: {minHeight: 34, borderRadius: 17, paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10},
  statusDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: '#00C08C'}, statusDotInactive: {backgroundColor: '#999999'},
  statusText: {fontSize: 14, fontWeight: '500', color: '#666666', lineHeight: 18},
  hero: {width: 230, height: 230, alignSelf: 'center', marginTop: 16, marginBottom: 30},
  heroBase: {position: 'absolute', width: 230, height: 230}, heroFront: {position: 'absolute', width: 142, height: 210, left: 44, top: 9},
  heroShadow: {position: 'absolute', width: 172, height: 40, left: 29, top: 194},
  ledLeft: {position: 'absolute', width: 50, height: 9, left: 55, top: 26}, ledRight: {position: 'absolute', width: 50, height: 9, left: 126, top: 26},
  glowLeft: {position: 'absolute', width: 34, height: 48, left: 62, top: 36}, glowRight: {position: 'absolute', width: 34, height: 48, left: 133, top: 36},
  card: {backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 10, boxShadow: '0px 1px 10px rgba(0,0,0,0.04)'},
  lightCard: {paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24}, colorOptions: {marginTop: 28}, extraCard: {padding: 20},
  unitSwitch: {alignSelf: 'center', width: 136, minHeight: 44, flexDirection: 'row', borderRadius: 25, padding: 4, backgroundColor: '#E5E5E5', marginTop: 27},
  unitOption: {flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 22}, unitOptionSelected: {backgroundColor: '#FFFFFF'},
  unitText: {fontSize: 14, lineHeight: 20, color: '#666666'}, unitTextSelected: {fontWeight: '600', color: '#000000'},
  divider: {height: 1, backgroundColor: '#F2F2F2', marginHorizontal: 16},
  dock: {flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 32, paddingTop: 6, paddingBottom: 8},
  notice: {fontSize: 13, lineHeight: 20, color: '#8B4939', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, marginBottom: 10},
  alarm: {backgroundColor: '#FFF4EF', borderRadius: 12, padding: 16, marginBottom: 10}, alarmTitle: {fontSize: 14, lineHeight: 22, color: '#8B4939'},
  caption: {fontSize: 12, lineHeight: 20, color: '#666666'}, rowLabel: {fontSize: 16, lineHeight: 24, color: '#333333'},
  link: {fontSize: 14, color: '#186DAF', fontWeight: '600', lineHeight: 22}, reconnect: {alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginBottom: 12},
  resetButton: {minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', marginTop: 12},
  dim: {opacity: 0.3}, modalBackdrop: {flex: 1, justifyContent: 'center', padding: 32, backgroundColor: 'rgba(0,0,0,0.35)'},
  modalCard: {borderRadius: 12, padding: 24, backgroundColor: '#FFFFFF'}, modalTitle: {fontSize: 18, lineHeight: 26, fontWeight: '600', marginBottom: 16, color: '#232323'},
  modalActions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 20}, modalButton: {minWidth: 72, minHeight: 44, justifyContent: 'center', alignItems: 'center'},
});
