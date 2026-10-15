import React from 'react';
import { Skeleton } from '../Common/SkeletonShimmer';
import { FileExplorerSkeleton } from '../../explorer/FileExplorerSkeleton';
import { EditorSkeleton } from '../../editor/EditorSkeleton';
import { Sparkles, Terminal } from 'lucide-react';

interface AppStartupShimmerProps {
  statusMessage?: string;
}

export const AppStartupShimmer: React.FC<AppStartupShimmerProps> = ({
  statusMessage = 'Initializing Binary IDE...',
}) => {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* ── 1. TitleBar Skeleton ───────────────────────────────────── */}
      <div
        style={{
          height: 38,
          backgroundColor: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          zIndex: 10,
        }}
      >
        {/* Left: App icon & menu placeholders */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                background: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>01</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>BINARY</span>
          </div>

          {/* Simulated menus */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.7 }}>
            {['File', 'Edit', 'Selection', 'View', 'Go', 'Terminal'].map((menu) => (
              <span
                key={menu}
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  padding: '2px 6px',
                  borderRadius: 3,
                }}
              >
                {menu}
              </span>
            ))}
          </div>
        </div>

        {/* Center: Command Palette / Search Bar placeholder */}
        <div
          style={{
            width: 380,
            height: 24,
            backgroundColor: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 10px',
            gap: 8,
          }}
        >
          <Skeleton width={140} height={10} borderRadius={3} style={{ opacity: 0.5 }} />
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>Ctrl+P</span>
        </div>

        {/* Right: Window Controls skeleton */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Skeleton width={12} height={12} borderRadius={2} style={{ opacity: 0.5 }} />
          <Skeleton width={12} height={12} borderRadius={2} style={{ opacity: 0.5 }} />
          <Skeleton width={12} height={12} borderRadius={2} style={{ opacity: 0.5 }} />
        </div>
      </div>

      {/* ── 2. Main Body ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Activity Bar */}
        <div
          style={{
            width: 48,
            height: '100%',
            backgroundColor: 'var(--bg-panel)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 10,
            gap: 16,
          }}
        >
          {/* Top Activity Icons */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              backgroundColor: 'var(--bg-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderLeft: '2px solid var(--accent-primary)',
            }}
          >
            <Skeleton width={18} height={18} borderRadius={3} />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.5,
              }}
            >
              <Skeleton width={18} height={18} borderRadius={3} />
            </div>
          ))}

          {/* Bottom Settings Icon */}
          <div style={{ marginTop: 'auto', marginBottom: 12, opacity: 0.6 }}>
            <Skeleton width={18} height={18} borderRadius={3} />
          </div>
        </div>

        {/* Sidebar: File Explorer Skeleton */}
        <div
          style={{
            width: 280,
            height: '100%',
            backgroundColor: 'var(--bg-panel)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <FileExplorerSkeleton />
        </div>

        {/* Center Content: Editor & Bottom Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Editor Area */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <EditorSkeleton />
          </div>

          {/* Bottom Panel Skeleton (Terminal / Problems) */}
          <div
            style={{
              height: 180,
              backgroundColor: 'var(--bg-panel)',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Panel Tab Strip */}
            <div
              style={{
                height: 30,
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '2px solid var(--accent-primary)', paddingBottom: 4 }}>
                <Terminal size={12} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>TERMINAL</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>PROBLEMS</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>OUTPUT</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>DEBUG CONSOLE</span>
            </div>

            {/* Simulated Terminal Prompt Lines */}
            <div
              style={{
                flex: 1,
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                backgroundColor: 'var(--bg-main)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.7 }}>
                <Skeleton width={18} height={10} borderRadius={2} />
                <Skeleton width={140} height={10} borderRadius={2} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.45 }}>
                <Skeleton width={220} height={10} borderRadius={2} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.3 }}>
                <Skeleton width={160} height={10} borderRadius={2} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. StatusBar Skeleton ─────────────────────────────────── */}
      <div
        style={{
          height: 24,
          backgroundColor: 'var(--accent-primary)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          fontSize: 11,
          fontWeight: 500,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#fff', opacity: 0.9 }} className="shimmer-pulse" />
            <span style={{ fontSize: 11, letterSpacing: 0.3 }}>{statusMessage}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0.9 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={12} />
            <span>AI Ready</span>
          </div>
          <span>UTF-8</span>
          <span>Spaces: 2</span>
        </div>
      </div>
    </div>
  );
};

export default AppStartupShimmer;
