export type IpcSendFunction = (channel: string, payload: any) => void;

let ipcSender: IpcSendFunction = (channel: string, payload: any) => {
  console.warn(`[VSCodeShim] IPC sender not initialized (channel: ${channel})`);
};

export function setIpcSender(sender: IpcSendFunction) {
  ipcSender = sender;
}

export function sendIpcMessage(channel: string, payload: any) {
  ipcSender(channel, payload);
}

let activeExtensionId = 'system';

export function setActiveExtensionId(id: string) {
  activeExtensionId = id;
}

export function getActiveExtensionId(): string {
  return activeExtensionId;
}

export const contextKeysMap = new Map<string, any>();

export function setContextKey(key: string, value: any) {
  contextKeysMap.set(key, value);
}

export function getContextKey(key: string): any {
  return contextKeysMap.get(key);
}
