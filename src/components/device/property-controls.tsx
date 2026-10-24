import { useState } from "react";
import { View } from "react-native";
import {
  displayNumber,
  type ControlKind,
  type ControlView,
  type PropertyControls,
} from "../../services/device-controls";
import { Button, Card, Field, Label, styles } from "../../ui/kit";

const labels: Record<ControlKind, string> = {
  power: "Power",
  temperature: "TargetTemperature",
  humidity: "TargetHumidity",
  mode: "Mode",
  light: "Light",
  brightness: "Brightness",
  childLock: "ChildLock",
  mute: "Device mute",
};
export function DevicePropertyControls({
  controls,
  temperatureUnit,
  busy,
  run,
}: {
  controls: PropertyControls;
  temperatureUnit: "C" | "F";
  busy: boolean;
  run: (work: () => Promise<unknown>) => Promise<void>;
}) {
  const views = controls.list();
  return (
    <>
      {!views.length && <Label muted>当前产品没有可用的属性控制能力</Label>}
      {views.map((view) => (
        <PropertyControl
          key={`${view.kind}-${temperatureUnit}`}
          view={view}
          controls={controls}
          temperatureUnit={temperatureUnit}
          busy={busy}
          run={run}
        />
      ))}
    </>
  );
}
function PropertyControl({
  view,
  controls,
  temperatureUnit,
  busy,
  run,
}: {
  view: ControlView;
  controls: PropertyControls;
  temperatureUnit: "C" | "F";
  busy: boolean;
  run: (work: () => Promise<unknown>) => Promise<void>;
}) {
  const [draft, setDraft] = useState(""),
    { kind, attribute, value, reason } = view,
    disabled = !!reason || busy;
  const unit =
    kind === "temperature" && (attribute.unit === "C" || attribute.unit === "F")
      ? temperatureUnit
      : attribute.unit;
  const on = controls.isOn(kind);
  const switchTitle =
    on === undefined
      ? "State unknown"
      : kind === "power"
        ? on
          ? "Turn off"
          : "Turn on"
        : kind === "childLock"
          ? on
            ? "Unlock"
            : "Lock"
          : kind === "mute"
            ? on
              ? "Unmute device"
              : "Mute device"
            : on
              ? "Disable"
              : "Enable";
  const enumKnown = attribute.values?.includes(value as string);
  const step =
    attribute.step === undefined
      ? "—"
      : kind === "temperature" &&
          (attribute.unit === "C" || attribute.unit === "F") &&
          attribute.unit !== temperatureUnit
        ? Number((attribute.step * (attribute.unit === "C" ? 9 / 5 : 5 / 9)).toPrecision(12))
        : attribute.step;
  return (
    <Card>
      <Label>{labels[kind]}</Label>
      <Label large>
        {view.variant === "switch"
          ? on === undefined
            ? `未知 (${String(value ?? "—")})`
            : on
              ? "Enabled"
              : "Disabled"
          : view.variant === "enum"
            ? !enumKnown
              ? `未知 (${String(value ?? "—")})`
              : String(value)
            : displayNumber(value, attribute.unit, temperatureUnit)}
      </Label>
      {!!reason && <Label muted>{reason}</Label>}
      {view.variant === "switch" ? (
        <Button
          secondary
          title={switchTitle}
          disabled={disabled}
          onPress={() => void run(() => controls.toggle(kind))}
        />
      ) : view.variant === "enum" ? (
        <View style={styles.row}>
          {attribute.values?.map((option) => (
            <Button
              key={option}
              title={option}
              secondary={value !== option}
              disabled={disabled || value === option}
              onPress={() => void run(() => controls.choose(kind, option))}
            />
          ))}
        </View>
      ) : (
        <>
          <Label
            muted
          >{`范围 ${displayNumber(attribute.min, attribute.unit, temperatureUnit)}～${displayNumber(attribute.max, attribute.unit, temperatureUnit)}；步长 ${step}${unit ? ` ${unit}` : ""}`}</Label>
          <Field
            label={`${labels[kind]}${unit ? ` (${unit})` : ""}`}
            keyboardType="decimal-pad"
            value={draft}
            editable={!disabled}
            onChangeText={setDraft}
          />
          <Button
            secondary
            title="Apply"
            disabled={disabled || !draft.trim()}
            onPress={() =>
              void run(async () => {
                await controls.submit(kind, draft, temperatureUnit);
                setDraft("");
              })
            }
          />
        </>
      )}
    </Card>
  );
}
