/**
 * Binary Code Editor — Public Extension API & Manifest Type Definitions
 *
 * This file defines the complete type contracts for Binary Extensions,
 * Extension Host IPC/RPC protocols, permissions, and the public `binary.*` namespace.
 */

export type DisposableLike = { dispose(): any };

export class Disposable implements DisposableLike {
  private isDisposed = false;
  constructor(private readonly callOnDispose: () => any) {}

  dispose(): void {
    if (!this.isDisposed) {
      this.isDisposed = true;
      try {
        this.callOnDispose();
      } catch (err) {
        console.error('[Binary Disposable] Error disposing resource:', err);
      }
    }
  }

  static from(...disposables: { dispose(): any }[]): Disposable {
    return new Disposable(() => {
      for (const d of disposables) {
        if (d && typeof d.dispose === 'function') {
          d.dispose();
        }
      }
    });
  }
}

export interface CancellationToken {
  readonly isCancellationRequested: boolean;
  onCancellationRequested(listener: () => any): Disposable;
}

export type ExtensionPermission =
  | 'workspace.read'
  | 'workspace.write'
  | 'terminal.execute'
  | 'process.execute'
  | 'network'
  | 'filesystem.readOutsideWorkspace'
  | 'filesystem.writeOutsideWorkspace'
  | 'debugger'
  | 'sourceControl'
  | 'webview';

export type ExtensionState =
  | 'uninstalled'
  | 'installed'
  | 'disabled'
  | 'activating'
  | 'active'
  | 'deactivated'
  | 'crashed'
  | 'error';

export interface ContributedCommand {
  command: string;
  title: string;
  category?: string;
  icon?: string;
  enablement?: string;
}

export interface ContributedMenuItem {
  command: string;
  when?: string;
  group?: string;
  alt?: string;
}

export interface ContributedActivityBarItem {
  id: string;
  title: string;
  icon: string;
  priority?: number;
}

export interface ContributedView {
  id: string;
  container: string;
  name: string;
  when?: string;
  type?: 'tree' | 'webview' | 'custom';
}

export interface ContributedLanguage {
  id: string;
  extensions?: string[];
  aliases?: string[];
  mimetypes?: string[];
  filenames?: string[];
  configuration?: string;
}

export interface ContributedConfigurationProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default?: any;
  description: string;
  enum?: any[];
  enumDescriptions?: string[];
  scope?: 'window' | 'resource' | 'machine';
}

export interface ContributedConfiguration {
  title?: string;
  properties: Record<string, ContributedConfigurationProperty>;
}

export interface ContributedCustomEditor {
  viewType: string;
  displayName: string;
  selector: Array<{ filenamePattern: string }>;
  priority?: 'default' | 'option';
}

export interface IBinaryExtensionManifest {
  id: string;
  name: string;
  displayName?: string;
  version: string;
  publisher: string;
  description?: string;
  main: string;
  icon?: string;
  engines?: {
    binary?: string;
    vscode?: string;
  };
  activationEvents?: string[];
  dependencies?: Record<string, string>;
  permissions?: ExtensionPermission[];
  contributes?: {
    commands?: ContributedCommand[];
    menus?: {
      'editor/context'?: ContributedMenuItem[];
      'explorer/context'?: ContributedMenuItem[];
      'tab/context'?: ContributedMenuItem[];
      'terminal/context'?: ContributedMenuItem[];
      'view/title'?: ContributedMenuItem[];
      'view/item/context'?: ContributedMenuItem[];
      'activityBar/context'?: ContributedMenuItem[];
      'commandPalette'?: ContributedMenuItem[];
    };
    activityBar?: ContributedActivityBarItem[];
    views?: ContributedView[];
    languages?: ContributedLanguage[];
    configuration?: ContributedConfiguration | ContributedConfiguration[];
    customEditors?: ContributedCustomEditor[];
    themes?: Array<{ id: string; label: string; uiTheme: string; path: string }>;
    keybindings?: Array<{ command: string; key: string; mac?: string; when?: string }>;
  };
  enabled?: boolean;
  state?: ExtensionState;
  source?: 'builtin' | 'binary' | 'vscode' | 'unpacked' | 'marketplace';
  installedPath?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Editor & Documents
// ─────────────────────────────────────────────────────────────────────────────

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Selection extends Range {
  anchor: Position;
  active: Position;
  isReversed?: boolean;
}

export interface TextLine {
  lineNumber: number;
  text: string;
  range: Range;
  rangeIncludingLineBreak: Range;
  firstNonWhitespaceCharacterIndex: number;
  isEmptyOrWhitespace: boolean;
}

export interface TextDocument {
  readonly uri: string;
  readonly fileName: string;
  readonly languageId: string;
  readonly version: number;
  readonly isDirty: boolean;
  readonly lineCount: number;
  getText(range?: Range): string;
  lineAt(line: number): TextLine;
  positionAt(offset: number): Position;
  offsetAt(position: Position): number;
}

export interface TextEditorDecorationType {
  readonly key: string;
  dispose(): void;
}

export interface DecorationRenderOptions {
  backgroundColor?: string;
  color?: string;
  border?: string;
  borderColor?: string;
  borderRadius?: string;
  fontWeight?: string;
  fontStyle?: string;
  gutterIconPath?: string;
  overviewRulerColor?: string;
  after?: {
    contentText?: string;
    color?: string;
  };
}

export interface DecorationOptions {
  range: Range;
  hoverMessage?: string;
  renderOptions?: DecorationRenderOptions;
}

export interface TextEditor {
  readonly document: TextDocument;
  selection: Selection;
  selections: Selection[];
  visibleRanges: Range[];
  setDecorations(decorationType: TextEditorDecorationType, rangesOrOptions: Range[] | DecorationOptions[]): void;
  insertSnippet?(snippet: string): Promise<boolean>;
}

export interface TextDocumentContentChangeEvent {
  range?: Range;
  text: string;
}

export interface TextDocumentChangeEvent {
  document: TextDocument;
  contentChanges: TextDocumentContentChangeEvent[];
}

export interface TextEditorSelectionChangeEvent {
  textEditor: TextEditor;
  selections: Selection[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Workspace & File System
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkspaceFolder {
  uri: string;
  name: string;
  index: number;
}

export interface WorkspaceChangeEvent {
  added: WorkspaceFolder[];
  removed: WorkspaceFolder[];
}

export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}

export interface FileStat {
  type: FileType;
  ctime: number;
  mtime: number;
  size: number;
}

export interface FileSystemWatcher extends DisposableLike {
  onDidCreate(listener: (uri: string) => any): Disposable;
  onDidChange(listener: (uri: string) => any): Disposable;
  onDidDelete(listener: (uri: string) => any): Disposable;
}

// ─────────────────────────────────────────────────────────────────────────────
// Terminal
// ─────────────────────────────────────────────────────────────────────────────

export interface TerminalCreationOptions {
  name?: string;
  shellPath?: string;
  shellArgs?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export interface Terminal {
  readonly id: string;
  readonly name: string;
  readonly processId: Promise<number | undefined>;
  sendText(text: string, addNewLine?: boolean): void;
  show(): void;
  hide(): void;
  dispose(): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI & Views
// ─────────────────────────────────────────────────────────────────────────────

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export interface StatusBarItem {
  id: string;
  alignment: StatusBarAlignment;
  priority: number;
  text: string;
  tooltip?: string;
  color?: string;
  backgroundColor?: string;
  command?: string;
  show(): void;
  hide(): void;
  dispose(): void;
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export interface TreeItem {
  id?: string;
  label: string;
  description?: string;
  tooltip?: string;
  iconPath?: string;
  command?: { command: string; title: string; arguments?: any[] };
  collapsibleState?: TreeItemCollapsibleState;
  contextValue?: string;
}

export interface TreeDataProvider<T> {
  onDidChangeTreeData?: (listener: (e?: T | T[] | void) => any) => Disposable;
  getTreeItem(element: T): TreeItem | Promise<TreeItem>;
  getChildren(element?: T): T[] | Promise<T[]>;
  getParent?(element: T): T | undefined | Promise<T | undefined>;
}

export interface TreeView<T> extends DisposableLike {
  readonly viewId: string;
  readonly visible: boolean;
  title?: string;
  description?: string;
  badge?: { value: number; tooltip: string };
  reveal(element: T, options?: { select?: boolean; focus?: boolean; expand?: boolean }): Promise<void>;
  onDidChangeVisibility(listener: (e: { visible: boolean }) => any): Disposable;
  onDidChangeSelection(listener: (e: { selection: T[] }) => any): Disposable;
}

export interface WebviewView {
  readonly viewType: string;
  html: string;
  onDidReceiveMessage(listener: (message: any) => any): Disposable;
  postMessage(message: any): Promise<boolean>;
}

export interface WebviewViewProvider {
  resolveWebviewView(webviewView: WebviewView, context: any, token: CancellationToken): void | Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Languages, Diagnostics & LSP
// ─────────────────────────────────────────────────────────────────────────────

export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

export interface Diagnostic {
  range: Range;
  message: string;
  severity: DiagnosticSeverity;
  source?: string;
  code?: string | number;
}

export interface DiagnosticCollection extends DisposableLike {
  readonly name: string;
  set(uri: string, diagnostics: Diagnostic[]): void;
  delete(uri: string): void;
  clear(): void;
  get(uri: string): Diagnostic[];
  has(uri: string): boolean;
}

export interface CompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: string;
  insertText?: string;
  sortText?: string;
  filterText?: string;
}

export interface Hover {
  contents: string[];
  range?: Range;
}

export interface Definition {
  uri: string;
  range: Range;
}

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface DocumentFormattingEditProvider {
  provideDocumentFormattingEdits(
    document: TextDocument,
    options: { tabSize: number; insertSpaces: boolean },
    token: CancellationToken
  ): Promise<TextEdit[]> | TextEdit[];
}

export interface DocumentRangeFormattingEditProvider {
  provideDocumentRangeFormattingEdits(
    document: TextDocument,
    range: Range,
    options: { tabSize: number; insertSpaces: boolean },
    token: CancellationToken
  ): Promise<TextEdit[]> | TextEdit[];
}

export interface LspServerConfig {
  command: string;
  args?: string[];
  options?: { cwd?: string; env?: Record<string, string> };
}

// ─────────────────────────────────────────────────────────────────────────────
// Window / Dialogs
// ─────────────────────────────────────────────────────────────────────────────

export interface QuickPickItem {
  label: string;
  description?: string;
  detail?: string;
  picked?: boolean;
}

export interface QuickPickOptions {
  placeHolder?: string;
  canPickMany?: boolean;
  matchOnDescription?: boolean;
  matchOnDetail?: boolean;
}

export interface InputBoxOptions {
  value?: string;
  prompt?: string;
  placeHolder?: string;
  password?: boolean;
  validateInput?(value: string): string | undefined | null | Promise<string | undefined | null>;
}

export interface ProgressReporter {
  report(value: { message?: string; increment?: number }): void;
}

export interface ProgressOptions {
  location?: 'notification' | 'window';
  title?: string;
  cancellable?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Output & Extension Context
// ─────────────────────────────────────────────────────────────────────────────

export interface OutputChannel {
  readonly name: string;
  append(value: string): void;
  appendLine(value: string): void;
  clear(): void;
  show(preserveFocus?: boolean): void;
  hide(): void;
  dispose(): void;
}

export interface Memento {
  get<T>(key: string, defaultValue?: T): T;
  update(key: string, value: any): Promise<void>;
  keys(): readonly string[];
}

export interface SecretStorage {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export enum ExtensionMode {
  Production = 1,
  Development = 2,
  Test = 3,
}

export interface ExtensionContext {
  readonly subscriptions: { dispose(): any }[];
  readonly extensionPath: string;
  readonly extensionUri: string;
  readonly extensionMode: ExtensionMode;
  readonly globalState: Memento;
  readonly workspaceState: Memento;
  readonly secrets: SecretStorage;
  readonly storageUri: string;
  readonly globalStorageUri: string;
  readonly logUri: string;
  asAbsolutePath(relativePath: string): string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public `binary.*` Namespace Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface BinaryExtensionAPI {
  readonly version: string;

  readonly editor: {
    readonly activeEditor: TextEditor | undefined;
    readonly visibleEditors: TextEditor[];
    readonly openEditors: TextEditor[];
    getDocument(uri: string): TextDocument | undefined;
    getText(uri: string): string;
    getSelection(): Selection | undefined;
    insertText(position: Position, text: string): Promise<boolean>;
    replaceRange(range: Range, text: string): Promise<boolean>;
    openDocument(uri: string): Promise<TextDocument>;
    showDocument(uri: string, options?: { viewColumn?: number; preserveFocus?: boolean }): Promise<TextEditor>;
    createTextEditorDecorationType(options: DecorationRenderOptions): TextEditorDecorationType;
    onDidChangeTextDocument(listener: (e: TextDocumentChangeEvent) => any): Disposable;
    onDidChangeSelection(listener: (e: TextEditorSelectionChangeEvent) => any): Disposable;
    onDidOpenDocument(listener: (doc: TextDocument) => any): Disposable;
    onDidCloseDocument(listener: (doc: TextDocument) => any): Disposable;
    onDidChangeActiveEditor(listener: (editor: TextEditor | undefined) => any): Disposable;
  };

  readonly workspace: {
    readonly root: string | undefined;
    readonly folders: WorkspaceFolder[];
    readonly name: string;
    getWorkspace(): { id: string; name: string; path?: string; folders: WorkspaceFolder[] };
    getFiles(pattern?: string, exclude?: string): Promise<string[]>;
    onDidOpen(listener: (folder: WorkspaceFolder) => any): Disposable;
    onDidChange(listener: (e: WorkspaceChangeEvent) => any): Disposable;
    onDidClose(listener: () => any): Disposable;
  };

  readonly fs: {
    readFile(uri: string): Promise<Uint8Array | string>;
    writeFile(uri: string, data: Uint8Array | string): Promise<void>;
    createFile(uri: string, content?: string): Promise<void>;
    delete(uri: string, options?: { recursive?: boolean }): Promise<void>;
    rename(oldUri: string, newUri: string): Promise<void>;
    copy(source: string, destination: string): Promise<void>;
    exists(uri: string): Promise<boolean>;
    readDirectory(uri: string): Promise<Array<[string, FileType]>>;
    stat(uri: string): Promise<FileStat>;
    watch(uri: string, options?: { recursive?: boolean }): FileSystemWatcher;
    onDidCreate(listener: (uri: string) => any): Disposable;
    onDidDelete(listener: (uri: string) => any): Disposable;
    onDidChange(listener: (uri: string) => any): Disposable;
  };

  readonly commands: {
    registerCommand(commandId: string, handler: (...args: any[]) => any): Disposable;
    executeCommand<T = any>(commandId: string, ...args: any[]): Promise<T>;
    getCommands(filterInternal?: boolean): Promise<string[]>;
  };

  readonly terminal: {
    create(options?: TerminalCreationOptions): Terminal;
    readonly activeTerminal: Terminal | undefined;
    readonly terminals: Terminal[];
    onDidWrite(listener: (data: { terminalId: string; text: string }) => any): Disposable;
    onDidClose(listener: (terminal: Terminal) => any): Disposable;
    onDidStartProcess(listener: (e: { terminalId: string; pid: number }) => any): Disposable;
    onDidEndProcess(listener: (e: { terminalId: string; exitCode: number }) => any): Disposable;
  };

  readonly window: {
    showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;
    showWarningMessage(message: string, ...items: string[]): Promise<string | undefined>;
    showErrorMessage(message: string, ...items: string[]): Promise<string | undefined>;
    showInputBox(options?: InputBoxOptions): Promise<string | undefined>;
    showQuickPick(items: string[] | QuickPickItem[], options?: QuickPickOptions): Promise<any>;
    showConfirmation(options: { title: string; message: string; confirmLabel?: string; cancelLabel?: string }): Promise<boolean>;
    withProgress<R>(options: ProgressOptions, task: (progress: ProgressReporter, token: CancellationToken) => Promise<R>): Promise<R>;
  };

  readonly ui: {
    readonly activityBar: {
      setBadge(containerId: string, badge?: number | string): void;
      setTitle(containerId: string, title: string): void;
    };
  };

  readonly statusBar: {
    createItem(alignment?: StatusBarAlignment, priority?: number): StatusBarItem;
    createItem(options?: { id?: string; alignment?: StatusBarAlignment; priority?: number }): StatusBarItem;
  };

  readonly menus: {
    registerMenuItem(location: string, item: ContributedMenuItem): Disposable;
    setContextKey(key: string, value: any): void;
    getContextKey(key: string): any;
  };

  readonly views: {
    registerTreeDataProvider<T>(viewId: string, provider: TreeDataProvider<T>): Disposable;
    createTreeView<T>(viewId: string, options: { treeDataProvider: TreeDataProvider<T> }): TreeView<T>;
    registerWebviewViewProvider(viewId: string, provider: WebviewViewProvider): Disposable;
  };

  readonly config: {
    get<T = any>(key: string, defaultValue?: T): T;
    set(key: string, value: any, scope?: 'user' | 'workspace'): Promise<void>;
    onDidChange(listener: (e: { key: string; value: any; scope: string }) => any): Disposable;
  };

  readonly languages: {
    register(contribution: ContributedLanguage): Disposable;
    registerDocumentFormattingEditProvider(languageId: string, provider: DocumentFormattingEditProvider): Disposable;
    registerDocumentRangeFormattingEditProvider(languageId: string, provider: DocumentRangeFormattingEditProvider): Disposable;
    registerCompletionItemProvider(languageId: string, provider: any, ...triggerCharacters: string[]): Disposable;
    registerHoverProvider(languageId: string, provider: any): Disposable;
    registerDefinitionProvider(languageId: string, provider: any): Disposable;
    setLanguageConfiguration(languageId: string, configuration: any): Disposable;
  };

  readonly lsp: {
    registerLanguageServer(languageId: string, serverConfig: LspServerConfig): Disposable;
  };

  readonly diagnostics: {
    createDiagnosticCollection(name?: string): DiagnosticCollection;
    getDiagnostics(uri?: string): Diagnostic[];
  };

  readonly formatting: {
    registerDocumentFormattingEditProvider(languageId: string, provider: DocumentFormattingEditProvider): Disposable;
    registerDocumentRangeFormattingEditProvider(languageId: string, provider: DocumentRangeFormattingEditProvider): Disposable;
  };

  readonly scm: {
    createSourceControl(id: string, label: string, rootUri?: string): any;
  };

  readonly debug: {
    registerDebugConfigurationProvider(debugType: string, provider: any): Disposable;
    registerDebugAdapterDescriptorFactory(debugType: string, factory: any): Disposable;
    startDebugging(folder: WorkspaceFolder | undefined, nameOrConfiguration: string | any): Promise<boolean>;
  };

  readonly events: {
    onFileCreated(listener: (uri: string) => any): Disposable;
    onFileDeleted(listener: (uri: string) => any): Disposable;
    onFileChanged(listener: (uri: string) => any): Disposable;
    onDocumentOpened(listener: (doc: TextDocument) => any): Disposable;
    onDocumentChanged(listener: (e: TextDocumentChangeEvent) => any): Disposable;
    onDocumentSaved(listener: (doc: TextDocument) => any): Disposable;
    onDocumentClosed(listener: (doc: TextDocument) => any): Disposable;
    onEditorChanged(listener: (editor: TextEditor | undefined) => any): Disposable;
    onSelectionChanged(listener: (e: TextEditorSelectionChangeEvent) => any): Disposable;
    onWorkspaceOpened(listener: (folder: WorkspaceFolder) => any): Disposable;
    onWorkspaceClosed(listener: () => any): Disposable;
    onTerminalCreated(listener: (terminal: Terminal) => any): Disposable;
    onTerminalClosed(listener: (terminal: Terminal) => any): Disposable;
    onConfigurationChanged(listener: (e: any) => any): Disposable;
    onExtensionActivated(listener: (extId: string) => any): Disposable;
    onExtensionDeactivated(listener: (extId: string) => any): Disposable;
  };

  readonly output: {
    createChannel(name: string): OutputChannel;
    getChannels(): string[];
  };

  readonly extensions: {
    getExtension(extensionId: string): any;
    readonly all: any[];
    onDidChange(listener: () => any): Disposable;
  };
}
