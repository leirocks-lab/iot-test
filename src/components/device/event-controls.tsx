import type { EventControls } from "../../services/device-events";
import { Button, Card, Label } from "../../ui/kit";

/** Business state only; no clear-fault action or visual restoration. */
export function DeviceEvents({ events }: { events: EventControls }) {
  return (
    <>
      {events.records.map((record) => (
        <Card key={record.key}>
          <Label>
            {record.title} ·{" "}
            {record.state === "recovered"
              ? "已恢复"
              : record.needsCheck
                ? "状态待核对"
                : "未收到恢复证据"}
          </Label>
          {record.dismissed ? (
            <Button
              secondary
              title="查看告警上下文"
              onPress={() => events.dismiss(record.key, false)}
            />
          ) : (
            <>
              <Label muted>
                {record.event.identifier}
                {record.event.occurrenceID ? ` · ${record.event.occurrenceID}` : ""}
              </Label>
              <Label muted>{record.level ? `等级：${record.level}` : "等级待确认"}</Label>
              <Label muted>
                {record.event.occurredAt
                  ? `发生时间：${record.event.occurredAt}`
                  : "发生时间待确认"}
              </Label>
              <Label>{JSON.stringify(record.event.data)}</Label>
              {!!record.guidance && <Label>{record.guidance}</Label>}
              {!!record.recovery && (
                <Label muted>恢复依据：{JSON.stringify(record.recovery)}</Label>
              )}
              <Button secondary title="关闭提示" onPress={() => events.dismiss(record.key)} />
            </>
          )}
        </Card>
      ))}
    </>
  );
}
