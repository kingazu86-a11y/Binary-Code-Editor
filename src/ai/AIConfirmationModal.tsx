import React, { useEffect } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { useAI, aiStore } from '../state/aiStore';

export const AIConfirmationModal: React.FC = () => {
  const { pendingApproval } = useAI();

  useEffect(() => {
    if (!pendingApproval) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        aiStore.denyPendingTool();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingApproval]);

  if (!pendingApproval) return null;

  const { toolName, params } = pendingApproval;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={() => aiStore.denyPendingTool()}
    >
      <div
        style={{
          width: 'min(520px, calc(100vw - 32px))',
          maxHeight: 'min(600px, calc(100vh - 48px))',
          backgroundColor: 'var(--bg-modal, #12151B)',
          border: '1px solid var(--border-menu, #252B35)',
          borderRadius: 12,
          boxShadow: '0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-in"
      >
        <div style={{ height: 3, backgroundColor: 'var(--color-warning, #F59E0B)' }} />

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-warning, #F59E0B)',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #E6EAF0)', margin: 0 }}>
                Action Confirmation Required
              </h3>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted, #8B929E)', margin: '3px 0 0 0' }}>
                Binary AI requested to execute a potentially sensitive operation.
              </p>
            </div>
          </div>

          {/* Operation Details */}
          <div
            style={{
              padding: 12,
              backgroundColor: '#090C10',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              borderRadius: 8,
              fontSize: 12,
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            <div style={{ color: 'var(--accent-primary, #3B82F6)', marginBottom: 6, fontWeight: 600 }}>
              Tool: {toolName}
            </div>
            <div
              style={{
                color: 'var(--text-secondary, #8B929E)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                maxHeight: 200,
                overflowY: 'auto',
                lineHeight: 1.45,
              }}
            >
              {JSON.stringify(params, null, 2)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <button
            onClick={() => aiStore.denyPendingTool()}
            style={{
              padding: '6px 14px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
              color: 'var(--text-secondary, #8B929E)',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Deny (Esc)
          </button>
          <button
            onClick={() => aiStore.approvePendingTool()}
            style={{
              padding: '6px 16px',
              backgroundColor: 'var(--color-danger, #EF4444)',
              color: '#FFF',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <Check size={14} />
            <span>Allow Execution</span>
          </button>
        </div>
      </div>
    </div>
  );
};
