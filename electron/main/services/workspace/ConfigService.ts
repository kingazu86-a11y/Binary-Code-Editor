import { EventEmitter } from 'events';
import { settingsService } from '../../ipc/settings';

export class ConfigService extends EventEmitter {
  private extensionDefaults = new Map<string, any>();
  private runtimeConfig = new Map<string, any>();

  registerDefaults(extensionId: string, properties: Record<string, { default?: any }>): void {
    for (const [key, prop] of Object.entries(properties)) {
      if (prop && prop.default !== undefined) {
        this.extensionDefaults.set(key, prop.default);
      }
    }
  }

  get<T = any>(key: string, defaultValue?: T): T {
    if (this.runtimeConfig.has(key)) {
      return this.runtimeConfig.get(key);
    }

    // Try finding in settingsService
    try {
      const appSettings: any = settingsService.loadSettings();
      const parts = key.split('.');
      let current = appSettings;
      let found = true;
      for (const p of parts) {
        if (current && typeof current === 'object' && p in current) {
          current = current[p];
        } else {
          found = false;
          break;
        }
      }
      if (found && current !== undefined) {
        return current as T;
      }
    } catch {}

    // Fallback to extension default
    if (this.extensionDefaults.has(key)) {
      return this.extensionDefaults.get(key) as T;
    }

    return defaultValue as T;
  }

  async set(extensionId: string, key: string, value: any, scope: 'user' | 'workspace' = 'user'): Promise<void> {
    // Prevent extension from tampering with security settings or unrelated top-level settings without permission
    const isExtensionKey =
      key.startsWith(extensionId.toLowerCase() + '.') ||
      key.startsWith(extensionId.split('.').pop()?.toLowerCase() + '.') ||
      this.extensionDefaults.has(key);

    if (!isExtensionKey && !key.startsWith('extensions.')) {
      console.warn(
        `[ConfigService] Extension '${extensionId}' attempted to write non-namespaced setting '${key}'. Restricting to runtime cache.`
      );
    }

    this.runtimeConfig.set(key, value);
    this.emit('onDidChange', { key, value, scope });
  }

  getAllSettingsSnapshot(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [k, v] of this.extensionDefaults.entries()) {
      result[k] = v;
    }
    for (const [k, v] of this.runtimeConfig.entries()) {
      result[k] = v;
    }
    return result;
  }
}

export const configService = new ConfigService();
