import React from 'react';
import {ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import type {ImageSourcePropType} from 'react-native';
import type {ControlViewModel} from './view-model';
import {wineAssets} from './assets';

export function ControlFeedback({model}: {model: ControlViewModel}) {
  if (!model.commandLabel) {return null;}
  return <View style={styles.feedback} accessibilityLiveRegion="polite">
    {model.busy && <ActivityIndicator size="small" color="#186DAF" />}
    <Text style={[styles.feedbackText, model.failed && styles.failed]}>
      {model.pendingTargetText === null ? '' : `目标 ${model.pendingTargetText}${model.unit} · `}{model.commandLabel}
    </Text>
  </View>;
}

export function NumericControl({label, currentText, model, lowerTarget, upperTarget, onChange}: {
  label: string; currentText?: string; model: ControlViewModel;
  lowerTarget: number | null; upperTarget: number | null; onChange(value: number): void;
}) {
  return <View style={styles.numeric}>
    <Text style={[styles.caption, model.disabled && styles.dimText]}>
      {label}{currentText === undefined ? '' : `（当前 ${currentText}${model.unit}）`}
    </Text>
    <View style={styles.numericRow}>
      <StepButton label={`${label}减小`} glyph="−" disabled={model.disabled || lowerTarget === null}
        hint={model.disabledReason} onPress={() => {if (lowerTarget !== null) {onChange(lowerTarget);}}} />
      <View style={styles.valueRow} accessible accessibilityLabel={`${label}，${model.valueText}${model.unit}，设备确认值`}>
        <Text style={[styles.number, model.disabled && styles.dimText]}>{model.valueText}</Text>
        <Text style={[styles.unit, model.disabled && styles.dimText]}>{model.unit}</Text>
      </View>
      <StepButton label={`${label}增大`} glyph="+" disabled={model.disabled || upperTarget === null}
        hint={model.disabledReason} onPress={() => {if (upperTarget !== null) {onChange(upperTarget);}}} />
    </View>
    <ControlFeedback model={model} />
  </View>;
}

function StepButton({label, glyph, disabled, hint, onPress}: {
  label: string; glyph: string; disabled: boolean; hint: string | null; onPress(): void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint ?? undefined}
    accessibilityState={{disabled}} disabled={disabled} onPress={onPress} hitSlop={4}
    style={[styles.stepTouch, disabled && styles.dim]}>
    <View style={styles.stepCircle}><Text style={styles.stepGlyph}>{glyph}</Text></View>
  </Pressable>;
}

/** Exact 48 × 24 exported track geometry with native accessibility switch semantics. */
export function ToggleControl({label, model, icon, onChange}: {
  label: string; model: ControlViewModel; icon?: ImageSourcePropType; onChange(value: boolean): void;
}) {
  const disabled = model.disabled || model.busy || typeof model.value !== 'boolean';
  return <View>
    <View style={styles.toggleRow}>
      <View style={styles.toggleLabel}>
        {icon && <Image source={icon} style={[styles.rowIcon, model.disabled && styles.dim]} />}
        <Text style={[styles.rowLabel, model.disabled && styles.dimText]}>{label}</Text>
      </View>
      <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityHint={model.disabledReason ?? undefined}
        accessibilityState={{disabled, checked: model.value === null ? 'mixed' : model.value === true, busy: model.busy}}
        accessibilityValue={{text: model.valueText}} disabled={disabled}
        onPress={() => {if (typeof model.value === 'boolean') {onChange(!model.value);}}}
        style={[styles.toggleTouch, disabled && styles.dim]}>
        <View style={[styles.track, model.value === true && styles.trackOn]}><View style={styles.thumb} /></View>
      </Pressable>
    </View>
    {model.value === null && <Text style={styles.empty}>状态未知</Text>}
    <ControlFeedback model={model} />
  </View>;
}

export function ChoiceControl({label, model, colored = false, onChange}: {
  label: string; model: ControlViewModel; colored?: boolean; onChange(value: string | number): void;
}) {
  const choices = model.capability?.kind === 'enum' ? model.capability.choices : [];
  return <View style={styles.choicesBlock}>
    {!colored && <Text style={styles.caption}>{label} <Text style={styles.separator}>｜</Text> {model.valueText}</Text>}
    {!choices.length && <Text style={styles.empty}>{label}能力尚未配置</Text>}
    <View style={[styles.choices, colored && styles.coloredChoices]}>
      {choices.map(choice => {
        const selected = model.value === choice.value;
        const color = /^#[0-9a-f]{6}$/i.test(choice.color ?? '') ? choice.color : '#F2F2F2';
        return <Pressable key={`${typeof choice.value}:${choice.value}`} accessibilityRole="radio" accessibilityLabel={`${label}，${choice.label}`}
          accessibilityState={{checked: selected, disabled: model.disabled}} accessibilityHint={model.disabledReason ?? undefined}
          disabled={model.disabled} onPress={() => onChange(choice.value)}
          style={[colored ? styles.colorChoice : styles.pill, selected && !colored && styles.pillSelected, model.disabled && styles.dim]}>
          {colored && <View style={[styles.colorRing, selected && styles.colorRingSelected]}>
            <View style={[styles.colorCircle, {backgroundColor: color}]}>
              {selected && <Image source={wineAssets.selection} style={styles.sun} />}
            </View>
          </View>}
          <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected, colored && styles.colorLabel]}>{choice.label}</Text>
        </Pressable>;
      })}
    </View>
    <ControlFeedback model={model} />
  </View>;
}

export function DockControl({label, model, onIcon, offIcon, onChange}: {
  label: string; model: ControlViewModel; onIcon: ImageSourcePropType; offIcon: ImageSourcePropType; onChange(value: boolean): void;
}) {
  const disabled = model.disabled || model.busy || typeof model.value !== 'boolean';
  return <View style={styles.dockControl}>
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityHint={model.disabledReason ?? undefined}
      accessibilityState={{disabled, checked: model.value === null ? 'mixed' : model.value === true, busy: model.busy}}
      accessibilityValue={{text: model.valueText}} disabled={disabled}
      onPress={() => {if (typeof model.value === 'boolean') {onChange(!model.value);}}}
      style={[styles.dockTouch, disabled && styles.dim]}>
      <Image source={model.value === true ? onIcon : offIcon} style={styles.dockIcon} />
      <Text style={styles.dockLabel}>{label}{model.value === null ? '｜未知' : model.value === true && label === '童锁' ? '｜开' : ''}</Text>
    </Pressable>
    <ControlFeedback model={model} />
  </View>;
}

const styles = StyleSheet.create({
  numeric: {paddingHorizontal: 20, paddingTop: 30, paddingBottom: 24},
  caption: {fontSize: 12, lineHeight: 18, color: '#666666'},
  numericRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14},
  valueRow: {flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', flexShrink: 1},
  number: {fontFamily: Platform.OS === 'ios' ? 'DINAlternate-Bold' : 'sans-serif-condensed', fontWeight: '700', fontSize: 36, lineHeight: 44, color: '#000000'},
  unit: {fontSize: 16, color: '#333333', marginLeft: 4},
  stepTouch: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  stepCircle: {width: 37, height: 37, borderRadius: 19, backgroundColor: '#F2F2F2', alignItems: 'center', justifyContent: 'center'},
  stepGlyph: {fontSize: 28, color: '#999999', lineHeight: 34, fontWeight: '300'},
  toggleRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44},
  toggleLabel: {flexDirection: 'row', alignItems: 'center', flexShrink: 1},
  rowIcon: {width: 32, height: 32, marginRight: 8}, rowLabel: {fontSize: 16, lineHeight: 24, color: '#000000'},
  toggleTouch: {minWidth: 48, minHeight: 44, alignItems: 'center', justifyContent: 'center'},
  track: {width: 48, height: 24, borderRadius: 12, backgroundColor: '#E0E0E0', padding: 6, alignItems: 'flex-start', justifyContent: 'center'},
  trackOn: {backgroundColor: '#186DAF', alignItems: 'flex-end'}, thumb: {width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF'},
  choicesBlock: {marginTop: 24}, choices: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16},
  coloredChoices: {justifyContent: 'space-evenly', marginTop: 0, gap: 12},
  colorChoice: {alignItems: 'center', minWidth: 56, minHeight: 72},
  colorRing: {width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center'},
  colorRingSelected: {borderColor: '#E7F0F7'},
  colorCircle: {width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#E5E5E5', alignItems: 'center', justifyContent: 'center'},
  sun: {width: 20, height: 20}, colorLabel: {fontSize: 12, lineHeight: 18, marginTop: 4},
  pill: {flexGrow: 1, minWidth: 70, minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#F2F2F2', alignItems: 'center', justifyContent: 'center'},
  pillSelected: {backgroundColor: '#E7F0F7'}, choiceLabel: {color: '#666666', fontSize: 14, lineHeight: 20},
  choiceLabelSelected: {color: '#186DAF', fontWeight: '600'}, separator: {color: '#DADADA'},
  feedback: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8},
  feedbackText: {fontSize: 12, lineHeight: 18, color: '#186DAF', flexShrink: 1}, failed: {color: '#A13F32'},
  empty: {fontSize: 12, lineHeight: 18, color: '#999999', marginTop: 8},
  dim: {opacity: 0.3}, dimText: {color: '#B3B3B3'},
  dockControl: {flex: 1, alignItems: 'center'}, dockTouch: {minWidth: 84, minHeight: 76, alignItems: 'center', paddingTop: 4},
  dockIcon: {width: 48, height: 48}, dockLabel: {fontSize: 12, lineHeight: 18, marginTop: 6, color: '#232323'},
});
