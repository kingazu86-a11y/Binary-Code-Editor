import React, { useState, useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../services/api';

export const OutputPanel: React.FC = () => {
  const [channel, setChannel] = useState('Extension Host');
  const [logs, setLogs] = useState<Record<string, string[]>>({
    'Extension Host': [
      '[ExtensionHostEngine] Extension Host initialized.',
      '[ExtensionHostEngine] Monitoring active runtime channels.',
    ],
    Binary: [
      '[Binary Core] System initialized successfully.',
      '[Binary Core] Workspace listener active.',
      '[Binary Core] File watchers registered.',
    ],
    Build: ['[Build] Ready for compilation tasks.'],
    Tasks: ['[Tasks] No active background tasks.'],
    Extensions: ['[Extensions] Ready.'],
    'AI Agent': ['[AI Agent] Ready. Local tools initialized.'],
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = api.onExtensionOutput((data) => {
      setLogs((prev) => {
        const targetChannel = data.channel || 'Extension Host';
        const currentLines = prev[targetChannel] || [];
        const newLines = [...currentLines, data.text.trimEnd()];
        if (newLines.length > 1500) newLines.shift();
        return {
          ...prev,
          [targetChannel]: newLines,
        };
      });
    });

    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, channel]);

  const clearChannel = () => {
    setLogs({
      ...logs,
      [channel]: [],
    });
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-panel)',
      }}
    >
      {/* Header with channel selector */}
      <div
        style={{
          height: 28,
          backgroundColor: 'var(--bg-tab-bar)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Channel:</span>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            style={{
              height: 20,
              padding: '0 4px',
              fontSize: 11,
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 3,
            }}
          >
            {Object.keys(logs).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={clearChannel}
          style={{ padding: 2, borderRadius: 3, color: 'var(--text-muted)' }}
          title="Clear Output"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Output Log lines */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        {(logs[channel] || []).map((line, idx) => (
          <div key={idx}>{line}</div>
        ))}
      </div>
    </div>
  );
};
