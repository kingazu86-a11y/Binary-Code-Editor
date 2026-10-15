import React from 'react';
import { Skeleton } from '../components/Common/SkeletonShimmer';

export const FileExplorerSkeleton: React.FC = () => {
  // A realistic simulated tree pattern: root folders, subfolders, files
  const items = [
    { type: 'folder', level: 0, width: 95 },
    { type: 'file', level: 1, width: 120 },
    { type: 'file', level: 1, width: 85 },
    { type: 'folder', level: 1, width: 110 },
    { type: 'file', level: 2, width: 140 },
    { type: 'file', level: 2, width: 95 },
    { type: 'folder', level: 0, width: 80 },
    { type: 'file', level: 1, width: 130 },
    { type: 'file', level: 1, width: 105 },
    { type: 'file', level: 0, width: 115 },
    { type: 'file', level: 0, width: 75 },
    { type: 'file', level: 0, width: 140 },
    { type: 'file', level: 0, width: 90 },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '10px 8px',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Workspace Header Skeleton */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 6px 10px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Skeleton width={14} height={14} borderRadius={3} />
          <Skeleton width={110} height={12} borderRadius={3} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Skeleton width={14} height={14} borderRadius={3} />
          <Skeleton width={14} height={14} borderRadius={3} />
          <Skeleton width={14} height={14} borderRadius={3} />
        </div>
      </div>

      {/* Simulated File & Folder Rows */}
      {items.map((it, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 22,
            paddingLeft: `${it.level * 14 + 6}px`,
            gap: 7,
          }}
        >
          {/* Chevron placeholder for folders */}
          {it.type === 'folder' ? (
            <Skeleton width={8} height={8} borderRadius={2} />
          ) : (
            <span style={{ width: 8 }} />
          )}

          {/* Folder or File icon placeholder */}
          <Skeleton
            width={14}
            height={14}
            borderRadius={3}
            style={{
              opacity: it.type === 'folder' ? 0.9 : 0.65,
            }}
          />

          {/* Name bar placeholder with realistic varied width */}
          <Skeleton
            width={it.width}
            height={11}
            borderRadius={3}
            style={{
              opacity: it.type === 'folder' ? 0.9 : 0.75,
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default FileExplorerSkeleton;
