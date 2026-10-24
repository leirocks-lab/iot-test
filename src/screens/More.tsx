import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { DeviceSettingsFlow } from "../services/device-settings";
import { translate } from "../ui/i18n";
import { useApp } from "../ui/context";
import { Busy, Button, Card, ErrorText, Field, Label, Page, confirm } from "../ui/kit";

export default function More() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { runtime } = useApp();
  const [, redraw] = useState(0);
  const service = runtime?.service,
    revision = service?.sessionRevision;
  const flow = useMemo(
    () => (service && revision !== undefined ? new DeviceSettingsFlow(service, id) : null),
    [service, id, revision],
  );
  const unbindFlow = useMemo(
    () => (runtime && id && revision !== undefined ? runtime.unbindFlow(id) : null),
    [runtime, id, revision],
  );
  useFocusEffect(
    useCallback(() => {
      if (!flow || !unbindFlow) return;
      const notify = () => redraw((value) => value + 1);
      const unsubscribeSettings = flow.onChange(notify);
      const unsubscribeUnbind = unbindFlow.onChange(notify);
      void flow.start();
      unbindFlow.start();
      return () => {
        unsubscribeSettings();
        unsubscribeUnbind();
        flow.stop();
        unbindFlow.stop();
      };
    }, [flow, unbindFlow]),
  );
  if (!flow)
    return (
      <Page title="Device settings">
        <Busy />
      </Page>
    );
  const state = flow.state,
    device = state.device.value;
  const language = service?.language ?? "zh-CN",
    unassigned = translate("Unassigned", language);
  const pendingName = state.name.phase === "unknown" || state.name.phase === "checking";
  const pendingRoom = state.room.phase === "unknown" || state.room.phase === "checking";
  const roomEditable =
    flow.writable &&
    !flow.busy &&
    !pendingRoom &&
    !state.rooms.loading &&
    !state.location.loading &&
    !!state.rooms.value &&
    !state.rooms.error &&
    !!state.location.value &&
    !state.location.error;

  return (
    <Page title="Device settings">
      <Card>
        {state.device.loading && <Busy />}
        <ErrorText error={state.device.error} />
        {state.device.error && (
          <Button
            secondary
            title="Retry device details"
            disabled={flow.busy}
            onPress={() => void flow.loadDevice()}
          />
        )}
        {device && (
          <>
            <Label
              muted
            >{`${translate("Current name", language)}: ${device.deviceNickname}`}</Label>
            <Field
              label="Device nickname"
              value={state.name.draft}
              editable={flow.writable && !flow.busy && !pendingName}
              onChangeText={(value) => flow.editName(value)}
            />
            <ErrorText error={state.name.error} />
            {state.name.phase === "saved" && <Label>Name save verified</Label>}
            {pendingName ? (
              <Button
                title="Check saved name"
                disabled={flow.busy}
                onPress={() => void flow.reconcileName()}
              />
            ) : (
              <>
                <Button
                  title="Save name"
                  disabled={!flow.writable || flow.busy}
                  onPress={() => void flow.saveName()}
                />
                <Button
                  secondary
                  title="Cancel name edit"
                  disabled={flow.busy}
                  onPress={() => flow.cancelName()}
                />
              </>
            )}
            <Label muted>{device.device.mac}</Label>
          </>
        )}
      </Card>

      <Card>
        <Label large>Room</Label>
        {state.location.loading && <Busy />}
        <Label muted>
          {state.location.value
            ? `${translate("Current room", language)}: ${state.location.value.id === null ? unassigned : state.location.value.name || state.location.value.id}`
            : "Current room has not been loaded"}
        </Label>
        <ErrorText error={state.location.error} />
        {state.location.error && (
          <Button
            secondary
            title="Retry current room"
            disabled={flow.busy}
            onPress={() => void flow.loadLocation()}
          />
        )}
        {state.rooms.loading && <Busy />}
        <ErrorText error={state.rooms.error} />
        {state.rooms.error && (
          <Button
            secondary
            title="Retry room choices"
            disabled={flow.busy}
            onPress={() => void flow.loadRooms()}
          />
        )}
        {state.rooms.value && (
          <>
            <Button
              secondary={state.room.draft !== null}
              title="Unassigned"
              disabled={!roomEditable}
              onPress={() => flow.selectRoom(null)}
            />
            {state.rooms.value.map((room) => (
              <Button
                key={room.id}
                secondary={state.room.draft !== room.id}
                title={room.name}
                disabled={!roomEditable}
                onPress={() => flow.selectRoom(room.id)}
              />
            ))}
            {state.rooms.value.length === 0 && (
              <Label muted>No room choices. You can leave the device unassigned.</Label>
            )}
          </>
        )}
        {state.room.draft !== undefined && (
          <Label
            muted
          >{`${translate("Pending room choice", language)}: ${state.room.draft === null ? unassigned : state.rooms.value?.find((room) => room.id === state.room.draft)?.name || state.room.draft}`}</Label>
        )}
        <ErrorText error={state.room.error} />
        {state.roomNeedsSelection && <Label>Room unavailable. Choose again.</Label>}
        {state.room.phase === "saved" && <Label>Room save verified</Label>}
        {pendingRoom ? (
          <Button
            title="Check saved room"
            disabled={flow.busy}
            onPress={() => void flow.reconcileRoom()}
          />
        ) : (
          <>
            <Button
              title="Save room"
              disabled={
                !roomEditable ||
                state.roomNeedsSelection ||
                state.room.draft === state.location.value?.id
              }
              onPress={() => void flow.saveRoom()}
            />
            <Button
              secondary
              title="Cancel room edit"
              disabled={flow.busy}
              onPress={() => flow.cancelRoom()}
            />
          </>
        )}
      </Card>

      {(state.home.loading || state.home.error || state.home.value) && (
        <Card>
          {state.home.loading && <Busy />}
          <ErrorText error={state.home.error} />
          {state.home.error ? (
            <Button
              secondary
              title="Retry home refresh"
              disabled={state.home.loading}
              onPress={() => void flow.refreshHome()}
            />
          ) : (
            state.home.value && <Label>Home result synchronized</Label>
          )}
        </Card>
      )}

      <Card>
        <Label large>Members</Label>
        {state.members.loading && <Busy />}
        <ErrorText error={state.members.error} />
        <ErrorText error={state.memberRemoval.error} />
        {state.memberRemoval.phase === "removed" && <Label>成员已不在当前绑定列表</Label>}
        {state.memberRemoval.phase === "unknown" && (
          <Button
            secondary
            title="Check removal result"
            disabled={state.members.loading}
            onPress={() => void flow.reconcileMember()}
          />
        )}
        {/* Existing member actions stay separate from nickname and room loading. */}
        {state.members.error && (
          <Button
            secondary
            title="Retry members"
            disabled={state.members.loading}
            onPress={() => void flow.loadMembers()}
          />
        )}
        {state.members.value && (
          <>
            <Label muted>
              {state.members.value.filter((member) => member.bindingRole === "mbr").length} members
            </Label>
            {state.members.value.map((member) => {
              const nickname = member.nickname?.trim();
              const removalPending = ["removing", "checking", "unknown"].includes(
                state.memberRemoval.phase,
              );
              return (
                <Card key={member.userID}>
                  {nickname && <Label>{nickname}</Label>}
                  <Label muted>{member.userID}</Label>
                  <Label muted>
                    {member.bindingRole === "sa"
                      ? "管理员"
                      : member.bindingRole === "mbr"
                        ? "普通成员"
                        : "观察员"}
                  </Label>
                  {device?.bindingRole === "sa" && member.bindingRole === "mbr" && (
                    <Button
                      secondary
                      danger
                      title="Remove member"
                      disabled={
                        removalPending ||
                        state.members.loading ||
                        !!state.members.error ||
                        !!state.device.error
                      }
                      onPress={() =>
                        confirm(
                          "Remove member",
                          `设备：${device.deviceNickname} (${device.device.id})\n成员：${nickname ? `${nickname} ` : ""}(${member.userID})`,
                          () => void flow.removeMember(member.userID),
                        )
                      }
                    />
                  )}
                </Card>
              );
            })}
            {state.members.value.length === 0 && <Label muted>暂无成员</Label>}
          </>
        )}
        {device?.bindingRole === "sa" && (
          <Button
            title="Share device"
            disabled={!!state.device.error}
            onPress={() => router.push({ pathname: "/device/[id]/share", params: { id } })}
          />
        )}
      </Card>
      {device && (
        <>
          <Button
            secondary
            title="Device manual & FAQ"
            onPress={() => router.push({ pathname: "/help", params: { id } })}
          />
          <Button
            secondary
            title="Firmware updates"
            onPress={() => router.push({ pathname: "/device/[id]/ota", params: { id } })}
          />
          <Button
            danger
            title="Remove my binding"
            disabled={
              !unbindFlow ||
              unbindFlow.busy ||
              unbindFlow.pending ||
              unbindFlow.state.phase === "complete" ||
              flow.busy ||
              device.device.id !== id
            }
            onPress={() =>
              confirm(
                "Remove my binding",
                `设备：${device.deviceNickname} (${device.device.id})\n当前账号：${service!.userID}\n仅解除本人绑定，不清除设备或其他用户。`,
                () => {
                  void unbindFlow?.submit().then((complete) => {
                    if (complete) router.replace("/home");
                  });
                },
              )
            }
          />
          {unbindFlow?.busy && <Busy />}
          <ErrorText error={unbindFlow?.state.error ?? ""} />
          {unbindFlow?.pending && (
            <Button
              secondary
              title="Check unbind result"
              disabled={unbindFlow.busy}
              onPress={() => {
                void unbindFlow.reconcile().then((complete) => {
                  if (complete) router.replace("/home");
                });
              }}
            />
          )}
        </>
      )}
    </Page>
  );
}
