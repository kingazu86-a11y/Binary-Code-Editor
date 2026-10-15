import { useState, useEffect } from 'react';
import { settingsStore, useSettings } from './settingsStore';
import { layoutStore } from './layoutStore';
import { editorStore } from './editorStore';
import { workspaceStore } from './workspaceStore';
import { aiStore } from './aiStore';
import { cppStore } from './cppStore';
import { api } from '../services/api';

export interface CommandDefinition {
  id: string;
  title: string;
  category: string;
  defaultKeybinding: string;
  description?: string;
}

export const MASTER_COMMANDS: CommandDefinition[] = [
  // File Commands
  { id: 'file.new', title: 'File: New File in Explorer', category: 'File', defaultKeybinding: 'Ctrl+N' },
  { id: 'file.newFolder', title: 'File: New Folder in Explorer', category: 'File', defaultKeybinding: 'Ctrl+Shift+N' },
  { id: 'file.openFile', title: 'File: Open File...', category: 'File', defaultKeybinding: 'Ctrl+O' },
  { id: 'file.openFolder', title: 'File: Open Folder...', category: 'File', defaultKeybinding: 'Ctrl+K Ctrl+O' },
  { id: 'file.save', title: 'File: Save', category: 'File', defaultKeybinding: 'Ctrl+S' },
  { id: 'file.saveAll', title: 'File: Save All', category: 'File', defaultKeybinding: 'Ctrl+K S' },
  { id: 'file.closeActiveTab', title: 'File: Close Active Tab', category: 'File', defaultKeybinding: 'Ctrl+W' },
  { id: 'file.closeAllTabs', title: 'File: Close All Tabs', category: 'File', defaultKeybinding: 'Ctrl+K W' },

  // Explorer Commands
  { id: 'explorer.rename', title: 'Explorer: Rename Selected Item', category: 'Explorer', defaultKeybinding: 'F2' },
  { id: 'explorer.delete', title: 'Explorer: Delete Selected Item', category: 'Explorer', defaultKeybinding: 'Delete' },

  // Edit Commands
  { id: 'edit.undo', title: 'Edit: Undo', category: 'Edit', defaultKeybinding: 'Ctrl+Z' },
  { id: 'edit.redo', title: 'Edit: Redo', category: 'Edit', defaultKeybinding: 'Ctrl+Y' },
  { id: 'edit.cut', title: 'Edit: Cut', category: 'Edit', defaultKeybinding: 'Ctrl+X' },
  { id: 'edit.copy', title: 'Edit: Copy', category: 'Edit', defaultKeybinding: 'Ctrl+C' },
  { id: 'edit.paste', title: 'Edit: Paste', category: 'Edit', defaultKeybinding: 'Ctrl+V' },
  { id: 'edit.selectAll', title: 'Edit: Select All', category: 'Edit', defaultKeybinding: 'Ctrl+A' },

  // Navigation & Palettes
  { id: 'view.commandPalette', title: 'View: Command Palette...', category: 'Navigation', defaultKeybinding: 'Ctrl+Shift+P' },
  { id: 'view.quickOpen', title: 'Go to File: Quick Open...', category: 'Navigation', defaultKeybinding: 'Ctrl+P' },
  { id: 'view.settings', title: 'Preferences: Open Settings', category: 'Preferences', defaultKeybinding: 'Ctrl+,' },
  { id: 'view.keyboardShortcuts', title: 'Preferences: Open Keyboard Shortcuts', category: 'Preferences', defaultKeybinding: 'Ctrl+K Ctrl+S' },

  // Panels & Views
  { id: 'view.toggleSidebar', title: 'View: Toggle Primary Sidebar', category: 'View', defaultKeybinding: 'Ctrl+B' },
  { id: 'view.toggleBottomPanel', title: 'View: Toggle Bottom Panel', category: 'View', defaultKeybinding: 'Ctrl+J' },
  { id: 'view.toggleTerminal', title: 'Terminal: Toggle Integrated Terminal', category: 'Terminal', defaultKeybinding: 'Ctrl+`' },
  { id: 'view.toggleAI', title: 'AI: Toggle Binary AI Agent', category: 'AI', defaultKeybinding: 'Ctrl+Shift+A' },
  { id: 'view.explorer', title: 'View: Show File Explorer', category: 'View', defaultKeybinding: 'Ctrl+Shift+E' },
  { id: 'view.search', title: 'View: Show Search in Files', category: 'View', defaultKeybinding: 'Ctrl+Shift+F' },
  { id: 'view.git', title: 'View: Show Source Control', category: 'View', defaultKeybinding: 'Ctrl+Shift+G' },
  { id: 'view.extensions', title: 'View: Show Extensions', category: 'View', defaultKeybinding: 'Ctrl+Shift+X' },
  { id: 'view.splitHorizontal', title: 'View: Split Editor Horizontal', category: 'View', defaultKeybinding: 'Ctrl+\\' },
  { id: 'view.splitVertical', title: 'View: Split Editor Vertical', category: 'View', defaultKeybinding: 'Ctrl+K Ctrl+\\' },
  { id: 'view.toggleZenMode', title: 'View: Toggle Zen Mode', category: 'View', defaultKeybinding: 'Ctrl+K Z' },

  // Terminal
  { id: 'terminal.new', title: 'Terminal: Create New Terminal', category: 'Terminal', defaultKeybinding: 'Ctrl+Shift+`' },
  { id: 'terminal.kill', title: 'Terminal: Kill Active Terminal', category: 'Terminal', defaultKeybinding: 'Ctrl+Shift+W' },

  // C/C++ Build & Debug
  { id: 'cpp.build', title: 'C++: Build / Compile Active File', category: 'C/C++', defaultKeybinding: 'Ctrl+Shift+B' },
  { id: 'cpp.run', title: 'C++: Compile & Run in Terminal', category: 'C/C++', defaultKeybinding: 'Ctrl+F5' },
  { id: 'cpp.debug', title: 'C++: Start / Continue Debugging (GDB)', category: 'C/C++', defaultKeybinding: 'F5' },
  { id: 'cpp.stepOver', title: 'Debug: Step Over', category: 'Debug', defaultKeybinding: 'F10' },
  { id: 'cpp.stepInto', title: 'Debug: Step Into', category: 'Debug', defaultKeybinding: 'F11' },
  { id: 'cpp.stepOut', title: 'Debug: Step Out', category: 'Debug', defaultKeybinding: 'Shift+F11' },
  { id: 'cpp.stopDebug', title: 'Debug: Stop Debugging', category: 'Debug', defaultKeybinding: 'Shift+F5' },
  { id: 'cpp.toggleBreakpoint', title: 'Debug: Toggle Line Breakpoint', category: 'Debug', defaultKeybinding: 'F9' },

  // AI
  { id: 'ai.explain', title: 'AI: Explain Code / Active Selection', category: 'AI', defaultKeybinding: 'Ctrl+Shift+L' },
  { id: 'ai.refactor', title: 'AI: Refactor and Optimize Code', category: 'AI', defaultKeybinding: 'Ctrl+Shift+R' },
];

export interface ResolvedCommand extends CommandDefinition {
  currentKeybinding: string;
  isModified: boolean;
  conflictsWith: string[];
}

/** Normalize any shortcut string into a standard "Ctrl+Shift+P" format */
export function normalizeKeybinding(combo: string): string {
  if (!combo) return '';
  return combo
    .trim()
    .split(/\s+/)
    .map((part) => {
      const tokens = part.split('+').map((t) => t.trim().toLowerCase());
      const hasCtrl = tokens.includes('ctrl') || tokens.includes('control');
      const hasAlt = tokens.includes('alt') || tokens.includes('opt') || tokens.includes('option');
      const hasShift = tokens.includes('shift');
      const hasMeta = tokens.includes('cmd') || tokens.includes('meta') || tokens.includes('super');
      const key = tokens.filter((t) => !['ctrl', 'control', 'alt', 'opt', 'option', 'shift', 'cmd', 'meta', 'super'].includes(t)).pop();

      const ordered: string[] = [];
      if (hasCtrl) ordered.push('Ctrl');
      if (hasAlt) ordered.push('Alt');
      if (hasShift) ordered.push('Shift');
      if (hasMeta) ordered.push('Cmd');
      if (key) {
        if (key.length === 1) {
          ordered.push(key.toUpperCase());
        } else {
          ordered.push(key.charAt(0).toUpperCase() + key.slice(1));
        }
      }
      return ordered.join('+');
    })
    .join(' ');
}

/** Convert a native KeyboardEvent into a normalized key combo string (e.g. "Ctrl+P", "Ctrl+`", "Ctrl+Shift+P") */
export function eventToKeybinding(e: KeyboardEvent): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const ctrl = isMac ? e.ctrlKey : (e.ctrlKey || e.metaKey);
  const alt = e.altKey;
  const shift = e.shiftKey;
  const cmd = isMac && e.metaKey;

  // Ignore standalone modifier keypresses
  if (['Control', 'Shift', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
    return '';
  }

  let key = e.key;
  if (key === ' ') key = 'Space';
  else if (key === 'Escape') key = 'Esc';
  else if (key === 'ArrowUp') key = 'Up';
  else if (key === 'ArrowDown') key = 'Down';
  else if (key === 'ArrowLeft') key = 'Left';
  else if (key === 'ArrowRight') key = 'Right';
  else if (key.length === 1) key = key.toUpperCase();

  const parts: string[] = [];
  if (ctrl) parts.push('Ctrl');
  if (alt) parts.push('Alt');
  if (shift) parts.push('Shift');
  if (cmd) parts.push('Cmd');
  parts.push(key);

  return parts.join('+');
}

/** Centralized Command Execution Hub */
export async function executeCommand(commandId: string): Promise<boolean> {
  switch (commandId) {
    case 'file.new': {
      // Dispatch custom event — FileExplorer listens and shows inline name prompt
      window.dispatchEvent(new CustomEvent('binary:explorer:newFile'));
      return true;
    }
    case 'file.newFolder': {
      window.dispatchEvent(new CustomEvent('binary:explorer:newFolder'));
      return true;
    }
    case 'explorer.rename': {
      window.dispatchEvent(new CustomEvent('binary:explorer:rename'));
      return true;
    }
    case 'explorer.delete': {
      window.dispatchEvent(new CustomEvent('binary:explorer:delete'));
      return true;
    }
    case 'file.openFile': {
      const filePath = await api.openFileDialog();
      if (filePath) {
        editorStore.openFile(filePath);
      }
      return true;
    }
    case 'file.openFolder': {
      await workspaceStore.openFolder();
      return true;
    }
    case 'file.save': {
      await editorStore.saveFile();
      return true;
    }
    case 'file.saveAll': {
      await editorStore.saveAll();
      return true;
    }
    case 'file.closeActiveTab': {
      const state = editorStore.getState();
      const group = state.groups.find((g) => g.id === state.activeGroupId) || state.groups[0];
      if (group && group.activeTabId) {
        editorStore.closeTab(group.activeTabId, group.id);
      }
      return true;
    }
    case 'file.closeAllTabs': {
      editorStore.closeAllTabs();
      return true;
    }
    case 'view.commandPalette': {
      layoutStore.setCommandPaletteOpen(true);
      return true;
    }
    case 'view.quickOpen': {
      layoutStore.setQuickOpenOpen(true);
      return true;
    }
    case 'view.settings': {
      layoutStore.openSettings();
      return true;
    }
    case 'view.keyboardShortcuts': {
      layoutStore.openSettings('keyboard');
      return true;
    }
    case 'view.toggleSidebar': {
      layoutStore.toggleSidebar();
      return true;
    }
    case 'view.toggleBottomPanel': {
      layoutStore.toggleBottomPanel();
      return true;
    }
    case 'view.toggleTerminal': {
      const { bottomPanelVisible, bottomPanelTab } = layoutStore.getState();
      if (bottomPanelVisible && bottomPanelTab === 'terminal') {
        layoutStore.toggleBottomPanel();
      } else {
        layoutStore.setBottomPanelTab('terminal');
        if (!bottomPanelVisible) layoutStore.toggleBottomPanel();
      }
      return true;
    }
    case 'view.toggleAI': {
      layoutStore.toggleAIPanel();
      return true;
    }
    case 'view.explorer': {
      layoutStore.setActiveActivityTab('explorer');
      return true;
    }
    case 'view.search': {
      layoutStore.setActiveActivityTab('search');
      return true;
    }
    case 'view.git': {
      layoutStore.setActiveActivityTab('git');
      return true;
    }
    case 'view.extensions': {
      layoutStore.setActiveActivityTab('extensions');
      return true;
    }
    case 'view.splitHorizontal': {
      editorStore.splitEditor('horizontal');
      return true;
    }
    case 'view.splitVertical': {
      editorStore.splitEditor('vertical');
      return true;
    }
    case 'view.toggleZenMode': {
      layoutStore.toggleZenMode();
      return true;
    }
    case 'terminal.new': {
      layoutStore.setBottomPanelTab('terminal');
      if (!layoutStore.getState().bottomPanelVisible) layoutStore.toggleBottomPanel();
      window.dispatchEvent(new CustomEvent('binary:terminal:new'));
      return true;
    }
    case 'terminal.kill': {
      window.dispatchEvent(new CustomEvent('binary:terminal:kill'));
      return true;
    }
    case 'ai.explain': {
      if (!layoutStore.getState().aiPanelVisible) layoutStore.toggleAIPanel();
      aiStore.sendMessage('Please explain the structure and logic of the current file/code.');
      return true;
    }
    case 'ai.refactor': {
      if (!layoutStore.getState().aiPanelVisible) layoutStore.toggleAIPanel();
      aiStore.sendMessage('Please refactor and optimize the current file/code.');
      return true;
    }
    case 'cpp.build': {
      cppStore.compileActiveFile(workspaceStore.getState().workspacePath || undefined);
      return true;
    }
    case 'cpp.run': {
      cppStore.runActiveFile(workspaceStore.getState().workspacePath || undefined);
      return true;
    }
    case 'cpp.debug': {
      if (cppStore.getState().debuggerState === 'paused') {
        cppStore.continue();
      } else {
        cppStore.startDebuggingActiveFile(workspaceStore.getState().workspacePath || undefined);
      }
      return true;
    }
    case 'cpp.stepOver': {
      cppStore.stepOver();
      return true;
    }
    case 'cpp.stepInto': {
      cppStore.stepInto();
      return true;
    }
    case 'cpp.stepOut': {
      cppStore.stepOut();
      return true;
    }
    case 'cpp.stopDebug': {
      cppStore.stopDebugging();
      return true;
    }
    case 'cpp.toggleBreakpoint': {
      const editorState = editorStore.getState();
      const activeGroup = editorState.groups.find(g => g.id === editorState.activeGroupId) || editorState.groups[0];
      const activeTab = activeGroup?.tabs.find(t => t.id === activeGroup.activeTabId);
      if (activeTab?.filePath) {
        cppStore.toggleBreakpoint(activeTab.filePath, 1);
      }
      return true;
    }
    default:
      return false;
  }
}

/** Hook for managing keyboard shortcuts state & settings */
export function useKeyboardShortcuts() {
  const settings = useSettings();
  const userShortcuts = settings.keyboard?.shortcuts || {};

  const keyMap = new Map<string, string[]>();

  const resolvedCommands: ResolvedCommand[] = MASTER_COMMANDS.map((cmd) => {
    const userBinding = userShortcuts[cmd.id];
    const isModified = userBinding !== undefined;
    const currentKeybinding = isModified ? userBinding : cmd.defaultKeybinding;

    if (currentKeybinding && currentKeybinding.trim() !== '') {
      const norm = normalizeKeybinding(currentKeybinding);
      const list = keyMap.get(norm) || [];
      list.push(cmd.id);
      keyMap.set(norm, list);
    }

    return {
      ...cmd,
      currentKeybinding,
      isModified,
      conflictsWith: [],
    };
  });

  // Calculate conflicts
  resolvedCommands.forEach((cmd) => {
    if (cmd.currentKeybinding && cmd.currentKeybinding.trim() !== '') {
      const norm = normalizeKeybinding(cmd.currentKeybinding);
      const ids = keyMap.get(norm) || [];
      if (ids.length > 1) {
        cmd.conflictsWith = ids
          .filter((id) => id !== cmd.id)
          .map((id) => MASTER_COMMANDS.find((c) => c.id === id)?.title || id);
      }
    }
  });

  const updateShortcut = (commandId: string, newBinding: string) => {
    const updated = { ...userShortcuts, [commandId]: normalizeKeybinding(newBinding) };
    settingsStore.updateSettings({
      keyboard: { ...settings.keyboard, shortcuts: updated },
    });
  };

  const removeShortcut = (commandId: string) => {
    const updated = { ...userShortcuts, [commandId]: '' };
    settingsStore.updateSettings({
      keyboard: { ...settings.keyboard, shortcuts: updated },
    });
  };

  const resetShortcut = (commandId: string) => {
    const updated = { ...userShortcuts };
    delete updated[commandId];
    settingsStore.updateSettings({
      keyboard: { ...settings.keyboard, shortcuts: updated },
    });
  };

  const restoreAllDefaults = () => {
    settingsStore.updateSettings({
      keyboard: { ...settings.keyboard, shortcuts: {} },
    });
  };

  return {
    commands: resolvedCommands,
    updateShortcut,
    removeShortcut,
    resetShortcut,
    restoreAllDefaults,
  };
}

/**
 * Global Keyboard Shortcut Listener Hook
 * Listens for single combos & multi-key chord sequences (e.g. Ctrl+K Ctrl+S)
 * across the entire application and executes the matching command.
 */
export function useGlobalKeyboardShortcuts() {
  const settings = useSettings();

  useEffect(() => {
    let pendingChord: string | null = null;
    let chordTimer: any = null;

    const clearChord = () => {
      pendingChord = null;
      if (chordTimer) {
        clearTimeout(chordTimer);
        chordTimer = null;
      }
    };

    const handleKeyDown = async (e: KeyboardEvent) => {
      const pressedCombo = eventToKeybinding(e);
      if (!pressedCombo) return;

      const userShortcuts = settingsStore.getState().keyboard?.shortcuts || {};

      // Map normalized bindings to command IDs
      const bindingToCmd = new Map<string, string>();
      for (const cmd of MASTER_COMMANDS) {
        const userBinding = userShortcuts[cmd.id];
        const binding = userBinding !== undefined ? userBinding : cmd.defaultKeybinding;
        if (binding && binding.trim()) {
          bindingToCmd.set(normalizeKeybinding(binding), cmd.id);
        }
      }

      // 1. Check if we are waiting for second part of a chord sequence (e.g. "Ctrl+K ...")
      if (pendingChord) {
        const fullChord = normalizeKeybinding(`${pendingChord} ${pressedCombo}`);
        const matchedCmdId = bindingToCmd.get(fullChord);
        clearChord();

        if (matchedCmdId) {
          e.preventDefault();
          e.stopPropagation();
          await executeCommand(matchedCmdId);
          return;
        }
      }

      // 2. Check if pressed key is the start of a chord sequence (e.g. "Ctrl+K")
      const isStartOfChord = Array.from(bindingToCmd.keys()).some((b) =>
        b.startsWith(`${pressedCombo} `)
      );

      if (isStartOfChord) {
        e.preventDefault();
        e.stopPropagation();
        pendingChord = pressedCombo;
        chordTimer = setTimeout(() => {
          clearChord();
        }, 2000);
        return;
      }

      // 3. Check for direct single-key shortcut match (e.g. "Ctrl+O", "Ctrl+N", "Ctrl+P", etc.)
      const matchedCmdId = bindingToCmd.get(pressedCombo);
      if (matchedCmdId) {
        const target = e.target as HTMLElement;
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        // Let native text editing handle basic edit commands
        if (isInput && matchedCmdId.startsWith('edit.')) return;
        // Let Delete/F2/Backspace pass through when the user is typing in an input
        if (isInput && (matchedCmdId === 'explorer.delete' || matchedCmdId === 'explorer.rename')) return;
        // Don't intercept Ctrl+N / Ctrl+Shift+N while typing (e.g. browser autocomplete)
        if (isInput && (matchedCmdId === 'file.new' || matchedCmdId === 'file.newFolder')) return;

        e.preventDefault();
        e.stopPropagation();
        await executeCommand(matchedCmdId);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      clearChord();
    };
  }, [settings.keyboard?.shortcuts]);
}
