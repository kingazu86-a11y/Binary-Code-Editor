import React, { useState, useEffect } from 'react';
import {
  FilePlus,
  FolderPlus,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
  Files,
  Sparkles,
} from 'lucide-react';
import { FileItem } from '../types';
import { api } from '../services/api';

interface ExplorerContextMenuProps {
  x: number;
  y: number;
  targetItem: FileItem | null;
  onClose: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onReveal: () => void;
  onCopyPath: () => void;
}

export const ExplorerContextMenu: React.FC<ExplorerContextMenuProps> = ({
  x,
  y,
  targetItem,
  onClose,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onDuplicate,
  onReveal,
  onCopyPath,
}) => {
  const [extensionItems, setExtensionItems] = useState<any[]>([]);

  useEffect(() => {
    const handleClick = () => onClose();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onClose]);

  useEffect(() => {
    const ext = targetItem?.name.includes('.') ? `.${targetItem.name.split('.').pop()}` : '';
    api
      .getExtensionMenus('explorer/context', {
        resourcePath: targetItem?.path,
        resourceExt: ext,
        isDirectory: targetItem?.isDirectory ?? false,
      })
      .then((items) => {
        if (Array.isArray(items)) setExtensionItems(items);
      });
  }, [targetItem]);

  type MenuItem =
    | { type: 'separator' }
    | { type?: never; label: string; icon?: React.ReactNode; action?: () => void; danger?: boolean };

  const baseItems: MenuItem[] = [
    { label: 'New File', icon: <FilePlus size={14} />, action: onNewFile },
    { label: 'New Folder', icon: <FolderPlus size={14} />, action: onNewFolder },
    { type: 'separator' as const },
    ...(targetItem
      ? [
          { label: 'Rename', icon: <Edit2 size={14} />, action: onRename },
          { label: 'Duplicate', icon: <Files size={14} />, action: onDuplicate },
          { label: 'Copy Path', icon: <Copy size={14} />, action: onCopyPath },
          { label: 'Reveal in System Explorer', icon: <ExternalLink size={14} />, action: onReveal },
          { type: 'separator' as const },
          { label: 'Delete', icon: <Trash2 size={14} />, action: onDelete, danger: true },
        ]
      : []),
  ];

  const menuItems: MenuItem[] = [
    ...baseItems,
    ...(extensionItems.length > 0 ? [{ type: 'separator' as const }] : []),
    ...extensionItems.map((extItem) => ({
      label: extItem.title as string,
      icon: <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />,
      action: () => api.executeExtensionCommand(extItem.command, targetItem?.path),
    })),
  ];

  return (
    <div
      style={{
        position: 'fixed',
        left: Math.min(x, window.innerWidth - 220),
        top: Math.min(y, window.innerHeight - 260),
        backgroundColor: 'var(--bg-menu)',
        border: '1px solid var(--border-menu)',
        borderRadius: 6,
        boxShadow: 'var(--shadow-menu)',
        zIndex: 9999,
        minWidth: 190,
        width: 'max-content',
        padding: '4px 0',
        whiteSpace: 'nowrap',
      }}
      onClick={(e) => e.stopPropagation()}
      className="context-menu animate-fade-in"
    >
      {menuItems.map((item, idx) => {
        if (item.type === 'separator') {
          return (
            <div
              key={idx}
              style={{ height: 1, backgroundColor: 'var(--border-color)', margin: '4px 0' }}
            />
          );
        }
        return (
          <button
            key={idx}
            onClick={() => {
              onClose();
              item.action?.();
            }}
            style={{
              width: '100%',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 9,
              fontSize: 12,
              color: item.danger ? 'var(--color-danger)' : 'var(--text-primary)',
              textAlign: 'left',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {item.icon}
            <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
