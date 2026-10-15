import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import https from 'https';
import http from 'http';
import type { ExtensionManifest, MarketplaceExtensionItem } from '../../../src/types/electron';
// Extensions Services
import { VsixInstallerService } from '../services/extensions/VsixInstallerService';
import { extensionRegistry, ExtensionRegistry } from '../services/extensions/ExtensionRegistry';
import { VSCodeExtensionManifestParser } from '../services/extensions/VSCodeExtensionManifestParser';
import { extensionDownloaderService, DownloadProgress } from '../services/extensions/ExtensionDownloaderService';
import { extensionHostProcess } from '../services/extensions/ExtensionHostProcess';

// Editor Services
import { editorService } from '../services/editor/EditorService';
import { dialogService } from '../services/editor/DialogService';
import { statusBarService } from '../services/editor/StatusBarService';
import { viewRegistryService } from '../services/editor/ViewRegistryService';
import { menuRegistryService } from '../services/editor/MenuRegistryService';
import { outputChannelService } from '../services/editor/OutputChannelService';
import { customEditorService } from '../services/editor/CustomEditorService';

// Workspace Services
import { commandRegistry } from '../services/workspace/CommandRegistry';
import { workspaceService } from '../services/workspace/WorkspaceService';
import { terminalService } from '../services/workspace/TerminalService';
import { configService } from '../services/workspace/ConfigService';

// LSP Services
import { diagnosticsService } from '../services/lsp/DiagnosticsService';
import { lspClientService } from '../services/lsp/LspClientService';
import { clangdService } from '../services/lsp/ClangdService';

const BUILTIN_EXTENSIONS: ExtensionManifest[] = [
  {
    id: 'binary.theme-pack',
    name: 'binary-theme-pack',
    displayName: 'Binary Official Themes',
    version: '1.0.0',
    description: 'Minimalist dark themes: Binary Dark, Binary Midnight, and Binary Cyber.',
    author: 'Binary Team',
    enabled: true,
    categories: ['Themes'],
    source: 'builtin',
    contributes: {
      themes: [
        { id: 'binary-dark', label: 'Binary Dark (Default)', uiTheme: 'vs-dark', path: './themes/dark.json' },
        { id: 'binary-midnight', label: 'Binary Midnight', uiTheme: 'vs-dark', path: './themes/midnight.json' },
        { id: 'binary-cyber', label: 'Binary Cyber', uiTheme: 'vs-dark', path: './themes/cyber.json' },
      ],
    },
  },
  {
    id: 'binary.ts-essentials',
    name: 'binary-ts-essentials',
    displayName: 'TypeScript & JavaScript Essentials',
    version: '1.2.0',
    description: 'Advanced syntax highlighting, IntelliSense presets, and quick refactoring.',
    author: 'Binary Team',
    enabled: true,
    categories: ['Programming Languages', 'Linters'],
    source: 'builtin',
  },
  {
    id: 'binary.git-lens-pro',
    name: 'binary-git-lens-pro',
    displayName: 'Git Lens Pro',
    version: '1.0.4',
    description: 'Seamless git branch visualizer, inline diffs, and staging management.',
    author: 'DevTools Lab',
    enabled: true,
    categories: ['SCM Providers'],
    source: 'builtin',
  },
  {
    id: 'binary.python-toolkit',
    name: 'binary-python-toolkit',
    displayName: 'Python Developer Toolkit',
    version: '1.1.0',
    description: 'Python language definitions, virtual environment detector, and runner.',
    author: 'Python Foundation',
    enabled: true,
    categories: ['Programming Languages', 'Debuggers'],
    source: 'builtin',
  },
];

export class ExtensionService {
  private installerService: VsixInstallerService;
  private win: BrowserWindow | null = null;
  private cachedExtensions: ExtensionManifest[] | null = null;
  private lastCacheTime = 0;
  private unpackedExtensions = new Map<string, ExtensionManifest>();

  constructor() {
    const extDir = this.getExtensionsDirectory();
    // Do not resurrect deleted extensions from legacy AppData directory
    this.installerService = new VsixInstallerService(extDir);
    extensionRegistry.initialize().catch((err) => {
      console.warn('[ExtensionService] Registry initialization warning:', err);
    });
  }

  setWindow(win: BrowserWindow) {
    this.win = win;
    editorService.setWindow(win);
    terminalService.setWindow(win);
    dialogService.setWindow(win);
    statusBarService.setWindow(win);
    viewRegistryService.setWindow(win);
    outputChannelService.setWindow(win);
    diagnosticsService.setWindow(win);
  }

  getHostDashboard() {
    return extensionHostProcess.getHostDashboard();
  }

  getLifecycleStatus() {
    return extensionHostProcess.getLifecycleStatusList();
  }

  getExtensionHostStatus() {
    return extensionHostProcess.getStatus();
  }

  async restartExtensionHost() {
    const status = await extensionHostProcess.restart();
    await this.activateAllEnabledExtensions();
    return status;
  }

  async activateAllEnabledExtensions(): Promise<void> {
    try {
      const allExts = this.listExtensions();
      for (const ext of allExts) {
        if (ext.enabled && ext.main && ext.installedPath) {
          await extensionHostProcess.activateExtension(ext.id, ext.installedPath, ext.main, ext);
        }
      }
    } catch (err) {
      console.warn('[ExtensionService] Error activating extensions:', err);
    }
  }

  async executeCommand(command: string, ...args: any[]) {
    const cmd = commandRegistry.getCommand(command);
    if (cmd && typeof cmd.handler === 'function') {
      return await cmd.handler(...args);
    }
    try {
      return await extensionHostProcess.executeCommand(command, ...args);
    } catch {
      return undefined;
    }
  }

  getCommands() {
    return commandRegistry.getCommands();
  }

  getStatusBarItems() {
    return statusBarService.getItems();
  }

  getDiagnostics() {
    return diagnosticsService.getAllDiagnostics();
  }

  getActivityBarContributions() {
    return viewRegistryService.getActivityBarItems();
  }

  getViewContributions(containerId?: string) {
    if (containerId) {
      return viewRegistryService.getViewsForContainer(containerId);
    }
    return viewRegistryService.getAllViews();
  }

  getMenuItems(location: string, context?: any) {
    return menuRegistryService.getMenuItems(location, context);
  }

  getCustomEditors() {
    return customEditorService.getAllCustomEditors();
  }

  resolveDialog(dialogId: string, result: any) {
    dialogService.resolveDialog(dialogId, result);
  }

  async syncDocument(uri: string, languageId: string, version: number, text: string, isDirty = false) {
    editorService.syncDocument(uri, languageId, version, text, isDirty);
    if ((languageId === 'cpp' || languageId === 'c') && !clangdService.getStatus().running) {
      clangdService.start(workspaceService.getRoot()).catch(() => {});
    }
    lspClientService.syncDocument(uri, languageId, version, text);
    return null;
  }

  saveDocument(uri: string) {
    editorService.saveDocument(uri);
  }

  closeDocument(uri: string) {
    editorService.closeDocument(uri);
  }

  setActiveEditor(uri: string, selection?: any) {
    editorService.setActiveEditor(uri, selection);
  }

  async provideFormatting(_uri: string, _options?: any) {
    return null;
  }

  async provideCompletions(uri: string, position: { line: number; character: number }, _context?: any) {
    try {
      return await lspClientService.provideCompletions(uri, position);
    } catch {
      return [];
    }
  }

  async provideHover(uri: string, position: { line: number; character: number }) {
    try {
      return await lspClientService.provideHover(uri, position);
    } catch {
      return null;
    }
  }

  async provideDefinition(uri: string, position: { line: number; character: number }) {
    try {
      return await lspClientService.provideDefinition(uri, position);
    } catch {
      return null;
    }
  }

  async provideCodeActions(_uri: string, _range: any, _context?: any) {
    return [];
  }

  async provideDocumentSymbols(uri: string) {
    try {
      return await lspClientService.provideDocumentSymbols(uri);
    } catch {
      return [];
    }
  }

  async provideReferences(uri: string, position: { line: number; character: number }, _context?: any) {
    try {
      return await lspClientService.provideReferences(uri, position);
    } catch {
      return [];
    }
  }

  async handleWorkspaceChanged(folderPath: string) {
    workspaceService.setWorkspace(folderPath);
    clangdService.setWorkspace(folderPath);
    await extensionHostProcess.sendWorkspaceChanged(folderPath);
    await this.activateAllEnabledExtensions();
  }

  handleSettingsChanged(_settings: any) {
    // Config change handler stub
  }

  async triggerFormat(_languageId: string) {
    return [];
  }

  private getExtensionsStatePath(): string {
    const dir = path.join(os.homedir(), '.binary');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    return path.join(dir, 'binary-extensions-state.json');
  }

  getExtensionsDirectory(): string {
    const p = path.join(os.homedir(), '.binary', 'extensions');
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
    return p;
  }

  getMyIdeExtensionsDirectory(): string {
    const binaryExt = path.join(process.cwd(), '.binary', 'extensions');
    if (fs.existsSync(binaryExt)) {
      return binaryExt;
    }
    const legacyExt = path.join(process.cwd(), '.my_ide', 'extensions');
    if (fs.existsSync(legacyExt)) {
      return legacyExt;
    }
    try {
      fs.mkdirSync(binaryExt, { recursive: true });
    } catch {}
    return binaryExt;
  }

  getVSCodeExtensionsDirectory(): string {
    return path.join(os.homedir(), '.vscode', 'extensions');
  }

  private migrateLegacyExtensionsIfAny(targetDir: string): void {
    try {
      if (!app?.getPath) return;
      const legacyDir = path.join(app.getPath('userData'), 'extensions');
      if (fs.existsSync(legacyDir) && path.resolve(legacyDir) !== path.resolve(targetDir)) {
        const legacyEntries = fs.readdirSync(legacyDir);
        for (const entry of legacyEntries) {
          if (entry === 'node_modules' || entry.startsWith('.')) continue;
          const src = path.join(legacyDir, entry);
          const dest = path.join(targetDir, entry);
          if (!fs.existsSync(dest)) {
            try {
              fs.cpSync(src, dest, { recursive: true });
            } catch (err) {
              console.warn(`[Extensions] Failed to copy legacy extension ${entry}:`, err);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Extensions] Legacy migration failed:', err);
    }
  }

  loadState(): Record<string, boolean> {
    try {
      const p = this.getExtensionsStatePath();
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
      }
      // Migrate legacy state if present in app.getPath('userData')
      if (app?.getPath) {
        const legacyPath = path.join(app.getPath('userData'), 'binary-extensions-state.json');
        if (fs.existsSync(legacyPath)) {
          const state = JSON.parse(fs.readFileSync(legacyPath, 'utf-8'));
          this.saveState(state);
          return state;
        }
      }
    } catch (err) {
      console.error('[Extensions] Failed to load state:', err);
    }
    return {};
  }

  saveState(state: Record<string, boolean>) {
    try {
      fs.writeFileSync(this.getExtensionsStatePath(), JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Extensions] Failed to save state:', err);
    }
  }

  private scanFolderForExtension(
    parentDir: string,
    folderName: string,
    source: 'vscode' | 'binary' | 'unpacked',
    state: Record<string, boolean>
  ): ExtensionManifest | null {
    if (folderName.startsWith('.') || folderName === 'extensions.json' || folderName === '.obsolete') {
      return null;
    }

    const rootExtensionFolder = path.join(parentDir, folderName);
    let contentFolder = rootExtensionFolder;
    let manifestPath = path.join(rootExtensionFolder, 'package.json');

    if (!fs.existsSync(manifestPath)) {
      // Check inner extension/ folder (standard unpacked VSIX structure)
      const innerManifest = path.join(rootExtensionFolder, 'extension', 'package.json');
      if (fs.existsSync(innerManifest)) {
        manifestPath = innerManifest;
        contentFolder = path.join(rootExtensionFolder, 'extension');
      } else {
        return null;
      }
    }

    try {
      const manifestStat = fs.statSync(manifestPath);
      if (!manifestStat.isFile()) return null;

      const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const publisher = raw.publisher || folderName.split('.')[0] || 'community';
      const extName = raw.name || folderName;
      const id = `${publisher}.${extName}`;
      const isEnabled = state[id] !== undefined ? state[id] : true;

      let iconUri: string | undefined = undefined;
      if (raw.icon) {
        const iconPath = path.join(contentFolder, raw.icon);
        if (fs.existsSync(iconPath)) {
          try {
            const ext = path.extname(iconPath).toLowerCase().replace('.', '');
            const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext || 'png'}`;
            const b64 = fs.readFileSync(iconPath).toString('base64');
            iconUri = `data:${mime};base64,${b64}`;
          } catch {}
        }
      }

      const authorName =
        typeof raw.author === 'string'
          ? raw.author
          : raw.author?.name || raw.publisher || 'Community';

      return {
        id,
        name: extName,
        displayName: raw.displayName || extName,
        version: raw.version || '1.0.0',
        description: raw.description || '',
        author: authorName,
        icon: iconUri,
        enabled: isEnabled,
        categories: Array.isArray(raw.categories) ? raw.categories : ['Other'],
        source,
        installedPath: rootExtensionFolder,
        contributes: raw.contributes,
        main: raw.main || '',
        permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
        activationEvents: Array.isArray(raw.activationEvents) ? raw.activationEvents : [],
        engines: raw.engines,
      };
    } catch {
      return null;
    }
  }

  listExtensions(): ExtensionManifest[] {
    const state = this.loadState();
    const map = new Map<string, ExtensionManifest>();

    // 1. Built-in extensions
    for (const ext of BUILTIN_EXTENSIONS) {
      const isEnabled = state[ext.id] !== undefined ? state[ext.id] : ext.enabled;
      map.set(ext.id, { ...ext, source: 'builtin', enabled: isEnabled });
    }

    // 2. Unpacked developer extensions
    for (const [id, ext] of this.unpackedExtensions.entries()) {
      map.set(id, ext);
    }

    // 3. User-Installed Extensions from ExtensionRegistry
    const registered = extensionRegistry.list();
    for (const entry of registered) {
      if (entry.state === 'quarantined' || entry.state === 'invalid' || entry.state === 'corrupted') continue;
      const isEnabled = state[entry.id] !== undefined ? state[entry.id] : entry.enabled;
      const m = entry.manifest;
      map.set(entry.id, {
        id: entry.id,
        name: entry.name,
        displayName: entry.displayName || entry.name,
        version: entry.version,
        description: entry.description || '',
        author: entry.publisher,
        icon: entry.icon || m?.icon,
        enabled: isEnabled,
        categories: m?.categories || ['Other'],
        source: (entry.source as any) || 'binary',
        installedPath: entry.installPath,
        contributes: m?.contributes as any,
        main: m?.main || '',
        permissions: [],
        activationEvents: m?.activationEvents || [],
        engines: m?.engines,
      });
    }

    // 4. Workspace extensions (.binary/extensions or .my_ide/extensions)
    const localDir = this.getMyIdeExtensionsDirectory();
    if (fs.existsSync(localDir)) {
      try {
        const entries = fs.readdirSync(localDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const ext = this.scanFolderForExtension(localDir, entry.name, 'binary', state);
            if (ext && !map.has(ext.id)) map.set(ext.id, ext);
          }
        }
      } catch {}
    }

    // 5. Binary User-Installed Extensions (~/.binary/extensions) fallback scan
    const binaryDir = this.getExtensionsDirectory();
    if (fs.existsSync(binaryDir)) {
      try {
        const entries = fs.readdirSync(binaryDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const ext = this.scanFolderForExtension(binaryDir, entry.name, 'binary', state);
            if (ext && !map.has(ext.id)) map.set(ext.id, ext);
          }
        }
      } catch {}
    }

    const result = Array.from(map.values());
    this.cachedExtensions = result;
    this.lastCacheTime = Date.now();
    return result;
  }

  async loadUnpackedExtension(folderPath: string): Promise<{ success: boolean; extension?: ExtensionManifest; error?: string }> {
    const pkgPath = path.join(folderPath, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      return { success: false, error: 'Directory does not contain a package.json manifest' };
    }

    try {
      const state = this.loadState();
      const parentDir = path.dirname(folderPath);
      const folderName = path.basename(folderPath);
      const ext = this.scanFolderForExtension(parentDir, folderName, 'unpacked', state);

      if (!ext) {
        return { success: false, error: 'Failed to parse extension manifest' };
      }

      this.unpackedExtensions.set(ext.id, ext);
      this.cachedExtensions = null;

      // Register contributions into menus/views/settings if present
      if (ext.contributes) {
        if (Array.isArray((ext.contributes as any).commands)) {
          for (const cmd of (ext.contributes as any).commands) {
            commandRegistry.registerCommand(
              cmd.command,
              {
                title: cmd.title,
                category: cmd.category || ext.displayName,
                icon: cmd.icon,
                handler: (...args: any[]) => this.executeCommand(cmd.command, ...args),
              },
              ext.id
            );
          }
        }
        if (Array.isArray((ext.contributes as any).activityBar)) {
          for (const item of (ext.contributes as any).activityBar) {
            viewRegistryService.registerActivityBarItem(ext.id, item);
          }
        }
        if (Array.isArray((ext.contributes as any).views)) {
          for (const view of (ext.contributes as any).views) {
            viewRegistryService.registerView(ext.id, view);
          }
        }
      }

      outputChannelService.append(
        'Extension Host',
        `[DevMode] Loaded unpacked extension: ${ext.displayName} (${ext.id})`
      );

      if (ext.enabled && ext.main && ext.installedPath) {
        extensionHostProcess.activateExtension(ext.id, ext.installedPath, ext.main, ext).catch(() => {});
      }

      return { success: true, extension: ext };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  getRegistry(): ExtensionRegistry {
    return extensionRegistry;
  }

  async reconcileRegistry() {
    return await extensionRegistry.reconcile();
  }

  importVSCodeExtensions(): { success: boolean; count: number; extensions: ExtensionManifest[] } {
    this.cachedExtensions = null;
    const vscodeDir = this.getVSCodeExtensionsDirectory();
    const binaryDir = this.getExtensionsDirectory();
    let imported = 0;

    if (!fs.existsSync(vscodeDir)) {
      return { success: false, count: 0, extensions: this.listExtensions() };
    }

    try {
      const entries = fs.readdirSync(vscodeDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const src = path.join(vscodeDir, entry.name);
          const dest = path.join(binaryDir, entry.name);
          if (fs.existsSync(path.join(src, 'package.json')) && !fs.existsSync(dest)) {
            try {
              fs.cpSync(src, dest, { recursive: true });
              imported++;
            } catch (err) {
              console.error(`[Extensions] Error importing ${entry.name}:`, err);
            }
          }
        }
      }
    } catch (err) {
      console.error('[Extensions] Import failed:', err);
    }

    return {
      success: true,
      count: imported,
      extensions: this.listExtensions(),
    };
  }

  toggleExtension(id: string, enabled: boolean): boolean {
    this.cachedExtensions = null;
    if (enabled) {
      extensionRegistry.enable(id);
      const ext = this.listExtensions().find((e) => e.id.toLowerCase() === id.toLowerCase());
      if (ext && ext.main && ext.installedPath) {
        extensionHostProcess.activateExtension(ext.id, ext.installedPath, ext.main, ext).catch(() => {});
      }
    } else {
      extensionRegistry.disable(id);
      extensionHostProcess.deactivateExtension(id).catch(() => {});
    }
    const state = this.loadState();
    state[id] = enabled;
    this.saveState(state);
    return true;
  }

  searchMarketplace(query: string): Promise<MarketplaceExtensionItem[]> {
    return new Promise((resolve) => {
      const trimmed = (query || '').trim();
      const isDefault = !trimmed || trimmed.toLowerCase() === 'popular';
      const apiUrl = isDefault
        ? `https://open-vsx.org/api/-/search?sortBy=downloadCount&sortOrder=desc&size=40`
        : `https://open-vsx.org/api/-/search?query=${encodeURIComponent(trimmed)}&size=40`;

      const installedList = this.listExtensions();
      const installedIds = new Set(installedList.map((e) => e.id.toLowerCase()));

      const client = apiUrl.startsWith('https') ? https : http;
      const req = client.get(
        apiUrl,
        { headers: { 'User-Agent': 'Binary-IDE' }, timeout: 25000 },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              const rawItems = json.extensions || [];

              if (rawItems.length === 0 && trimmed && !isDefault) {
                // Fallback to VS Code gallery if Open VSX has no results for this query
                this.queryVSCodeGallery(trimmed, installedIds).then(resolve);
                return;
              }

              const items: MarketplaceExtensionItem[] = rawItems.map((ext: any) => {
                const publisher = ext.namespace || ext.publisher || 'Community';
                const id = `${publisher}.${ext.name}`;
                const isInstalled = installedIds.has(id.toLowerCase());

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
              resolve(items);
            } catch (err) {
              console.error('[Extensions] Failed to parse marketplace response, attempting gallery fallback:', err);
              this.queryVSCodeGallery(trimmed, installedIds).then(resolve);
            }
          });
        }
      );

      req.on('error', (err) => {
        console.warn('[Extensions] Open VSX search request error, using gallery fallback:', err.message);
        this.queryVSCodeGallery(trimmed, installedIds).then(resolve);
      });

      req.on('timeout', () => {
        req.destroy();
        this.queryVSCodeGallery(trimmed, installedIds).then(resolve);
      });
    });
  }

  private queryVSCodeGallery(query: string, installedIds: Set<string>): Promise<MarketplaceExtensionItem[]> {
    return new Promise((resolve) => {
      const trimmed = (query || '').trim();
      const postData = JSON.stringify({
        filters: [{
          criteria: trimmed
            ? [{ filterType: 10, value: trimmed }]
            : [{ filterType: 8, value: 'Microsoft.VisualStudio.Code' }],
          pageNumber: 1,
          pageSize: 40,
          sortBy: trimmed ? 0 : 4,
          sortOrder: 0,
        }],
        flags: 0x1 | 0x2 | 0x4 | 0x10 | 0x40 | 0x80 | 0x100,
      });

      const req = https.request(
        'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json;api-version=6.0-preview.1',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': 'Binary-IDE/1.0',
          },
          timeout: 20000,
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              const exts = json.results?.[0]?.extensions || [];
              const items: MarketplaceExtensionItem[] = exts.map((ext: any) => {
                const publisher = ext.publisher?.publisherName || 'Community';
                const name = ext.extensionName;
                const id = `${publisher}.${name}`;
                const version = ext.versions?.[0]?.version || '1.0.0';
                const downloadUrl = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${name}/latest/vspackage`;

                let iconUrl: string | undefined = undefined;
                const files = ext.versions?.[0]?.files || [];
                const iconFile = files.find((f: any) => f.assetType === 'Microsoft.VisualStudio.Services.Icons.Default');
                if (iconFile?.source) {
                  iconUrl = iconFile.source;
                }

                let downloadCount = 0;
                let rating: number | undefined = undefined;
                const stats = ext.statistics || [];
                for (const s of stats) {
                  if (s.statisticName === 'install') downloadCount = Math.round(s.value);
                  if (s.statisticName === 'averagerating') rating = Math.round(s.value * 10) / 10;
                }

                return {
                  id,
                  name,
                  displayName: ext.displayName || name,
                  publisher,
                  version,
                  description: ext.shortDescription || '',
                  icon: iconUrl,
                  downloadUrl,
                  downloadCount,
                  rating,
                  installed: installedIds.has(id.toLowerCase()),
                };
              });
              resolve(items);
            } catch {
              resolve([]);
            }
          });
        }
      );

      req.on('error', () => resolve([]));
      req.on('timeout', () => {
        req.destroy();
        resolve([]);
      });
      req.write(postData);
      req.end();
    });
  }

  private downloadToFile(url: string, destPath: string, maxRedirects = 5): Promise<void> {
    return new Promise((resolve, reject) => {
      if (maxRedirects <= 0) {
        return reject(new Error('Too many HTTP redirects'));
      }

      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { headers: { 'User-Agent': 'Binary-IDE' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          const nextUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          return this.downloadToFile(nextUrl, destPath, maxRedirects - 1).then(resolve).catch(reject);
        }

        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Download failed with status code ${res.statusCode}`));
        }

        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);
        fileStream.on('close', () => {
          resolve();
        });
        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      });

      req.on('error', reject);
    });
  }

  async installExtension(
    id: string,
    downloadUrl?: string
  ): Promise<{ success: boolean; error?: string; extension?: ExtensionManifest }> {
    const notifyProgress = (progress: DownloadProgress) => {
      if (this.win && !this.win.isDestroyed()) {
        this.win.webContents.send('extensions:install-progress', progress);
      }
    };

    let finalDownloadUrl = downloadUrl;
    const publisher = id.split('.')[0] || 'community';
    const extName = id.includes('.') ? id.split('.').slice(1).join('.') : id;

    // Build candidate download URLs with fallbacks
    const candidateUrls: string[] = [];
    if (finalDownloadUrl) {
      candidateUrls.push(finalDownloadUrl);
    }
    candidateUrls.push(`https://open-vsx.org/api/${publisher}/${extName}/latest/file/${publisher}.${extName}.vsix`);
    candidateUrls.push(`https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${extName}/latest/vspackage`);

    let tempPackagePath: string | null = null;
    let lastError: Error | null = null;

    for (let i = 0; i < candidateUrls.length; i++) {
      const candidateUrl = candidateUrls[i];
      try {
        notifyProgress({
          extensionId: id,
          stage: 'downloading',
          progress: 5,
          message: i === 0 ? 'Downloading extension package...' : 'Retrying with mirror repository...',
        });

        // 1. Download package with real-time progress
        tempPackagePath = await extensionDownloaderService.downloadPackage(
          id,
          candidateUrl,
          notifyProgress
        );

        // 2. Validate package integrity, magic bytes, and manifest
        notifyProgress({
          extensionId: id,
          stage: 'validating',
          progress: 50,
          message: 'Validating package integrity...',
        });

        await extensionDownloaderService.validatePackage(tempPackagePath, id);
        break; // Successfully downloaded and validated!
      } catch (err: any) {
        lastError = err;
        if (tempPackagePath) {
          await extensionDownloaderService.cleanFile(tempPackagePath);
          tempPackagePath = null;
        }
        console.warn(`[Extensions] Candidate download failed (${candidateUrl}):`, err.message);
      }
    }

    if (!tempPackagePath) {
      const errorMsg = lastError?.message || `Failed to download extension package for ${id}`;
      notifyProgress({
        extensionId: id,
        stage: 'error',
        progress: 0,
        error: errorMsg,
      });
      return { success: false, error: errorMsg };
    }

    try {
      // 3. Extract and stage extension
      notifyProgress({
        extensionId: id,
        stage: 'extracting',
        progress: 60,
        message: 'Extracting package files...',
      });

      const extracted = await this.installerService.installFromVsix(
        tempPackagePath,
        (subStage, pct, msg) => {
          notifyProgress({
            extensionId: id,
            stage: subStage,
            progress: pct,
            message: msg,
          });
        }
      );

      // 4. Update extension state & registry
      const state = this.loadState();
      state[id] = true;
      state[extracted.id] = true;
      this.saveState(state);

      this.cachedExtensions = null;
      this.lastCacheTime = 0;

      // 5. Broadcast to window so UI refreshes immediately
      if (this.win && !this.win.isDestroyed()) {
        this.win.webContents.send('extensions:changed');
      }

      notifyProgress({
        extensionId: id,
        stage: 'completed',
        progress: 100,
        message: 'Installation complete',
      });

      if (extracted.manifest.main && extracted.folderPath) {
        extensionHostProcess
          .activateExtension(extracted.id, extracted.folderPath, extracted.manifest.main, extracted.manifest)
          .catch((err) => console.warn('[Extensions] Auto-activation after install failed:', err));
      }

      return {
        success: true,
        extension: {
          id: extracted.id,
          name: extracted.name,
          displayName: extracted.manifest.displayName || extracted.name,
          version: extracted.version,
          description: extracted.manifest.description || '',
          author: extracted.publisher,
          icon: extracted.manifest.icon,
          enabled: true,
          categories: Array.isArray(extracted.manifest.categories) ? extracted.manifest.categories : ['Other'],
          source: 'binary',
          installedPath: extracted.folderPath,
          contributes: extracted.manifest.contributes,
          main: extracted.manifest.main || '',
          activationEvents: extracted.manifest.activationEvents || [],
          engines: extracted.manifest.engines,
        } as any,
      };
    } catch (err: any) {
      console.error(`[Extensions] Installation error for ${id}:`, err);
      notifyProgress({
        extensionId: id,
        stage: 'error',
        progress: 0,
        error: err.message || 'Installation failed',
      });
      return { success: false, error: err.message || 'Installation failed' };
    } finally {
      if (tempPackagePath) {
        await extensionDownloaderService.cleanFile(tempPackagePath);
      }
    }
  }

  getVSCodeExtensionCount(): number {
    try {
      const vscodeDir = this.getVSCodeExtensionsDirectory();
      if (!fs.existsSync(vscodeDir)) return 0;
      const entries = fs.readdirSync(vscodeDir, { withFileTypes: true });
      return entries.filter(
        (e) => e.isDirectory() && !e.name.startsWith('.') && fs.existsSync(path.join(vscodeDir, e.name, 'package.json'))
      ).length;
    } catch {
      return 0;
    }
  }

  uninstallExtension(id: string): { success: boolean; error?: string } {
    const idLower = id.toLowerCase();
    const dotIdx = idLower.indexOf('.');
    const nameOnly = dotIdx !== -1 ? idLower.slice(dotIdx + 1) : idLower;

    try {
      // Deactivate from running Extension Host
      extensionHostProcess.deactivateExtension(id).catch(() => {});

      // 1. Invalidate cache before lookup
      this.cachedExtensions = null;
      this.lastCacheTime = 0;

      // 2. Unregister from ExtensionRegistry
      extensionRegistry.unregister(id, true);
      if (nameOnly !== idLower) {
        extensionRegistry.unregister(nameOnly, false);
      }

      // 3. Find matching extension in active list to get exact installedPath
      try {
        const currentList = this.listExtensions();
        const found = currentList.find(
          (e) =>
            e.id.toLowerCase() === idLower ||
            e.name.toLowerCase() === idLower ||
            e.name.toLowerCase() === nameOnly ||
            (e.installedPath && path.basename(e.installedPath).toLowerCase() === idLower) ||
            (e.installedPath && path.basename(e.installedPath).toLowerCase().startsWith(`${idLower}-`))
        );

        if (found?.installedPath && fs.existsSync(found.installedPath)) {
          try {
            const extBaseDir = path.resolve(this.getExtensionsDirectory());
            let targetToDelete = path.resolve(found.installedPath);

            // Ensure we delete the top-level extension directory inside ~/.binary/extensions
            if (targetToDelete.startsWith(extBaseDir + path.sep)) {
              const rel = path.relative(extBaseDir, targetToDelete);
              const topFolder = rel.split(path.sep)[0];
              targetToDelete = path.join(extBaseDir, topFolder);
            }

            if (fs.existsSync(targetToDelete)) {
              fs.rmSync(targetToDelete, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
            }
          } catch (e: any) {
            console.warn('[Extensions] Direct installedPath rmSync warning:', e);
          }
        }
      } catch {}

      // 3. Scan both binary extensions directory and workspace directory for any matching folders
      const dirsToCheck = [
        this.getExtensionsDirectory(),
        this.getMyIdeExtensionsDirectory(),
      ];

      for (const targetDir of dirsToCheck) {
        if (!fs.existsSync(targetDir)) continue;

        const entries = fs.readdirSync(targetDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          const folderPath = path.join(targetDir, entry.name);
          const entryLower = entry.name.toLowerCase();

          let isMatch = (
            entryLower === idLower ||
            entryLower.startsWith(`${idLower}-`) ||
            entryLower.startsWith(`${nameOnly}-`) ||
            entryLower === nameOnly
          );

          const pkgPath = fs.existsSync(path.join(folderPath, 'package.json'))
            ? path.join(folderPath, 'package.json')
            : path.join(folderPath, 'extension', 'package.json');

          if (!isMatch && fs.existsSync(pkgPath)) {
            try {
              const raw = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
              const publisher = (raw.publisher || entry.name.split('.')[0] || '').toLowerCase();
              const name = (raw.name || '').toLowerCase();
              const extId = `${publisher}.${name}`;
              if (extId === idLower || name === idLower || name === nameOnly) {
                isMatch = true;
              }
            } catch {}
          }

          if (isMatch) {
            try {
              fs.rmSync(folderPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
            } catch (rmErr: any) {
              console.warn(`[Extensions] rmSync warning for ${folderPath}:`, rmErr);
            }
          }
        }
      }

      // 4. Remove from unpacked developer extensions
      for (const unpackedId of Array.from(this.unpackedExtensions.keys())) {
        if (
          unpackedId.toLowerCase() === idLower ||
          unpackedId.toLowerCase().endsWith(`.${nameOnly}`) ||
          unpackedId.toLowerCase() === nameOnly
        ) {
          this.unpackedExtensions.delete(unpackedId);
        }
      }

      // 5. Clean state
      const state = this.loadState();
      for (const key of Object.keys(state)) {
        if (key.toLowerCase() === idLower || key.toLowerCase() === nameOnly) {
          delete state[key];
        }
      }
      this.saveState(state);

      this.cachedExtensions = null;
      this.lastCacheTime = 0;

      // 6. Broadcast to window so UI refreshes immediately
      if (this.win && !this.win.isDestroyed()) {
        this.win.webContents.send('extensions:changed');
      }

      return { success: true };
    } catch (err: any) {
      console.error('[Extensions] Uninstall failed:', err);
      return { success: false, error: err.message || 'Uninstall failed' };
    }
  }
}

export const extensionService = new ExtensionService();
