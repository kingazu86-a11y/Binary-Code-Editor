import { BrowserWindow, dialog } from 'electron';
import { EventEmitter } from 'events';
import { QuickPickItem, QuickPickOptions, InputBoxOptions } from '../../../../src/types/extensionApi';

export class DialogService extends EventEmitter {
  private win: BrowserWindow | null = null;
  private pendingDialogs = new Map<string, (result: any) => void>();

  setWindow(win: BrowserWindow | null): void {
    this.win = win;
  }

  resolveDialog(dialogId: string, result: any): void {
    const resolver = this.pendingDialogs.get(dialogId);
    if (resolver) {
      resolver(result);
      this.pendingDialogs.delete(dialogId);
    }
  }

  async showMessage(
    type: 'info' | 'warning' | 'error',
    message: string,
    items: string[] = []
  ): Promise<string | undefined> {
    const dialogId = `dlg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    if (this.win && !this.win.isDestroyed()) {
      return new Promise((resolve) => {
        this.pendingDialogs.set(dialogId, resolve);
        this.win!.webContents.send('dialog:showMessage', {
          dialogId,
          type,
          message,
          items,
        });

        // Timeout fallback after 2 minutes
        setTimeout(() => {
          if (this.pendingDialogs.has(dialogId)) {
            this.resolveDialog(dialogId, undefined);
          }
        }, 120000);
      });
    }

    // Native fallback if no window
    const electronType = type === 'info' ? 'info' : type === 'warning' ? 'warning' : 'error';
    const buttons = items.length > 0 ? items : ['OK'];
    const res = await dialog.showMessageBox({
      type: electronType,
      message,
      buttons,
    });
    return items[res.response];
  }

  async showInformationMessage(message: string, items: string[] = []): Promise<string | undefined> {
    return this.showMessage('info', message, items);
  }

  async showWarningMessage(message: string, items: string[] = []): Promise<string | undefined> {
    return this.showMessage('warning', message, items);
  }

  async showErrorMessage(message: string, items: string[] = []): Promise<string | undefined> {
    return this.showMessage('error', message, items);
  }

  async showInputBox(options: InputBoxOptions = {}): Promise<string | undefined> {
    const dialogId = `input_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    if (this.win && !this.win.isDestroyed()) {
      return new Promise((resolve) => {
        this.pendingDialogs.set(dialogId, resolve);
        this.win!.webContents.send('dialog:showInputBox', {
          dialogId,
          options,
        });
      });
    }
    return undefined;
  }

  async showQuickPick(
    items: string[] | QuickPickItem[],
    options: QuickPickOptions = {}
  ): Promise<any> {
    const dialogId = `qp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    if (this.win && !this.win.isDestroyed()) {
      return new Promise((resolve) => {
        this.pendingDialogs.set(dialogId, resolve);
        this.win!.webContents.send('dialog:showQuickPick', {
          dialogId,
          items,
          options,
        });
      });
    }
    return undefined;
  }

  async showConfirmation(options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }): Promise<boolean> {
    const confirmText = options.confirmLabel || 'Yes';
    const cancelText = options.cancelLabel || 'Cancel';
    const choice = await this.showMessage('warning', `${options.title}\n\n${options.message}`, [
      confirmText,
      cancelText,
    ]);
    return choice === confirmText;
  }
}

export const dialogService = new DialogService();
