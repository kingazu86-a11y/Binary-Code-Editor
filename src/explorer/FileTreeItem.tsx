import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  File,
  Code2,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { FileItem } from '../types';
import { workspaceStore } from '../state/workspaceStore';
import { editorStore } from '../state/editorStore';
import { FolderPagination } from './FolderPagination';

export interface CreationState {
  type: 'file' | 'folder';
  targetDir: string;
  anchorPath: string | null;
  anchorIsDirectory: boolean;
}

export const isPathEqual = (a: string | null | undefined, b: string | null | undefined): boolean => {
  if (!a || !b) return false;
  if (a === b) return true;
  const normA = a.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  const normB = b.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  return normA === normB;
};


export const CreationInputRow: React.FC<{
  type: 'file' | 'folder';
  level: number;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}> = ({ type, level, onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (name.trim()) {
        onSubmit(name.trim());
      } else {
        onCancel();
      }
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        paddingLeft: `${level * 14 + 10}px`,
        paddingRight: 10,
        height: 24,
        backgroundColor: 'var(--bg-active)',
        borderLeft: '2px solid var(--accent-primary)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <span style={{ width: 13, display: 'flex', alignItems: 'center' }} />
      {type === 'folder' ? (
        <Folder size={14} style={{ color: '#60A5FA', flexShrink: 0 }} />
      ) : (
        <FileCode size={14} style={{ color: '#3B82F6', flexShrink: 0 }} />
      )}
      <input
        ref={inputRef}
        type="text"
        value={name}
        placeholder={type === 'file' ? 'filename.ext' : 'folder-name'}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (name.trim()) onSubmit(name.trim());
          else onCancel();
        }}
        style={{
          flex: 1,
          height: 18,
          fontSize: 12,
          padding: '1px 6px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-focus)',
          borderRadius: 3,
          color: 'var(--text-primary)',
          outline: 'none',
        }}
      />
    </div>
  );
};

interface FileTreeItemProps {
  item: FileItem;
  level: number;
  expandedFolders: Set<string>;
  loadingFolders?: Set<string>;
  selectedPath: string | null;
  onContextMenu: (e: React.MouseEvent, item: FileItem) => void;
  renamingPath: string | null;
  onFinishRename: (targetPath: string, newName: string) => void;
  onCancelRename: () => void;
  creationState: CreationState | null;
  onCreateSubmit: (name: string) => void;
  onCancelCreate: () => void;
}

export const FileTreeItem: React.FC<FileTreeItemProps> = React.memo(({
  item,
  level,
  expandedFolders,
  loadingFolders,
  selectedPath,
  onContextMenu,
  renamingPath,
  onFinishRename,
  onCancelRename,
  creationState,
  onCreateSubmit,
  onCancelCreate,
}) => {
  const isExpanded = expandedFolders.has(item.path);
  const isSelected = isPathEqual(selectedPath, item.path);
  const isRenaming = renamingPath === item.path;
  const isLoadingFolder = item.isDirectory && !!loadingFolders?.has(item.path);
  const [renameValue, setRenameValue] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);
  // Prevents onBlur from triggering a second rename after Enter already committed
  const committedRef = useRef(false);

  // Pagination & progressive sequential streaming for large directories
  const PAGE_SIZE = 50;
  const totalChildren = item.children?.length || 0;
  const hasPagination = item.isDirectory && totalChildren > PAGE_SIZE;

  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // Reset pagination when folder is collapsed
  useEffect(() => {
    if (!isExpanded) {
      setIsStreaming(false);
      setVisibleCount(PAGE_SIZE);
    }
  }, [isExpanded]);

  // Sequential batch loader: increments by PAGE_SIZE every 40ms without locking main thread
  useEffect(() => {
    if (!isStreaming) return;
    if (visibleCount >= totalChildren) {
      setIsStreaming(false);
      return;
    }

    const timer = setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, totalChildren));
    }, 40);

    return () => clearTimeout(timer);
  }, [isStreaming, visibleCount, totalChildren]);

  useEffect(() => {
    if (isRenaming) {
      committedRef.current = false;
      setRenameValue(item.name);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isRenaming, item.name]);

  const getFileIcon = (fileName: string, isDirectory: boolean) => {
    if (isDirectory) {
      return isExpanded ? (
        <FolderOpen size={14} style={{ color: '#93C5FD', flexShrink: 0 }} />
      ) : (
        <Folder size={14} style={{ color: '#60A5FA', flexShrink: 0 }} />
      );
    }

    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return <FileCode size={14} style={{ color: '#3B82F6', flexShrink: 0 }} />;
      case 'js':
      case 'jsx':
        return <FileCode size={14} style={{ color: '#FBBF24', flexShrink: 0 }} />;
      case 'json':
        return <FileJson size={14} style={{ color: '#34D399', flexShrink: 0 }} />;
      case 'html':
        return <Code2 size={14} style={{ color: '#F97316', flexShrink: 0 }} />;
      case 'css':
      case 'scss':
        return <Code2 size={14} style={{ color: '#38BDF8', flexShrink: 0 }} />;
      case 'md':
        return <FileText size={14} style={{ color: '#A78BFA', flexShrink: 0 }} />;
      case 'py':
        return <FileCode size={14} style={{ color: '#EAB308', flexShrink: 0 }} />;
      case 'svg':
        return <ImageIcon size={14} style={{ color: '#FB923C', flexShrink: 0 }} />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
      case 'ico':
      case 'bmp':
      case 'avif':
        return <ImageIcon size={14} style={{ color: '#38BDF8', flexShrink: 0 }} />;
      default:
        return <File size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    workspaceStore.setSelectedPath(item.path);
    if (item.isDirectory) {
      workspaceStore.toggleFolder(item.path);
    } else {
      editorStore.openFile(item.path);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      committedRef.current = true;
      const newName = renameValue.trim() || item.name;
      // Only rename if the name actually changed
      if (newName !== item.name) {
        onFinishRename(item.path, newName);
      } else {
        onCancelRename();
      }
    } else if (e.key === 'Escape') {
      committedRef.current = true;
      onCancelRename();
    }
  };

  // Determine if creation input is attached to this directory
  const isCreatingInsideThisFolder =
    item.isDirectory &&
    creationState?.anchorPath === item.path &&
    creationState.anchorIsDirectory;

  // Determine if creation input is attached directly below this file
  const isCreatingBelowThisFile =
    !item.isDirectory &&
    creationState?.anchorPath === item.path &&
    !creationState.anchorIsDirectory;

  return (
    <div>
      <div
        className={`file-tree-row ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, item)}
        style={{
          paddingLeft: `${level * 14 + 10}px`,
          paddingRight: 10,
        }}
        data-selected={isSelected ? 'true' : 'false'}
        data-path={item.path}
      >
        {/* Chevron for folder */}
        {item.isDirectory ? (
          <span style={{ display: 'flex', alignItems: 'center', color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {isLoadingFolder ? (
              <Loader2 size={12} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
            ) : isExpanded ? (
              <ChevronDown size={13} />
            ) : (
              <ChevronRight size={13} />
            )}
          </span>
        ) : (
          <span style={{ width: 13 }} />
        )}

        {/* Icon */}
        <span className="file-tree-icon" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {isLoadingFolder ? (
            <FolderOpen size={14} style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />
          ) : (
            getFileIcon(item.name, item.isDirectory)
          )}
        </span>

        {/* Name or in-place edit */}
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Don't double-fire if Enter/Escape already committed
              if (committedRef.current) return;
              committedRef.current = true;
              const newName = renameValue.trim() || item.name;
              if (newName !== item.name) {
                onFinishRename(item.path, newName);
              } else {
                onCancelRename();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: '1px 4px',
              height: 20,
              fontSize: 12,
              flex: 1,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-focus)',
              borderRadius: 3,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        ) : (
          <span
            className="file-tree-label"
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {item.name}
          </span>
        )}
      </div>

      {/* If this item is a file and we are creating below it, render input directly below */}
      {isCreatingBelowThisFile && creationState && (
        <CreationInputRow
          type={creationState.type}
          level={level}
          onSubmit={onCreateSubmit}
          onCancel={onCancelCreate}
        />
      )}

      {/* Children if directory and expanded (or if currently creating inside this folder) */}
      {item.isDirectory && (isExpanded || isCreatingInsideThisFolder) && (
        <div>
          {/* If creating inside this folder, show the creation input at the top of the folder's children */}
          {isCreatingInsideThisFolder && creationState && (
            <CreationInputRow
              type={creationState.type}
              level={level + 1}
              onSubmit={onCreateSubmit}
              onCancel={onCancelCreate}
            />
          )}

          {(hasPagination ? item.children!.slice(0, visibleCount) : (item.children || [])).map((child) => (
            <FileTreeItem
              key={child.id}
              item={child}
              level={level + 1}
              expandedFolders={expandedFolders}
              loadingFolders={loadingFolders}
              selectedPath={selectedPath}
              onContextMenu={onContextMenu}
              renamingPath={renamingPath}
              onFinishRename={onFinishRename}
              onCancelRename={onCancelRename}
              creationState={creationState}
              onCreateSubmit={onCreateSubmit}
              onCancelCreate={onCancelCreate}
            />
          ))}

          {/* Pagination and sequential chunk streaming footer for large directories */}
          {hasPagination && (
            <FolderPagination
              total={totalChildren}
              visibleCount={Math.min(visibleCount, totalChildren)}
              level={level}
              pageSize={PAGE_SIZE}
              isStreaming={isStreaming}
              onLoadMore={(count = PAGE_SIZE) => {
                setVisibleCount((prev) => Math.min(prev + count, totalChildren));
              }}
              onLoadAll={() => {
                setIsStreaming(false);
                setVisibleCount(totalChildren);
              }}
              onToggleStream={() => {
                setIsStreaming((prev) => !prev);
              }}
              onCollapseToFirst={() => {
                setIsStreaming(false);
                setVisibleCount(PAGE_SIZE);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  // If the Set references themselves changed, always re-render — this propagates
  // subfolder expansion/loading changes down to all ancestor nodes
  if (prev.expandedFolders !== next.expandedFolders) return false;
  if (prev.loadingFolders !== next.loadingFolders) return false;

  // If selected item changed, always re-render so all tree items update their active highlight state
  if (prev.selectedPath !== next.selectedPath) return false;

  // If rename or creation state changed, re-render
  if (prev.renamingPath !== next.renamingPath) return false;
  if (prev.creationState !== next.creationState) return false;

  if (prev.item !== next.item) return false;
  if (prev.item.isLoaded !== next.item.isLoaded) return false;
  if (prev.item.children !== next.item.children) return false;
  if (prev.item.name !== next.item.name) return false;
  if (prev.level !== next.level) return false;

  return true;
});
