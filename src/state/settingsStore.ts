import { useState, useEffect } from 'react';
import { AppSettings } from '../types/electron';
import { api } from '../services/api';

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
    modelType: 'high',
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

const CACHED_THEME_KEY = 'binary_cached_theme';
const CACHED_SCALE_KEY = 'binary_cached_ui_scale';

// Immediately apply cached theme & scale on boot before React renders to prevent flash
if (typeof window !== 'undefined') {
  try {
    const cachedTheme = localStorage.getItem(CACHED_THEME_KEY);
    if (cachedTheme) {
      document.documentElement.setAttribute('data-theme', cachedTheme);
    }
    const cachedScale = localStorage.getItem(CACHED_SCALE_KEY);
    if (cachedScale) {
      document.documentElement.style.setProperty('--ui-scale', cachedScale);
    }
  } catch {}
}

let globalSettings: AppSettings = DEFAULT_SETTINGS;
let currentWorkspacePath: string | undefined = undefined;
let isSettingsInitialized = false;
let initPromise: Promise<AppSettings> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function applyLiveDomEffects(settings: AppSettings) {
  try {
    // Apply UI theme
    const theme = settings.appearance?.theme || settings.general?.theme || 'binary-dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(CACHED_THEME_KEY, theme);

    // Apply UI scaling
    const scale = (settings.appearance?.uiScale || 100) / 100;
    document.documentElement.style.setProperty('--ui-scale', String(scale));
    localStorage.setItem(CACHED_SCALE_KEY, String(scale));
  } catch (err) {
    console.error('Error applying live settings DOM effects:', err);
  }
}

export const settingsStore = {
  getState: () => globalSettings,
  isReady: () => isSettingsInitialized,

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  init: async (workspacePath?: string): Promise<AppSettings> => {
    if (initPromise && currentWorkspacePath === workspacePath) {
      return initPromise;
    }

    currentWorkspacePath = workspacePath;
    initPromise = (async () => {
      try {
        const loaded = await api.loadSettings(workspacePath);
        if (loaded) {
          // Strip legacy default exclude patterns so they don't persist automatically
          const legacyDefaults = new Set(['**/node_modules', '**/.git', '**/dist', '**/build', '**/.next', '**/.nuxt', '**/dist-electron']);
          const cleanedExclude = Array.isArray(loaded.files?.exclude)
            ? loaded.files.exclude.filter((p: string) => !legacyDefaults.has(p))
            : [];

          // Deep merge with defaults to ensure full schema integrity
          globalSettings = {
            general: { ...DEFAULT_SETTINGS.general, ...(loaded.general || {}) },
            appearance: { ...DEFAULT_SETTINGS.appearance, ...(loaded.appearance || {}) },
            editor: { ...DEFAULT_SETTINGS.editor, ...(loaded.editor || {}), wordWrap: loaded.editor?.wordWrap === 'on' ? 'off' : (loaded.editor?.wordWrap || 'off') },
            files: { ...DEFAULT_SETTINGS.files, ...(loaded.files || {}), exclude: cleanedExclude },
            terminal: { ...DEFAULT_SETTINGS.terminal, ...(loaded.terminal || {}) },
            keyboard: { ...DEFAULT_SETTINGS.keyboard, ...(loaded.keyboard || {}) },
            extensions: { ...DEFAULT_SETTINGS.extensions, ...(loaded.extensions || {}) },
            ai: { ...DEFAULT_SETTINGS.ai, ...(loaded.ai || {}) },
            security: { ...DEFAULT_SETTINGS.security, ...(loaded.security || {}) },
            workspace: { ...DEFAULT_SETTINGS.workspace, ...(loaded.workspace || {}) },
          };
          applyLiveDomEffects(globalSettings);
          isSettingsInitialized = true;
          notify();
          api.notifySettingsChanged(globalSettings);
        } else {
          isSettingsInitialized = true;
        }
      } catch (err) {
        console.error('Failed to init settings:', err);
        isSettingsInitialized = true;
      }
      return globalSettings;
    })();

    return initPromise;
  },

  updateSettings: async (
    newSettings: Partial<AppSettings>,
    scope: 'user' | 'workspace' = 'user'
  ) => {
    globalSettings = {
      ...globalSettings,
      ...newSettings,
      general: { ...globalSettings.general, ...(newSettings.general || {}) },
      appearance: { ...globalSettings.appearance, ...(newSettings.appearance || {}) },
      editor: { ...globalSettings.editor, ...(newSettings.editor || {}) },
      files: { ...globalSettings.files, ...(newSettings.files || {}) },
      terminal: { ...globalSettings.terminal, ...(newSettings.terminal || {}) },
      keyboard: { ...globalSettings.keyboard, ...(newSettings.keyboard || {}) },
      extensions: { ...globalSettings.extensions, ...(newSettings.extensions || {}) },
      ai: { ...globalSettings.ai, ...(newSettings.ai || {}) },
      security: { ...globalSettings.security, ...(newSettings.security || {}) },
      workspace: { ...globalSettings.workspace, ...(newSettings.workspace || {}) },
    };

    applyLiveDomEffects(globalSettings);
    notify();
    api.notifySettingsChanged(globalSettings);

    try {
      await api.saveSettings(globalSettings, scope, currentWorkspacePath);
    } catch (err) {
      console.error('Failed to persist settings:', err);
    }
  },

  resetCategory: async (category: keyof AppSettings, scope: 'user' | 'workspace' = 'user') => {
    const defaultCat = DEFAULT_SETTINGS[category];
    await settingsStore.updateSettings({ [category]: defaultCat } as any, scope);
  },

  resetAll: async (scope: 'user' | 'workspace' = 'user') => {
    globalSettings = { ...DEFAULT_SETTINGS };
    applyLiveDomEffects(globalSettings);
    notify();
    await api.saveSettings(globalSettings, scope, currentWorkspacePath);
  },
};

// Initialize settings
settingsStore.init();

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(settingsStore.getState());

  useEffect(() => {
    const unsub = settingsStore.subscribe(() => {
      setSettings({ ...settingsStore.getState() });
    });
    return () => {
      unsub();
    };
  }, []);

  return settings;
}
