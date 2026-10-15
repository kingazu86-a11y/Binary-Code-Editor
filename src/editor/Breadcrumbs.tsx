import React from 'react';
import { ChevronRight, FileCode } from 'lucide-react';

interface BreadcrumbsProps {
  filePath: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ filePath }) => {
  if (!filePath) return null;

  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);

  return (
    <div
      style={{
        height: 24,
        backgroundColor: '#0D0F12',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        fontSize: 11,
        color: 'var(--text-muted)',
        gap: 4,
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      <FileCode size={12} style={{ color: 'var(--accent-primary)', marginRight: 2 }} />
      {parts.map((part, index) => {
        const isLast = index === parts.length - 1;
        return (
          <React.Fragment key={index}>
            <span
              style={{
                color: isLast ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: isLast ? 500 : 400,
              }}
            >
              {part}
            </span>
            {!isLast && <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
};
