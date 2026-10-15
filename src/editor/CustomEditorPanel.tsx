import React from 'react';
import { Film, FileCode, Play, Volume2, Info, Eye } from 'lucide-react';

interface Props {
  tabId: string;
  filePath: string;
  fileName: string;
  viewType: string;
  displayName: string;
}

export const CustomEditorPanel: React.FC<Props> = ({
  filePath,
  fileName,
  viewType,
  displayName,
}) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
  const isAudio = ['mp3', 'wav', 'flac', 'aac', 'm4a'].includes(ext);

  // Normalize file path to valid file URL
  const fileUrl = filePath.startsWith('file://')
    ? filePath
    : `file://${filePath.replace(/\\/g, '/')}`;

  return (
    <div
      style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0A0C10',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Viewer Header */}
      <div
        style={{
          height: 34,
          backgroundColor: 'var(--bg-tab-bar)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          fontSize: 11,
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isVideo ? (
            <Film size={13} style={{ color: 'var(--accent-primary)' }} />
          ) : (
            <Eye size={13} style={{ color: 'var(--accent-primary)' }} />
          )}
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fileName}</span>
          <span style={{ color: 'var(--text-muted)' }}>— {displayName || viewType}</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Custom Extension Viewer</div>
      </div>

      {/* Viewer Body */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          overflow: 'auto',
        }}
      >
        {isVideo ? (
          <div
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              backgroundColor: '#000',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
              border: '1px solid var(--border-color)',
            }}
          >
            <video
              src={fileUrl}
              controls
              autoPlay={false}
              style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block' }}
            />
          </div>
        ) : isAudio ? (
          <div
            style={{
              padding: 32,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              minWidth: 320,
            }}
          >
            <Volume2 size={40} style={{ color: 'var(--accent-primary)' }} />
            <div style={{ fontSize: 14, fontWeight: 500 }}>{fileName}</div>
            <audio src={fileUrl} controls style={{ width: '100%' }} />
          </div>
        ) : (
          <div
            style={{
              padding: 32,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              textAlign: 'center',
              maxWidth: 420,
            }}
          >
            <FileCode size={36} style={{ margin: '0 auto 12px', color: 'var(--accent-primary)' }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{fileName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Rendered via custom extension viewer: <code>{viewType}</code>
            </div>
            <div
              style={{
                fontSize: 11,
                padding: '8px 12px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: 4,
                color: 'var(--text-muted)',
                wordBreak: 'break-all',
              }}
            >
              Path: {filePath}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
