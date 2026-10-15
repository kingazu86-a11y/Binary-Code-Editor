import React, { useState, useEffect, useRef } from 'react';
import { useKeyboardShortcuts, ResolvedCommand, normalizeKeybinding } from '../../state/keyboardShortcutsStore';
import { Search, Edit2, X, RotateCcw, AlertTriangle, Check, Keyboard as KeyboardIcon } from 'lucide-react';
import { useSettingsSearch } from '../components/SettingRow';

export const KeyboardShortcutsSettings: React.FC = () => {
  const { commands, updateShortcut, removeShortcut, resetShortcut, restoreAllDefaults } = useKeyboardShortcuts();
  const { searchQuery: globalSearchQuery } = useSettingsSearch();
  const [searchQuery, setSearchQuery] = useState(globalSearchQuery || '');
  const [filterType, setFilterType] = useState<'all' | 'modified' | 'conflicts'>('all');
  const [recordingCmd, setRecordingCmd] = useState<ResolvedCommand | null>(null);
  const [recordedKeys, setRecordedKeys] = useState<string>('');

  useEffect(() => {
    if (globalSearchQuery !== undefined) {
      setSearchQuery(globalSearchQuery);
    }
  }, [globalSearchQuery]);

  // Key recording listener
  useEffect(() => {
    if (!recordingCmd) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingCmd(null);
        setRecordedKeys('');
        return;
      }

      if (e.key === 'Enter' && recordedKeys) {
        updateShortcut(recordingCmd.id, recordedKeys);
        setRecordingCmd(null);
        setRecordedKeys('');
        return;
      }

      // Ignore bare modifier presses
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        return;
      }

      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Cmd');

      let mainKey = e.key;
      if (mainKey === ' ') mainKey = 'Space';
      else if (mainKey.length === 1) mainKey = mainKey.toUpperCase();
      else if (mainKey.startsWith('Arrow')) mainKey = mainKey.replace('Arrow', '');

      parts.push(mainKey);
      const combo = parts.join('+');
      setRecordedKeys(combo);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingCmd, recordedKeys]);

  const filteredCommands = commands.filter((cmd) => {
    const matchesSearch =
      cmd.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.currentKeybinding.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'modified') return cmd.isModified;
    if (filterType === 'conflicts') return cmd.conflictsWith.length > 0;
    return true;
  });

  const conflictCount = commands.filter((c) => c.conflictsWith.length > 0).length;
  const modifiedCount = commands.filter((c) => c.isModified).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header bar */}
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          Keyboard Shortcuts
        </h3>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Search commands, assign custom key combinations, and resolve shortcut conflicts.
        </p>
      </div>

      {/* Filter and Search controls */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: '1 1 200px', minWidth: 160, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 8, color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Type to search commands or keys (e.g. 'save', 'ctrl+s', 'terminal')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: 30,
              paddingLeft: 32,
              paddingRight: searchQuery ? 28 : 10,
              fontSize: 12,
              boxSizing: 'border-box',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: 8, top: 6, color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => setFilterType('all')}
            style={{
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 11,
              backgroundColor: filterType === 'all' ? 'var(--bg-active)' : 'transparent',
              color: filterType === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              whiteSpace: 'nowrap',
            }}
          >
            All ({commands.length})
          </button>
          <button
            onClick={() => setFilterType('modified')}
            style={{
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 11,
              backgroundColor: filterType === 'modified' ? 'var(--bg-active)' : 'transparent',
              color: filterType === 'modified' ? 'var(--accent-primary)' : 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              whiteSpace: 'nowrap',
            }}
          >
            Modified ({modifiedCount})
          </button>
          <button
            onClick={() => setFilterType('conflicts')}
            style={{
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 11,
              backgroundColor: filterType === 'conflicts' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
              color: filterType === 'conflicts' ? '#EF4444' : conflictCount > 0 ? '#F59E0B' : 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              whiteSpace: 'nowrap',
            }}
          >
            Conflicts ({conflictCount})
          </button>
        </div>

        {/* Restore defaults button */}
        <button
          onClick={restoreAllDefaults}
          style={{
            padding: '4px 10px',
            borderRadius: 4,
            fontSize: 11,
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          title="Reset all customized keyboard shortcuts to default factory bindings"
        >
          <RotateCcw size={12} />
          <span>Restore Defaults</span>
        </button>
      </div>

      {/* Shortcuts Table */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          border: '1px solid var(--border-color)',
          borderRadius: 6,
          backgroundColor: 'var(--bg-panel)',
          width: '100%',
        }}
      >
        <table style={{ width: '100%', minWidth: 500, borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--bg-card)',
                borderBottom: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              <th style={{ padding: '8px 12px' }}>Command</th>
              <th style={{ padding: '8px 12px', width: 220 }}>Keybinding</th>
              <th style={{ padding: '8px 12px', width: 120 }}>Category</th>
              <th style={{ padding: '8px 12px', width: 100, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCommands.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No commands match your search filter.
                </td>
              </tr>
            ) : (
              filteredCommands.map((cmd) => {
                const hasConflict = cmd.conflictsWith.length > 0;
                return (
                  <tr
                    key={cmd.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: hasConflict ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = hasConflict
                        ? 'rgba(239, 68, 68, 0.04)'
                        : 'transparent')
                    }
                  >
                    {/* Command Title */}
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{cmd.title}</div>
                      {hasConflict && (
                        <div
                          style={{
                            fontSize: 11,
                            color: '#EF4444',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 2,
                          }}
                        >
                          <AlertTriangle size={11} />
                          <span>Conflict: also assigned to {cmd.conflictsWith.join(', ')}</span>
                        </div>
                      )}
                    </td>

                    {/* Keybinding Display */}
                    <td style={{ padding: '8px 12px' }}>
                      {cmd.currentKeybinding ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {cmd.currentKeybinding.split('+').map((key, i) => (
                            <kbd
                              key={i}
                              style={{
                                display: 'inline-block',
                                padding: '2px 6px',
                                fontSize: 11,
                                fontFamily: 'var(--font-mono)',
                                backgroundColor: 'var(--bg-card)',
                                border: hasConflict ? '1px solid #EF4444' : '1px solid var(--border-color)',
                                borderRadius: 3,
                                color: hasConflict ? '#EF4444' : 'var(--text-primary)',
                                boxShadow: '0 1px 1px rgba(0,0,0,0.3)',
                              }}
                            >
                              {key}
                            </kbd>
                          ))}
                          {cmd.isModified && (
                            <span
                              style={{
                                fontSize: 9,
                                padding: '1px 4px',
                                borderRadius: 3,
                                backgroundColor: 'var(--accent-subtle)',
                                color: 'var(--accent-primary)',
                                marginLeft: 4,
                              }}
                            >
                              custom
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Unassigned</span>
                      )}
                    </td>

                    {/* Category Tag */}
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                      {cmd.category}
                    </td>

                    {/* Action buttons */}
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => {
                            setRecordingCmd(cmd);
                            setRecordedKeys('');
                          }}
                          style={{ padding: 4, borderRadius: 4, color: 'var(--text-secondary)' }}
                          title="Record new shortcut"
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                        >
                          <Edit2 size={13} />
                        </button>

                        {cmd.isModified && (
                          <button
                            onClick={() => resetShortcut(cmd.id)}
                            style={{ padding: 4, borderRadius: 4, color: 'var(--text-muted)' }}
                            title="Reset to default shortcut"
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-warning)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}

                        {cmd.currentKeybinding && (
                          <button
                            onClick={() => removeShortcut(cmd.id)}
                            style={{ padding: 4, borderRadius: 4, color: 'var(--text-muted)' }}
                            title="Remove shortcut"
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Interactive Key Recording Modal */}
      {recordingCmd && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              width: 460,
              backgroundColor: '#111419',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <KeyboardIcon size={18} style={{ color: 'var(--accent-primary)' }} />
              <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Record Keybinding
              </h4>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Command: <strong style={{ color: 'var(--text-primary)' }}>{recordingCmd.title}</strong>
            </div>

            {/* Recording box */}
            <div
              style={{
                height: 56,
                backgroundColor: 'var(--bg-main)',
                border: '2px dashed var(--accent-primary)',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontFamily: 'var(--font-mono)',
                color: recordedKeys ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {recordedKeys ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  {recordedKeys.split('+').map((k, i) => (
                    <kbd
                      key={i}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 4,
                      }}
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              ) : (
                'Press keys on your keyboard...'
              )}
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              Press desired shortcut keys, then press <kbd>Enter</kbd> to confirm or <kbd>Esc</kbd> to cancel.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button
                onClick={() => {
                  setRecordingCmd(null);
                  setRecordedKeys('');
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 4,
                  fontSize: 12,
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancel
              </button>
              <button
                disabled={!recordedKeys}
                onClick={() => {
                  if (recordedKeys) {
                    updateShortcut(recordingCmd.id, recordedKeys);
                    setRecordingCmd(null);
                    setRecordedKeys('');
                  }
                }}
                style={{
                  padding: '6px 16px',
                  borderRadius: 4,
                  fontSize: 12,
                  backgroundColor: recordedKeys ? 'var(--accent-primary)' : 'var(--bg-card)',
                  color: '#FFFFFF',
                  opacity: recordedKeys ? 1 : 0.4,
                  cursor: recordedKeys ? 'pointer' : 'not-allowed',
                }}
              >
                Save Shortcut
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
