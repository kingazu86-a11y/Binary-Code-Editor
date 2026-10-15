import { useState, useEffect } from 'react';
import { GitStatusResult, GitBranch } from '../types/electron';
import { api } from '../services/api';
import { workspaceStore } from './workspaceStore';
import { editorStore } from './editorStore';

export interface GitState {
  status: GitStatusResult;
  branches: GitBranch[];
  commitMessage: string;
  isCommitting: boolean;
  isRefreshing: boolean;
}

const INITIAL_STATUS: GitStatusResult = {
  isRepo: false,
  branch: '',
  ahead: 0,
  behind: 0,
  modified: [],
  staged: [],
  untracked: [],
  deleted: [],
};

let globalState: GitState = {
  status: INITIAL_STATUS,
  branches: [],
  commitMessage: '',
  isCommitting: false,
  isRefreshing: false,
};

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((listener) => listener());
}

export const gitStore = {
  getState: () => globalState,

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setCommitMessage: (msg: string) => {
    globalState = { ...globalState, commitMessage: msg };
    notify();
  },

  refreshStatus: async () => {
    const cwd = workspaceStore.getState().workspacePath;
    if (!cwd) {
      globalState = { ...globalState, status: INITIAL_STATUS, branches: [], isRefreshing: false };
      notify();
      return;
    }

    globalState = { ...globalState, isRefreshing: true };
    notify();

    try {
      const status = await api.gitGetStatus(cwd);
      let branches: GitBranch[] = [];
      if (status.isRepo) {
        branches = await api.gitGetBranches(cwd);
      }
      globalState = { ...globalState, status, branches, isRefreshing: false };
      notify();
    } catch (err) {
      console.error('Git refresh error:', err);
      globalState = { ...globalState, isRefreshing: false };
      notify();
    }
  },

  stageFile: async (file: string) => {
    const cwd = workspaceStore.getState().workspacePath;
    if (!cwd) return;
    await api.gitStage(cwd, [file]);
    await gitStore.refreshStatus();
  },

  stageAll: async () => {
    const cwd = workspaceStore.getState().workspacePath;
    if (!cwd) return;
    await api.gitStage(cwd, ['.']);
    await gitStore.refreshStatus();
  },

  unstageFile: async (file: string) => {
    const cwd = workspaceStore.getState().workspacePath;
    if (!cwd) return;
    await api.gitUnstage(cwd, [file]);
    await gitStore.refreshStatus();
  },

  unstageAll: async () => {
    const cwd = workspaceStore.getState().workspacePath;
    if (!cwd) return;
    await api.gitUnstage(cwd, ['.']);
    await gitStore.refreshStatus();
  },

  commit: async () => {
    const cwd = workspaceStore.getState().workspacePath;
    if (!cwd || !globalState.commitMessage.trim()) return false;

    globalState = { ...globalState, isCommitting: true };
    notify();

    try {
      const res = await api.gitCommit(cwd, globalState.commitMessage.trim());
      globalState = { ...globalState, isCommitting: false, commitMessage: '' };
      await gitStore.refreshStatus();
      return res.success;
    } catch (err) {
      console.error('Git commit failed:', err);
      globalState = { ...globalState, isCommitting: false };
      notify();
      return false;
    }
  },

  viewFileDiff: async (file: string) => {
    const cwd = workspaceStore.getState().workspacePath;
    if (!cwd) return;

    try {
      const diff = await api.gitGetDiff(cwd, file);
      const sep = cwd.includes('\\') ? '\\' : '/';
      const fullPath = `${cwd}${sep}${file}`;

      let currentContent = '';
      try {
        const fileRes = await api.readFile(fullPath);
        currentContent = fileRes.content;
      } catch {
        // May be deleted
      }

      // Open in diff tab
      editorStore.openDiff(fullPath, diff || currentContent, currentContent, `Diff: ${file}`);
    } catch (err) {
      console.error('Failed to get diff:', err);
    }
  },

  checkoutBranch: async (branchName: string) => {
    const cwd = workspaceStore.getState().workspacePath;
    if (!cwd) return;
    const ok = await api.gitCheckout(cwd, branchName);
    if (ok) {
      await gitStore.refreshStatus();
      await workspaceStore.refreshTree();
    }
  },

  createBranch: async (branchName: string) => {
    const cwd = workspaceStore.getState().workspacePath;
    if (!cwd) return;
    const ok = await api.gitCreateBranch(cwd, branchName);
    if (ok) {
      await gitStore.refreshStatus();
    }
  },
};

export function useGit() {
  const [state, setState] = useState<GitState>(gitStore.getState());

  useEffect(() => {
    const unsub = gitStore.subscribe(() => {
      setState({ ...gitStore.getState() });
    });
    return () => {
      unsub();
    };
  }, []);

  return state;
}
