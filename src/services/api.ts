import { BinaryAPI, FileItem, SearchFileResult, GitStatusResult, GitBranch, AppSettings, ExtensionManifest, MarketplaceExtensionItem, AIMessage, AISettings } from '../types/electron';

// Fallback for browser testing or before electron preload binds
const isElectron = typeof window !== 'undefined' && !!window.binaryAPI;

export const api: BinaryAPI = {
  openFolderDialog: async () => {
    if (isElectron) return window.binaryAPI.openFolderDialog();
    return null;
  },

  openFileDialog: async () => {
    if (isElectron) return window.binaryAPI.openFileDialog();
    return null;
  },

  saveFileDialog: async (defaultName) => {
    if (isElectron) return window.binaryAPI.saveFileDialog(defaultName);
    return null;
  },

  readDirectory: async (dirPath: string, maxDepth?: number): Promise<FileItem[]> => {
    if (isElectron) return window.binaryAPI.readDirectory(dirPath, maxDepth);
    return [];
  },

  readFile: async (filePath: string) => {
    if (isElectron) return window.binaryAPI.readFile(filePath);
    return { content: '', encoding: 'utf-8' };
  },

  readImage: async (filePath: string) => {
    if (isElectron) return window.binaryAPI.readImage(filePath);
    return { error: 'Not available in browser' };
  },

  writeFile: async (filePath: string, content: string) => {
    if (isElectron) return window.binaryAPI.writeFile(filePath, content);
    return false;
  },

  createFile: async (filePath: string, content?: string) => {
    if (isElectron) return window.binaryAPI.createFile(filePath, content);
    return false;
  },

  createFolder: async (folderPath: string) => {
    if (isElectron) return window.binaryAPI.createFolder(folderPath);
    return false;
  },

  deleteEntry: async (targetPath: string) => {
    if (isElectron) return window.binaryAPI.deleteEntry(targetPath);
    return false;
  },

  trashEntry: async (targetPath: string) => {
    if (isElectron) return window.binaryAPI.trashEntry(targetPath);
    return false;
  },

  renameEntry: async (oldPath: string, newPath: string) => {
    if (isElectron) return window.binaryAPI.renameEntry(oldPath, newPath);
    return false;
  },

  duplicateEntry: async (srcPath: string) => {
    if (isElectron) return window.binaryAPI.duplicateEntry(srcPath);
    return srcPath;
  },

  revealInExplorer: async (targetPath: string) => {
    if (isElectron) return window.binaryAPI.revealInExplorer(targetPath);
  },

  watchDirectory: async (dirPath: string) => {
    if (isElectron) return window.binaryAPI.watchDirectory(dirPath);
    return false;
  },

  unwatchDirectory: async (dirPath?: string) => {
    if (isElectron) return window.binaryAPI.unwatchDirectory(dirPath);
    return false;
  },

  onFilesystemEvent: (callback) => {
    if (isElectron) return window.binaryAPI.onFilesystemEvent(callback);
    return () => {};
  },

  createTerminal: async (options) => {
    if (isElectron) return window.binaryAPI.createTerminal(options);
    return false;
  },

  writeTerminal: (id, data) => {
    if (isElectron) window.binaryAPI.writeTerminal(id, data);
  },

  resizeTerminal: (id, cols, rows) => {
    if (isElectron) window.binaryAPI.resizeTerminal(id, cols, rows);
  },

  killTerminal: (id) => {
    if (isElectron) window.binaryAPI.killTerminal(id);
  },

  onTerminalData: (id, callback) => {
    if (isElectron) return window.binaryAPI.onTerminalData(id, callback);
    return () => {};
  },

  onTerminalExit: (id, callback) => {
    if (isElectron) return window.binaryAPI.onTerminalExit(id, callback);
    return () => {};
  },

  gitGetStatus: async (cwd: string): Promise<GitStatusResult> => {
    if (isElectron) return window.binaryAPI.gitGetStatus(cwd);
    return { isRepo: false, branch: '', ahead: 0, behind: 0, modified: [], staged: [], untracked: [], deleted: [] };
  },

  gitStage: async (cwd, files) => {
    if (isElectron) return window.binaryAPI.gitStage(cwd, files);
    return false;
  },

  gitUnstage: async (cwd, files) => {
    if (isElectron) return window.binaryAPI.gitUnstage(cwd, files);
    return false;
  },

  gitCommit: async (cwd, message) => {
    if (isElectron) return window.binaryAPI.gitCommit(cwd, message);
    return { success: false, output: 'Not running in Electron' };
  },

  gitGetBranches: async (cwd): Promise<GitBranch[]> => {
    if (isElectron) return window.binaryAPI.gitGetBranches(cwd);
    return [];
  },

  gitCheckout: async (cwd, branchName) => {
    if (isElectron) return window.binaryAPI.gitCheckout(cwd, branchName);
    return false;
  },

  gitCreateBranch: async (cwd, branchName) => {
    if (isElectron) return window.binaryAPI.gitCreateBranch(cwd, branchName);
    return false;
  },

  gitGetDiff: async (cwd, filePath) => {
    if (isElectron) return window.binaryAPI.gitGetDiff(cwd, filePath);
    return '';
  },

  searchProject: async (options): Promise<SearchFileResult[]> => {
    if (isElectron) return window.binaryAPI.searchProject(options);
    return [];
  },

  replaceInFiles: async (options) => {
    if (isElectron) return window.binaryAPI.replaceInFiles(options);
    return { modifiedCount: 0 };
  },

  loadSettings: async (workspacePath?: string): Promise<AppSettings> => {
    if (isElectron) return window.binaryAPI.loadSettings(workspacePath);
    return {
      general: {
        startupAction: 'welcome',
        confirmDelete: true,
        deletePermanently: false,
        autoSave: 'afterDelay',
        autoSaveDelay: 1000,
        telemetry: false,
        theme: 'binary-dark',
        fontFamily: "'JetBrains Mono', Consolas, monospace",
        fontSize: 14,
      },
      appearance: {
        theme: 'binary-dark',
        uiScale: 100,
        density: 'comfortable',
        sidebarPosition: 'left',
        showActivityBar: true,
        showStatusBar: true,
        showMinimap: true,
      },
      editor: {
        fontSize: 14,
        fontFamily: "'JetBrains Mono', Consolas, monospace",
        tabSize: 2,
        insertSpaces: true,
        lineHeight: 22,
        lineNumbers: 'on',
        cursorStyle: 'line',
        cursorBlinking: 'smooth',
        minimap: true,
        wordWrap: 'off',
        bracketPairColorization: true,
        smoothScrolling: true,
        stickyScroll: true,
        formatOnSave: true,
        renderWhitespace: 'selection',
        mouseWheelZoom: true,
      },
      files: {
        exclude: [],
        autoSave: 'afterDelay',
        autoSaveDelay: 1000,
        defaultEncoding: 'utf-8',
        trimTrailingWhitespace: true,
        insertFinalNewline: true,
        maxFileSizeMB: 20,
      },
      terminal: {
        defaultShell: 'powershell',
        fontSize: 13,
        fontFamily: "'JetBrains Mono', Consolas, monospace",
        lineHeight: 18,
        cursorStyle: 'block',
        cursorBlink: true,
        scrollback: 5000,
        workingDirectory: 'workspace',
        copyOnSelect: true,
      },
      keyboard: {
        shortcuts: {},
      },
      extensions: {
        autoUpdate: true,
        autoEnable: true,
        confirmInstall: true,
        developerMode: false,
      },
      ai: {
        provider: 'builtin',
        endpoint: 'http://localhost:11434/v1',
        apiKey: '',
        model: 'gpt-4o',
        temperature: 0.2,
        maxTokens: 4096,
        autoApproveSafeTools: true,
      },
      security: {
        trustWorkspace: true,
        allowNodeInTerminal: true,
        warnExternalLinks: true,
        isolateExtensionProcesses: false,
      },
      workspace: {
        syncWithFile: true,
      },
    };
  },

  saveSettings: async (settings, scope, workspacePath) => {
    if (isElectron) return window.binaryAPI.saveSettings(settings, scope, workspacePath);
    return true;
  },

  getRecentProjects: async () => {
    if (isElectron) return window.binaryAPI.getRecentProjects();
    return [];
  },

  addRecentProject: async (p) => {
    if (isElectron) return window.binaryAPI.addRecentProject(p);
  },

  removeRecentProject: async (p) => {
    if (isElectron) return window.binaryAPI.removeRecentProject(p);
  },

  clearRecentProjects: async () => {
    if (isElectron) return window.binaryAPI.clearRecentProjects();
  },

  listExtensions: async (): Promise<ExtensionManifest[]> => {
    try {
      if (isElectron && typeof window.binaryAPI?.listExtensions === 'function') {
        const res = await window.binaryAPI.listExtensions();
        return Array.isArray(res) ? res : [];
      }
    } catch (err) {
      console.warn('[API] listExtensions failed:', err);
    }

    // In browser dev mode, query Vite dev server middleware
    try {
      const res = await fetch('/__api/extensions');
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) return list;
      }
    } catch {}

    return [];
  },

  toggleExtension: async (id, enabled) => {
    try {
      if (isElectron && typeof window.binaryAPI?.toggleExtension === 'function') {
        return await window.binaryAPI.toggleExtension(id, enabled);
      }
    } catch (err) {
      console.warn('[API] toggleExtension failed:', err);
    }

    try {
      const res = await fetch('/__api/extensions/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled }),
      });
      if (res.ok) return true;
    } catch {}

    return false;
  },

  searchMarketplaceExtensions: async (query: string): Promise<MarketplaceExtensionItem[]> => {
    try {
      if (isElectron && typeof window.binaryAPI?.searchMarketplaceExtensions === 'function') {
        const res = await window.binaryAPI.searchMarketplaceExtensions(query);
        return Array.isArray(res) ? res : [];
      }
    } catch (err) {
      console.warn('[API] searchMarketplaceExtensions electron call failed:', err);
    }

    // Direct browser mode fallback: query Open VSX using CORS
    try {
      const trimmed = (query || '').trim();
      const isDefault = !trimmed || trimmed.toLowerCase() === 'popular';
      const apiUrl = isDefault
        ? 'https://open-vsx.org/api/-/search?sortBy=downloadCount&sortOrder=desc&size=40'
        : `https://open-vsx.org/api/-/search?query=${encodeURIComponent(trimmed)}&size=40`;

      const installedList = await api.listExtensions().catch(() => []);
      const installedIds = new Set(installedList.map((e) => (e.id || '').toLowerCase()));
      const installedNames = new Set(installedList.map((e) => (e.name || '').toLowerCase()));

      const res = await fetch(apiUrl);
      if (res.ok) {
        const json = await res.json();
        return (json.extensions || []).map((ext: any) => {
          const publisher = ext.namespace || ext.publisher || 'Community';
          const id = `${publisher}.${ext.name}`;
          const isInstalled = installedIds.has(id.toLowerCase()) || installedNames.has(ext.name.toLowerCase());

          return {
            id,
            name: ext.name,
            displayName: ext.displayName || ext.name,
            publisher,
            version: ext.version || '1.0.0',
            description: ext.description || '',
            icon: ext.files?.icon,
            downloadUrl: ext.files?.download,
            downloadCount: ext.downloadCount,
            rating: ext.averageRating,
            installed: isInstalled,
          };
        });
      }
    } catch (webErr) {
      console.warn('[API] Browser fallback search error:', webErr);
    }

    return [];
  },

  installExtension: async (id: string, downloadUrl?: string) => {
    try {
      if (isElectron && typeof window.binaryAPI?.installExtension === 'function') {
        return await window.binaryAPI.installExtension(id, downloadUrl);
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Install failed' };
    }
    return { success: false, error: 'Not running in Electron' };
  },

  uninstallExtension: async (id: string) => {
    try {
      if (isElectron && typeof window.binaryAPI?.uninstallExtension === 'function') {
        return await window.binaryAPI.uninstallExtension(id);
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Uninstall failed' };
    }

    try {
      const res = await fetch('/__api/extensions/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) return { success: true };
    } catch {}

    return { success: false, error: 'Not running in Electron' };
  },

  getExtensionRegistry: async () => {
    try {
      if (isElectron && typeof window.binaryAPI?.getExtensionRegistry === 'function') {
        return await window.binaryAPI.getExtensionRegistry();
      }
    } catch (err: any) {
      console.warn('[API] getExtensionRegistry error:', err);
    }
    return [];
  },

  reconcileExtensions: async () => {
    try {
      if (isElectron && typeof window.binaryAPI?.reconcileExtensions === 'function') {
        return await window.binaryAPI.reconcileExtensions();
      }
    } catch (err: any) {
      console.warn('[API] reconcileExtensions error:', err);
    }
    return { added: 0, updated: 0, removed: 0 };
  },

  importVSCodeExtensions: async () => {
    try {
      if (isElectron && typeof window.binaryAPI?.importVSCodeExtensions === 'function') {
        return await window.binaryAPI.importVSCodeExtensions();
      }
    } catch (err: any) {
      return { success: false, count: 0, extensions: [], error: err.message };
    }
    return { success: false, count: 0, extensions: [] };
  },

  getVSCodeExtensionCount: async () => {
    try {
      if (isElectron && typeof window.binaryAPI?.getVSCodeExtensionCount === 'function') {
        const count = await window.binaryAPI.getVSCodeExtensionCount();
        return typeof count === 'number' ? count : 0;
      }
    } catch {
      return 0;
    }
    return 0;
  },

  getExtensionDashboard: async () => {
    try {
      if (isElectron && typeof window.binaryAPI?.getExtensionDashboard === 'function') {
        return await window.binaryAPI.getExtensionDashboard();
      }
    } catch {}
    return { activated: [], failed: [], totalCommands: 0, commands: [], activeFormatters: [] };
  },

  getExtensionLifecycle: async () => {
    try {
      if (isElectron && typeof window.binaryAPI?.getExtensionLifecycle === 'function') {
        const res = await window.binaryAPI.getExtensionLifecycle();
        return Array.isArray(res) ? res : [];
      }
    } catch {}
    return [];
  },

  executeExtensionCommand: async (cmd: string, ...args: any[]) => {
    if (isElectron) return window.binaryAPI.executeExtensionCommand(cmd, ...args);
    return undefined;
  },

  getExtensionCommands: async () => {
    if (isElectron) return window.binaryAPI.getExtensionCommands();
    return [];
  },

  getExtensionStatusBarItems: async () => {
    if (isElectron) return window.binaryAPI.getExtensionStatusBarItems();
    return [];
  },

  getExtensionDiagnostics: async () => {
    if (isElectron) return window.binaryAPI.getExtensionDiagnostics();
    return [];
  },

  syncExtensionDoc: async (uri: string, languageId: string, version: number, text: string, isDirty?: boolean) => {
    if (isElectron) return window.binaryAPI.syncExtensionDoc(uri, languageId, version, text, isDirty);
  },

  saveExtensionDoc: async (uri: string) => {
    if (isElectron) return window.binaryAPI.saveExtensionDoc(uri);
  },

  closeExtensionDoc: async (uri: string) => {
    if (isElectron) return window.binaryAPI.closeExtensionDoc(uri);
  },

  setExtensionActiveEditor: async (uri: string, selection?: any) => {
    if (isElectron) return window.binaryAPI.setExtensionActiveEditor(uri, selection);
  },

  provideExtensionFormatting: async (uri: string, options?: any) => {
    if (isElectron) return window.binaryAPI.provideExtensionFormatting(uri, options);
    return [];
  },

  provideExtensionCompletions: async (uri: string, position: { line: number; character: number }, context?: any) => {
    if (isElectron) return window.binaryAPI.provideExtensionCompletions(uri, position, context);
    return [];
  },

  provideExtensionHover: async (uri: string, position: { line: number; character: number }) => {
    if (isElectron) return window.binaryAPI.provideExtensionHover(uri, position);
    return null;
  },

  provideExtensionDefinition: async (uri: string, position: { line: number; character: number }) => {
    if (isElectron) return window.binaryAPI.provideExtensionDefinition(uri, position);
    return [];
  },

  provideExtensionCodeActions: async (uri: string, range: any, context?: any) => {
    if (isElectron) return window.binaryAPI.provideExtensionCodeActions(uri, range, context);
    return [];
  },

  provideExtensionSymbols: async (uri: string) => {
    if (isElectron) return window.binaryAPI.provideExtensionSymbols(uri);
    return [];
  },

  provideExtensionReferences: async (uri: string, position: { line: number; character: number }, context?: any) => {
    if (isElectron) return window.binaryAPI.provideExtensionReferences(uri, position, context);
    return [];
  },

  notifyWorkspaceChanged: async (folderPath: string) => {
    if (isElectron) return window.binaryAPI.notifyWorkspaceChanged(folderPath);
  },

  notifySettingsChanged: async (settings: any) => {
    if (isElectron) return window.binaryAPI.notifySettingsChanged(settings);
  },

  onExtensionStatusBarUpdated: (callback: (items: any[]) => void) => {
    if (isElectron) return window.binaryAPI.onExtensionStatusBarUpdated(callback);
    return () => {};
  },

  onExtensionDiagnosticsUpdated: (callback: (diagnostics: any[]) => void) => {
    if (isElectron) return window.binaryAPI.onExtensionDiagnosticsUpdated(callback);
    return () => {};
  },

  onExtensionOutput: (callback: (data: { channel: string; text: string }) => void) => {
    if (isElectron) return window.binaryAPI.onExtensionOutput(callback);
    return () => {};
  },

  onExtensionInstallProgress: (callback: (progress: any) => void) => {
    if (isElectron) return window.binaryAPI.onExtensionInstallProgress(callback);
    return () => {};
  },

  getExtensionActivityBar: async () => {
    if (isElectron) return window.binaryAPI.getExtensionActivityBar();
    return [];
  },

  getExtensionViews: async (containerId?: string) => {
    if (isElectron) return window.binaryAPI.getExtensionViews(containerId);
    return [];
  },

  getExtensionMenus: async (location: string, context?: any) => {
    if (isElectron) return window.binaryAPI.getExtensionMenus(location, context);
    return [];
  },

  getExtensionCustomEditors: async () => {
    if (isElectron) return window.binaryAPI.getExtensionCustomEditors();
    return [];
  },

  loadUnpackedExtension: async (folderPath: string) => {
    if (isElectron) return window.binaryAPI.loadUnpackedExtension(folderPath);
    return { success: false, error: 'Not running in Electron' };
  },

  restartExtensionHost: async () => {
    if (isElectron) return window.binaryAPI.restartExtensionHost();
    return null;
  },

  getExtensionHostStatus: async () => {
    if (isElectron) return window.binaryAPI.getExtensionHostStatus();
    return { state: 'STOPPED', uptimeMs: 0, activeExtensionsCount: 0 };
  },

  getTreeChildren: async (viewId: string, elementId?: string) => {
    if (isElectron) return window.binaryAPI.getTreeChildren(viewId, elementId);
    return [];
  },

  resolveDialog: async (dialogId: string, result: any) => {
    if (isElectron) return window.binaryAPI.resolveDialog(dialogId, result);
  },

  onExtensionHostCrashed: (callback: (data: { error: string; crashedAt: string }) => void) => {
    if (isElectron) return window.binaryAPI.onExtensionHostCrashed(callback);
    return () => {};
  },

  onExtensionViewsUpdated: (callback: (data: any) => void) => {
    if (isElectron) return window.binaryAPI.onExtensionViewsUpdated(callback);
    return () => {};
  },

  onExtensionsChanged: (callback: () => void) => {
    if (isElectron) return window.binaryAPI.onExtensionsChanged(callback);
    return () => {};
  },

  onDialogShowMessage: (callback: (data: any) => void) => {
    if (isElectron) return window.binaryAPI.onDialogShowMessage(callback);
    return () => {};
  },

  onDialogShowInputBox: (callback: (data: any) => void) => {
    if (isElectron) return window.binaryAPI.onDialogShowInputBox(callback);
    return () => {};
  },

  onDialogShowQuickPick: (callback: (data: any) => void) => {
    if (isElectron) return window.binaryAPI.onDialogShowQuickPick(callback);
    return () => {};
  },

  onEditorInsertText: (callback: (data: any) => void) => {
    if (isElectron) return window.binaryAPI.onEditorInsertText(callback);
    return () => {};
  },

  onEditorReplaceRange: (callback: (data: any) => void) => {
    if (isElectron) return window.binaryAPI.onEditorReplaceRange(callback);
    return () => {};
  },

  onEditorOpenFile: (callback: (data: any) => void) => {
    if (isElectron) return window.binaryAPI.onEditorOpenFile(callback);
    return () => {};
  },

  aiExecuteTool: async (toolName, args, workspacePath) => {
    if (isElectron) return window.binaryAPI.aiExecuteTool(toolName, args, workspacePath);
    return null;
  },

  aiSendPrompt: async (request) => {
    if (isElectron) return window.binaryAPI.aiSendPrompt(request);
    return { reply: 'Binary AI is initializing...' };
  },

  // C++ Toolchain & Debugger
  cppGetToolchainInfo: async (forceRefresh?: boolean) => {
    if (isElectron && window.binaryAPI?.cppGetToolchainInfo) {
      return window.binaryAPI.cppGetToolchainInfo(forceRefresh);
    }
    return {
      available: false,
      rootPath: '',
      compilerPath: '',
      cCompilerPath: '',
      debuggerPath: '',
      makePath: '',
      cmakePath: '',
      ninjaPath: '',
      clangdPath: '',
      compilerVersion: 'Not available',
      cCompilerVersion: 'Not available',
      debuggerVersion: 'Not available',
      cmakeVersion: 'Not available',
      ninjaVersion: 'Not available',
      clangdVersion: 'Not available',
      runtimeLibsAvailable: false,
      licenseNoticesAvailable: false,
      environment: {},
      details: 'Not in Electron runtime',
    };
  },

  cppCompile: async (options) => {
    if (isElectron && window.binaryAPI?.cppCompile) {
      return window.binaryAPI.cppCompile(options);
    }
    return {
      success: false,
      exitCode: -1,
      output: 'C++ Compiler not available in browser mode.',
      executablePath: '',
      diagnostics: [],
      durationMs: 0,
      error: 'Not in Electron runtime',
    };
  },

  cppStartDebugging: async (options) => {
    if (isElectron && window.binaryAPI?.cppStartDebugging) {
      return window.binaryAPI.cppStartDebugging(options);
    }
    return { success: false, error: 'Debugger not available in browser mode' };
  },

  cppContinue: async () => {
    if (isElectron && window.binaryAPI?.cppContinue) return window.binaryAPI.cppContinue();
    return false;
  },

  cppStepOver: async () => {
    if (isElectron && window.binaryAPI?.cppStepOver) return window.binaryAPI.cppStepOver();
    return false;
  },

  cppStepInto: async () => {
    if (isElectron && window.binaryAPI?.cppStepInto) return window.binaryAPI.cppStepInto();
    return false;
  },

  cppStepOut: async () => {
    if (isElectron && window.binaryAPI?.cppStepOut) return window.binaryAPI.cppStepOut();
    return false;
  },

  cppPause: async () => {
    if (isElectron && window.binaryAPI?.cppPause) return window.binaryAPI.cppPause();
    return false;
  },

  cppStopDebug: async () => {
    if (isElectron && window.binaryAPI?.cppStopDebug) return window.binaryAPI.cppStopDebug();
  },

  cppGetCallStack: async () => {
    if (isElectron && window.binaryAPI?.cppGetCallStack) return window.binaryAPI.cppGetCallStack();
    return [];
  },

  cppGetVariables: async () => {
    if (isElectron && window.binaryAPI?.cppGetVariables) return window.binaryAPI.cppGetVariables();
    return [];
  },

  cppEvaluateExpression: async (expr: string) => {
    if (isElectron && window.binaryAPI?.cppEvaluateExpression) return window.binaryAPI.cppEvaluateExpression(expr);
    return '<undefined>';
  },

  cppAddBreakpoint: async (file: string, line: number) => {
    if (isElectron && window.binaryAPI?.cppAddBreakpoint) return window.binaryAPI.cppAddBreakpoint(file, line);
    return { id: 0, file, line, verified: false, enabled: true };
  },

  cppRemoveBreakpoint: async (file: string, line: number) => {
    if (isElectron && window.binaryAPI?.cppRemoveBreakpoint) return window.binaryAPI.cppRemoveBreakpoint(file, line);
    return false;
  },

  cppToggleBreakpoint: async (file: string, line: number) => {
    if (isElectron && window.binaryAPI?.cppToggleBreakpoint) return window.binaryAPI.cppToggleBreakpoint(file, line);
    return { action: 'removed' };
  },

  cppGetBreakpoints: async () => {
    if (isElectron && window.binaryAPI?.cppGetBreakpoints) return window.binaryAPI.cppGetBreakpoints();
    return [];
  },

  cppGetDebugStatus: async () => {
    if (isElectron && window.binaryAPI?.cppGetDebugStatus) return window.binaryAPI.cppGetDebugStatus();
    return { state: 'idle' };
  },

  // C++ Project & CMake
  cppDetectProjectType: async (workspaceDir: string) => {
    if (isElectron && window.binaryAPI?.cppDetectProjectType) return window.binaryAPI.cppDetectProjectType(workspaceDir);
    return 'single-file';
  },

  cppCreateConsoleProject: async (targetDir: string, projectName?: string) => {
    if (isElectron && window.binaryAPI?.cppCreateConsoleProject) return window.binaryAPI.cppCreateConsoleProject(targetDir, projectName);
  },

  cppCreateCmakeProject: async (targetDir: string, projectName?: string) => {
    if (isElectron && window.binaryAPI?.cppCreateCmakeProject) return window.binaryAPI.cppCreateCmakeProject(targetDir, projectName);
  },

  cppConfigureCmake: async (workspaceDir: string, buildType?: 'Debug' | 'Release') => {
    if (isElectron && window.binaryAPI?.cppConfigureCmake) return window.binaryAPI.cppConfigureCmake(workspaceDir, buildType);
    return { success: false, exitCode: -1, executablePath: null, diagnostics: [], stdout: '', stderr: 'Unavailable', commandExecuted: 'cmake' };
  },

  cppBuildCmake: async (workspaceDir: string, buildType?: 'Debug' | 'Release') => {
    if (isElectron && window.binaryAPI?.cppBuildCmake) return window.binaryAPI.cppBuildCmake(workspaceDir, buildType);
    return { success: false, exitCode: -1, executablePath: null, diagnostics: [], stdout: '', stderr: 'Unavailable', commandExecuted: 'cmake' };
  },

  cppCleanCmake: async (workspaceDir: string) => {
    if (isElectron && window.binaryAPI?.cppCleanCmake) return window.binaryAPI.cppCleanCmake(workspaceDir);
    return { success: true, exitCode: 0, executablePath: null, diagnostics: [], stdout: '', stderr: '', commandExecuted: 'clean' };
  },

  cppBuildSimpleProject: async (workspaceDir: string, standard?: string) => {
    if (isElectron && window.binaryAPI?.cppBuildSimpleProject) return window.binaryAPI.cppBuildSimpleProject(workspaceDir, standard);
    return { success: false, exitCode: -1, executablePath: null, diagnostics: [], stdout: '', stderr: 'Unavailable', commandExecuted: 'g++' };
  },

  cppCancelProjectBuild: async () => {
    if (isElectron && window.binaryAPI?.cppCancelProjectBuild) return window.binaryAPI.cppCancelProjectBuild();
    return false;
  },

  // C++ External Libraries
  cppGetLibraryCatalog: async () => {
    if (isElectron && window.binaryAPI?.cppGetLibraryCatalog) return window.binaryAPI.cppGetLibraryCatalog();
    return [];
  },

  cppGetProjectLibraries: async (workspaceDir: string) => {
    if (isElectron && window.binaryAPI?.cppGetProjectLibraries) return window.binaryAPI.cppGetProjectLibraries(workspaceDir);
    return [];
  },

  cppAddLibraryToProject: async (workspaceDir: string, libraryId: string) => {
    if (isElectron && window.binaryAPI?.cppAddLibraryToProject) return window.binaryAPI.cppAddLibraryToProject(workspaceDir, libraryId);
    return { success: false, message: 'Unavailable' };
  },

  onCppDebuggerStateChanged: (callback: (state: any) => void) => {
    if (isElectron && window.binaryAPI?.onCppDebuggerStateChanged) {
      return window.binaryAPI.onCppDebuggerStateChanged(callback);
    }
    return () => {};
  },

  onCppDebuggerStopped: (callback: (event: any) => void) => {
    if (isElectron && window.binaryAPI?.onCppDebuggerStopped) {
      return window.binaryAPI.onCppDebuggerStopped(callback);
    }
    return () => {};
  },

  onCppDebuggerContinued: (callback: () => void) => {
    if (isElectron && window.binaryAPI?.onCppDebuggerContinued) {
      return window.binaryAPI.onCppDebuggerContinued(callback);
    }
    return () => {};
  },

  onCppDebuggerCallStack: (callback: (frames: any[]) => void) => {
    if (isElectron && window.binaryAPI?.onCppDebuggerCallStack) {
      return window.binaryAPI.onCppDebuggerCallStack(callback);
    }
    return () => {};
  },

  onCppDebuggerVariables: (callback: (variables: any[]) => void) => {
    if (isElectron && window.binaryAPI?.onCppDebuggerVariables) {
      return window.binaryAPI.onCppDebuggerVariables(callback);
    }
    return () => {};
  },

  onCppDebuggerOutput: (callback: (data: { type: string; text: string }) => void) => {
    if (isElectron && window.binaryAPI?.onCppDebuggerOutput) {
      return window.binaryAPI.onCppDebuggerOutput(callback);
    }
    return () => {};
  },

  onCppDebuggerTerminated: (callback: (data: { exitCode: number; error?: string }) => void) => {
    if (isElectron && window.binaryAPI?.onCppDebuggerTerminated) {
      return window.binaryAPI.onCppDebuggerTerminated(callback);
    }
    return () => {};
  },

  onCppDebuggerBreakpointChanged: (callback: (bp: any) => void) => {
    if (isElectron && window.binaryAPI?.onCppDebuggerBreakpointChanged) {
      return window.binaryAPI.onCppDebuggerBreakpointChanged(callback);
    }
    return () => {};
  },

  minimizeWindow: () => {
    if (isElectron) window.binaryAPI.minimizeWindow();
  },

  maximizeWindow: () => {
    if (isElectron) window.binaryAPI.maximizeWindow();
  },

  closeWindow: () => {
    if (isElectron) window.binaryAPI.closeWindow();
  },

  openExternalUrl: (url) => {
    if (isElectron) window.binaryAPI.openExternalUrl(url);
    else window.open(url, '_blank');
  },

  getPlatform: () => {
    if (isElectron) return window.binaryAPI.getPlatform();
    return 'win32';
  },
};

