import React, { useEffect } from 'react';
import {
  GitBranch,
  Plus,
  Minus,
  Check,
  RotateCw,
  FileCode,
  GitCommit,
  Layers,
} from 'lucide-react';
import { useGit, gitStore } from '../state/gitStore';
import { useWorkspace } from '../state/workspaceStore';

export const SourceControl: React.FC = () => {
  const { workspacePath } = useWorkspace();
  const { status, commitMessage, isCommitting, isRefreshing, branches } = useGit();

  useEffect(() => {
    gitStore.refreshStatus();
  }, [workspacePath]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      gitStore.commit();
    }
  };

  if (!status.isRepo) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          color: 'var(--text-secondary)',
        }}
      >
        <GitBranch size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
        <p style={{ fontSize: 13, marginBottom: 8, color: 'var(--text-primary)' }}>No Git Repository</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          The current workspace folder is not tracked by Git.
        </p>
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
    >
      {/* Header */}
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
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <GitBranch size={13} style={{ color: 'var(--accent-primary)' }} />
          <span>{status.branch || 'main'}</span>
        </span>

        <button
          onClick={() => gitStore.refreshStatus()}
          style={{ padding: 3, borderRadius: 3, color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          title="Refresh Git Status"
        >
          <RotateCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {isRefreshing && <div className="progress-bar-indeterminate" />}

      {/* Commit Input Box */}
      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <textarea
          placeholder="Message (Ctrl+Enter to commit)"
          value={commitMessage}
          onChange={(e) => gitStore.setCommitMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          style={{ width: '100%', resize: 'none', fontSize: 12 }}
        />

        <button
          onClick={() => gitStore.commit()}
          disabled={!commitMessage.trim() || isCommitting}
          style={{
            padding: '6px 12px',
            backgroundColor: commitMessage.trim() ? 'var(--accent-primary)' : '#1E2430',
            color: commitMessage.trim() ? '#FFF' : 'var(--text-muted)',
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: commitMessage.trim() ? 'pointer' : 'default',
          }}
          onMouseEnter={(e) => {
            if (commitMessage.trim()) e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)';
          }}
          onMouseLeave={(e) => {
            if (commitMessage.trim()) e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
          }}
        >
          <Check size={14} />
          <span>{isCommitting ? 'Committing...' : 'Commit'}</span>
        </button>
      </div>

      {/* Changes list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {/* Staged changes */}
        {status.staged.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                backgroundColor: 'rgba(255,255,255,0.02)',
              }}
            >
              <span>STAGED CHANGES ({status.staged.length})</span>
              <button
                onClick={() => gitStore.unstageAll()}
                style={{ padding: 2, borderRadius: 3, color: 'var(--text-muted)' }}
                title="Unstage All"
              >
                <Minus size={13} />
              </button>
            </div>

            {status.staged.map((f) => (
              <div
                key={f}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
                onClick={() => gitStore.viewFileDiff(f)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span style={{ color: 'var(--color-success)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    gitStore.unstageFile(f);
                  }}
                  style={{ padding: 2, color: 'var(--text-muted)' }}
                  title="Unstage"
                >
                  <Minus size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Unstaged changes */}
        {status.modified.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                backgroundColor: 'rgba(255,255,255,0.02)',
              }}
            >
              <span>CHANGES ({status.modified.length})</span>
              <button
                onClick={() => gitStore.stageAll()}
                style={{ padding: 2, borderRadius: 3, color: 'var(--text-muted)' }}
                title="Stage All"
              >
                <Plus size={13} />
              </button>
            </div>

            {status.modified.map((f) => (
              <div
                key={f}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
                onClick={() => gitStore.viewFileDiff(f)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span style={{ color: 'var(--color-warning)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    gitStore.stageFile(f);
                  }}
                  style={{ padding: 2, color: 'var(--text-muted)' }}
                  title="Stage"
                >
                  <Plus size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Untracked files */}
        {status.untracked.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                backgroundColor: 'rgba(255,255,255,0.02)',
              }}
            >
              <span>UNTRACKED ({status.untracked.length})</span>
              <button
                onClick={() => gitStore.stageAll()}
                style={{ padding: 2, borderRadius: 3, color: 'var(--text-muted)' }}
                title="Stage All"
              >
                <Plus size={13} />
              </button>
            </div>

            {status.untracked.map((f) => (
              <div
                key={f}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
                onClick={() => gitStore.viewFileDiff(f)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span style={{ color: 'var(--color-info)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    gitStore.stageFile(f);
                  }}
                  style={{ padding: 2, color: 'var(--text-muted)' }}
                  title="Stage"
                >
                  <Plus size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
