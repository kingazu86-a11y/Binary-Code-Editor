import { useState, useEffect, useCallback } from 'react';
import { FileItem } from '../types/electron';
import { api } from '../services/api';
import { editorStore } from './editorStore';
import { terminalStore } from './terminalStore';
import { settingsStore } from './settingsStore';

export interface WorkspaceState {
  workspacePath: string | null;
  folderName: string;
  fileTree: FileItem[];
  selectedPath: string | null;
  expandedFolders: Set<string>;
  loadingFolders: Set<string>;
  isLoading: boolean;
}

let globalState: WorkspaceState = {
  workspacePath: null,
  folderName: '',
  fileTree: [],
  selectedPath: null,
  expandedFolders: new Set(),
  loadingFolders: new Set(),
  isLoading: false,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

const WORKSPACE_STORAGE_KEY = 'binary_last_workspace';

export const workspaceStore = {
  getState: () => globalState,

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setWorkspace: async (folderPath: string | null) => {
    if (!folderPath) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(WORKSPACE_STORAGE_KEY);
        (window as any).__binary_active_workspace = '';
      }
      globalState = {
        ...globalState,
        workspacePath: null,
        folderName: '',
        fileTree: [],
        selectedPath: null,
        expandedFolders: new Set(),
        loadingFolders: new Set(),
        isLoading: false,
      };
      notify();
      return;
    }

    const parts = folderPath.replace(/\\/g, '/').split('/');
    const folderName = parts[parts.length - 1] || folderPath;

    // Immediately set active workspace, clear previous state, and start loading
    globalState = {
      ...globalState,
      workspacePath: folderPath,
      folderName,
      fileTree: [],
      selectedPath: null,
      expandedFolders: new Set(),
      loadingFolders: new Set(),
      isLoading: true,
    };
    notify();

    if (typeof window !== 'undefined') {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, folderPath);
      (window as any).__binary_active_workspace = folderPath;
    }

    try {
      // 1. Immediately read root directory items (depth 0 is near-instantaneous, ~5ms)
      const items = await api.readDirectory(folderPath, 0);

      // 2. Instantly update file tree and turn off loading so files render with zero lag!
      globalState = {
        ...globalState,
        fileTree: items,
        isLoading: false,
      };
      notify();

      // 3. Offload watchers, recent project history, and extension notifications to background
      Promise.allSettled([
        api.watchDirectory(folderPath),
        api.addRecentProject(folderPath),
        api.notifyWorkspaceChanged(folderPath),
      ]).catch((err) => {
        console.warn('[workspaceStore] Background workspace task error:', err);
      });

      // 4. Update terminal cwd in next event loop tick so UI stays responsive
      setTimeout(() => {
        terminalStore.handleWorkspaceChanged(folderPath);
      }, 50);

    } catch (err) {
      console.error('Failed to set workspace:', err);
      globalState = {
        ...globalState,
        isLoading: false,
      };
      notify();
    }
  },

  openFolder: async () => {
    const selected = await api.openFolderDialog();
    if (selected) {
      await workspaceStore.setWorkspace(selected);
    }
  },

  refreshTree: async (silent: boolean = false) => {
    const currentPath = globalState.workspacePath;
    if (!currentPath) return;

    if (!silent) {
      globalState = { ...globalState, isLoading: true };
      notify();
    }

    try {
      const items = await api.readDirectory(currentPath, 0);

      // Concurrently re-hydrate any currently expanded folders that need their children populated
      const expanded = globalState.expandedFolders;
      const rehydrate = async (nodes: FileItem[]): Promise<void> => {
        const tasks: Promise<void>[] = [];
        for (const node of nodes) {
          if (node.isDirectory && expanded.has(node.path)) {
            if (!node.children || node.children.length === 0 || node.isLoaded === false) {
              const p = api.readDirectory(node.path, 0).then(async (children) => {
                node.children = children;
                node.isLoaded = true;
                if (node.children && node.children.length > 0) {
                  await rehydrate(node.children);
                }
              }).catch(() => {});
              tasks.push(p);
            } else if (node.children && node.children.length > 0) {
              tasks.push(rehydrate(node.children));
            }
          }
        }
        if (tasks.length > 0) {
          await Promise.all(tasks);
        }
      };
      await rehydrate(items);

      globalState = { ...globalState, fileTree: items, isLoading: false };
      notify();
    } catch (err) {
      console.error('Failed to refresh tree:', err);
      globalState = { ...globalState, isLoading: false };
      notify();
    }
  },

  setSelectedPath: (path: string | null) => {
    if (globalState.selectedPath === path) return;
    globalState = { ...globalState, selectedPath: path };
    notify();
  },

  loadFolderChildrenIfNeeded: async (folderPath: string) => {
    if (globalState.loadingFolders.has(folderPath)) return;

    const findItem = (items: FileItem[], p: string): FileItem | null => {
      for (const it of items) {
        if (it.path === p) return it;
        if (it.children) {
          const f = findItem(it.children, p);
          if (f) return f;
        }
      }
      return null;
    };

    const item = findItem(globalState.fileTree, folderPath);
    if (item && item.isDirectory && (item.isLoaded === false || !item.children || item.children.length === 0)) {
      const nextLoading = new Set(globalState.loadingFolders);
      nextLoading.add(folderPath);
      globalState = { ...globalState, loadingFolders: nextLoading };
      notify();

      try {
        const children = await api.readDirectory(folderPath);
        item.children = children;
        item.isLoaded = true;
      } catch (err) {
        console.error('[workspaceStore] Failed to load children for folder:', folderPath, err);
      } finally {
        const afterLoading = new Set(globalState.loadingFolders);
        afterLoading.delete(folderPath);
        globalState = {
          ...globalState,
          loadingFolders: afterLoading,
          fileTree: [...globalState.fileTree],
        };
        notify();
      }
    }
  },

  toggleFolder: async (folderPath: string) => {
    const next = new Set(globalState.expandedFolders);
    const isExpanding = !next.has(folderPath);
    if (isExpanding) {
      next.add(folderPath);
    } else {
      next.delete(folderPath);
    }
    globalState = { ...globalState, expandedFolders: next };
    notify();

    if (isExpanding) {
      await workspaceStore.loadFolderChildrenIfNeeded(folderPath);
    }
  },

  expandFolder: async (folderPath: string) => {
    if (!globalState.expandedFolders.has(folderPath)) {
      const next = new Set(globalState.expandedFolders);
      next.add(folderPath);
      globalState = { ...globalState, expandedFolders: next };
      notify();
    }
    await workspaceStore.loadFolderChildrenIfNeeded(folderPath);
  },

  createFile: async (parentDir: string, fileName: string, content: string = '') => {
    const sep = parentDir.includes('\\') ? '\\' : '/';
    const filePath = `${parentDir}${sep}${fileName}`;
    const success = await api.createFile(filePath, content);
    if (success) {
      await workspaceStore.refreshTree();
      editorStore.openFile(filePath);
      workspaceStore.setSelectedPath(filePath);
    }
    return success ? filePath : null;
  },

  createFolder: async (parentDir: string, folderName: string) => {
    const sep = parentDir.includes('\\') ? '\\' : '/';
    const folderPath = `${parentDir}${sep}${folderName}`;
    const success = await api.createFolder(folderPath);
    if (success) {
      await workspaceStore.refreshTree();
      workspaceStore.expandFolder(folderPath);
      workspaceStore.setSelectedPath(folderPath);
    }
    return success;
  },

  deleteEntry: async (targetPath: string, permanentOverride?: boolean) => {
    const deletePermanently = permanentOverride ?? settingsStore.getState().general.deletePermanently;
    let success = false;
    if (deletePermanently) {
      success = await api.deleteEntry(targetPath);
    } else {
      success = await api.trashEntry(targetPath);
      // Fallback to permanent delete if trash fails
      if (!success) {
        success = await api.deleteEntry(targetPath);
      }
    }
    if (success) {
      editorStore.handleFileDeleted(targetPath);
      await workspaceStore.refreshTree();
    }
    return success;
  },

  renameEntry: async (oldPath: string, newName: string) => {
    const sep = oldPath.includes('\\') ? '\\' : '/';
    const parts = oldPath.split(sep);
    const currentName = parts[parts.length - 1];

    // No-op: name didn't change — skip API call entirely
    if (newName === currentName) return oldPath;

    parts[parts.length - 1] = newName;
    const newPath = parts.join(sep);

    const success = await api.renameEntry(oldPath, newPath);
    if (success) {
      editorStore.handleFileRenamed(oldPath, newPath);
      await workspaceStore.refreshTree();
    }
    return success ? newPath : null;
  },

  duplicateEntry: async (srcPath: string) => {
    const newPath = await api.duplicateEntry(srcPath);
    await workspaceStore.refreshTree();
    return newPath;
  },

  revealInExplorer: async (targetPath: string) => {
    await api.revealInExplorer(targetPath);
  },

  isReady: () => isWorkspaceInitialized,

  init: async () => {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (typeof window !== 'undefined') {
        const lastWs = localStorage.getItem(WORKSPACE_STORAGE_KEY);
        if (lastWs) {
          await workspaceStore.setWorkspace(lastWs);
        } else {
          try {
            const recents = await api.getRecentProjects();
            if (recents && recents.length > 0 && !workspaceStore.getState().workspacePath) {
              await workspaceStore.setWorkspace(recents[0]);
            }
          } catch (e) {
            console.warn('Failed loading recent projects:', e);
          }
        }
      }
      isWorkspaceInitialized = true;
    })();
    return initPromise;
  },
};

let initPromise: Promise<void> | null = null;
let isWorkspaceInitialized = false;

// Auto-load last workspace or recent project on startup
workspaceStore.init();

// Listen for filesystem events in main process to live-update tree (debounced & silent)
let fsDebounceTimer: any = null;
api.onFilesystemEvent(() => {
  if (fsDebounceTimer) {
    clearTimeout(fsDebounceTimer);
  }
  fsDebounceTimer = setTimeout(() => {
    workspaceStore.refreshTree(true); // silent refresh without skeleton/progress bar flicker
  }, 250);
});

export function useWorkspace() {
  const [state, setState] = useState<WorkspaceState>(workspaceStore.getState());

  useEffect(() => {
    const unsub = workspaceStore.subscribe(() => {
      setState({ ...workspaceStore.getState() });
    });
    return () => {
      unsub();
    };
  }, []);

  return state;
}
