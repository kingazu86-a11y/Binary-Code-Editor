import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { editorStore } from '../state/editorStore';
import { useDiagnostics, DiagnosticItem } from '../state/diagnosticsStore';

export const ProblemsPanel: React.FC = () => {
  const { problems } = useDiagnostics();

  if (problems.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 12,
          gap: 6,
          padding: 16,
          userSelect: 'none',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 2,
          }}
        >
          <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
        </div>
        <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: 12 }}>
          No problems have been detected in the workspace.
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Workspace diagnostics and compiler markers will appear here.
        </span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
      {problems.map((p: DiagnosticItem) => (
        <div
          key={p.id}
          onClick={() => editorStore.openFile(p.filePath)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 8px',
            fontSize: 12,
            cursor: 'pointer',
            borderRadius: 4,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {p.severity === 'error' ? (
            <AlertCircle size={14} style={{ color: 'var(--color-danger)' }} />
          ) : (
            <AlertTriangle size={14} style={{ color: 'var(--color-warning)' }} />
          )}
          <span style={{ color: 'var(--text-primary)' }}>{p.message}</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {p.fileName} [{p.line}, {p.column}]
          </span>
        </div>
      ))}
    </div>
  );
};
