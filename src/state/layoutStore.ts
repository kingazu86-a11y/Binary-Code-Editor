import { useState, useEffect } from 'react';
import { ActivityTab, BottomTab } from '../types';

export interface LayoutState {
  activeActivityTab: ActivityTab;
  sidebarVisible: boolean;
  sidebarWidth: number;
  bottomPanelVisible: boolean;
  bottomPanelTab: BottomTab;
  bottomPanelHeight: number;
  aiPanelVisible: boolean;
  aiPanelWidth: number;
  commandPaletteOpen: boolean;
  quickOpenOpen: boolean;
  isZenMode: boolean;
  isSettingsOpen: boolean;
  settingsCategory: string;
}

const STORAGE_KEY = 'binary_layout_state';

function loadSavedLayout(): Partial<LayoutState> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
}

const saved = loadSavedLayout();

let globalLayout: LayoutState = {
  activeActivityTab: (saved.activeActivityTab as ActivityTab) || 'explorer',
  sidebarVisible: saved.sidebarVisible !== undefined ? saved.sidebarVisible : true,
  sidebarWidth: saved.sidebarWidth || 280,
  bottomPanelVisible: saved.bottomPanelVisible !== undefined ? saved.bottomPanelVisible : true,
  bottomPanelTab: (saved.bottomPanelTab as BottomTab) || 'terminal',
  bottomPanelHeight: saved.bottomPanelHeight || 260,
  aiPanelVisible: saved.aiPanelVisible !== undefined ? saved.aiPanelVisible : false,
  aiPanelWidth: Math.max(300, saved.aiPanelWidth || 360),
  commandPaletteOpen: false,
  quickOpenOpen: false,
  isZenMode: false,
  isSettingsOpen: false,
  settingsCategory: 'general',
};

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeActivityTab: globalLayout.activeActivityTab,
        sidebarVisible: globalLayout.sidebarVisible,
        sidebarWidth: globalLayout.sidebarWidth,
        bottomPanelVisible: globalLayout.bottomPanelVisible,
        bottomPanelTab: globalLayout.bottomPanelTab,
        bottomPanelHeight: globalLayout.bottomPanelHeight,
        aiPanelVisible: globalLayout.aiPanelVisible,
        aiPanelWidth: globalLayout.aiPanelWidth,
      })
    );
  } catch {}
}

export const layoutStore = {
  getState: () => globalLayout,

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setActiveActivityTab: (tab: ActivityTab) => {
    if (globalLayout.activeActivityTab === tab && globalLayout.sidebarVisible) {
      globalLayout = { ...globalLayout, sidebarVisible: false };
    } else {
      globalLayout = { ...globalLayout, activeActivityTab: tab, sidebarVisible: true };
    }
    notify();
  },

  toggleSidebar: () => {
    globalLayout = { ...globalLayout, sidebarVisible: !globalLayout.sidebarVisible };
    notify();
  },

  setSidebarWidth: (width: number) => {
    globalLayout = { ...globalLayout, sidebarWidth: Math.max(180, Math.min(width, 600)) };
    notify();
  },

  toggleBottomPanel: () => {
    globalLayout = { ...globalLayout, bottomPanelVisible: !globalLayout.bottomPanelVisible };
    notify();
  },

  setBottomPanelTab: (tab: BottomTab) => {
    globalLayout = { ...globalLayout, bottomPanelTab: tab, bottomPanelVisible: true };
    notify();
  },

  setBottomPanelHeight: (height: number) => {
    globalLayout = { ...globalLayout, bottomPanelHeight: Math.max(120, Math.min(height, 600)) };
    notify();
  },

  toggleAIPanel: () => {
    globalLayout = { ...globalLayout, aiPanelVisible: !globalLayout.aiPanelVisible };
    notify();
  },

  setAIPanelWidth: (width: number) => {
    globalLayout = { ...globalLayout, aiPanelWidth: Math.max(300, Math.min(width, 900)) };
    notify();
  },

  setCommandPaletteOpen: (open: boolean) => {
    globalLayout = { ...globalLayout, commandPaletteOpen: open };
    notify();
  },

  setQuickOpenOpen: (open: boolean) => {
    globalLayout = { ...globalLayout, quickOpenOpen: open };
    notify();
  },

  toggleZenMode: () => {
    const nextZen = !globalLayout.isZenMode;
    globalLayout = {
      ...globalLayout,
      isZenMode: nextZen,
      sidebarVisible: !nextZen,
      bottomPanelVisible: !nextZen,
      aiPanelVisible: false,
    };
    notify();
  },

  openSettings: (category: string = 'general') => {
    globalLayout = { ...globalLayout, isSettingsOpen: true, settingsCategory: category };
    notify();
  },

  closeSettings: () => {
    globalLayout = { ...globalLayout, isSettingsOpen: false };
    notify();
  },

  toggleSettings: () => {
    globalLayout = { ...globalLayout, isSettingsOpen: !globalLayout.isSettingsOpen };
    notify();
  },

  setSettingsCategory: (category: string) => {
    globalLayout = { ...globalLayout, settingsCategory: category };
    notify();
  },
};

export function useLayout() {
  const [layout, setLayout] = useState<LayoutState>(layoutStore.getState());

  useEffect(() => {
    const unsub = layoutStore.subscribe(() => {
      setLayout({ ...layoutStore.getState() });
    });
    return () => {
      unsub();
    };
  }, []);

  return layout;
}
