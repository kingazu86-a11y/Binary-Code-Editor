import React, { useState, useEffect, useRef } from 'react';
import {
  FilePlus,
  FolderPlus,
  RotateCw,
  FolderOpen,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useWorkspace, workspaceStore } from '../state/workspaceStore';
import { useSettings, settingsStore } from '../state/settingsStore';
import { FileTreeItem, CreationState, CreationInputRow } from './FileTreeItem';
import { ExplorerContextMenu } from './ExplorerContextMenu';
import { FileItem } from '../types';
import { FileExplorerSkeleton } from './FileExplorerSkeleton';
import { FolderPagination } from './FolderPagination';

export const FileExplorer: React.FC = () => {
  const { workspacePath, folderName, fileTree, expandedFolders, loadingFolders, selectedPath, isLoading } = useWorkspace();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileItem | null } | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [creationState, setCreationState] = useState<CreationState | null>(null);

  // Pagination & Sequential streaming for large root listings (> 50 items)
  const ROOT_PAGE_SIZE = 50;
  const hasRootPagination = fileTree.length > ROOT_PAGE_SIZE;
  const [rootVisibleCount, setRootVisibleCount] = useState<number>(ROOT_PAGE_SIZE);
  const [isRootStreaming, setIsRootStreaming] = useState<boolean>(false);

  useEffect(() => {
    setRootVisibleCount(ROOT_PAGE_SIZE);
    setIsRootStreaming(false);
  }, [workspacePath]);

  useEffect(() => {
    if (!isRootStreaming) return;
    if (rootVisibleCount >= fileTree.length) {
      setIsRootStreaming(false);
      return;
    }
    const timer = setTimeout(() => {
      setRootVisibleCount((prev) => Math.min(prev + ROOT_PAGE_SIZE, fileTree.length));
    }, 40);
    return () => clearTimeout(timer);
  }, [isRootStreaming, rootVisibleCount, fileTree.length]);

  const findItemByPath = (items: FileItem[], targetPath: string): FileItem | null => {
    for (const it of items) {
      if (it.path === targetPath) return it;
      if (it.children) {
        const found = findItemByPath(it.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  };

  const handleStartCreate = (type: 'file' | 'folder', contextItem?: FileItem | null) => {
    if (!workspacePath) return;

    let item = contextItem;
    if (item === undefined) {
      item = selectedPath ? findItemByPath(fileTree, selectedPath) : null;
    }

    if (item) {
      if (item.isDirectory) {
        // User clicked on a folder -> expand and show prompt just below folder
        workspaceStore.expandFolder(item.path);
        setCreationState({
          type,
          targetDir: item.path,
          anchorPath: item.path,
          anchorIsDirectory: true,
        });
      } else {
        // User clicked on a file -> target file's parent dir, show prompt just below file
        const sep = item.path.includes('\\') ? '\\' : '/';
        const lastSep = item.path.lastIndexOf(sep);
        const parentDir = lastSep !== -1 ? item.path.substring(0, lastSep) : workspacePath;
        setCreationState({
          type,
          targetDir: parentDir,
          anchorPath: item.path,
          anchorIsDirectory: false,
        });
      }
    } else {
      // Empty root space outside folders -> target root workspace directly
      setCreationState({
        type,
        targetDir: workspacePath,
        anchorPath: null,
        anchorIsDirectory: false,
      });
    }
  };

  const { general } = useSettings();
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ path: string; itemName: string; isDirectory: boolean } | null>(null);

  const handleDeleteRequested = (targetPath: string) => {
    const confirmDelete = settingsStore.getState().general.confirmDelete;
    const item = findItemByPath(fileTree, targetPath);
    const itemName = item ? item.name : targetPath.split(/[/\\]/).pop() || targetPath;
    const isDirectory = item ? item.isDirectory : false;

    if (confirmDelete !== false) {
      setDeleteConfirmation({ path: targetPath, itemName, isDirectory });
    } else {
      workspaceStore.deleteEntry(targetPath);
    }
  };

  const handleStartCreateRef = useRef(handleStartCreate);
  const handleDeleteRequestedRef = useRef(handleDeleteRequested);
  useEffect(() => {
    handleStartCreateRef.current = handleStartCreate;
    handleDeleteRequestedRef.current = handleDeleteRequested;
  });

  // Listen for global command events dispatched from keyboardShortcutsStore
  useEffect(() => {
    const onNewFile = () => handleStartCreateRef.current('file');
    const onNewFolder = () => handleStartCreateRef.current('folder');
    const onRename = () => {
      const sel = workspaceStore.getState().selectedPath;
      if (sel) setRenamingPath(sel);
    };
    const onDelete = () => {
      const sel = workspaceStore.getState().selectedPath;
      if (sel) handleDeleteRequestedRef.current(sel);
    };

    window.addEventListener('binary:explorer:newFile', onNewFile);
    window.addEventListener('binary:explorer:newFolder', onNewFolder);
    window.addEventListener('binary:explorer:rename', onRename);
    window.addEventListener('binary:explorer:delete', onDelete);
    return () => {
      window.removeEventListener('binary:explorer:newFile', onNewFile);
      window.removeEventListener('binary:explorer:newFolder', onNewFolder);
      window.removeEventListener('binary:explorer:rename', onRename);
      window.removeEventListener('binary:explorer:delete', onDelete);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateSubmit = async (name: string) => {
    if (!creationState || !name.trim()) {
      setCreationState(null);
      return;
    }

    const { type, targetDir } = creationState;
    setCreationState(null);

    if (type === 'file') {
      await workspaceStore.createFile(targetDir, name.trim());
    } else {
      await workspaceStore.createFolder(targetDir, name.trim());
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    workspaceStore.setSelectedPath(item.path);
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const handleContainerContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    workspaceStore.setSelectedPath(null);
    setContextMenu({ x: e.clientX, y: e.clientY, item: null });
  };

  if (!workspacePath) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          textAlign: 'center',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ marginBottom: 12, color: 'var(--text-muted)' }}>
          <FolderOpen size={36} />
        </div>
        <p style={{ fontSize: 13, marginBottom: 14, color: 'var(--text-primary)' }}>No Folder Open</p>
        <button
          onClick={() => workspaceStore.openFolder()}
          style={{
            padding: '6px 14px',
            backgroundColor: 'var(--accent-primary)',
            color: '#FFF',
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 500,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
        >
          Open Folder
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-panel)',
        userSelect: 'none',
      }}
      onContextMenu={handleContainerContextMenu}
    >
      {/* Explorer Pane Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {folderName || 'WORKSPACE'}
        </span>

        {/* Toolbar buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button
            onClick={() => handleStartCreate('file')}
            style={{ padding: 3, borderRadius: 3, color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            title="New File"
          >
            <FilePlus size={14} />
          </button>

          <button
            onClick={() => handleStartCreate('folder')}
            style={{ padding: 3, borderRadius: 3, color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            title="New Folder"
          >
            <FolderPlus size={14} />
          </button>

          <button
            onClick={() => workspaceStore.refreshTree()}
            style={{ padding: 3, borderRadius: 3, color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            title="Refresh Explorer"
          >
            <RotateCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Indeterminate Progress Bar during file loading / workspace refresh */}
      {isLoading && <div className="progress-bar-indeterminate" />}

      {/* File Tree List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 0',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          position: 'relative',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            workspaceStore.setSelectedPath(null);
          }
        }}
      >
        {/* Loading state with professional shimmer skeleton when workspace has no items yet */}
        {isLoading && fileTree.length === 0 && <FileExplorerSkeleton />}

        {(hasRootPagination ? fileTree.slice(0, rootVisibleCount) : fileTree).map((item) => (
          <FileTreeItem
            key={item.id}
            item={item}
            level={0}
            expandedFolders={expandedFolders}
            loadingFolders={loadingFolders}
            selectedPath={selectedPath}
            onContextMenu={handleContextMenu}
            renamingPath={renamingPath}
            onFinishRename={async (targetPath, newName) => {
              setRenamingPath(null);
              if (newName) {
                await workspaceStore.renameEntry(targetPath, newName);
              }
            }}
            onCancelRename={() => setRenamingPath(null)}
            creationState={creationState}
            onCreateSubmit={handleCreateSubmit}
            onCancelCreate={() => setCreationState(null)}
          />
        ))}

        {hasRootPagination && (
          <FolderPagination
            total={fileTree.length}
            visibleCount={Math.min(rootVisibleCount, fileTree.length)}
            level={-1}
            pageSize={ROOT_PAGE_SIZE}
            isStreaming={isRootStreaming}
            onLoadMore={(count = ROOT_PAGE_SIZE) => {
              setRootVisibleCount((prev) => Math.min(prev + count, fileTree.length));
            }}
            onLoadAll={() => {
              setIsRootStreaming(false);
              setRootVisibleCount(fileTree.length);
            }}
            onToggleStream={() => {
              setIsRootStreaming((prev) => !prev);
            }}
            onCollapseToFirst={() => {
              setIsRootStreaming(false);
              setRootVisibleCount(ROOT_PAGE_SIZE);
            }}
          />
        )}

        {/* If creating at root level, render prompt right below the root items */}
        {creationState && creationState.anchorPath === null && (
          <CreationInputRow
            type={creationState.type}
            level={0}
            onSubmit={handleCreateSubmit}
            onCancel={() => setCreationState(null)}
          />
        )}

        {/* Empty root space click area to deselect */}
        <div
          style={{ flex: 1, minHeight: 60, cursor: 'default' }}
          onClick={() => workspaceStore.setSelectedPath(null)}
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ExplorerContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetItem={contextMenu.item}
          onClose={() => setContextMenu(null)}
          onNewFile={() => handleStartCreate('file', contextMenu.item)}
          onNewFolder={() => handleStartCreate('folder', contextMenu.item)}
          onRename={() => {
            if (contextMenu.item) {
              setRenamingPath(contextMenu.item.path);
            }
          }}
          onDelete={() => {
            if (contextMenu.item) {
              handleDeleteRequested(contextMenu.item.path);
            }
          }}
          onDuplicate={async () => {
            if (contextMenu.item) {
              await workspaceStore.duplicateEntry(contextMenu.item.path);
            }
          }}
          onReveal={() => {
            if (contextMenu.item) {
              workspaceStore.revealInExplorer(contextMenu.item.path);
            }
          }}
          onCopyPath={() => {
            if (contextMenu.item) {
              navigator.clipboard.writeText(contextMenu.item.path);
            }
          }}
        />
      )}

      {/* Confirmation Warning Modal */}
      {deleteConfirmation && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setDeleteConfirmation(null)}
        >
          <div
            style={{
              width: 'min(440px, calc(100vw - 32px))',
              maxHeight: 'min(500px, calc(100vh - 48px))',
              backgroundColor: 'var(--bg-modal, #141820)',
              border: '1px solid var(--border-menu, rgba(255,255,255,0.12))',
              borderRadius: 12,
              boxShadow: '0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-in"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: general.deletePermanently ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: general.deletePermanently ? '#ef4444' : '#f59e0b',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {deleteConfirmation.isDirectory ? 'Delete Folder?' : 'Delete File?'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                  Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirmation.itemName}</strong>?
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>
                  {general.deletePermanently
                    ? 'This item will be permanently deleted from disk. This action cannot be undone.'
                    : 'This item will be moved to your system Recycle Bin.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button
                onClick={() => setDeleteConfirmation(null)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.06))',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const pathToDelete = deleteConfirmation.path;
                  setDeleteConfirmation(null);
                  await workspaceStore.deleteEntry(pathToDelete);
                }}
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: general.deletePermanently ? '#dc2626' : '#ea580c',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {general.deletePermanently ? 'Delete Permanently' : 'Move to Recycle Bin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
