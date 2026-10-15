import { contextBridge, ipcRenderer } from 'electron';
import { BinaryAPI, TerminalOptions, AppSettings, AISettings, AIMessage } from '../../src/types/electron';

const binaryAPI: BinaryAPI = {
  // Dialogs
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveFileDialog: (defaultName?: string) => ipcRenderer.invoke('dialog:saveFile', defaultName),

  // Filesystem
  readDirectory: (dirPath: string, maxDepth?: number) => ipcRenderer.invoke('fs:readDirectory', dirPath, maxDepth),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  readImage: (filePath: string) => ipcRenderer.invoke('fs:readImage', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  createFile: (filePath: string, content?: string) => ipcRenderer.invoke('fs:createFile', filePath, content),
  createFolder: (folderPath: string) => ipcRenderer.invoke('fs:createFolder', folderPath),
  deleteEntry: (targetPath: string) => ipcRenderer.invoke('fs:deleteEntry', targetPath),
  trashEntry: (targetPath: string) => ipcRenderer.invoke('fs:trashEntry', targetPath),
  renameEntry: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:renameEntry', oldPath, newPath),
  duplicateEntry: (srcPath: string) => ipcRenderer.invoke('fs:duplicateEntry', srcPath),
  revealInExplorer: (targetPath: string) => ipcRenderer.invoke('fs:revealInExplorer', targetPath),
  watchDirectory: (dirPath: string) => ipcRenderer.invoke('fs:watchDirectory', dirPath),
  unwatchDirectory: (dirPath?: string) => ipcRenderer.invoke('fs:unwatchDirectory', dirPath),
  onFilesystemEvent: (callback: (event: { type: string; path: string }) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('fs:event', subscription);
    return () => ipcRenderer.removeListener('fs:event', subscription);
  },

  // Terminal
  createTerminal: (options: TerminalOptions) => ipcRenderer.invoke('terminal:create', options),
  writeTerminal: (id: string, data: string) => ipcRenderer.send('terminal:write', id, data),
  resizeTerminal: (id: string, cols: number, rows: number) => ipcRenderer.send('terminal:resize', id, cols, rows),
  killTerminal: (id: string) => ipcRenderer.send('terminal:kill', id),
  onTerminalData: (id: string, callback: (data: string) => void) => {
    const channel = `terminal:data:${id}`;
    const listener = (_event: any, data: string) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onTerminalExit: (id: string, callback: (exitCode: number) => void) => {
    const channel = `terminal:exit:${id}`;
    const listener = (_event: any, code: number) => callback(code);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  // Git
  gitGetStatus: (cwd: string) => ipcRenderer.invoke('git:getStatus', cwd),
  gitStage: (cwd: string, files: string[]) => ipcRenderer.invoke('git:stage', cwd, files),
  gitUnstage: (cwd: string, files: string[]) => ipcRenderer.invoke('git:unstage', cwd, files),
  gitCommit: (cwd: string, message: string) => ipcRenderer.invoke('git:commit', cwd, message),
  gitGetBranches: (cwd: string) => ipcRenderer.invoke('git:getBranches', cwd),
  gitCheckout: (cwd: string, branchName: string) => ipcRenderer.invoke('git:checkout', cwd, branchName),
  gitCreateBranch: (cwd: string, branchName: string) => ipcRenderer.invoke('git:createBranch', cwd, branchName),
  gitGetDiff: (cwd: string, filePath?: string) => ipcRenderer.invoke('git:getDiff', cwd, filePath),

  // Search
  searchProject: (options) => ipcRenderer.invoke('search:project', options),
  replaceInFiles: (options) => ipcRenderer.invoke('search:replace', options),

  // Settings
  loadSettings: (workspacePath?: string) => ipcRenderer.invoke('settings:load', workspacePath),
  saveSettings: (settings: AppSettings, scope?: 'user' | 'workspace', workspacePath?: string) =>
    ipcRenderer.invoke('settings:save', settings, scope, workspacePath),
  getRecentProjects: () => ipcRenderer.invoke('settings:getRecentProjects'),
  addRecentProject: (p: string) => ipcRenderer.invoke('settings:addRecentProject', p),
  removeRecentProject: (p: string) => ipcRenderer.invoke('settings:removeRecentProject', p),
  clearRecentProjects: () => ipcRenderer.invoke('settings:clearRecentProjects'),

  // Extensions
  listExtensions: () => ipcRenderer.invoke('extensions:list'),
  toggleExtension: (id: string, enabled: boolean) => ipcRenderer.invoke('extensions:toggle', id, enabled),
  searchMarketplaceExtensions: (query: string) => ipcRenderer.invoke('extensions:search', query),
  installExtension: (id: string, downloadUrl?: string) => ipcRenderer.invoke('extensions:install', id, downloadUrl),
  uninstallExtension: (id: string) => ipcRenderer.invoke('extensions:uninstall', id),
  getExtensionRegistry: () => ipcRenderer.invoke('extensions:get-registry'),
  reconcileExtensions: () => ipcRenderer.invoke('extensions:reconcile'),
  importVSCodeExtensions: () => ipcRenderer.invoke('extensions:import-vscode'),
  getVSCodeExtensionCount: () => ipcRenderer.invoke('extensions:get-vscode-count'),
  getExtensionDashboard: () => ipcRenderer.invoke('extensions:dashboard'),
  getExtensionLifecycle: () => ipcRenderer.invoke('extensions:lifecycle'),
  executeExtensionCommand: (cmd: string, ...args: any[]) => ipcRenderer.invoke('extensions:execute-command', cmd, ...args),
  getExtensionCommands: () => ipcRenderer.invoke('extensions:get-commands'),
  getExtensionStatusBarItems: () => ipcRenderer.invoke('extensions:get-status-bar-items'),
  getExtensionDiagnostics: () => ipcRenderer.invoke('extensions:get-diagnostics'),
  syncExtensionDoc: (uri: string, languageId: string, version: number, text: string, isDirty?: boolean) =>
    ipcRenderer.invoke('extensions:sync-doc', uri, languageId, version, text, isDirty),
  saveExtensionDoc: (uri: string) => ipcRenderer.invoke('extensions:save-doc', uri),
  closeExtensionDoc: (uri: string) => ipcRenderer.invoke('extensions:close-doc', uri),
  setExtensionActiveEditor: (uri: string, selection?: any) =>
    ipcRenderer.invoke('extensions:set-active-editor', uri, selection),
  provideExtensionFormatting: (uri: string, options?: any) =>
    ipcRenderer.invoke('extensions:provide-formatting', uri, options),
  provideExtensionCompletions: (uri: string, position: { line: number; character: number }, context?: any) =>
    ipcRenderer.invoke('extensions:provide-completions', uri, position, context),
  provideExtensionHover: (uri: string, position: { line: number; character: number }) =>
    ipcRenderer.invoke('extensions:provide-hover', uri, position),
  provideExtensionDefinition: (uri: string, position: { line: number; character: number }) =>
    ipcRenderer.invoke('extensions:provide-definition', uri, position),
  provideExtensionCodeActions: (uri: string, range: any, context?: any) =>
    ipcRenderer.invoke('extensions:provide-code-actions', uri, range, context),
  provideExtensionSymbols: (uri: string) =>
    ipcRenderer.invoke('extensions:provide-symbols', uri),
  provideExtensionReferences: (uri: string, position: { line: number; character: number }, context?: any) =>
    ipcRenderer.invoke('extensions:provide-references', uri, position, context),
  notifyWorkspaceChanged: (folderPath: string) =>
    ipcRenderer.invoke('extensions:workspace-changed', folderPath),
  notifySettingsChanged: (settings: any) =>
    ipcRenderer.invoke('extensions:settings-changed', settings),
  onExtensionStatusBarUpdated: (callback: (items: any[]) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('extensions:statusBarUpdated', listener);
    return () => ipcRenderer.removeListener('extensions:statusBarUpdated', listener);
  },
  onExtensionDiagnosticsUpdated: (callback: (diagnostics: any[]) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('extensions:diagnosticsUpdated', listener);
    return () => ipcRenderer.removeListener('extensions:diagnosticsUpdated', listener);
  },
  onExtensionOutput: (callback: (data: { channel: string; text: string }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('extensions:output', listener);
    return () => ipcRenderer.removeListener('extensions:output', listener);
  },
  onExtensionInstallProgress: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('extensions:install-progress', listener);
    return () => ipcRenderer.removeListener('extensions:install-progress', listener);
  },
  getExtensionActivityBar: () => ipcRenderer.invoke('extensions:get-activity-bar'),
  getExtensionViews: (containerId?: string) => ipcRenderer.invoke('extensions:get-views', containerId),
  getExtensionMenus: (location: string, context?: any) => ipcRenderer.invoke('extensions:get-menus', location, context),
  getExtensionCustomEditors: () => ipcRenderer.invoke('extensions:get-custom-editors'),
  loadUnpackedExtension: (folderPath: string) => ipcRenderer.invoke('extensions:load-unpacked', folderPath),
  restartExtensionHost: () => ipcRenderer.invoke('extensions:restart-host'),
  getExtensionHostStatus: () => ipcRenderer.invoke('extensions:host-status'),
  getTreeChildren: (viewId: string, elementId?: string) => ipcRenderer.invoke('views:getChildren', viewId, elementId),
  resolveDialog: (dialogId: string, result: any) => ipcRenderer.invoke('dialog:resolve', dialogId, result),
  onExtensionHostCrashed: (callback: (data: { error: string; crashedAt: string }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('extensions:hostCrashed', listener);
    return () => ipcRenderer.removeListener('extensions:hostCrashed', listener);
  },
  onExtensionViewsUpdated: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('extensions:viewsUpdated', listener);
    return () => ipcRenderer.removeListener('extensions:viewsUpdated', listener);
  },
  onExtensionsChanged: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('extensions:changed', listener);
    return () => ipcRenderer.removeListener('extensions:changed', listener);
  },
  onDialogShowMessage: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('dialog:showMessage', listener);
    return () => ipcRenderer.removeListener('dialog:showMessage', listener);
  },
  onDialogShowInputBox: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('dialog:showInputBox', listener);
    return () => ipcRenderer.removeListener('dialog:showInputBox', listener);
  },
  onDialogShowQuickPick: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('dialog:showQuickPick', listener);
    return () => ipcRenderer.removeListener('dialog:showQuickPick', listener);
  },
  onEditorInsertText: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('editor:insertText', listener);
    return () => ipcRenderer.removeListener('editor:insertText', listener);
  },
  onEditorReplaceRange: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('editor:replaceRange', listener);
    return () => ipcRenderer.removeListener('editor:replaceRange', listener);
  },
  onEditorOpenFile: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('editor:openFile', listener);
    return () => ipcRenderer.removeListener('editor:openFile', listener);
  },

  // AI
  aiExecuteTool: (toolName: string, args: any, workspacePath: string) =>
    ipcRenderer.invoke('ai:executeTool', toolName, args, workspacePath),
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
  }) => ipcRenderer.invoke('ai:sendPrompt', request),

  // C++ Toolchain & Debugger
  cppGetToolchainInfo: (forceRefresh?: boolean) => ipcRenderer.invoke('cpp:getToolchainInfo', forceRefresh),
  cppCompile: (options) => ipcRenderer.invoke('cpp:compile', options),
  cppStartDebugging: (options) => ipcRenderer.invoke('cpp:startDebugging', options),
  cppContinue: () => ipcRenderer.invoke('cpp:continue'),
  cppStepOver: () => ipcRenderer.invoke('cpp:stepOver'),
  cppStepInto: () => ipcRenderer.invoke('cpp:stepInto'),
  cppStepOut: () => ipcRenderer.invoke('cpp:stepOut'),
  cppPause: () => ipcRenderer.invoke('cpp:pause'),
  cppStopDebug: () => ipcRenderer.invoke('cpp:stop'),
  cppGetCallStack: () => ipcRenderer.invoke('cpp:getCallStack'),
  cppGetVariables: () => ipcRenderer.invoke('cpp:getVariables'),
  cppEvaluateExpression: (expr: string) => ipcRenderer.invoke('cpp:evaluateExpression', expr),
  cppAddBreakpoint: (file: string, line: number) => ipcRenderer.invoke('cpp:addBreakpoint', file, line),
  cppRemoveBreakpoint: (file: string, line: number) => ipcRenderer.invoke('cpp:removeBreakpoint', file, line),
  cppToggleBreakpoint: (file: string, line: number) => ipcRenderer.invoke('cpp:toggleBreakpoint', file, line),
  cppGetBreakpoints: () => ipcRenderer.invoke('cpp:getBreakpoints'),
  cppGetDebugStatus: () => ipcRenderer.invoke('cpp:getDebugStatus'),

  // C++ Project & CMake
  cppDetectProjectType: (workspaceDir: string) => ipcRenderer.invoke('cpp:detectProjectType', workspaceDir),
  cppCreateConsoleProject: (targetDir: string, projectName?: string) => ipcRenderer.invoke('cpp:createConsoleProject', targetDir, projectName),
  cppCreateCmakeProject: (targetDir: string, projectName?: string) => ipcRenderer.invoke('cpp:createCmakeProject', targetDir, projectName),
  cppConfigureCmake: (workspaceDir: string, buildType?: 'Debug' | 'Release') => ipcRenderer.invoke('cpp:configureCmake', workspaceDir, buildType),
  cppBuildCmake: (workspaceDir: string, buildType?: 'Debug' | 'Release') => ipcRenderer.invoke('cpp:buildCmake', workspaceDir, buildType),
  cppCleanCmake: (workspaceDir: string) => ipcRenderer.invoke('cpp:cleanCmake', workspaceDir),
  cppBuildSimpleProject: (workspaceDir: string, standard?: string) => ipcRenderer.invoke('cpp:buildSimpleProject', workspaceDir, standard),
  cppCancelProjectBuild: () => ipcRenderer.invoke('cpp:cancelProjectBuild'),

  // C++ External Libraries
  cppGetLibraryCatalog: () => ipcRenderer.invoke('cpp:getLibraryCatalog'),
  cppGetProjectLibraries: (workspaceDir: string) => ipcRenderer.invoke('cpp:getProjectLibraries', workspaceDir),
  cppAddLibraryToProject: (workspaceDir: string, libraryId: string) => ipcRenderer.invoke('cpp:addLibraryToProject', workspaceDir, libraryId),
  onCppDebuggerStateChanged: (callback: (state: any) => void) => {
    const listener = (_event: any, state: any) => callback(state);
    ipcRenderer.on('debugger:stateChanged', listener);
    return () => ipcRenderer.removeListener('debugger:stateChanged', listener);
  },
  onCppDebuggerStopped: (callback: (event: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('debugger:stopped', listener);
    return () => ipcRenderer.removeListener('debugger:stopped', listener);
  },
  onCppDebuggerContinued: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('debugger:continued', listener);
    return () => ipcRenderer.removeListener('debugger:continued', listener);
  },
  onCppDebuggerCallStack: (callback: (frames: any[]) => void) => {
    const listener = (_event: any, frames: any[]) => callback(frames);
    ipcRenderer.on('debugger:callStack', listener);
    return () => ipcRenderer.removeListener('debugger:callStack', listener);
  },
  onCppDebuggerVariables: (callback: (variables: any[]) => void) => {
    const listener = (_event: any, variables: any[]) => callback(variables);
    ipcRenderer.on('debugger:variables', listener);
    return () => ipcRenderer.removeListener('debugger:variables', listener);
  },
  onCppDebuggerOutput: (callback: (data: { type: string; text: string }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('debugger:output', listener);
    return () => ipcRenderer.removeListener('debugger:output', listener);
  },
  onCppDebuggerTerminated: (callback: (data: { exitCode: number; error?: string }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('debugger:terminated', listener);
    return () => ipcRenderer.removeListener('debugger:terminated', listener);
  },
  onCppDebuggerBreakpointChanged: (callback: (bp: any) => void) => {
    const listener = (_event: any, bp: any) => callback(bp);
    ipcRenderer.on('debugger:breakpointChanged', listener);
    return () => ipcRenderer.removeListener('debugger:breakpointChanged', listener);
  },

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  openExternalUrl: (url: string) => ipcRenderer.send('system:openExternal', url),
  getPlatform: () => process.platform,
};

contextBridge.exposeInMainWorld('binaryAPI', binaryAPI);

