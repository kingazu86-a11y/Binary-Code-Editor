import { EventEmitter } from 'events';
import { BrowserWindow } from 'electron';
import { terminalManager } from '../../ipc/terminal';
import { TerminalCreationOptions } from '../../../../src/types/extensionApi';

export interface ExtensionTerminalRecord {
  id: string;
  name: string;
  extensionId: string;
  createdAt: number;
}

export class TerminalService extends EventEmitter {
  private terminals = new Map<string, ExtensionTerminalRecord>();
  private win: BrowserWindow | null = null;

  setWindow(win: BrowserWindow | null): void {
    this.win = win;
  }

  createTerminal(extensionId: string, options: TerminalCreationOptions = {}): ExtensionTerminalRecord {
    const id = `ext_term_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const name = options.name || `Terminal (${extensionId})`;

    terminalManager.createTerminal({
      id,
      cwd: options.cwd,
      shell: options.shellPath,
    });

    const record: ExtensionTerminalRecord = {
      id,
      name,
      extensionId,
      createdAt: Date.now(),
    };

    this.terminals.set(id, record);

    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send('terminal:createdFromExtension', { id, name });
    }

    this.emit('onDidCreateTerminal', record);
    return record;
  }

  sendText(extensionId: string, terminalId: string, text: string, addNewLine = true): void {
    const fullText = addNewLine ? `${text}\r\n` : text;
    terminalManager.writeTerminal(terminalId, fullText);
  }

  show(terminalId: string): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send('terminal:focus', terminalId);
    }
  }

  hide(terminalId: string): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send('terminal:hide', terminalId);
    }
  }

  kill(terminalId: string): void {
    terminalManager.killTerminal(terminalId);
    const record = this.terminals.get(terminalId);
    if (record) {
      this.terminals.delete(terminalId);
      this.emit('onDidCloseTerminal', record);
    }
  }

  getTerminals(extensionId?: string): ExtensionTerminalRecord[] {
    const list = Array.from(this.terminals.values());
    if (extensionId) {
      return list.filter((t) => t.extensionId.toLowerCase() === extensionId.toLowerCase());
    }
    return list;
  }

  cleanupExtensionTerminals(extensionId: string): void {
    const list = this.getTerminals(extensionId);
    for (const term of list) {
      this.kill(term.id);
    }
  }
}

export const terminalService = new TerminalService();
