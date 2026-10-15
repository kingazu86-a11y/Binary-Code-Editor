import React from 'react';
import { Skeleton } from '../components/Common/SkeletonShimmer';

export const EditorSkeleton: React.FC = () => {
  // Realistic staggered code line patterns: indent levels, token segments
  const codeLines = [
    { indent: 0, tokens: [55, 120, 90] },
    { indent: 0, tokens: [45, 80, 160] },
    { indent: 0, tokens: [0] },
    { indent: 0, tokens: [70, 140, 60] },
    { indent: 1, tokens: [90, 110] },
    { indent: 1, tokens: [130, 75, 100] },
    { indent: 2, tokens: [80, 160] },
    { indent: 2, tokens: [110, 90, 70] },
    { indent: 2, tokens: [65, 135] },
    { indent: 1, tokens: [30] },
    { indent: 1, tokens: [0] },
    { indent: 1, tokens: [85, 140, 95] },
    { indent: 2, tokens: [120, 80] },
    { indent: 2, tokens: [95, 150, 60] },
    { indent: 3, tokens: [140, 110] },
    { indent: 3, tokens: [75, 90] },
    { indent: 2, tokens: [40] },
    { indent: 1, tokens: [30] },
    { indent: 0, tokens: [25] },
    { indent: 0, tokens: [0] },
    { indent: 0, tokens: [80, 110] },
    { indent: 1, tokens: [100, 120, 85] },
  ];

  return (
    <div
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-main)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Editor Tab Strip Skeleton — plain long strips instead of tab shapes */}
      <div
        style={{
          height: 35,
          backgroundColor: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          gap: 10,
        }}
      >
        <Skeleton width={110} height={11} borderRadius={3} style={{ opacity: 0.85 }} />
        <Skeleton width={80} height={11} borderRadius={3} style={{ opacity: 0.55 }} />
        <Skeleton width={95} height={11} borderRadius={3} style={{ opacity: 0.38 }} />
        <Skeleton width={65} height={11} borderRadius={3} style={{ opacity: 0.25 }} />
      </div>

      {/* Breadcrumbs Skeleton */}
      <div
        style={{
          height: 22,
          backgroundColor: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 6,
          opacity: 0.7,
        }}
      >
        <Skeleton width={40} height={8} borderRadius={2} />
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>›</span>
        <Skeleton width={30} height={8} borderRadius={2} />
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>›</span>
        <Skeleton width={60} height={8} borderRadius={2} />
      </div>

      {/* Editor Body with Line Numbers & Code Blocks */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          padding: '12px 0',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Line Numbers column */}
        <div
          style={{
            width: 46,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            paddingRight: 14,
            gap: 6,
            borderRight: '1px solid var(--border-subtle)',
            userSelect: 'none',
            opacity: 0.35,
          }}
        >
          {codeLines.map((_, i) => (
            <div
              key={i}
              style={{
                height: 18,
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                lineHeight: '18px',
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code token lines */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            paddingLeft: 16,
            gap: 6,
          }}
        >
          {codeLines.map((line, idx) => (
            <div
              key={idx}
              style={{
                height: 18,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: `${line.indent * 20}px`,
                gap: 8,
              }}
            >
              {line.tokens.map((tokenWidth, tIdx) =>
                tokenWidth > 0 ? (
                  <Skeleton
                    key={tIdx}
                    width={tokenWidth}
                    height={10}
                    borderRadius={2}
                    style={{
                      opacity: tIdx === 0 ? 0.85 : tIdx === 1 ? 0.65 : 0.45,
                    }}
                  />
                ) : null
              )}
            </div>
          ))}
        </div>

        {/* Minimap Skeleton on Right */}
        <div
          style={{
            width: 70,
            borderLeft: '1px solid var(--border-subtle)',
            padding: '10px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            opacity: 0.25,
          }}
        >
          {codeLines.slice(0, 18).map((l, i) => (
            <div
              key={i}
              style={{
                height: 3,
                width: l.tokens[0] ? Math.min(50, l.tokens[0] * 0.3) : 10,
                backgroundColor: 'var(--text-secondary)',
                borderRadius: 1,
                marginLeft: l.indent * 4,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default EditorSkeleton;
