import type { MaintenanceControls, ResetConfirmation } from "../../services/device-maintenance";
import { Button, Card, Label, confirm } from "../../ui/kit";

/** Business wiring only; visual restoration can reuse the same controller and confirmation ticket. */
export function DeviceMaintenance({
  maintenance,
  busy,
  run,
  synchronize,
}: {
  maintenance: MaintenanceControls;
  busy: boolean;
  run: (work: () => Promise<unknown>) => Promise<void>;
  synchronize: () => Promise<void>;
}) {
  return (
    <Card>
      <Label>维护计时</Label>
      <Label large>{maintenance.text}</Label>
      {!!maintenance.ledger.message && <Label muted>{maintenance.ledger.message}</Label>}
      {!!maintenance.reason && <Label muted>{maintenance.reason}</Label>}
      {maintenance.ledger.phase === "unknown" ? (
        <Button
          secondary
          title="同步维护状态"
          disabled={busy}
          onPress={() => void run(synchronize)}
        />
      ) : (
        <Button
          secondary
          title="重置维护计时"
          disabled={busy || !!maintenance.reason}
          onPress={() => {
            let ticket: ResetConfirmation;
            try {
              ticket = maintenance.requestReset();
            } catch (error) {
              void run(async () => {
                throw error;
              });
              return;
            }
            // UI confirmation does not send anything until the explicit confirm callback.
            confirm(ticket.title, ticket.body, () => void run(ticket.confirm), ticket.cancel);
          }}
        />
      )}
    </Card>
  );
}
