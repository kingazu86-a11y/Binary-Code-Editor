import React, { useState, useEffect } from 'react';
import { useWorkspace, workspaceStore } from '../../state/workspaceStore';
import { editorStore } from '../../state/editorStore';
import { layoutStore } from '../../state/layoutStore';
import { api } from '../../services/api';
import { SettingRow, SettingSectionHeader } from '../components/SettingRow';
import { Folder, FolderOpen, FileCode, Trash2, X } from 'lucide-react';

interface Props {
  scope: 'user' | 'workspace';
  onSwitchScope: (scope: 'user' | 'workspace') => void;
}

export const WorkspaceSettings: React.FC<Props> = ({ scope, onSwitchScope }) => {
  const { workspacePath, folderName } = useWorkspace();
  const [recentProjects, setRecentProjects] = useState<string[]>([]);

  useEffect(() => {
    loadRecents();
  }, []);

  const loadRecents = async () => {
    try {
      const list = await api.getRecentProjects();
      setRecentProjects(list || []);
    } catch {}
  };

  const handleRemoveRecent = async (p: string) => {
    await api.removeRecentProject(p);
    loadRecents();
  };

  const handleClearAllRecents = async () => {
    await api.clearRecentProjects();
    setRecentProjects([]);
  };

  const handleOpenWorkspaceSettingsFile = async () => {
    if (!workspacePath) return;
    const sep = workspacePath.includes('\\') ? '\\' : '/';
    const filePath = `${workspacePath}${sep}.binary${sep}settings.json`;
    await api.createFile(filePath, '{\n  "editor": {},\n  "terminal": {}\n}\n');
    layoutStore.closeSettings();
    await editorStore.openFile(filePath);
  };

  return (
    <div>
      <SettingSectionHeader
        title="Workspace Configuration"
        subtitle="Manage current folder settings, workspace overrides, and project history"
      />

      {/* Active Workspace Info */}
      <SettingRow
        title="Active Workspace Configuration"
        description="Directory-specific settings overrides and workspace path information."
        vertical
      >
        <div
          style={{
            padding: 16,
            borderRadius: 6,
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            marginBottom: 20,
            marginTop: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Folder size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                {workspacePath ? folderName : 'No Open Workspace'}
              </span>
            </div>

            {workspacePath && (
              <button
                onClick={handleOpenWorkspaceSettingsFile}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  fontSize: 11,
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <FileCode size={12} />
                <span>Edit .binary/settings.json</span>
              </button>
            )}
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
            {workspacePath || 'Open a project folder to configure directory-specific settings.'}
          </div>
        </div>
      </SettingRow>

      <SettingRow
        title="Recent Projects History"
        description="Quickly reopen or manage previous development workspaces and project directories."
        vertical
      >
        {recentProjects.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, marginTop: 8 }}>
            <button
              onClick={handleClearAllRecents}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                fontSize: 11,
                color: 'var(--color-danger)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Trash2 size={11} />
              <span>Clear History</span>
            </button>
          </div>
        )}

        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            backgroundColor: 'var(--bg-panel)',
            overflow: 'hidden',
          }}
        >
        {recentProjects.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            No recent projects found.
          </div>
        ) : (
          recentProjects.map((p) => {
            const parts = p.replace(/\\/g, '/').split('/');
            const name = parts[parts.length - 1] || p;
            const isCurrent = workspacePath && workspacePath.toLowerCase() === p.toLowerCase();

            return (
              <div
                key={p}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border-subtle)',
                  backgroundColor: isCurrent ? 'var(--bg-active)' : 'transparent',
                }}
              >
                <div
                  onClick={async () => {
                    await workspaceStore.setWorkspace(p);
                    layoutStore.closeSettings();
                  }}
                  style={{ cursor: 'pointer', flex: 1 }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FolderOpen size={14} style={{ color: 'var(--accent-primary)' }} />
                    <span>{name}</span>
                    {isCurrent && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: '1px 5px',
                          borderRadius: 3,
                          backgroundColor: 'var(--accent-subtle)',
                          color: 'var(--accent-primary)',
                        }}
                      >
                        Current
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {p}
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveRecent(p)}
                  style={{ padding: 4, color: 'var(--text-muted)', borderRadius: 3 }}
                  title="Remove from recents"
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })
        )}
        </div>
      </SettingRow>
    </div>
  );
};
