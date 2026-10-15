import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import type { AppSettings } from '../../../src/types/electron';

export const DEFAULT_SETTINGS: AppSettings = {
  general: {
    startupAction: 'welcome',
    confirmDelete: true,
    deletePermanently: false,
    autoSave: 'afterDelay',
    autoSaveDelay: 1000,
    telemetry: false,
    theme: 'binary-dark',
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
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
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
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
    mouseWheelZoom: false,
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
    defaultShell: process.platform === 'win32' ? 'powershell' : 'bash',
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
    systemPromptExtra: '',
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

function deepMerge<T extends Record<string, any>>(target: T, source?: Partial<T>): T {
  if (!source) return { ...target };
  const output: any = { ...target };
  for (const key of Object.keys(source)) {
    const sVal = (source as any)[key];
    const tVal = (target as any)[key];
    if (sVal !== undefined) {
      if (
        sVal !== null &&
        typeof sVal === 'object' &&
        !Array.isArray(sVal) &&
        tVal !== null &&
        typeof tVal === 'object' &&
        !Array.isArray(tVal)
      ) {
        output[key] = deepMerge(tVal, sVal);
      } else {
        output[key] = sVal;
      }
    }
  }
  return output;
}

const LEGACY_DEFAULT_EXCLUDES = new Set([
  '**/node_modules',
  '**/.git',
  '**/dist',
  '**/build',
  '**/.next',
  '**/.nuxt',
  '**/dist-electron',
]);

export class SettingsService {
  private getUserSettingsPath(): string {
    return path.join(app.getPath('userData'), 'binary-settings.json');
  }

  private getWorkspaceSettingsPath(workspacePath: string): string {
    return path.join(workspacePath, '.binary', 'settings.json');
  }

  private getRecentProjectsPath(): string {
    return path.join(app.getPath('userData'), 'binary-recent-projects.json');
  }

  // Load User-level settings
  loadUserSettings(): AppSettings {
    try {
      const p = this.getUserSettingsPath();
      if (fs.existsSync(p)) {
        const data = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(data);
        if (parsed?.files?.exclude && Array.isArray(parsed.files.exclude)) {
          parsed.files.exclude = parsed.files.exclude.filter((item: string) => !LEGACY_DEFAULT_EXCLUDES.has(item));
        }
        return deepMerge(DEFAULT_SETTINGS, parsed);
      }
    } catch (err) {
      console.error('[Settings] Failed to load user settings:', err);
    }
    return DEFAULT_SETTINGS;
  }

  // Load Workspace-level settings (.binary/settings.json)
  loadWorkspaceSettings(workspacePath: string): Partial<AppSettings> | null {
    try {
      const p = this.getWorkspaceSettingsPath(workspacePath);
      if (fs.existsSync(p)) {
        const data = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(data);
        if (parsed?.files?.exclude && Array.isArray(parsed.files.exclude)) {
          parsed.files.exclude = parsed.files.exclude.filter((item: string) => !LEGACY_DEFAULT_EXCLUDES.has(item));
        }
        return parsed;
      }
    } catch (err) {
      console.error('[Settings] Failed to load workspace settings from:', workspacePath, err);
    }
    return null;
  }

  // Effective Settings: Default -> User -> Workspace
  loadSettings(workspacePath?: string): AppSettings {
    const userSettings = this.loadUserSettings();
    if (!workspacePath) {
      return userSettings;
    }

    const wsSettings = this.loadWorkspaceSettings(workspacePath);
    if (!wsSettings) {
      return {
        ...userSettings,
        workspace: { ...userSettings.workspace, workspacePath },
      };
    }

    const effective = deepMerge(userSettings, wsSettings);
    effective.workspace = { ...effective.workspace, workspacePath };
    return effective;
  }

  // Save Settings: to User (global) or Workspace (.binary/settings.json)
  saveSettings(settings: AppSettings, scope: 'user' | 'workspace' = 'user', workspacePath?: string): boolean {
    try {
      if (scope === 'workspace' && workspacePath) {
        const wsFile = this.getWorkspaceSettingsPath(workspacePath);
        const wsDir = path.dirname(wsFile);
        if (!fs.existsSync(wsDir)) {
          fs.mkdirSync(wsDir, { recursive: true });
        }
        fs.writeFileSync(wsFile, JSON.stringify(settings, null, 2), 'utf-8');
        return true;
      }

      // Default: Save to User Global Settings
      const p = this.getUserSettingsPath();
      fs.writeFileSync(p, JSON.stringify(settings, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[Settings] Failed to save settings:', err);
      return false;
    }
  }

  getRecentProjects(): string[] {
    try {
      const p = this.getRecentProjectsPath();
      if (fs.existsSync(p)) {
        const data = fs.readFileSync(p, 'utf-8');
        const list: string[] = JSON.parse(data);
        return list.filter((item) => fs.existsSync(item));
      }
    } catch (err) {
      console.error('[Settings] Error loading recent projects:', err);
    }
    return [];
  }

  addRecentProject(projectPath: string): void {
    try {
      if (!fs.existsSync(projectPath)) return;
      let recents = this.getRecentProjects();
      recents = recents.filter((p) => p.toLowerCase() !== projectPath.toLowerCase());
      recents.unshift(projectPath);
      recents = recents.slice(0, 15);

      const p = this.getRecentProjectsPath();
      fs.writeFileSync(p, JSON.stringify(recents, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Settings] Error saving recent project:', err);
    }
  }

  removeRecentProject(projectPath: string): void {
    try {
      let recents = this.getRecentProjects();
      recents = recents.filter((p) => p.toLowerCase() !== projectPath.toLowerCase());
      const p = this.getRecentProjectsPath();
      fs.writeFileSync(p, JSON.stringify(recents, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Settings] Error removing recent project:', err);
    }
  }

  clearRecentProjects(): void {
    try {
      const p = this.getRecentProjectsPath();
      if (fs.existsSync(p)) {
        fs.writeFileSync(p, JSON.stringify([], null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('[Settings] Error clearing recent projects:', err);
    }
  }
}

export const settingsService = new SettingsService();
