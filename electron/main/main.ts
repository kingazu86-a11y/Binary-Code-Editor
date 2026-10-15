import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron';
import path from 'path';
import { createMainWindow } from './window';
import { handleOpenFolder, handleOpenFile, handleSaveFileDialog } from './ipc/dialogs';
import { filesystemService } from './ipc/filesystem';
import { terminalManager } from './ipc/terminal';
import { gitService } from './ipc/git';
import { searchService } from './ipc/search';
import { settingsService } from './ipc/settings';
import { aiService } from './ipc/ai';
import { extensionService } from './ipc/extensions';
import { cppIpcService } from './ipc/cpp';
import { clangdService } from './services/lsp/ClangdService';
import { gdbDebuggerService } from './services/debugger/GdbDebuggerService';
import { cppProjectService } from './services/project/CppProjectService';
import { viewRegistryService } from './services/editor/ViewRegistryService';

if (app?.commandLine) {
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
}

let mainWindow: BrowserWindow | null = null;

function setupIPC(win: BrowserWindow) {
  filesystemService.setWindow(win);
  terminalManager.setWindow(win);
  extensionService.setWindow(win);
  cppIpcService.setWindow(win);
  cppIpcService.registerIpcHandlers();

  // Dialogs
  ipcMain.handle('dialog:openFolder', () => handleOpenFolder(win));
  ipcMain.handle('dialog:openFile', () => handleOpenFile(win));
  ipcMain.handle('dialog:saveFile', (_e, defaultName) => handleSaveFileDialog(win, defaultName));

  // Filesystem
  ipcMain.handle('fs:readDirectory', (_e, dirPath, maxDepth) => filesystemService.readDirectory(dirPath, maxDepth ?? 0));
  ipcMain.handle('fs:readFile', (_e, filePath) => filesystemService.readFile(filePath));
  ipcMain.handle('fs:readImage', (_e, filePath) => filesystemService.readImage(filePath));
  ipcMain.handle('fs:writeFile', (_e, filePath, content) => filesystemService.writeFile(filePath, content));
  ipcMain.handle('fs:createFile', (_e, filePath, content) => filesystemService.createFile(filePath, content));
  ipcMain.handle('fs:createFolder', (_e, folderPath) => filesystemService.createFolder(folderPath));
  ipcMain.handle('fs:deleteEntry', (_e, targetPath) => filesystemService.deleteEntry(targetPath));
  ipcMain.handle('fs:trashEntry', (_e, targetPath) => filesystemService.trashEntry(targetPath));

  ipcMain.handle('fs:renameEntry', (_e, oldPath, newPath) => filesystemService.renameEntry(oldPath, newPath));
  ipcMain.handle('fs:duplicateEntry', (_e, srcPath) => filesystemService.duplicateEntry(srcPath));
  ipcMain.handle('fs:revealInExplorer', (_e, targetPath) => filesystemService.revealInExplorer(targetPath));
  ipcMain.handle('fs:watchDirectory', (_e, dirPath) => filesystemService.watchDirectory(dirPath));
  ipcMain.handle('fs:unwatchDirectory', () => filesystemService.unwatchDirectory());

  // Terminal
  ipcMain.handle('terminal:create', (_e, options) => terminalManager.createTerminal(options));
  ipcMain.on('terminal:write', (_e, id, data) => terminalManager.writeTerminal(id, data));
  ipcMain.on('terminal:resize', (_e, id, cols, rows) => terminalManager.resizeTerminal(id, cols, rows));
  ipcMain.on('terminal:kill', (_e, id) => terminalManager.killTerminal(id));

  // Git
  ipcMain.handle('git:getStatus', (_e, cwd) => gitService.getStatus(cwd));
  ipcMain.handle('git:stage', (_e, cwd, files) => gitService.stage(cwd, files));
  ipcMain.handle('git:unstage', (_e, cwd, files) => gitService.unstage(cwd, files));
  ipcMain.handle('git:commit', (_e, cwd, message) => gitService.commit(cwd, message));
  ipcMain.handle('git:getBranches', (_e, cwd) => gitService.getBranches(cwd));
  ipcMain.handle('git:checkout', (_e, cwd, branch) => gitService.checkout(cwd, branch));
  ipcMain.handle('git:createBranch', (_e, cwd, branch) => gitService.createBranch(cwd, branch));
  ipcMain.handle('git:getDiff', (_e, cwd, file) => gitService.getDiff(cwd, file));

  // Search
  ipcMain.handle('search:project', (_e, options) => searchService.searchProject(options));
  ipcMain.handle('search:replace', (_e, options) => searchService.replaceInFiles(options));

  // Settings
  ipcMain.handle('settings:load', (_e, workspacePath?: string) => settingsService.loadSettings(workspacePath));
  ipcMain.handle('settings:save', (_e, settings, scope?: 'user' | 'workspace', workspacePath?: string) =>
    settingsService.saveSettings(settings, scope, workspacePath)
  );
  ipcMain.handle('settings:getRecentProjects', () => settingsService.getRecentProjects());
  ipcMain.handle('settings:addRecentProject', (_e, p) => settingsService.addRecentProject(p));
  ipcMain.handle('settings:removeRecentProject', (_e, p) => settingsService.removeRecentProject(p));
  ipcMain.handle('settings:clearRecentProjects', () => settingsService.clearRecentProjects());

  // Extensions
  ipcMain.handle('extensions:list', () => extensionService.listExtensions());
  ipcMain.handle('extensions:toggle', (_e, id, enabled) => extensionService.toggleExtension(id, enabled));
  ipcMain.handle('extensions:search', (_e, query) => extensionService.searchMarketplace(query));
  ipcMain.handle('extensions:install', (_e, id, downloadUrl) => extensionService.installExtension(id, downloadUrl));
  ipcMain.handle('extensions:uninstall', (_e, id) => extensionService.uninstallExtension(id));
  ipcMain.handle('extensions:get-registry', () => extensionService.getRegistry().list());
  ipcMain.handle('extensions:reconcile', () => extensionService.reconcileRegistry());
  ipcMain.handle('extensions:import-vscode', () => extensionService.importVSCodeExtensions());
  ipcMain.handle('extensions:get-vscode-count', () => extensionService.getVSCodeExtensionCount());
  ipcMain.handle('extensions:dashboard', () => extensionService.getHostDashboard());
  ipcMain.handle('extensions:lifecycle', () => extensionService.getLifecycleStatus());
  ipcMain.handle('extensions:execute-command', (_e, cmd, ...args) => extensionService.executeCommand(cmd, ...args));
  ipcMain.handle('extensions:get-commands', () => extensionService.getCommands());
  ipcMain.handle('extensions:get-status-bar-items', () => extensionService.getStatusBarItems());
  ipcMain.handle('extensions:get-diagnostics', () => extensionService.getDiagnostics());
  ipcMain.handle('extensions:sync-doc', (_e, uri, languageId, version, text, isDirty) =>
    extensionService.syncDocument(uri, languageId, version, text, isDirty)
  );
  ipcMain.handle('extensions:save-doc', (_e, uri) => extensionService.saveDocument(uri));
  ipcMain.handle('extensions:close-doc', (_e, uri) => extensionService.closeDocument(uri));
  ipcMain.handle('extensions:set-active-editor', (_e, uri, selection) =>
    extensionService.setActiveEditor(uri, selection)
  );
  ipcMain.handle('extensions:provide-formatting', (_e, uri, options) =>
    extensionService.provideFormatting(uri, options)
  );
  ipcMain.handle('extensions:provide-completions', (_e, uri, position, context) =>
    extensionService.provideCompletions(uri, position, context)
  );
  ipcMain.handle('extensions:provide-hover', (_e, uri, position) =>
    extensionService.provideHover(uri, position)
  );
  ipcMain.handle('extensions:provide-definition', (_e, uri, position) =>
    extensionService.provideDefinition(uri, position)
  );
  ipcMain.handle('extensions:provide-code-actions', (_e, uri, range, context) =>
    extensionService.provideCodeActions(uri, range, context)
  );
  ipcMain.handle('extensions:provide-symbols', (_e, uri) =>
    extensionService.provideDocumentSymbols(uri)
  );
  ipcMain.handle('extensions:provide-references', (_e, uri, position, context) =>
    extensionService.provideReferences(uri, position, context)
  );
  ipcMain.handle('extensions:workspace-changed', (_e, folderPath) =>
    extensionService.handleWorkspaceChanged(folderPath)
  );
  ipcMain.handle('extensions:settings-changed', (_e, settings) =>
    extensionService.handleSettingsChanged(settings)
  );
  ipcMain.handle('extensions:get-activity-bar', () => extensionService.getActivityBarContributions());
  ipcMain.handle('extensions:get-views', (_e, containerId) => extensionService.getViewContributions(containerId));
  ipcMain.handle('extensions:get-menus', (_e, location, context) => extensionService.getMenuItems(location, context));
  ipcMain.handle('extensions:get-custom-editors', () => extensionService.getCustomEditors());
  ipcMain.handle('extensions:load-unpacked', (_e, folderPath) => extensionService.loadUnpackedExtension(folderPath));
  ipcMain.handle('extensions:restart-host', () => extensionService.restartExtensionHost());
  ipcMain.handle('extensions:host-status', () => extensionService.getExtensionHostStatus());
  ipcMain.handle('dialog:resolve', (_e, dialogId, result) => extensionService.resolveDialog(dialogId, result));
  ipcMain.handle('views:getChildren', (_e, viewId, elementId) =>
    viewRegistryService.getTreeChildren(viewId, elementId)
  );

  // AI
  ipcMain.handle('ai:executeTool', (_e, toolName, args, workspacePath) =>
    aiService.executeTool(toolName, args, workspacePath)
  );
  ipcMain.handle('ai:sendPrompt', (_e, request) => aiService.sendPrompt(request));

  // Window Controls
  ipcMain.on('window:minimize', () => win.minimize());
  ipcMain.on('window:maximize', () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });
  ipcMain.on('window:close', () => win.close());
  ipcMain.on('system:openExternal', (_e, url) => shell.openExternal(url));
  ipcMain.handle('system:getPlatform', () => process.platform);
}

function createApplicationMenu() {
  const isMac = process.platform === 'darwin';
  const template: any[] = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New File', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu:newFile') },
        { label: 'Open File...', accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu:openFile') },
        { label: 'Open Folder...', accelerator: 'CmdOrCtrl+K CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu:openFolder') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu:save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow?.webContents.send('menu:saveAs') },
        { type: 'separator' },
        { role: isMac ? 'close' : 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Command Palette...', accelerator: 'CmdOrCtrl+Shift+P', click: () => mainWindow?.webContents.send('menu:commandPalette') },
        { label: 'Quick Open...', accelerator: 'CmdOrCtrl+P', click: () => mainWindow?.webContents.send('menu:quickOpen') },
        { type: 'separator' },
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+B', click: () => mainWindow?.webContents.send('menu:toggleSidebar') },
        { label: 'Toggle Terminal', accelerator: 'CmdOrCtrl+`', click: () => mainWindow?.webContents.send('menu:toggleTerminal') },
        { label: 'Toggle AI Panel', accelerator: 'CmdOrCtrl+Shift+A', click: () => mainWindow?.webContents.send('menu:toggleAI') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Binary',
          click: () => {
            shell.openExternal('https://github.com/binary-ide');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

if (app?.whenReady) {
  app.whenReady().then(() => {
    mainWindow = createMainWindow();
    setupIPC(mainWindow);
    createApplicationMenu();

    const devUrl = process.env.VITE_DEV_SERVER_URL;
    if (devUrl) {
      mainWindow.loadURL(devUrl);
    } else {
      mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
        setupIPC(mainWindow);
      }
    });
  });
}

if (app?.on) {
  app.on('before-quit', () => {
    try {
      clangdService.stop();
      gdbDebuggerService.stop();
      cppProjectService.cancelBuild();
      terminalManager.killAll();
    } catch {}
  });

  app.on('window-all-closed', () => {
    try {
      clangdService.stop();
      gdbDebuggerService.stop();
      cppProjectService.cancelBuild();
      terminalManager.killAll();
    } catch {}
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
