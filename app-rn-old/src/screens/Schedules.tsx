import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Switch, View } from "react-native";
import type { Schedule, ScheduleInput, ThingModel } from "../services/models";
import { useApp } from "../ui/context";
import {
  Button,
  Card,
  Empty,
  ErrorText,
  Field,
  Label,
  Page,
  confirm,
  styles,
  useAction,
} from "../ui/kit";
const newSchedule = (): ScheduleInput => ({
  type: "once",
  name: "",
  enabled: true,
  startTime: "",
  repeatType: "once",
  weekdays: [],
  action: { Power: 1 },
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
});
export default function Schedules() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { runtime } = useApp(),
    action = useAction(),
    run = action.run,
    [list, setList] = useState<Schedule[] | null>(null),
    [draft, setDraft] = useState<ScheduleInput | null>(null),
    [model, setModel] = useState<ThingModel | null>(null);
  const load = useCallback(async () => {
    const [s, d] = await Promise.all([runtime!.service.schedules(id), runtime!.service.device(id)]);
    setList(s);
    if (!d.product) throw new Error("产品信息尚未确认");
    setModel(await runtime!.service.model(d.product.id));
  }, [runtime, id]);
  useFocusEffect(
    useCallback(() => {
      if (runtime) void run(load);
    }, [runtime, load, run]),
  );
  const edit = (patch: Partial<ScheduleInput>) => setDraft((d) => (d ? { ...d, ...patch } : null));
  const unknown =
    draft &&
    Object.keys(draft.action).some(
      (k) => !model?.attributes.some((a) => a.identifier === k && a.writable),
    );
  return (
    <Page title="Schedules">
      <ErrorText error={action.error} />
      {draft ? (
        <>
          <Field label="Schedule name" value={draft.name} onChangeText={(name) => edit({ name })} />
          <View style={styles.row}>
            {(["once", "periodic"] as const).map((type) => (
              <Button
                key={type}
                title={type}
                secondary={draft.type !== type}
                disabled={!!draft.id}
                onPress={() =>
                  edit({
                    type,
                    repeatType: type === "once" ? "once" : "daily",
                    endTime: type === "periodic" ? "07:00" : undefined,
                  })
                }
              />
            ))}
          </View>
          <Field
            label="Start time (HH:mm)"
            value={draft.startTime}
            onChangeText={(startTime) => edit({ startTime })}
          />
          {draft.type === "periodic" && (
            <Field
              label="End time (HH:mm)"
              value={draft.endTime ?? ""}
              onChangeText={(endTime) => edit({ endTime })}
            />
          )}
          {draft.type === "periodic" && (
            <>
              <View style={styles.row}>
                {(["daily", "weekdays", "custom"] as const).map((repeatType) => (
                  <Button
                    key={repeatType}
                    title={repeatType}
                    secondary={draft.repeatType !== repeatType}
                    onPress={() =>
                      edit({
                        repeatType,
                        weekdays:
                          repeatType === "weekdays"
                            ? [1, 2, 3, 4, 5]
                            : repeatType === "daily"
                              ? [1, 2, 3, 4, 5, 6, 7]
                              : draft.weekdays,
                      })
                    }
                  />
                ))}
              </View>
              {draft.repeatType === "custom" && (
                <View style={styles.row}>
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <Button
                      key={day}
                      title={String(day)}
                      secondary={!draft.weekdays.includes(day)}
                      onPress={() =>
                        edit({
                          weekdays: draft.weekdays.includes(day)
                            ? draft.weekdays.filter((x) => x !== day)
                            : [...draft.weekdays, day].sort(),
                        })
                      }
                    />
                  ))}
                </View>
              )}
            </>
          )}
          <Field
            label="Time zone (IANA)"
            editable={!draft.id}
            value={draft.timeZone}
            onChangeText={(timeZone) => edit({ timeZone })}
          />
          <Card>
            <Label>Action</Label>
            <View style={styles.row}>
              <Button
                title="Power on"
                secondary={draft.action.Power !== 1}
                onPress={() => edit({ action: { ...draft.action, Power: 1 } })}
              />
              <Button
                title="Power off"
                secondary={draft.action.Power !== 0}
                onPress={() => edit({ action: { ...draft.action, Power: 0 } })}
              />
            </View>
            <View style={styles.row}>
              {model?.attributes
                .find((a) => a.identifier === "Mode")
                ?.values?.map((mode) => (
                  <Button
                    key={mode}
                    title={mode}
                    secondary={draft.mode !== mode}
                    onPress={() => edit({ mode, action: { ...draft.action, Mode: mode } })}
                  />
                ))}
            </View>
            {unknown && (
              <ErrorText error="Unknown action. Refresh the product capability before saving." />
            )}
          </Card>
          <Button
            title="Save schedule"
            disabled={action.busy || !!unknown}
            onPress={() =>
              void run(async () => {
                await runtime!.service.saveSchedule(id, draft);
                setDraft(null);
                await load();
              })
            }
          />
          <Button secondary title="Cancel" disabled={action.busy} onPress={() => setDraft(null)} />
        </>
      ) : (
        <>
          {list?.length === 0 && <Empty text="No schedules yet" />}
          {list?.map((schedule) => (
            <Card key={schedule.id}>
              <Label large>{schedule.name || schedule.startTime}</Label>
              <Label>
                {schedule.startTime}
                {schedule.endTime
                  ? " → " +
                    schedule.endTime +
                    (schedule.endTime < schedule.startTime ? " (next day)" : "")
                  : ""}{" "}
                · {schedule.repeatType}
              </Label>
              <Label muted>{schedule.timeZone}</Label>
              <Label muted>{schedule.nextExecutionAt ?? "Next execution unavailable"}</Label>
              <View style={styles.row}>
                <Switch
                  accessibilityLabel={"Enable " + schedule.name}
                  value={schedule.enabled}
                  disabled={action.busy}
                  onValueChange={(enabled) =>
                    void run(async () => {
                      await runtime!.service.enableSchedule(id, schedule.id, enabled);
                      await load();
                    })
                  }
                />
                <Button secondary title="Edit" onPress={() => setDraft({ ...schedule })} />
                <Button
                  secondary
                  danger
                  title="Delete"
                  disabled={action.busy}
                  onPress={() =>
                    confirm(
                      "Delete schedule",
                      `${schedule.name} · ${schedule.startTime}`,
                      () =>
                        void run(async () => {
                          await runtime!.service.deleteSchedule(id, schedule.id);
                          await load();
                        }),
                    )
                  }
                />
              </View>
            </Card>
          ))}
          <Button title="Add schedule" onPress={() => setDraft(newSchedule())} />
          <Button secondary title="Refresh" disabled={action.busy} onPress={() => void run(load)} />
        </>
      )}
    </Page>
  );
}
