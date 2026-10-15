import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';

export interface OutputChannelRecord {
  name: string;
  extensionId: string;
  lines: string[];
}

export class OutputChannelService extends EventEmitter {
  private channels = new Map<string, OutputChannelRecord>();
  private win: BrowserWindow | null = null;

  setWindow(win: BrowserWindow | null): void {
    this.win = win;
  }

  createChannel(extensionId: string, name: string): OutputChannelRecord {
    const key = name.trim();
    if (!this.channels.has(key)) {
      this.channels.set(key, {
        name: key,
        extensionId,
        lines: [],
      });
      this.notifyChannelsChanged();
    }
    return this.channels.get(key)!;
  }

  append(name: string, text: string): void {
    const ch = this.channels.get(name);
    if (ch) {
      ch.lines.push(text);
      if (ch.lines.length > 2000) ch.lines.shift();
    }

    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send('extensions:output', { channel: name, text });
    }
  }

  clear(name: string): void {
    const ch = this.channels.get(name);
    if (ch) {
      ch.lines = [];
      if (this.win && !this.win.isDestroyed()) {
        this.win.webContents.send('extensions:output:clear', { channel: name });
      }
    }
  }

  show(name: string): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send('extensions:output:show', { channel: name });
    }
  }

  getChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  private notifyChannelsChanged(): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send('extensions:channelsUpdated', this.getChannels());
    }
  }
}

export const outputChannelService = new OutputChannelService();
