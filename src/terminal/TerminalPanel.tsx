import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Terminal as TermIcon,
  ChevronDown,
  X,
} from 'lucide-react';
import { useTerminal, terminalStore } from '../state/terminalStore';
import { useWorkspace } from '../state/workspaceStore';
import { useSettings } from '../state/settingsStore';
import { XTermInstance } from './XTermInstance';

export const TerminalPanel: React.FC = () => {
  const { terminals, activeTerminalId } = useTerminal();
  const { workspacePath } = useWorkspace();
  const { terminal: terminalSettings } = useSettings();
  const [showShellDropdown, setShowShellDropdown] = useState(false);

  // Auto-create initial terminal in workspace directory
  useEffect(() => {
    if (terminals.length === 0 && workspacePath) {
      const defaultShell = terminalSettings.defaultShell || 'powershell';
      terminalStore.createTerminal(workspacePath, defaultShell);
    }
  }, [workspacePath, terminals.length]);

  const handleCreateNew = (shell?: string) => {
    const chosen = shell || terminalSettings.defaultShell || 'powershell';
    const targetCwd =
      workspacePath ||
      (typeof window !== 'undefined' ? (window as any).__binary_active_workspace : '') ||
      undefined;
    terminalStore.createTerminal(targetCwd, chosen);
    setShowShellDropdown(false);
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-panel)',
        overflow: 'hidden',
      }}
    >
      {/* Terminal Toolbar */}
      <div
        style={{
          height: 30,
          backgroundColor: 'var(--bg-tab-bar)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          userSelect: 'none',
        }}
      >
        {/* Terminal Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', flex: 1 }}>
          {terminals.map((t) => {
            const isActive = t.id === activeTerminalId;
            return (
              <div
                key={t.id}
                onClick={() => terminalStore.setActiveTerminal(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  cursor: 'pointer',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  backgroundColor: isActive ? 'var(--bg-active)' : 'transparent',
                  border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
                }}
              >
                <TermIcon size={12} style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                <span>{t.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    terminalStore.killTerminal(t.id);
                  }}
                  style={{
                    padding: 1,
                    borderRadius: 2,
                    color: 'var(--text-muted)',
                    marginLeft: 2,
                  }}
                  title="Close Terminal"
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Right Actions: Add terminal, Kill, Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}>
          {/* New terminal dropdown */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => handleCreateNew()}
              style={{
                padding: '3px 6px',
                borderRadius: '4px 0 0 4px',
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRight: 'none',
              }}
              title="New Terminal"
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
            >
              <Plus size={13} />
            </button>
            <button
              onClick={() => setShowShellDropdown(!showShellDropdown)}
              style={{
                padding: '3px 4px',
                borderRadius: '0 4px 4px 0',
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
              }}
              title="Select Shell Profile"
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
            >
              <ChevronDown size={11} />
            </button>
          </div>

          {showShellDropdown && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                onClick={() => setShowShellDropdown(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  backgroundColor: 'var(--bg-menu)',
                  border: '1px solid var(--border-menu)',
                  borderRadius: 6,
                  boxShadow: 'var(--shadow-menu)',
                  minWidth: 190,
                  width: 'max-content',
                  padding: '4px 0',
                  zIndex: 1000,
                  whiteSpace: 'nowrap',
                }}
              >
                <button
                  onClick={() => handleCreateNew('powershell')}
                  style={{
                    width: '100%',
                    padding: '6px 14px',
                    textAlign: 'left',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <TermIcon size={12} style={{ color: 'var(--accent-primary)' }} />
                  <span>Windows PowerShell</span>
                </button>
                <button
                  onClick={() => handleCreateNew('cmd')}
                  style={{
                    width: '100%',
                    padding: '6px 14px',
                    textAlign: 'left',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <TermIcon size={12} style={{ color: '#F59E0B' }} />
                  <span>Command Prompt (CMD)</span>
                </button>
                <button
                  onClick={() => handleCreateNew('bash')}
                  style={{
                    width: '100%',
                    padding: '6px 14px',
                    textAlign: 'left',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <TermIcon size={12} style={{ color: '#10B981' }} />
                  <span>Git Bash / Bash</span>
                </button>
              </div>
            </>
          )}

          {/* Kill current active terminal */}
          {activeTerminalId && (
            <button
              onClick={() => terminalStore.killTerminal(activeTerminalId)}
              style={{
                padding: '3px 6px',
                borderRadius: 4,
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              title="Kill Active Terminal"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Viewports: All instances kept alive in DOM */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {terminals.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
              fontSize: 12,
              gap: 8,
            }}
          >
            <span>No active terminal session.</span>
            <button
              onClick={() => handleCreateNew()}
              style={{
                padding: '5px 12px',
                backgroundColor: 'var(--accent-primary)',
                color: '#FFF',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              Open Terminal
            </button>
          </div>
        ) : (
          terminals.map((t) => (
            <div
              key={t.id}
              style={{
                display: t.id === activeTerminalId ? 'flex' : 'none',
                width: '100%',
                height: '100%',
                position: 'absolute',
                inset: 0,
              }}
            >
              <XTermInstance id={t.id} isActive={t.id === activeTerminalId} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
