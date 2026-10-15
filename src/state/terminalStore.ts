import { useState, useEffect } from 'react';
import { api } from '../services/api';

export interface TerminalTab {
  id: string;
  title: string;
  shell: string;
  cwd: string;
}

export interface TerminalState {
  terminals: TerminalTab[];
  activeTerminalId: string | null;
}

let globalState: TerminalState = {
  terminals: [],
  activeTerminalId: null,
};

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((listener) => listener());
}

let termCounter = 1;

export const terminalStore = {
  getState: () => globalState,

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  createTerminal: async (cwd?: string, shellChoice?: string) => {
    const id = `term_${Date.now()}`;
    const shell = shellChoice || 'powershell';
    let shellName = 'PowerShell';
    if (shell === 'cmd') shellName = 'CMD';
    else if (shell === 'bash') shellName = 'Bash';

    const title = `${shellName} ${termCounter++}`;
    const targetCwd = cwd || (typeof window !== 'undefined' ? (window as any).__binary_active_workspace : '') || '';

    await api.createTerminal({
      id,
      cwd: targetCwd,
      shell,
      cols: 80,
      rows: 24,
    });

    const newTab: TerminalTab = {
      id,
      title,
      shell,
      cwd: targetCwd,
    };

    globalState = {
      terminals: [...globalState.terminals, newTab],
      activeTerminalId: id,
    };
    notify();

    // Listen for process exit to clean up tab
    const unsubExit = api.onTerminalExit(id, () => {
      unsubExit();
      terminalStore.removeTerminalTab(id);
    });

    return id;
  },

  setActiveTerminal: (id: string) => {
    globalState = { ...globalState, activeTerminalId: id };
    notify();
  },

  renameTerminal: (id: string, newTitle: string) => {
    globalState = {
      ...globalState,
      terminals: globalState.terminals.map((t) => (t.id === id ? { ...t, title: newTitle } : t)),
    };
    notify();
  },

  removeTerminalTab: (id: string) => {
    const remaining = globalState.terminals.filter((t) => t.id !== id);
    let nextActive = globalState.activeTerminalId;

    if (globalState.activeTerminalId === id) {
      nextActive = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
    }

    globalState = {
      terminals: remaining,
      activeTerminalId: nextActive,
    };
    notify();
  },

  handleWorkspaceChanged: (newWorkspacePath: string) => {
    if (!newWorkspacePath) return;

    if (globalState.terminals.length > 0) {
      globalState.terminals.forEach((t) => {
        // Change directory in active shell to the newly opened workspace
        api.writeTerminal(t.id, `cd "${newWorkspacePath}"\r`);
        t.cwd = newWorkspacePath;
      });
      notify();
    }
  },

  writeTerminal: (id: string, data: string) => {
    api.writeTerminal(id, data);
  },

  killTerminal: (id: string) => {
    api.killTerminal(id);
    terminalStore.removeTerminalTab(id);
  },
};

export function useTerminal() {
  const [state, setState] = useState<TerminalState>(terminalStore.getState());

  useEffect(() => {
    const unsub = terminalStore.subscribe(() => {
      setState({ ...terminalStore.getState() });
    });
    return () => {
      unsub();
    };
  }, []);

  return state;
}
