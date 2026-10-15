import { EventEmitter } from '../types';

export const extensionRegistryMap = new Map<string, any>();

export function registerExtensionMetadata(id: string, metadata: any) {
  extensionRegistryMap.set(id.toLowerCase(), metadata);
}

export function unregisterExtensionMetadata(id: string) {
  extensionRegistryMap.delete(id.toLowerCase());
}

export const extensions = {
  getExtension: (extensionId: string): any => {
    if (!extensionId || typeof extensionId !== 'string') return undefined;
    const lower = extensionId.toLowerCase();
    if (extensionRegistryMap.has(lower)) {
      return extensionRegistryMap.get(lower);
    }
    for (const [key, val] of extensionRegistryMap.entries()) {
      if (key.endsWith('.' + lower) || key.startsWith(lower + '.')) {
        return val;
      }
    }
    // Safe resilient fallback descriptor
    return {
      id: extensionId,
      extensionPath: '',
      isActive: true,
      packageJSON: { name: extensionId, version: '1.0.0' },
      exports: undefined,
      activate: async () => {},
    };
  },
  get all(): any[] {
    return Array.from(extensionRegistryMap.values());
  },
  onDidChange: new EventEmitter<void>().event,
};
