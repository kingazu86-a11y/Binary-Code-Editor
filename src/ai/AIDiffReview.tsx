import React from 'react';
import { Check, X, FileDiff, ArrowRight } from 'lucide-react';
import { aiStore } from '../state/aiStore';
import { editorStore } from '../state/editorStore';

interface AIDiffReviewProps {
  messageId: string;
  diffProposal: {
    filePath: string;
    originalContent: string;
    proposedContent: string;
    status: 'pending' | 'accepted' | 'rejected';
  };
}

export const AIDiffReview: React.FC<AIDiffReviewProps> = ({ messageId, diffProposal }) => {
  const fileName = diffProposal.filePath.replace(/\\/g, '/').split('/').pop() || diffProposal.filePath;
  const isPending = diffProposal.status === 'pending';

  return (
    <div
      style={{
        marginTop: 8,
        backgroundColor: 'var(--bg-card, #11151C)',
        border: '1px solid var(--border-color)',
        borderRadius: 6,
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, width: '100%', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <FileDiff size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={fileName}
          >
            Proposed Changes: {fileName}
          </span>
        </div>

        <span
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            fontWeight: 700,
            color:
              diffProposal.status === 'accepted'
                ? 'var(--color-success)'
                : diffProposal.status === 'rejected'
                ? 'var(--color-danger)'
                : 'var(--color-warning)',
          }}
        >
          {diffProposal.status}
        </span>
      </div>

      {/* Action buttons */}
      {isPending ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <button
            onClick={() => aiStore.acceptDiff(messageId)}
            style={{
              padding: '4px 10px',
              backgroundColor: 'var(--color-success)',
              color: '#FFF',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              gap: 4,
            }}
          >
            <Check size={12} />
            <span>Accept</span>
          </button>

          <button
            onClick={() => aiStore.rejectDiff(messageId)}
            style={{
              padding: '4px 10px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 500,
              gap: 4,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <X size={12} />
            <span>Reject</span>
          </button>

          <button
            onClick={() => {
              editorStore.openDiff(
                diffProposal.filePath,
                diffProposal.originalContent,
                diffProposal.proposedContent,
                `AI Diff: ${fileName}`
              );
            }}
            style={{
              padding: '4px 10px',
              backgroundColor: 'var(--bg-active)',
              color: 'var(--accent-primary)',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 500,
              marginLeft: 'auto',
              gap: 4,
            }}
          >
            <span>Review Diff</span>
            <ArrowRight size={11} />
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {diffProposal.status === 'accepted' ? 'Changes successfully applied to file.' : 'Proposal was rejected.'}
        </div>
      )}
    </div>
  );
};
