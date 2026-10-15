import { sendIpcMessage, getActiveExtensionId } from '../ipc';
import { Uri, Disposable, StatusBarAlignment, EventEmitter } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Output Channel Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class OutputChannel {
  constructor(public readonly name: string, private readonly extensionId?: string) {}

  public append(value: string): void {
    sendIpcMessage('output/append', { name: this.name, value, extensionId: this.extensionId });
  }

  public appendLine(value: string): void {
    this.append(value + '\n');
  }

  public replace(value: string): void {
    this.clear();
    this.append(value);
  }

  public trace(message: string, ...args: any[]): void {
    const extra = args.length ? ' ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') : '';
    this.appendLine(`[trace] ${message}${extra}`);
  }

  public debug(message: string, ...args: any[]): void {
    const extra = args.length ? ' ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') : '';
    this.appendLine(`[debug] ${message}${extra}`);
  }

  public info(message: string, ...args: any[]): void {
    const extra = args.length ? ' ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') : '';
    this.appendLine(`[info] ${message}${extra}`);
  }

  public warn(message: string, ...args: any[]): void {
    const extra = args.length ? ' ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') : '';
    this.appendLine(`[warn] ${message}${extra}`);
  }

  public error(error: string | Error, ...args: any[]): void {
    const msg = error instanceof Error ? error.stack || error.message : String(error);
    const extra = args.length ? ' ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') : '';
    this.appendLine(`[error] ${msg}${extra}`);
  }

  public clear(): void {
    sendIpcMessage('output/clear', { name: this.name });
  }

  public show(preserveFocus?: boolean): void {
    sendIpcMessage('output/show', { name: this.name, preserveFocus });
  }

  public hide(): void {
    sendIpcMessage('output/hide', { name: this.name });
  }

  public dispose(): void {
    sendIpcMessage('output/dispose', { name: this.name });
  }
}

export class LogOutputChannel extends OutputChannel {}

// ─────────────────────────────────────────────────────────────────────────────
// Status Bar Item Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class StatusBarItem {
  public text = '';
  public tooltip = '';
  public color = '';
  public backgroundColor = '';
  public command = '';
  private _showing = false;

  constructor(
    public readonly id: string,
    public readonly alignment: StatusBarAlignment,
    public readonly priority?: number,
    private readonly extensionId?: string
  ) {}

  public show(): void {
    this._showing = true;
    this.update();
  }

  public hide(): void {
    this._showing = false;
    sendIpcMessage('statusBar/hide', { id: this.id });
  }

  private update(): void {
    if (!this._showing) return;
    sendIpcMessage('statusBar/set', {
      id: this.id,
      text: this.text,
      tooltip: this.tooltip,
      color: this.color,
      backgroundColor: this.backgroundColor,
      command: this.command,
      alignment: this.alignment,
      priority: this.priority,
      extensionId: this.extensionId,
    });
  }

  public dispose(): void {
    this.hide();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Webview Panel Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class WebviewPanel {
  public title: string;
  public iconPath?: any;
  public options: any;
  public viewColumn: any;
  public active = true;
  public visible = true;
  private _onDidChangeViewState = new EventEmitter<any>();
  public onDidChangeViewState = this._onDidChangeViewState.event;
  private _onDidDispose = new EventEmitter<void>();
  public onDidDispose = this._onDidDispose.event;
  public webview: {
    options: any;
    html: string;
    onDidReceiveMessage: (listener: (e: any) => any, thisArgs?: any, disposables?: Disposable[]) => Disposable;
    postMessage: (message: any) => Promise<boolean>;
    asWebviewUri: (uri: Uri) => Uri;
    cspSource: string;
  };

  constructor(public readonly viewType: string, title: string, showOptions: any, options?: any) {
    this.title = title;
    this.options = options || {};
    this.viewColumn = typeof showOptions === 'object' ? showOptions.viewColumn : showOptions;

    const messageEmitter = new EventEmitter<any>();
    this.webview = {
      options: options || {},
      html: '',
      onDidReceiveMessage: messageEmitter.event,
      postMessage: async (_msg: any) => true,
      asWebviewUri: (uri: Uri) => {
        if (!uri) return uri;
        return Uri.parse(`vscode-webview://webview-panel/${uri.path}`);
      },
      cspSource: 'https://*.vscode-cdn.net',
    };
  }

  reveal(_viewColumn?: any, _preserveFocus?: boolean): void {}
  dispose(): void {
    this._onDidDispose.fire();
    this._onDidDispose.dispose();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// vscode.window Namespace
// ─────────────────────────────────────────────────────────────────────────────

export const window = {
  showInformationMessage: async (message: string, ...items: string[]): Promise<string | undefined> => {
    sendIpcMessage('window/showMessage', { type: 'info', message, items, extensionId: getActiveExtensionId() });
    return items[0];
  },
  showWarningMessage: async (message: string, ...items: string[]): Promise<string | undefined> => {
    sendIpcMessage('window/showMessage', { type: 'warning', message, items, extensionId: getActiveExtensionId() });
    return items[0];
  },
  showErrorMessage: async (message: string, ...items: string[]): Promise<string | undefined> => {
    sendIpcMessage('window/showMessage', { type: 'error', message, items, extensionId: getActiveExtensionId() });
    return items[0];
  },
  showQuickPick: async (items: any[] | Promise<any[]>, _options?: any): Promise<any> => {
    const resolved = await Promise.resolve(items);
    return Array.isArray(resolved) && resolved.length > 0 ? resolved[0] : undefined;
  },
  showInputBox: async (_options?: any): Promise<string | undefined> => {
    return undefined;
  },
  withProgress: async (_options: any, task: (progress: any, token: any) => Promise<any>): Promise<any> => {
    const progress = { report: (_value: any) => {} };
    const token = { isCancellationRequested: false, onCancellationRequested: new EventEmitter<any>().event };
    return await task(progress, token);
  },
  createTerminal: (nameOrOptions?: any): any => ({
    name: typeof nameOrOptions === 'string' ? nameOrOptions : nameOrOptions?.name || 'Terminal',
    processId: Promise.resolve(process.pid),
    sendText: (_text: string, _addNewLine?: boolean) => {},
    show: (_preserveFocus?: boolean) => {},
    hide: () => {},
    dispose: () => {},
  }),
  createOutputChannel: (name: string): OutputChannel => {
    return new OutputChannel(name, getActiveExtensionId());
  },
  createStatusBarItem: (alignment = StatusBarAlignment.Left, priority?: number): StatusBarItem => {
    const id = `statusBar_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    return new StatusBarItem(id, alignment, priority, getActiveExtensionId());
  },
  createWebviewPanel: (viewType: string, title: string, showOptions: any, options?: any): WebviewPanel => {
    sendIpcMessage('window/createWebviewPanel', { viewType, title, extensionId: getActiveExtensionId() });
    return new WebviewPanel(viewType, title, showOptions, options);
  },
  createTreeView: <T>(_viewId: string, _options: any): any => ({
    onDidCollapseElement: new EventEmitter<any>().event,
    onDidExpandElement: new EventEmitter<any>().event,
    onDidChangeSelection: new EventEmitter<any>().event,
    onDidChangeVisibility: new EventEmitter<any>().event,
    visible: true,
    selection: [],
    reveal: async (_element: T, _options?: any) => {},
    dispose: () => {},
  }),
  registerWebviewViewProvider: (_viewId: string, _provider: any, _options?: any): Disposable => {
    return new Disposable(() => {});
  },
  registerCustomEditorProvider: (_viewType: string, _provider: any, _options?: any): Disposable => {
    return new Disposable(() => {});
  },
  registerUriHandler: (_handler: any): Disposable => {
    return new Disposable(() => {});
  },
  registerFileDecorationProvider: (_provider: any): Disposable => {
    return new Disposable(() => {});
  },
  registerTerminalLinkProvider: (_provider: any): Disposable => {
    return new Disposable(() => {});
  },
  registerTerminalProfileProvider: (_id: string, _provider: any): Disposable => {
    return new Disposable(() => {});
  },
  createTextEditorDecorationType: (_options: any): any => ({
    key: `decoration_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    dispose: () => {},
  }),
  activeTextEditor: undefined as any,
  visibleTextEditors: [] as any[],
  onDidChangeActiveTextEditor: new EventEmitter<any>().event,
  onDidChangeVisibleTextEditors: new EventEmitter<any>().event,
  onDidChangeTextEditorSelection: new EventEmitter<any>().event,
  activeColorTheme: { kind: 2 }, // Dark
  onDidChangeActiveColorTheme: new EventEmitter<any>().event,
};
