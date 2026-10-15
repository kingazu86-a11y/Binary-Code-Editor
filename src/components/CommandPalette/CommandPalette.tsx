import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronRight, Puzzle } from 'lucide-react';
import { useLayout, layoutStore } from '../../state/layoutStore';
import { useKeyboardShortcuts, executeCommand, MASTER_COMMANDS } from '../../state/keyboardShortcutsStore';
import { api } from '../../services/api';

interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const { commandPaletteOpen } = useLayout();
  const { commands: resolvedShortcuts } = useKeyboardShortcuts();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [extensionCommands, setExtensionCommands] = useState<CommandItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Map master commands with their resolved active shortcuts
  const builtInCommands: CommandItem[] = MASTER_COMMANDS.map((cmd) => {
    const resolved = resolvedShortcuts.find((r) => r.id === cmd.id);
    return {
      id: cmd.id,
      title: cmd.title,
      category: cmd.category,
      shortcut: resolved?.currentKeybinding || cmd.defaultKeybinding,
      action: () => executeCommand(cmd.id),
    };
  });

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      // Dynamically load all registered extension commands
      api.getExtensionCommands().then((extList) => {
        if (Array.isArray(extList)) {
          const mapped: CommandItem[] = extList.map((c) => ({
            id: c.id,
            title: c.title || c.id,
            category: c.category || 'Extension',
            action: () => {
              layoutStore.setCommandPaletteOpen(false);
              api.executeExtensionCommand(c.id);
            },
          }));
          setExtensionCommands(mapped);
        }
      });
    }
  }, [commandPaletteOpen]);

  const allCommands = [...builtInCommands, ...extensionCommands];

  const filtered = allCommands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase()) ||
      c.id.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      layoutStore.setCommandPaletteOpen(false);
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
        layoutStore.setCommandPaletteOpen(false);
        target.action();
      }
    }
  };

  if (!commandPaletteOpen) return null;

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
      onClick={() => layoutStore.setCommandPaletteOpen(false)}
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
        {/* Input header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-panel-secondary)',
          }}
        >
          <ChevronRight size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command to run..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 14,
            }}
          />
        </div>

        {/* Command list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No matching commands found
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const isExt = item.category === 'Extension';

              return (
                <div
                  key={`${item.id}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 5,
                    backgroundColor: isSelected ? 'var(--bg-active)' : 'transparent',
                    cursor: 'pointer',
                    gap: 12,
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    layoutStore.setCommandPaletteOpen(false);
                    item.action();
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    {isExt ? (
                      <Puzzle size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
                          fontWeight: 500,
                          flexShrink: 0,
                          minWidth: 80,
                        }}
                      >
                        {item.category}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 13,
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: isSelected ? 500 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.title}
                    </span>
                  </div>

                  {item.shortcut && (
                    <kbd
                      style={{
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor: isSelected ? '#21262D' : '#161B22',
                        border: '1px solid var(--border-color)',
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontFamily: 'monospace',
                        flexShrink: 0,
                      }}
                    >
                      {item.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '6px 16px',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: '#0E1116',
            fontSize: 11,
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Use ↑ ↓ to navigate, Enter to run, Esc to close</span>
          <span>{filtered.length} commands</span>
        </div>
      </div>
    </div>
  );
};
