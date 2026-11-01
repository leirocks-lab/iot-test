import { Card } from "./Card";
import { Label } from "./Label";

export function Empty({ text }: { text: string }) {
  return (
    <Card>
      <Label muted>{text}</Label>
    </Card>
  );
}
