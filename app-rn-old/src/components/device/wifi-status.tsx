import { useNetworkState } from "expo-network";
import { Linking } from "react-native";
import { observeNetwork, wifiGuidance } from "../../services/network-policy";
import { Button, Card, Label, useAction } from "../../ui/kit";

export function WifiStatus() {
  const network = observeNetwork(useNetworkState()),
    action = useAction();
  return (
    <Card>
      <Label muted>{wifiGuidance(network)}</Label>
      <Button
        secondary
        title="打开系统设置"
        disabled={action.busy}
        onPress={() => void action.run(() => Linking.openSettings())}
      />
      {!!action.error && <Label>{action.error}</Label>}
    </Card>
  );
}
