import React, { useEffect, useState } from 'react';
import { FolderOpen, FileCode, GitFork, Clock, Trash2, ArrowRight, Bot, Terminal, Code2 } from 'lucide-react';
import { api } from '../../services/api';
import { workspaceStore } from '../../state/workspaceStore';
import { layoutStore } from '../../state/layoutStore';

export const WelcomeScreen: React.FC = () => {
  const [recentProjects, setRecentProjects] = useState<string[]>([]);

  const loadRecents = async () => {
    const list = await api.getRecentProjects();
    setRecentProjects(list);
  };

  useEffect(() => {
    loadRecents();
  }, []);

  const handleOpenFolder = async () => {
    await workspaceStore.openFolder();
  };

  const handleRemoveRecent = async (p: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.removeRecentProject(p);
    await loadRecents();
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: 'var(--bg-main)',
        overflowY: 'auto',
        userSelect: 'none',
      }}
      className="animate-fade-in"
    >
      <div style={{ maxWidth: 840, width: '100%' }}>
        {/* Header Branding */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              01
            </div>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#E6EAF0', letterSpacing: '-0.5px' }}>
                BINARY
              </h1>
              <p style={{ fontSize: 13, color: 'var(--accent-primary)', fontWeight: 500, letterSpacing: '1px' }}>
                CODE. BUILD. EXECUTE.
              </p>
            </div>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 540, lineHeight: 1.6 }}>
            Professional desktop development environment with native terminal execution, live git source control, Monaco editing engine, and integrated AI tool intelligence.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          {/* Start Actions */}
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>
              Start
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={handleOpenFolder}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  backgroundColor: '#141820',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.backgroundColor = '#181E29';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.backgroundColor = '#141820';
                }}
              >
                <FolderOpen size={18} style={{ color: 'var(--accent-primary)' }} />
                <div style={{ flex: 1 }}>
                  <div>Open Folder...</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Open a local project workspace</div>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              </button>

              <button
                onClick={() => layoutStore.toggleAIPanel()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  backgroundColor: '#141820',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.backgroundColor = '#181E29';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.backgroundColor = '#141820';
                }}
              >
                <Bot size={18} style={{ color: 'var(--text-secondary)' }} />
                <div style={{ flex: 1 }}>
                  <div>Ask Binary AI</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Generate, refactor, or debug code</div>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              </button>

              <button
                onClick={() => layoutStore.toggleBottomPanel()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  backgroundColor: '#141820',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.backgroundColor = '#181E29';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.backgroundColor = '#141820';
                }}
              >
                <Terminal size={18} style={{ color: 'var(--color-success)' }} />
                <div style={{ flex: 1 }}>
                  <div>Integrated Terminal</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>PowerShell & CMD command line</div>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          </div>

          {/* Recent Projects */}
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14 }}>
              Recent Projects
            </h2>

            {recentProjects.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  backgroundColor: '#12151B',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 6,
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: 12,
                }}
              >
                No recent projects opened yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                {recentProjects.map((p) => {
                  const name = p.replace(/\\/g, '/').split('/').pop() || p;
                  return (
                    <div
                      key={p}
                      onClick={() => workspaceStore.setWorkspace(p)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: '#141820',
                        border: '1px solid var(--border-color)',
                        borderRadius: 5,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#181E29')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#141820')}
                    >
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{name}</div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 280,
                          }}
                        >
                          {p}
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleRemoveRecent(p, e)}
                        style={{ padding: 4, borderRadius: 4, color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                        title="Remove from recents"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
