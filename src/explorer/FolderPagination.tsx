import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  Play,
  Pause,
  Layers,
  Sparkles,
} from 'lucide-react';

interface FolderPaginationProps {
  total: number;
  visibleCount: number;
  level: number;
  pageSize?: number;
  isStreaming: boolean;
  onLoadMore: (count?: number) => void;
  onLoadAll: () => void;
  onToggleStream: () => void;
  onCollapseToFirst?: () => void;
}

export const FolderPagination: React.FC<FolderPaginationProps> = ({
  total,
  visibleCount,
  level,
  pageSize = 50,
  isStreaming,
  onLoadMore,
  onLoadAll,
  onToggleStream,
  onCollapseToFirst,
}) => {
  const percent = Math.min(100, Math.round((visibleCount / total) * 100));
  const remaining = total - visibleCount;
  const nextBatch = Math.min(pageSize, remaining);
  const isFullyLoaded = visibleCount >= total;

  if (isFullyLoaded) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: `${(level + 1) * 14 + 10}px`,
          paddingRight: 12,
          paddingTop: 4,
          paddingBottom: 4,
          fontSize: 11,
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border-subtle)',
          marginTop: 2,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Layers size={11} style={{ color: 'var(--accent-primary)', opacity: 0.7 }} />
          <span>All {total.toLocaleString()} items loaded</span>
        </span>

        {onCollapseToFirst && (
          <button
            type="button"
            onClick={onCollapseToFirst}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              fontSize: 10,
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-hover)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 3,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.borderColor = 'var(--border-focus)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
            title={`Compact list back to first ${pageSize} items`}
          >
            <ChevronUp size={11} />
            <span>Compact to {pageSize}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        paddingLeft: `${(level + 1) * 14 + 10}px`,
        paddingRight: 10,
        paddingTop: 6,
        paddingBottom: 8,
        margin: '3px 0',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Top Status & Progress Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
          <Layers size={12} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <span>
            Showing <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{visibleCount}</strong> of{' '}
            <strong>{total.toLocaleString()}</strong> ({percent}%)
          </span>
          {isStreaming && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '1px 5px',
                borderRadius: 8,
                fontSize: 9,
                fontWeight: 600,
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: 'var(--accent-primary)',
                animation: 'pulse 1.5s infinite',
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-primary)',
                  boxShadow: '0 0 4px var(--accent-primary)',
                }}
              />
              STREAMING
            </span>
          )}
        </div>

        {/* Small Progress Bar */}
        <div
          style={{
            width: 70,
            height: 4,
            backgroundColor: 'var(--border-subtle)',
            borderRadius: 2,
            overflow: 'hidden',
            flexShrink: 0,
          }}
          title={`${percent}% loaded`}
        >
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              backgroundColor: 'var(--accent-primary)',
              borderRadius: 2,
              transition: 'width 0.2s ease',
              boxShadow: isStreaming ? '0 0 6px var(--accent-primary)' : 'none',
            }}
          />
        </div>
      </div>

      {/* Action Buttons Row */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        {/* Load Next Chunk Button */}
        <button
          type="button"
          onClick={() => onLoadMore(nextBatch)}
          disabled={isStreaming}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-primary)',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 4,
            cursor: isStreaming ? 'not-allowed' : 'pointer',
            opacity: isStreaming ? 0.6 : 1,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!isStreaming) {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-card)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
          title={`Load the next ${nextBatch} items`}
        >
          <ChevronDown size={12} />
          <span>+{nextBatch} More</span>
        </button>

        {/* Sequence Stream / Pause Button */}
        <button
          type="button"
          onClick={onToggleStream}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            fontSize: 11,
            fontWeight: 500,
            color: isStreaming ? '#FFF' : 'var(--accent-primary)',
            backgroundColor: isStreaming ? 'var(--accent-primary)' : 'rgba(59, 130, 246, 0.1)',
            border: isStreaming ? '1px solid var(--accent-primary)' : '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 4,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!isStreaming) {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isStreaming) {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            }
          }}
          title={isStreaming ? 'Pause progressive sequential loading' : 'Stream items in smooth non-blocking sequence'}
        >
          {isStreaming ? <Pause size={11} /> : <Play size={11} />}
          <span>{isStreaming ? 'Pause' : 'Sequence'}</span>
        </button>

        {/* Load All Button */}
        <button
          type="button"
          onClick={onLoadAll}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            fontSize: 11,
            color: 'var(--text-secondary)',
            backgroundColor: 'transparent',
            border: '1px solid var(--border-subtle)',
            borderRadius: 4,
            cursor: 'pointer',
            marginLeft: 'auto',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
          }}
          title={`Load all remaining ${remaining.toLocaleString()} items at once`}
        >
          <ChevronsDown size={12} />
          <span>All ({remaining.toLocaleString()})</span>
        </button>
      </div>
    </div>
  );
};
