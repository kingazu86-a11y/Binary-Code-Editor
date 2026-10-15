import { EventEmitter } from 'events';

export interface CommandDefinition {
  id: string;
  title: string;
  category?: string;
  icon?: string;
  handler?: (...args: any[]) => any;
  extensionId?: string;
}

export class CommandRegistry extends EventEmitter {
  private commands = new Map<string, CommandDefinition>();
  private contextKeys = new Map<string, any>();

  constructor() {
    super();
    this.registerBuiltInCommands();
  }

  private registerBuiltInCommands() {
    this.registerCommand('setContext', (key: string, value: any) => {
      this.contextKeys.set(key, value);
      this.emit('contextChanged', { key, value });
      return value;
    });
  }

  getContext(key: string): any {
    return this.contextKeys.get(key);
  }

  getAllContexts(): Record<string, any> {
    return Object.fromEntries(this.contextKeys.entries());
  }

  registerCommand(
    id: string,
    handlerOrMeta: ((...args: any[]) => any) | Omit<CommandDefinition, 'id'>,
    extensionId?: string
  ): { dispose(): void } {
    if (this.commands.has(id)) {
      console.warn(`[CommandRegistry] Overriding existing command '${id}'`);
    }

    let def: CommandDefinition;
    if (typeof handlerOrMeta === 'function') {
      def = {
        id,
        title: id,
        category: extensionId ? 'Extension' : 'System',
        handler: handlerOrMeta,
        extensionId,
      };
    } else {
      def = {
        id,
        title: handlerOrMeta.title || id,
        category: handlerOrMeta.category || (extensionId ? 'Extension' : 'System'),
        icon: handlerOrMeta.icon,
        handler: handlerOrMeta.handler,
        extensionId: extensionId || handlerOrMeta.extensionId,
      };
    }

    this.commands.set(id, def);
    this.emit('commandsChanged');

    return {
      dispose: () => {
        const current = this.commands.get(id);
        if (current === def) {
          this.commands.delete(id);
          this.emit('commandsChanged');
        }
      },
    };
  }

  async executeCommand<T = any>(id: string, ...args: any[]): Promise<T> {
    const cmd = this.commands.get(id);
    if (!cmd) {
      throw new Error(`[CommandRegistry] Command '${id}' not found`);
    }

    if (typeof cmd.handler !== 'function') {
      throw new Error(`[CommandRegistry] Command '${id}' has no executable handler registered`);
    }

    return await Promise.resolve(cmd.handler(...args));
  }

  getCommands(filterInternal = false): Array<{ id: string; title: string; category?: string; icon?: string }> {
    const list: Array<{ id: string; title: string; category?: string; icon?: string }> = [];
    for (const [id, def] of this.commands.entries()) {
      if (filterInternal && id.startsWith('_')) continue;
      list.push({
        id,
        title: def.title,
        category: def.category,
        icon: def.icon,
      });
    }
    return list;
  }

  hasCommand(id: string): boolean {
    return this.commands.has(id);
  }

  getCommand(id: string): CommandDefinition | undefined {
    return this.commands.get(id);
  }

  unregisterCommand(id: string): boolean {
    if (this.commands.has(id)) {
      this.commands.delete(id);
      this.emit('commandsChanged');
      return true;
    }
    return false;
  }

  clearExtensionCommands(extensionId: string): void {
    const norm = extensionId.toLowerCase();
    let changed = false;
    for (const [id, def] of this.commands.entries()) {
      if (def.extensionId && def.extensionId.toLowerCase() === norm) {
        this.commands.delete(id);
        changed = true;
      }
    }
    if (changed) {
      this.emit('commandsChanged');
    }
  }
}

export const commandRegistry = new CommandRegistry();
