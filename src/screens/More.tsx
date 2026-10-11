import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { DeviceSettingsFlow } from '../services/device-settings';
import { translate } from '../ui/i18n';
import { useApp } from '../ui/context';
import { Busy, Button, Card, ErrorText, Field, Label, Page, confirm, useAction } from '../ui/kit';

export default function More() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { runtime } = useApp();
  const action = useAction();
  const [, redraw] = useState(0);
  const service = runtime?.service, revision = service?.sessionRevision;
  const flow = useMemo(() => service && revision !== undefined ? new DeviceSettingsFlow(service, id) : null, [service, id, revision]);
  useFocusEffect(useCallback(() => {
    if (!flow) return;
    const unsubscribe = flow.onChange(() => redraw(value => value + 1));
    void flow.start();
    return () => { unsubscribe(); flow.stop(); };
  }, [flow]));
  if (!flow) return <Page title="Device settings"><Busy /></Page>;
  const state = flow.state, device = state.device.value;
  const language = service?.language ?? 'zh-CN', unassigned = translate('Unassigned', language);
  const pendingName = state.name.phase === 'unknown' || state.name.phase === 'checking';
  const pendingRoom = state.room.phase === 'unknown' || state.room.phase === 'checking';
  const roomEditable = flow.writable && !flow.busy && !pendingRoom && !state.rooms.loading && !state.location.loading && !!state.rooms.value && !state.rooms.error && !!state.location.value && !state.location.error;

  return <Page title="Device settings">
    <Card>
      {state.device.loading && <Busy />}
      <ErrorText error={state.device.error} />
      {state.device.error && <Button secondary title="Retry device details" disabled={flow.busy} onPress={() => void flow.loadDevice()} />}
      {device && <>
        <Label muted>{`${translate('Current name', language)}: ${device.deviceNickname}`}</Label>
        <Field label="Device nickname" value={state.name.draft} editable={flow.writable && !flow.busy && !pendingName} onChangeText={value => flow.editName(value)} />
        <ErrorText error={state.name.error} />
        {state.name.phase === 'saved' && <Label>Name save verified</Label>}
        {pendingName ? <Button title="Check saved name" disabled={flow.busy} onPress={() => void flow.reconcileName()} /> : <>
          <Button title="Save name" disabled={!flow.writable || flow.busy} onPress={() => void flow.saveName()} />
          <Button secondary title="Cancel name edit" disabled={flow.busy} onPress={() => flow.cancelName()} />
        </>}
        <Label muted>{device.device.mac}</Label>
      </>}
    </Card>

    <Card>
      <Label large>Room</Label>
      {state.location.loading && <Busy />}
      <Label muted>{state.location.value ? `${translate('Current room', language)}: ${state.location.value.id === null ? unassigned : state.location.value.name || state.location.value.id}` : 'Current room has not been loaded'}</Label>
      <ErrorText error={state.location.error} />
      {state.location.error && <Button secondary title="Retry current room" disabled={flow.busy} onPress={() => void flow.loadLocation()} />}
      {state.rooms.loading && <Busy />}
      <ErrorText error={state.rooms.error} />
      {state.rooms.error && <Button secondary title="Retry room choices" disabled={flow.busy} onPress={() => void flow.loadRooms()} />}
      {state.rooms.value && <>
        <Button secondary={state.room.draft !== null} title="Unassigned" disabled={!roomEditable} onPress={() => flow.selectRoom(null)} />
        {state.rooms.value.map(room => <Button key={room.id} secondary={state.room.draft !== room.id} title={room.name} disabled={!roomEditable} onPress={() => flow.selectRoom(room.id)} />)}
        {state.rooms.value.length === 0 && <Label muted>No room choices. You can leave the device unassigned.</Label>}
      </>}
      {state.room.draft !== undefined && <Label muted>{`${translate('Pending room choice', language)}: ${state.room.draft === null ? unassigned : state.rooms.value?.find(room => room.id === state.room.draft)?.name || state.room.draft}`}</Label>}
      <ErrorText error={state.room.error} />
      {state.roomNeedsSelection && <Label>Room unavailable. Choose again.</Label>}
      {state.room.phase === 'saved' && <Label>Room save verified</Label>}
      {pendingRoom ? <Button title="Check saved room" disabled={flow.busy} onPress={() => void flow.reconcileRoom()} /> : <>
        <Button title="Save room" disabled={!roomEditable || state.roomNeedsSelection || state.room.draft === state.location.value?.id} onPress={() => void flow.saveRoom()} />
        <Button secondary title="Cancel room edit" disabled={flow.busy} onPress={() => flow.cancelRoom()} />
      </>}
    </Card>

    {(state.home.loading || state.home.error || state.home.value) && <Card>
      {state.home.loading && <Busy />}
      <ErrorText error={state.home.error} />
      {state.home.error ? <Button secondary title="Retry home refresh" disabled={state.home.loading} onPress={() => void flow.refreshHome()} /> : state.home.value && <Label>Home result synchronized</Label>}
    </Card>}

    <Card>
      <Label large>Members</Label>
      {state.members.loading && <Busy />}
      <ErrorText error={state.members.error} />
      {/* Existing member actions stay separate from nickname and room loading. */}
      <ErrorText error={action.error} />
      {state.members.error && <Button secondary title="Retry members" disabled={state.members.loading} onPress={() => void flow.loadMembers()} />}
      {state.members.value && <>
        <Label muted>{state.members.value.filter(member => member.bindingRole === 'mbr').length} members</Label>
        {state.members.value.map(member => <Card key={member.userID}>
          <Label>{member.email || member.nickname}</Label><Label muted>{member.bindingRole}</Label>
          {device?.bindingRole === 'sa' && member.bindingRole === 'mbr' && <Button secondary danger title="Remove member" disabled={action.busy || !!state.device.error} onPress={() => confirm('Remove member', member.email || member.nickname, () => void action.run(async () => {
            await service!.removeMember(id, member.userID); await flow.loadMembers();
          }))} />}
        </Card>)}
      </>}
      {device?.bindingRole === 'sa' && <Button title="Share device" disabled={!!state.device.error} onPress={() => router.push({ pathname: '/device/[id]/share', params: { id } })} />}
    </Card>
    {device && <>
      <Button secondary title="Device manual & FAQ" onPress={() => router.push({ pathname: '/help', params: { id } })} />
      <Button secondary title="Firmware updates" onPress={() => router.push({ pathname: '/device/[id]/ota', params: { id } })} />
      <Button danger title="Remove my binding" disabled={action.busy || flow.busy} onPress={() => confirm('Remove my binding', '仅解除本人绑定，不清除设备或其他用户。', () => void action.run(async () => { await service!.unbind(id); router.replace('/home'); }))} />
    </>}
  </Page>;
}
