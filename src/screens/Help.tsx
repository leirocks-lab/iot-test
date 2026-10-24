import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { DeviceHelpFlow } from "../services/device-help";
import type { HelpArticle } from "../services/models";
import type { RowanService } from "../services/rowan";
import { useApp } from "../ui/context";
import { Busy, Button, Card, ErrorText, Label, Page, useAction } from "../ui/kit";

function DeviceHelp({ service, id }: { service: RowanService; id: string }) {
  const flow = useMemo(() => new DeviceHelpFlow(service, id), [service, id]);
  const state = useSyncExternalStore(flow.subscribe, flow.snapshot, flow.snapshot);

  useFocusEffect(
    useCallback(() => {
      if (AppState.currentState !== "background" && AppState.currentState !== "inactive") {
        void flow.start();
      }
      const subscription = AppState.addEventListener("change", (status) => {
        if (status === "active") void flow.start();
        else flow.stop();
      });
      return () => {
        subscription.remove();
        flow.stop();
      };
    }, [flow]),
  );

  return (
    <Page title="Device manual & FAQ">
      {state.loading && <Busy />}
      <ErrorText error={state.error} />
      {state.value?.map((article, index) => (
        <Card key={`${article.id ?? "help"}-${index}`}>
          <Label large>{article.title}</Label>
          <Label>{article.content}</Label>
        </Card>
      ))}
      {state.value?.length === 0 && <Label muted>暂无帮助内容</Label>}
      {(state.error || state.value !== null) && (
        <Button
          secondary
          title="Retry"
          disabled={!state.active || state.loading}
          onPress={() => void flow.load()}
        />
      )}
    </Page>
  );
}

/** The existing product pairing help route remains separate from RF-0044. */
function ProductHelp({ service, id }: { service: RowanService; id: string }) {
  const { run, busy, error } = useAction();
  const [content, setContent] = useState<HelpArticle[] | null>(null);
  const load = useCallback(
    () => run(async () => setContent(await service.help(id, true))),
    [run, service, id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Page title="Help">
      <ErrorText error={error} />
      {content?.map((article, index) => (
        <Card key={`${article.id ?? "help"}-${index}`}>
          <Label large>{article.title}</Label>
          <Label>{article.content}</Label>
        </Card>
      ))}
      {content?.length === 0 && <Label muted>暂无帮助内容</Label>}
      <Button secondary title="Retry" disabled={busy} onPress={() => void load()} />
    </Page>
  );
}

export default function Help() {
  const { id, product } = useLocalSearchParams<{
    id: string;
    product?: string;
  }>();
  const { runtime } = useApp();

  if (!runtime) {
    return (
      <Page title="Help">
        <Busy />
      </Page>
    );
  }
  const key = `${id}-${runtime.service.sessionRevision}`;
  if (product === "true") {
    return <ProductHelp key={key} service={runtime.service} id={id} />;
  }
  return <DeviceHelp key={key} service={runtime.service} id={id} />;
}
