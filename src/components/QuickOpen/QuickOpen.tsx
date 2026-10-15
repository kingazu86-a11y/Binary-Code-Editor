import React, { useState, useEffect, useRef } from 'react';
import { File, Search } from 'lucide-react';
import { useLayout, layoutStore } from '../../state/layoutStore';
import { useWorkspace } from '../../state/workspaceStore';
import { editorStore } from '../../state/editorStore';
import { FileItem } from '../../types';

export const QuickOpen: React.FC = () => {
  const { quickOpenOpen } = useLayout();
  const { fileTree, workspacePath } = useWorkspace();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten fileTree into a flat list of files
  const flattenFiles = (items: FileItem[]): FileItem[] => {
    let result: FileItem[] = [];
    for (const item of items) {
      if (item.isDirectory && item.children) {
        result = result.concat(flattenFiles(item.children));
      } else if (!item.isDirectory) {
        result.push(item);
      }
    }
    return result;
  };

  const allFiles = flattenFiles(fileTree);
  const filtered = allFiles.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase()) ||
    f.path.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (quickOpenOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [quickOpenOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      layoutStore.setQuickOpenOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filtered[selectedIndex];
      if (target) {
        layoutStore.setQuickOpenOpen(false);
        editorStore.openFile(target.path);
      }
    }
  };

  if (!quickOpenOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(2px)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '60px',
      }}
      onClick={() => layoutStore.setQuickOpenOpen(false)}
    >
      <div
        style={{
          width: 580,
          maxHeight: 420,
          backgroundColor: 'var(--bg-modal)',
          border: '1px solid var(--border-menu)',
          borderRadius: 8,
          boxShadow: 'var(--shadow-menu)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-in"
      >
        {/* Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-panel-secondary)',
          }}
        >
          <Search size={16} style={{ color: 'var(--accent-primary)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search files by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: 13,
              boxShadow: 'none',
              padding: 0,
            }}
          />
        </div>

        {/* File Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No files matching "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const relPath = workspacePath ? item.path.replace(workspacePath, '').replace(/^[\\\/]/, '') : item.path;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    layoutStore.setQuickOpenOpen(false);
                    editorStore.openFile(item.path);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 14px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--bg-active)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--accent-primary)' : '3px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <File size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: isSelected ? '#FFF' : 'var(--text-primary)', fontWeight: 500 }}>
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {relPath}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
