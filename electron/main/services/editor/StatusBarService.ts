import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import { StatusBarAlignment } from '../../../../src/types/extensionApi';

export interface StatusBarItemRecord {
  id: string;
  extensionId: string;
  alignment: StatusBarAlignment;
  priority: number;
  text: string;
  tooltip?: string;
  color?: string;
  backgroundColor?: string;
  command?: string;
  visible: boolean;
}

export class StatusBarService extends EventEmitter {
  private items = new Map<string, StatusBarItemRecord>();
  private win: BrowserWindow | null = null;

  setWindow(win: BrowserWindow | null): void {
    this.win = win;
  }

  createOrUpdateItem(
    extensionId: string,
    id: string,
    data: Partial<StatusBarItemRecord>
  ): StatusBarItemRecord {
    const existing = this.items.get(id) || {
      id,
      extensionId,
      alignment: StatusBarAlignment.Left,
      priority: 0,
      text: '',
      visible: false,
    };

    const updated: StatusBarItemRecord = {
      ...existing,
      ...data,
      id,
      extensionId,
    };

    this.items.set(id, updated);
    this.notifyRenderer();
    return updated;
  }

  removeItem(id: string): void {
    if (this.items.delete(id)) {
      this.notifyRenderer();
    }
  }

  setEntry(
    extensionId: string,
    entry: {
      id: string;
      text?: string;
      tooltip?: string;
      color?: string;
      backgroundColor?: string;
      command?: string;
      alignment?: StatusBarAlignment | 'left' | 'right';
      priority?: number;
    }
  ): StatusBarItemRecord {
    const alignmentEnum =
      entry.alignment === 'right' || entry.alignment === StatusBarAlignment.Right
        ? StatusBarAlignment.Right
        : StatusBarAlignment.Left;

    return this.createOrUpdateItem(extensionId, entry.id, {
      ...entry,
      alignment: alignmentEnum,
      visible: true,
    });
  }

  removeEntry(id: string): void {
    this.removeItem(id);
  }

  getItems(): StatusBarItemRecord[] {
    return Array.from(this.items.values())
      .filter((i) => i.visible)
      .sort((a, b) => b.priority - a.priority);
  }

  clearExtensionItems(extensionId: string): void {
    const norm = extensionId.toLowerCase();
    let changed = false;
    for (const [id, item] of this.items.entries()) {
      if (item.extensionId.toLowerCase() === norm) {
        this.items.delete(id);
        changed = true;
      }
    }
    if (changed) {
      this.notifyRenderer();
    }
  }

  private notifyRenderer(): void {
    const visibleItems = this.getItems();
    this.emit('updated', visibleItems);
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send('extensions:statusBarUpdated', visibleItems);
    }
  }
}

export const statusBarService = new StatusBarService();
