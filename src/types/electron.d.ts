export interface FileItem {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  extension?: string;
  children?: FileItem[];
  isLoaded?: boolean;
}

export interface SearchMatch {
  line: number;
  column: number;
  text: string;
  matchLength: number;
}

export interface SearchFileResult {
  filePath: string;
  relativePath: string;
  matches: SearchMatch[];
}

export interface GitStatusResult {
  isRepo: boolean;
  branch: string;
  ahead: number;
  behind: number;
  modified: string[];
  staged: string[];
  untracked: string[];
  deleted: string[];
}

export interface GitBranch {
  name: string;
  isCurrent: boolean;
}

export interface TerminalOptions {
  id: string;
  cwd?: string;
  shell?: string;
  cols?: number;
  rows?: number;
}

export type AIModelType = 'low' | 'medium' | 'high' | 'thinking';

export interface AIMemoryItem {
  id: string;
  text: string;
  enabled: boolean;
  createdAt: number;
}

export interface AISettings {
  provider: 'openai' | 'gemini' | 'anthropic' | 'ollama' | 'builtin';
  endpoint: string;
  apiKey: string;
  model: string;
  modelType?: AIModelType;
  temperature: number;
  maxTokens: number;
  autoApproveSafeTools: boolean;
  systemPromptExtra?: string;
}

export interface GeneralSettings {
  startupAction: 'welcome' | 'reopenLast' | 'empty';
  confirmDelete: boolean;
  deletePermanently: boolean;
  autoSave: 'off' | 'afterDelay' | 'onFocusChange';
  autoSaveDelay: number;
  telemetry: boolean;
  theme?: string;
  fontFamily?: string;
  fontSize?: number;
  defaultProjectDir?: string;
}

export interface AppearanceSettings {
  theme: 'binary-dark' | 'binary-midnight' | 'binary-cyber' | 'binary-nord' | 'binary-monokai' | 'binary-light';
  uiScale: number;
  density: 'compact' | 'comfortable';
  sidebarPosition: 'left' | 'right';
  showActivityBar: boolean;
  showStatusBar: boolean;
  showMinimap: boolean;
}

export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  insertSpaces: boolean;
  lineHeight: number;
  lineNumbers: 'on' | 'off' | 'relative';
  cursorStyle: 'line' | 'block' | 'underline' | 'line-thin';
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  minimap: boolean;
  wordWrap: 'on' | 'off' | 'wordWrapColumn';
  bracketPairColorization: boolean;
  smoothScrolling: boolean;
  stickyScroll: boolean;
  formatOnSave: boolean;
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'all';
  mouseWheelZoom: boolean;
}

export interface FilesSettings {
  exclude: string[];
  autoSave: 'off' | 'afterDelay' | 'onFocusChange';
  autoSaveDelay: number;
  defaultEncoding: string;
  trimTrailingWhitespace: boolean;
  insertFinalNewline: boolean;
  maxFileSizeMB: number;
}

export interface TerminalSettings {
  defaultShell: 'powershell' | 'cmd' | 'bash';
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  scrollback: number;
  workingDirectory: 'workspace' | 'home' | 'custom';
  customCwd?: string;
  copyOnSelect: boolean;
}

export interface KeyboardSettings {
  shortcuts: Record<string, string>;
}

export interface ExtensionsSettings {
  autoUpdate: boolean;
  autoEnable: boolean;
  confirmInstall: boolean;
  developerMode: boolean;
}

export interface SecuritySettings {
  trustWorkspace: boolean;
  allowNodeInTerminal: boolean;
  warnExternalLinks: boolean;
  isolateExtensionProcesses: boolean;
}

export interface WorkspaceSettingsConfig {
  workspacePath?: string;
  syncWithFile: boolean;
}

export interface AppSettings {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  editor: EditorSettings;
  files: FilesSettings;
  terminal: TerminalSettings;
  keyboard: KeyboardSettings;
  extensions: ExtensionsSettings;
  ai: AISettings;
  security: SecuritySettings;
  workspace: WorkspaceSettingsConfig;
}

export interface ExtensionManifest {
  id: string;
  name: string;
  displayName: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  enabled: boolean;
  categories: string[];
  source?: 'builtin' | 'vscode' | 'binary' | 'unpacked' | 'marketplace';
  installedPath?: string;
  main?: string;
  activationEvents?: string[];
  permissions?: string[];
  engines?: any;
  contributes?: {
    commands?: Array<{ command: string; title: string }>;
    themes?: Array<{ id: string; label: string; uiTheme: string; path: string }>;
    snippets?: Array<{ language: string; path: string }>;
    [key: string]: any;
  };
}

export interface MarketplaceExtensionItem {
  id: string;
  name: string;
  displayName: string;
  publisher: string;
  version: string;
  description: string;
  icon?: string;
  downloadUrl?: string;
  downloadCount?: number;
  rating?: number;
  installed?: boolean;
}

export interface ExtensionInstallProgress {
  extensionId: string;
  stage: 'downloading' | 'validating' | 'extracting' | 'completed' | 'error';
  progress: number; // 0 to 100
  bytesReceived?: number;
  totalBytes?: number;
  speed?: string;
  message?: string;
  error?: string;
}

export interface AIToolCall {
  id: string;
  name: string;
  params: any;
  status: 'pending' | 'requires_approval' | 'executing' | 'completed' | 'failed' | 'denied';
  result?: any;
  error?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  modelType?: AIModelType;
  attachedFiles?: Array<{ path: string; name: string }>;
  toolCalls?: AIToolCall[];
  diffProposal?: {
    filePath: string;
    originalContent: string;
    proposedContent: string;
    status: 'pending' | 'accepted' | 'rejected';
  };
}

export interface BinaryAPI {
  // Dialogs
  openFolderDialog: () => Promise<string | null>;
  openFileDialog: () => Promise<string | null>;
  saveFileDialog: (defaultName?: string) => Promise<string | null>;

  // Filesystem
  readDirectory: (dirPath: string, maxDepth?: number) => Promise<FileItem[]>;
  readFile: (filePath: string) => Promise<{ content: string; encoding: string }>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  createFile: (filePath: string, initialContent?: string) => Promise<boolean>;
  createFolder: (folderPath: string) => Promise<boolean>;
  deleteEntry: (targetPath: string) => Promise<boolean>;
  trashEntry: (targetPath: string) => Promise<boolean>;
  renameEntry: (oldPath: string, newPath: string) => Promise<boolean>;
  duplicateEntry: (srcPath: string) => Promise<string>;
  revealInExplorer: (targetPath: string) => Promise<void>;
  watchDirectory: (dirPath: string) => Promise<boolean>;
  unwatchDirectory: (dirPath?: string) => Promise<boolean>;
  onFilesystemEvent: (callback: (event: { type: string; path: string }) => void) => () => void;

  // Terminal (PTY)
  createTerminal: (options: TerminalOptions) => Promise<boolean>;
  writeTerminal: (id: string, data: string) => void;
  resizeTerminal: (id: string, cols: number, rows: number) => void;
  killTerminal: (id: string) => void;
  onTerminalData: (id: string, callback: (data: string) => void) => () => void;
  onTerminalExit: (id: string, callback: (exitCode: number) => void) => () => void;

  // Git
  gitGetStatus: (cwd: string) => Promise<GitStatusResult>;
  gitStage: (cwd: string, files: string[]) => Promise<boolean>;
  gitUnstage: (cwd: string, files: string[]) => Promise<boolean>;
  gitCommit: (cwd: string, message: string) => Promise<{ success: boolean; output: string }>;
  gitGetBranches: (cwd: string) => Promise<GitBranch[]>;
  gitCheckout: (cwd: string, branchName: string) => Promise<boolean>;
  gitCreateBranch: (cwd: string, branchName: string) => Promise<boolean>;
  gitGetDiff: (cwd: string, filePath?: string) => Promise<string>;

  // Search
  searchProject: (options: {
    folderPath: string;
    query: string;
    isRegex?: boolean;
    caseSensitive?: boolean;
    wholeWord?: boolean;
    includePattern?: string;
    excludePattern?: string;
  }) => Promise<SearchFileResult[]>;
  replaceInFiles: (options: {
    folderPath: string;
    query: string;
    replaceText: string;
    files: string[];
    isRegex?: boolean;
    caseSensitive?: boolean;
  }) => Promise<{ modifiedCount: number }>;

  // Settings
  loadSettings: (workspacePath?: string) => Promise<AppSettings>;
  saveSettings: (settings: AppSettings, scope?: 'user' | 'workspace', workspacePath?: string) => Promise<boolean>;
  getRecentProjects: () => Promise<string[]>;
  addRecentProject: (path: string) => Promise<void>;
  removeRecentProject: (path: string) => Promise<void>;
  clearRecentProjects: () => Promise<void>;

  // Extensions
  listExtensions: () => Promise<ExtensionManifest[]>;
  toggleExtension: (id: string, enabled: boolean) => Promise<boolean>;
  searchMarketplaceExtensions: (query: string) => Promise<MarketplaceExtensionItem[]>;
  installExtension: (id: string, downloadUrl?: string) => Promise<{ success: boolean; error?: string; extension?: ExtensionManifest }>;
  uninstallExtension: (id: string) => Promise<{ success: boolean; error?: string }>;
  getExtensionRegistry: () => Promise<any[]>;
  reconcileExtensions: () => Promise<{ added: number; updated: number; removed: number }>;
  importVSCodeExtensions: () => Promise<{ success: boolean; count: number; extensions: ExtensionManifest[] }>;
  getVSCodeExtensionCount: () => Promise<number>;
  getExtensionDashboard: () => Promise<any>;
  getExtensionLifecycle: () => Promise<any[]>;
  executeExtensionCommand: (cmd: string, ...args: any[]) => Promise<any>;
  getExtensionCommands: () => Promise<Array<{ id: string; title: string; category?: string }>>;
  getExtensionStatusBarItems: () => Promise<any[]>;
  getExtensionDiagnostics: () => Promise<Array<{ uri: string; diagnostics: any[] }>>;
  syncExtensionDoc: (uri: string, languageId: string, version: number, text: string, isDirty?: boolean) => Promise<any>;
  saveExtensionDoc: (uri: string) => Promise<void>;
  closeExtensionDoc: (uri: string) => Promise<void>;
  setExtensionActiveEditor: (uri: string, selection?: any) => Promise<void>;
  provideExtensionFormatting: (uri: string, options?: any) => Promise<any[]>;
  provideExtensionCompletions: (uri: string, position: { line: number; character: number }, context?: any) => Promise<any[]>;
  provideExtensionHover: (uri: string, position: { line: number; character: number }) => Promise<any>;
  provideExtensionDefinition: (uri: string, position: { line: number; character: number }) => Promise<any[]>;
  provideExtensionCodeActions: (uri: string, range: any, context?: any) => Promise<any[]>;
  provideExtensionSymbols: (uri: string) => Promise<any[]>;
  provideExtensionReferences: (uri: string, position: { line: number; character: number }, context?: any) => Promise<any[]>;
  notifyWorkspaceChanged: (folderPath: string) => Promise<void>;
  notifySettingsChanged: (settings: any) => Promise<void>;
  onExtensionStatusBarUpdated: (callback: (items: any[]) => void) => () => void;
  onExtensionDiagnosticsUpdated: (callback: (diagnostics: any[]) => void) => () => void;
  onExtensionOutput: (callback: (data: { channel: string; text: string }) => void) => () => void;
  onExtensionInstallProgress: (callback: (progress: ExtensionInstallProgress) => void) => () => void;
  getExtensionActivityBar: () => Promise<Array<{ id: string; title: string; icon: string; priority?: number; badge?: number | string; extensionId: string }>>;
  getExtensionViews: (containerId?: string) => Promise<Array<{ id: string; container: string; name: string; type?: string; extensionId: string }>>;
  getExtensionMenus: (location: string, context?: any) => Promise<Array<{ command: string; title: string; category?: string; icon?: string; group?: string; alt?: string; extensionId?: string }>>;
  getExtensionCustomEditors: () => Promise<Array<{ viewType: string; displayName: string; selector: Array<{ filenamePattern: string }>; extensionId: string }>>;
  loadUnpackedExtension: (folderPath: string) => Promise<{ success: boolean; extension?: ExtensionManifest; error?: string }>;
  restartExtensionHost: () => Promise<any>;
  getExtensionHostStatus: () => Promise<{ state: string; pid?: number; uptimeMs: number; crashedAt?: string; crashError?: string; activeExtensionsCount: number }>;
  getTreeChildren: (viewId: string, elementId?: string) => Promise<any[]>;
  resolveDialog: (dialogId: string, result: any) => Promise<void>;
  onExtensionHostCrashed: (callback: (data: { error: string; crashedAt: string }) => void) => () => void;
  onExtensionViewsUpdated: (callback: (data: any) => void) => () => void;
  onExtensionsChanged: (callback: () => void) => () => void;
  onDialogShowMessage: (callback: (data: { dialogId: string; type: 'info' | 'warning' | 'error'; message: string; items: string[] }) => void) => () => void;
  onDialogShowInputBox: (callback: (data: { dialogId: string; options: any }) => void) => () => void;
  onDialogShowQuickPick: (callback: (data: { dialogId: string; items: any[]; options: any }) => void) => () => void;
  onEditorInsertText: (callback: (data: { uri: string; position: { line: number; character: number }; text: string }) => void) => () => void;
  onEditorReplaceRange: (callback: (data: { uri: string; range: any; text: string }) => void) => () => void;
  onEditorOpenFile: (callback: (data: { filePath: string; options?: any }) => void) => () => void;

  // AI Backend Dispatch
  aiExecuteTool: (toolName: string, args: any, workspacePath: string) => Promise<any>;
  aiSendPrompt: (request: {
    messages: AIMessage[];
    settings: AISettings;
    context: {
      workspacePath: string;
      activeFilePath?: string;
      selectedCode?: string;
      openFiles: string[];
      memories?: string[];
    };
  }) => Promise<{ reply: string; toolCalls?: any[]; diff?: any }>;

  // Image reading
  readImage: (filePath: string) => Promise<{ dataUrl?: string; size?: number; mimeType?: string; error?: string }>;

  // C++ Toolchain & Debugger
  cppGetToolchainInfo: (forceRefresh?: boolean) => Promise<CppToolchainInfo>;
  cppCompile: (options: CppCompileOptions) => Promise<CppCompileResult>;
  cppStartDebugging: (options: CppDebugLaunchOptions) => Promise<{ success: boolean; compileResult?: CppCompileResult; error?: string }>;
  cppContinue: () => Promise<boolean>;
  cppStepOver: () => Promise<boolean>;
  cppStepInto: () => Promise<boolean>;
  cppStepOut: () => Promise<boolean>;
  cppPause: () => Promise<boolean>;
  cppStopDebug: () => Promise<void>;
  cppGetCallStack: () => Promise<CppStackFrame[]>;
  cppGetVariables: () => Promise<CppDebugVariable[]>;
  cppEvaluateExpression: (expr: string) => Promise<string>;
  cppAddBreakpoint: (file: string, line: number) => Promise<CppBreakpointInfo>;
  cppRemoveBreakpoint: (file: string, line: number) => Promise<boolean>;
  cppToggleBreakpoint: (file: string, line: number) => Promise<{ action: 'added' | 'removed'; breakpoint?: CppBreakpointInfo }>;
  cppGetBreakpoints: () => Promise<Array<{ file: string; line: number; enabled: boolean }>>;
  cppGetDebugStatus: () => Promise<{ state: CppDebuggerState }>;

  // C++ Project & CMake
  cppDetectProjectType: (workspaceDir: string) => Promise<'cmake' | 'simple' | 'single-file'>;
  cppCreateConsoleProject: (targetDir: string, projectName?: string) => Promise<void>;
  cppCreateCmakeProject: (targetDir: string, projectName?: string) => Promise<void>;
  cppConfigureCmake: (workspaceDir: string, buildType?: 'Debug' | 'Release') => Promise<CppProjectBuildResult>;
  cppBuildCmake: (workspaceDir: string, buildType?: 'Debug' | 'Release') => Promise<CppProjectBuildResult>;
  cppCleanCmake: (workspaceDir: string) => Promise<CppProjectBuildResult>;
  cppBuildSimpleProject: (workspaceDir: string, standard?: string) => Promise<CppProjectBuildResult>;
  cppCancelProjectBuild: () => Promise<boolean>;

  // C++ External Libraries
  cppGetLibraryCatalog: () => Promise<CppLibraryInfo[]>;
  cppGetProjectLibraries: (workspaceDir: string) => Promise<string[]>;
  cppAddLibraryToProject: (workspaceDir: string, libraryId: string) => Promise<{ success: boolean; message: string }>;

  onCppDebuggerStateChanged: (callback: (state: CppDebuggerState) => void) => () => void;
  onCppDebuggerStopped: (callback: (event: CppStoppedEvent) => void) => () => void;
  onCppDebuggerContinued: (callback: () => void) => () => void;
  onCppDebuggerCallStack: (callback: (frames: CppStackFrame[]) => void) => () => void;
  onCppDebuggerVariables: (callback: (variables: CppDebugVariable[]) => void) => () => void;
  onCppDebuggerOutput: (callback: (data: { type: string; text: string }) => void) => () => void;
  onCppDebuggerTerminated: (callback: (data: { exitCode: number; error?: string }) => void) => () => void;
  onCppDebuggerBreakpointChanged: (callback: (bp: CppBreakpointInfo) => void) => () => void;

  // System & Window
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  openExternalUrl: (url: string) => void;
  getPlatform: () => string;
}

export interface CppToolchainInfo {
  available: boolean;
  rootPath: string;
  compilerPath: string;
  cCompilerPath: string;
  debuggerPath: string;
  makePath: string;
  cmakePath: string;
  ninjaPath: string;
  clangdPath: string;
  compilerVersion: string;
  cCompilerVersion: string;
  debuggerVersion: string;
  cmakeVersion: string;
  ninjaVersion: string;
  clangdVersion: string;
  runtimeLibsAvailable: boolean;
  licenseNoticesAvailable: boolean;
  environment: Record<string, string>;
  details: string;
}

export interface CppProjectBuildResult {
  success: boolean;
  exitCode: number | null;
  executablePath: string | null;
  diagnostics: CppDiagnostic[];
  stdout: string;
  stderr: string;
  commandExecuted: string;
}

export interface CppLibraryInfo {
  id: string;
  name: string;
  version: string;
  category: 'graphics' | 'utility' | 'game' | 'math' | 'vision';
  description: string;
  headerOnly: boolean;
  bundledOffline: boolean;
  headerInclude: string;
  cmakeSnippet: string;
  sampleCode: string;
  website: string;
}

export interface CppCompileOptions {
  sourceFilePath: string;
  workspacePath?: string;
  outputBinaryPath?: string;
  standard?: string;
  optimization?: string;
  debugSymbols?: boolean;
  warningFlags?: string[];
  extraFlags?: string[];
  defines?: string[];
  includePaths?: string[];
  libPaths?: string[];
  libraries?: string[];
  timeoutMs?: number;
}

export interface CppDiagnosticItem {
  id: string;
  filePath: string;
  fileName: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source: string;
}

export type CppDiagnostic = CppDiagnosticItem;

export interface CppCompileResult {
  success: boolean;
  exitCode: number;
  output: string;
  executablePath: string;
  diagnostics: CppDiagnosticItem[];
  durationMs: number;
  error?: string;
}

export interface CppDebugLaunchOptions {
  sourceFilePath: string;
  workspacePath?: string;
  standard?: string;
  args?: string[];
  stopAtEntry?: boolean;
}

export type CppDebuggerState = 'idle' | 'compiling' | 'launching' | 'running' | 'paused' | 'stopped' | 'error';

export interface CppBreakpointInfo {
  id: number;
  file: string;
  line: number;
  verified: boolean;
  enabled: boolean;
}

export interface CppStackFrame {
  id: number;
  level: number;
  functionName: string;
  file: string;
  line: number;
  address: string;
}

export interface CppDebugVariable {
  name: string;
  value: string;
  type?: string;
  hasChildren?: boolean;
}

export interface CppStoppedEvent {
  reason: 'breakpoint-hit' | 'step-end' | 'function-finished' | 'signal-received' | 'exception' | 'exited' | 'unknown';
  file?: string;
  line?: number;
  functionName?: string;
  frame?: CppStackFrame;
  description?: string;
  exitCode?: number;
}

declare global {
  interface Window {
    binaryAPI: BinaryAPI;
  }
}

