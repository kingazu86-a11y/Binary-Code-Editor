import { sendIpcMessage, getActiveExtensionId, setContextKey } from '../ipc';
import { Disposable } from '../types';

export const commandRegistryMap = new Map<string, (...args: any[]) => any>();

export function executeCommandInternal(command: string, ...args: any[]): Promise<any> {
  const handler = commandRegistryMap.get(command);
  if (handler) {
    return Promise.resolve(handler(...args));
  }
  return Promise.resolve(undefined);
}

export const commands = {
  registerCommand: (commandId: string, handler: (...args: any[]) => any, thisArgs?: any): Disposable => {
    const boundHandler = thisArgs ? handler.bind(thisArgs) : handler;
    commandRegistryMap.set(commandId, boundHandler);
    sendIpcMessage('commands/register', { commandId, extensionId: getActiveExtensionId() });

    return new Disposable(() => {
      commandRegistryMap.delete(commandId);
      sendIpcMessage('commands/unregister', { commandId, extensionId: getActiveExtensionId() });
    });
  },

  executeCommand: async (commandId: string, ...args: any[]): Promise<any> => {
    if (commandId === 'setContext') {
      const [key, value] = args;
      setContextKey(key, value);
      sendIpcMessage('commands/execute', { commandId, args });
      return value;
    }
    if (commandRegistryMap.has(commandId)) {
      return commandRegistryMap.get(commandId)!(...args);
    }
    sendIpcMessage('commands/execute', { commandId, args });
    return undefined;
  },

  getCommands: async (): Promise<string[]> => {
    return Array.from(commandRegistryMap.keys());
  },
};
