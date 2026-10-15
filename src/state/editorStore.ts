import { useState, useEffect } from 'react';
import { EditorGroupItem, EditorTabItem, SplitDirection } from '../types';
import { api } from '../services/api';

export interface EditorState {
  groups: EditorGroupItem[];
  activeGroupId: string;
  splitDirection: SplitDirection | null;
}

const DEFAULT_GROUP_ID = 'group-1';

let globalState: EditorState = {
  groups: [
    {
      id: DEFAULT_GROUP_ID,
      tabs: [],
      activeTabId: null,
    },
  ],
  activeGroupId: DEFAULT_GROUP_ID,
  splitDirection: null,
};

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((listener) => listener());
}

function detectLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'jsx':
      return 'javascript';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'scss':
      return 'scss';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'py':
      return 'python';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'c':
    case 'h':
      return 'c';
    case 'cpp':
    case 'hpp':
    case 'cc':
      return 'cpp';
    case 'cs':
      return 'csharp';
    case 'java':
      return 'java';
    case 'sql':
      return 'sql';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'ps1':
      return 'powershell';
    case 'yml':
    case 'yaml':
      return 'yaml';
    case 'xml':
    case 'svg':
      return 'xml';
    case 'less':
      return 'less';
    case 'jsonc':
      return 'json';
    default:
      return 'plaintext';
  }
}

export function normalizePath(p: string): string {
  return p ? p.toLowerCase().replace(/\\/g, '/') : '';
}

export const editorStore = {
  getState: () => globalState,

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setActiveGroup: (groupId: string) => {
    globalState = { ...globalState, activeGroupId: groupId };
    notify();
  },

  openFile: async (filePath: string, targetGroupId?: string) => {
    const groupId = targetGroupId || globalState.activeGroupId;
    let group = globalState.groups.find((g) => g.id === groupId) || globalState.groups[0];
    if (!group) return;

    // Check if tab already exists in this group using normalized path
    const targetNorm = normalizePath(filePath);
    const existing = group.tabs.find((t) => normalizePath(t.filePath) === targetNorm);
    if (existing) {
      globalState = {
        ...globalState,
        activeGroupId: group.id,
        groups: globalState.groups.map((g) =>
          g.id === group.id ? { ...g, activeTabId: existing.id } : g
        ),
      };
      notify();
      return;
    }

    const fileName = filePath.replace(/\\/g, '/').split('/').pop() || 'Untitled';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const language = detectLanguage(fileName);

    const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'tiff', 'tif', 'avif'];
    const isImage = IMAGE_EXTS.includes(ext);
    const isSvg = ext === 'svg';
    const viewMode: 'code' | 'image' | 'svg' = isImage ? 'image' : isSvg ? 'svg' : 'code';

    const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const loadingTab: EditorTabItem = {
      id: tabId,
      filePath,
      fileName,
      isDirty: false,
      isPinned: false,
      isLoading: true,
      content: '',
      savedContent: '',
      language,
      viewMode,
    };

    globalState = {
      ...globalState,
      activeGroupId: group.id,
      groups: globalState.groups.map((g) =>
        g.id === group.id
          ? {
              ...g,
              tabs: [...g.tabs, loadingTab],
              activeTabId: loadingTab.id,
            }
          : g
      ),
    };
    notify();

    try {
      if (isImage) {
        // Load image as base64 data URL — guard against undefined IPC response
        let imageContent = '';
        let imageError: string | undefined;
        try {
          const result = await api.readImage(filePath);
          if (!result) {
            imageError = 'No response from filesystem (file may be too large or inaccessible)';
          } else if (result.error) {
            imageError = result.error;
          } else if (result.dataUrl) {
            imageContent = result.dataUrl;
          } else {
            imageError = 'Image data could not be decoded';
          }
        } catch (ipcErr: any) {
          imageError = ipcErr?.message || 'Failed to read image over IPC';
        }

        globalState = {
          ...globalState,
          groups: globalState.groups.map((g) =>
            g.id === group.id
              ? {
                  ...g,
                  tabs: g.tabs.map((t) =>
                    t.id === tabId
                      ? {
                          ...t,
                          content: imageError ? `__ERROR__:${imageError}` : imageContent,
                          savedContent: imageError ? '' : imageContent,
                          isLoading: false,
                        }
                      : t
                  ),
                }
              : g
          ),
        };
      } else {
        // Load text content (SVG or any code file)
        let fileContent = '';
        try {
          const result = await api.readFile(filePath);
          fileContent = (result?.content ?? '').replace(/^\uFEFF/, '');
        } catch (ipcErr: any) {
          console.error('[editorStore] readFile IPC error:', ipcErr);
        }
        globalState = {
          ...globalState,
          groups: globalState.groups.map((g) =>
            g.id === group.id
              ? {
                  ...g,
                  tabs: g.tabs.map((t) =>
                    t.id === tabId
                      ? { ...t, content: fileContent, savedContent: fileContent, isLoading: false }
                      : t
                  ),
                }
              : g
          ),
        };
      }
      notify();
    } catch (err) {
      console.error('Failed to open file:', filePath, err);
      globalState = {
        ...globalState,
        groups: globalState.groups.map((g) =>
          g.id === group.id
            ? {
                ...g,
                tabs: g.tabs.filter((t) => t.id !== tabId),
                activeTabId: g.tabs.filter((t) => t.id !== tabId).slice(-1)[0]?.id || null,
              }
            : g
        ),
      };
      notify();
    }
  },

  reloadTab: async (tabId: string, groupId?: string) => {
    const gId = groupId || globalState.activeGroupId;
    const group = globalState.groups.find((g) => g.id === gId);
    if (!group) return;
    const tab = group.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    // Set loading state
    globalState = {
      ...globalState,
      groups: globalState.groups.map((g) =>
        g.id === gId
          ? {
              ...g,
              tabs: g.tabs.map((t) => (t.id === tabId ? { ...t, isLoading: true } : t)),
            }
          : g
      ),
    };
    notify();

    try {
      if (tab.viewMode === 'image') {
        let imageContent = '';
        let imageError: string | undefined;
        try {
          const result = await api.readImage(tab.filePath);
          if (!result) {
            imageError = 'No response from filesystem (file may be too large or inaccessible)';
          } else if (result.error) {
            imageError = result.error;
          } else if (result.dataUrl) {
            imageContent = result.dataUrl;
          } else {
            imageError = 'Image data could not be decoded';
          }
        } catch (ipcErr: any) {
          imageError = ipcErr?.message || 'Failed to read image over IPC';
        }

        globalState = {
          ...globalState,
          groups: globalState.groups.map((g) =>
            g.id === gId
              ? {
                  ...g,
                  tabs: g.tabs.map((t) =>
                    t.id === tabId
                      ? {
                          ...t,
                          content: imageError ? `__ERROR__:${imageError}` : imageContent,
                          savedContent: imageError ? '' : imageContent,
                          isLoading: false,
                        }
                      : t
                  ),
                }
              : g
          ),
        };
      } else {
        let fileContent = '';
        try {
          const result = await api.readFile(tab.filePath);
          fileContent = (result?.content ?? '').replace(/^\uFEFF/, '');
        } catch (ipcErr: any) {
          console.error('[editorStore] readFile IPC error on reload:', ipcErr);
        }

        globalState = {
          ...globalState,
          groups: globalState.groups.map((g) =>
            g.id === gId
              ? {
                  ...g,
                  tabs: g.tabs.map((t) =>
                    t.id === tabId
                      ? { ...t, content: fileContent, savedContent: fileContent, isDirty: false, isLoading: false }
                      : t
                  ),
                }
              : g
          ),
        };
      }
      notify();
    } catch (err) {
      console.error('Failed to reload tab:', tab.filePath, err);
      globalState = {
        ...globalState,
        groups: globalState.groups.map((g) =>
          g.id === gId
            ? {
                ...g,
                tabs: g.tabs.map((t) => (t.id === tabId ? { ...t, isLoading: false } : t)),
              }
            : g
        ),
      };
      notify();
    }
  },


  openDiff: (filePath: string, originalContent: string, modifiedContent: string, title?: string) => {
    const group = globalState.groups.find((g) => g.id === globalState.activeGroupId) || globalState.groups[0];
    const fileName = title || `Diff: ${filePath.replace(/\\/g, '/').split('/').pop()}`;
    const language = detectLanguage(filePath);

    const diffTab: EditorTabItem = {
      id: `diff_${Date.now()}`,
      filePath,
      fileName,
      isDirty: false,
      isPinned: true,
      content: modifiedContent,
      savedContent: modifiedContent,
      language,
      isDiff: true,
      originalContent,
      modifiedContent,
    };

    globalState = {
      ...globalState,
      groups: globalState.groups.map((g) =>
        g.id === group.id
          ? {
              ...g,
              tabs: [...g.tabs, diffTab],
              activeTabId: diffTab.id,
            }
          : g
      ),
    };
    notify();
  },

  openExtensionDetail: (extensionId: string, initialData?: any) => {
    const group = globalState.groups.find((g) => g.id === globalState.activeGroupId) || globalState.groups[0];
    if (!group) return;

    // Check if detail tab for this extension is already open in group
    const existing = group.tabs.find((t) => t.isExtensionDetail && t.extensionId?.toLowerCase() === extensionId.toLowerCase());
    if (existing) {
      globalState = {
        ...globalState,
        activeGroupId: group.id,
        groups: globalState.groups.map((g) =>
          g.id === group.id ? { ...g, activeTabId: existing.id } : g
        ),
      };
      notify();
      return;
    }

    const displayName = initialData?.displayName || initialData?.name || extensionId.split('.').pop() || extensionId;
    const detailTab: EditorTabItem = {
      id: `ext_detail_${extensionId.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      filePath: `extension:${extensionId}`,
      fileName: `Extension: ${displayName}`,
      isDirty: false,
      isPinned: true,
      content: '',
      savedContent: '',
      language: 'markdown',
      isExtensionDetail: true,
      extensionId,
      extensionData: initialData,
    };

    globalState = {
      ...globalState,
      activeGroupId: group.id,
      groups: globalState.groups.map((g) =>
        g.id === group.id
          ? {
              ...g,
              tabs: [...g.tabs, detailTab],
              activeTabId: detailTab.id,
            }
          : g
      ),
    };
    notify();
  },

  setActiveTab: (tabId: string, groupId?: string) => {
    const gId = groupId || globalState.activeGroupId;
    globalState = {
      ...globalState,
      activeGroupId: gId,
      groups: globalState.groups.map((g) =>
        g.id === gId ? { ...g, activeTabId: tabId } : g
      ),
    };
    notify();
  },

  updateContent: (tabId: string, content: string, groupId?: string) => {
    const gId = groupId || globalState.activeGroupId;
    globalState = {
      ...globalState,
      groups: globalState.groups.map((g) => {
        if (g.id !== gId) return g;
        return {
          ...g,
          tabs: g.tabs.map((t) => {
            if (t.id !== tabId) return t;
            const isDirty = content !== t.savedContent;
            return { ...t, content, isDirty };
          }),
        };
      }),
    };
    notify();
  },

  saveFile: async (tabId?: string, groupId?: string) => {
    const gId = groupId || globalState.activeGroupId;
    const group = globalState.groups.find((g) => g.id === gId);
    if (!group) return false;

    const targetTabId = tabId || group.activeTabId;
    const tab = group.tabs.find((t) => t.id === targetTabId);
    if (!tab || tab.isDiff) return false;

    try {
      const success = await api.writeFile(tab.filePath, tab.content);
      if (success) {
        globalState = {
          ...globalState,
          groups: globalState.groups.map((g) => {
            if (g.id !== gId) return g;
            return {
              ...g,
              tabs: g.tabs.map((t) => (t.id === tab.id ? { ...t, savedContent: t.content, isDirty: false } : t)),
            };
          }),
        };
        notify();
        return true;
      }
    } catch (err) {
      console.error('Failed to save file:', tab.filePath, err);
    }
    return false;
  },

  saveAll: async () => {
    for (const group of globalState.groups) {
      for (const tab of group.tabs) {
        if (tab.isDirty && !tab.isDiff) {
          await editorStore.saveFile(tab.id, group.id);
        }
      }
    }
  },

  closeTab: (tabId: string, groupId?: string) => {
    const gId = groupId || globalState.activeGroupId;
    const group = globalState.groups.find((g) => g.id === gId);
    if (!group) return;

    const tabIndex = group.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    const nextTabs = group.tabs.filter((t) => t.id !== tabId);

    // If closing last tab in a secondary split group, automatically close the split pane
    if (nextTabs.length === 0 && globalState.groups.length > 1) {
      editorStore.closeSplitGroup(gId);
      return;
    }

    let nextActiveTabId = group.activeTabId;
    if (group.activeTabId === tabId) {
      if (nextTabs.length > 0) {
        const nextIndex = Math.min(tabIndex, nextTabs.length - 1);
        nextActiveTabId = nextTabs[nextIndex].id;
      } else {
        nextActiveTabId = null;
      }
    }

    globalState = {
      ...globalState,
      groups: globalState.groups.map((g) =>
        g.id === gId ? { ...g, tabs: nextTabs, activeTabId: nextActiveTabId } : g
      ),
    };
    notify();
  },

  closeOtherTabs: (tabId: string, groupId?: string) => {
    const gId = groupId || globalState.activeGroupId;
    globalState = {
      ...globalState,
      groups: globalState.groups.map((g) => {
        if (g.id !== gId) return g;
        const remaining = g.tabs.filter((t) => t.id === tabId || t.isPinned);
        return {
          ...g,
          tabs: remaining,
          activeTabId: tabId,
        };
      }),
    };
    notify();
  },

  closeAllTabs: (groupId?: string) => {
    const gId = groupId || globalState.activeGroupId;
    if (globalState.groups.length > 1) {
      editorStore.closeSplitGroup(gId);
      return;
    }
    globalState = {
      ...globalState,
      groups: globalState.groups.map((g) =>
        g.id === gId ? { ...g, tabs: [], activeTabId: null } : g
      ),
    };
    notify();
  },

  splitEditor: (direction: SplitDirection) => {
    // Support up to 4 dynamic editor panes
    if (globalState.groups.length >= 4) {
      if (globalState.splitDirection !== direction) {
        globalState = { ...globalState, splitDirection: direction };
        notify();
      }
      return;
    }

    // If changing direction on existing split, switch orientation
    if (globalState.groups.length > 1 && globalState.splitDirection !== direction) {
      globalState = { ...globalState, splitDirection: direction };
      notify();
      return;
    }

    const newGroupId = `group-${Date.now()}`;
    const activeGroup =
      globalState.groups.find((g) => g.id === globalState.activeGroupId) || globalState.groups[0];
    const activeTab = activeGroup?.tabs.find((t) => t.id === activeGroup.activeTabId);

    const splitTabId = activeTab ? `tab_split_${Date.now()}_${Math.random().toString(36).slice(2, 5)}` : null;

    const newGroup: EditorGroupItem = {
      id: newGroupId,
      tabs: activeTab && splitTabId ? [{ ...activeTab, id: splitTabId }] : [],
      activeTabId: splitTabId,
    };

    globalState = {
      ...globalState,
      splitDirection: direction,
      groups: [...globalState.groups, newGroup],
      activeGroupId: newGroupId,
    };
    notify();
  },

  toggleSplitDirection: () => {
    if (globalState.groups.length <= 1) return;
    const nextDir: SplitDirection = globalState.splitDirection === 'horizontal' ? 'vertical' : 'horizontal';
    globalState = {
      ...globalState,
      splitDirection: nextDir,
    };
    notify();
  },

  resetToSingle: () => {
    if (globalState.groups.length <= 1) return;
    const primary = globalState.groups[0];
    const otherGroups = globalState.groups.slice(1);
    const existingNorms = new Set(primary.tabs.map((t) => normalizePath(t.filePath)));

    const mergedTabs = [...primary.tabs];
    for (const g of otherGroups) {
      for (const t of g.tabs) {
        if (!existingNorms.has(normalizePath(t.filePath))) {
          mergedTabs.push(t);
          existingNorms.add(normalizePath(t.filePath));
        }
      }
    }

    globalState = {
      ...globalState,
      groups: [
        {
          ...primary,
          tabs: mergedTabs,
          activeTabId: primary.activeTabId || (mergedTabs[0] ? mergedTabs[0].id : null),
        },
      ],
      activeGroupId: primary.id,
      splitDirection: null,
    };
    notify();
  },

  closeSplitGroup: (groupId: string) => {
    if (globalState.groups.length <= 1) return;

    const closingGroup = globalState.groups.find((g) => g.id === groupId);
    const remaining = globalState.groups.filter((g) => g.id !== groupId);

    const targetGroup = remaining.find((g) => g.id === globalState.activeGroupId) || remaining[0];
    const existingNorms = new Set(targetGroup.tabs.map((t) => normalizePath(t.filePath)));

    const updatedTargetTabs = [...targetGroup.tabs];
    if (closingGroup) {
      for (const t of closingGroup.tabs) {
        if (!existingNorms.has(normalizePath(t.filePath))) {
          updatedTargetTabs.push(t);
          existingNorms.add(normalizePath(t.filePath));
        }
      }
    }

    const updatedRemaining = remaining.map((g) =>
      g.id === targetGroup.id
        ? {
            ...g,
            tabs: updatedTargetTabs,
            activeTabId: g.activeTabId || (updatedTargetTabs[0] ? updatedTargetTabs[0].id : null),
          }
        : g
    );

    const nextActiveId =
      globalState.activeGroupId === groupId ? targetGroup.id : globalState.activeGroupId;

    globalState = {
      ...globalState,
      groups: updatedRemaining,
      activeGroupId: nextActiveId,
      splitDirection: updatedRemaining.length <= 1 ? null : globalState.splitDirection,
    };
    notify();
  },

  getActiveTab: () => {
    const group = globalState.groups.find((g) => g.id === globalState.activeGroupId) || globalState.groups[0];
    return group?.tabs.find((t) => t.id === group.activeTabId) || null;
  },

  handleFileRenamed: (oldPath: string, newPath: string) => {
    const oldNorm = normalizePath(oldPath);
    const newFileName = newPath.replace(/\\/g, '/').split('/').pop() || 'Untitled';
    const newLanguage = detectLanguage(newFileName);

    globalState = {
      ...globalState,
      groups: globalState.groups.map((g) => ({
        ...g,
        tabs: g.tabs.map((t) => {
          if (normalizePath(t.filePath) === oldNorm) {
            return {
              ...t,
              filePath: newPath,
              fileName: newFileName,
              language: newLanguage,
            };
          }
          if (normalizePath(t.filePath).startsWith(oldNorm + '/')) {
            const rel = t.filePath.slice(oldPath.length);
            const sep = newPath.includes('\\') ? '\\' : '/';
            const updated = `${newPath}${sep}${rel.replace(/^[/\\]+/, '')}`;
            return {
              ...t,
              filePath: updated,
            };
          }
          return t;
        }),
      })),
    };
    notify();
  },

  handleFileDeleted: (deletedPath: string) => {
    const delNorm = normalizePath(deletedPath);
    globalState = {
      ...globalState,
      groups: globalState.groups.map((g) => {
        const remaining = g.tabs.filter((t) => {
          const tNorm = normalizePath(t.filePath);
          return tNorm !== delNorm && !tNorm.startsWith(delNorm + '/');
        });
        let nextActive = g.activeTabId;
        if (!remaining.some((t) => t.id === nextActive)) {
          nextActive = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
        }
        return {
          ...g,
          tabs: remaining,
          activeTabId: nextActive,
        };
      }),
    };
    notify();
  },
};

export function useEditor() {
  const [state, setState] = useState<EditorState>(editorStore.getState());

  useEffect(() => {
    const unsub = editorStore.subscribe(() => {
      setState({ ...editorStore.getState() });
    });
    return () => {
      unsub();
    };
  }, []);

  return state;
}
