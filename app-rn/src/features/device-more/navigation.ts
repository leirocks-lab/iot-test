import type {DeviceReadPage} from '../../host/adapter/DeviceReadController';
/** Device-local presentation stack. It never creates/releases native observations. */
export function pushReadPage(
  stack: readonly DeviceReadPage[],
  page: DeviceReadPage,
): DeviceReadPage[] {
  return stack.at(-1)?.feature === page.feature
    ? [...stack.slice(0, -1), page]
    : [...stack, page];
}
export function popReadPage(
  stack: readonly DeviceReadPage[],
): DeviceReadPage[] {
  return stack.slice(0, -1);
}
