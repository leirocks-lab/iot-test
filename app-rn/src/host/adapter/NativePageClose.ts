export interface NativePageCloseHost {
  closeDevice(pageSessionId: string): void;
}
/** Capture native initial props per page. A delayed handler never obtains another page's token. */
export function createNativePageClose(
  host: NativePageCloseHost,
  pageSessionId?: string,
) {
  const token =
    typeof pageSessionId === 'string' &&
    pageSessionId.trim().length > 0 &&
    !Array.from(pageSessionId).some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    })
      ? pageSessionId
      : undefined;
  return Object.freeze({
    canClose: token !== undefined,
    requestClose(): boolean {
      if (token === undefined) {
        return false;
      }
      try {
        // A void RPC acknowledges no native navigation. Every intent retains this page's token;
        // native top/page validation makes stale repeated intents harmless.
        host.closeDevice(token);
        return true;
      } catch {
        // A synchronous detached-host error is not a completed close. No raw native error escapes.
        return false;
      }
    },
  });
}
