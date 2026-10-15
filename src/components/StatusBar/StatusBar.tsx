import React, { useState, useEffect } from 'react';
import { GitBranch, AlertCircle, AlertTriangle, Bot, Radio, Globe, Zap, Loader2 } from 'lucide-react';
import { useGit } from '../../state/gitStore';
import { useWorkspace } from '../../state/workspaceStore';
import { editorStore } from '../../state/editorStore';
import { layoutStore } from '../../state/layoutStore';
import { useAI } from '../../state/aiStore';
import { useDiagnostics } from '../../state/diagnosticsStore';
import { api } from '../../services/api';

export const StatusBar: React.FC = () => {
  const { status } = useGit();
  const { isLoading } = useWorkspace();
  const { isGenerating } = useAI();
  const { errorCount, warningCount } = useDiagnostics();
  const activeTab = editorStore.getActiveTab();

  const [extensionItems, setExtensionItems] = useState<any[]>([]);

  useEffect(() => {
    api.getExtensionStatusBarItems().then((items) => {
      if (Array.isArray(items)) setExtensionItems(items);
    });

    const unsub = api.onExtensionStatusBarUpdated((items) => {
      if (Array.isArray(items)) setExtensionItems(items);
    });

    return () => {
      unsub();
    };
  }, []);

  const handleExtensionItemClick = async (item: any) => {
    if (item.command) {
      try {
        await api.executeExtensionCommand(item.command);
      } catch (err) {
        console.error('Error executing status bar command:', err);
      }
    }
  };

  const renderIconForText = (text: string) => {
    if (text.includes('$(broadcast)') || text.includes('Go Live')) {
      return <Radio size={11} style={{ color: '#38BDF8' }} />;
    }
    if (text.includes('$(radio-tower)') || text.includes('Port :')) {
      return <Globe size={11} style={{ color: '#34D399' }} />;
    }
    if (text.includes('$(zap)')) {
      return <Zap size={11} style={{ color: '#FCD34D' }} />;
    }
    return null;
  };

  const cleanLabel = (text: string) => {
    return text.replace(/\$\([^)]+\)/g, '').trim();
  };

  const leftExtItems = extensionItems.filter((i) => i.alignment !== 2);
  const rightExtItems = extensionItems.filter((i) => i.alignment === 2);

  return (
    <div
      style={{
        height: 'var(--statusbar-height)',
        backgroundColor: 'var(--bg-statusbar)',
        borderTop: '1px solid var(--border-statusbar)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        fontSize: 11,
        color: 'var(--text-statusbar)',
        zIndex: 40,
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {isLoading && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              color: 'var(--text-statusbar)',
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            <Loader2 size={11} className="animate-spin" />
            <span>Loading...</span>
          </span>
        )}

        {status.isRepo && (
          <button
            onClick={() => layoutStore.setActiveActivityTab('git')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              borderRadius: 3,
              color: 'var(--text-statusbar)',
              fontSize: 11,
              border: 'none',
              background: 'transparent',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-statusbar-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            title={`Git branch: ${status.branch}`}
          >
            <GitBranch size={12} style={{ color: 'var(--text-statusbar)' }} />
            <span>{status.branch || 'main'}</span>
          </button>
        )}

        <button
          onClick={() => layoutStore.setBottomPanelTab('problems')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '2px 6px',
            borderRadius: 3,
            color: 'var(--text-statusbar)',
            fontSize: 11,
            border: 'none',
            background: 'transparent',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-statusbar-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="Problems Panel"
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <AlertCircle size={11} style={{ color: errorCount > 0 ? 'var(--color-danger)' : 'var(--text-statusbar-muted)' }} />
            <span>{errorCount}</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <AlertTriangle size={11} style={{ color: warningCount > 0 ? 'var(--color-warning)' : 'var(--text-statusbar-muted)' }} />
            <span>{warningCount}</span>
          </span>
        </button>

        <button
          onClick={() => layoutStore.toggleAIPanel()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '2px 6px',
            borderRadius: 3,
            color: isGenerating ? 'var(--text-statusbar)' : 'var(--text-statusbar-muted)',
            fontSize: 11,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
          title="Binary AI status"
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-statusbar-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Bot size={12} />
          <span>{isGenerating ? 'Thinking...' : 'AI'}</span>
        </button>

        {leftExtItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleExtensionItemClick(item)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '2px 8px',
              borderRadius: 3,
              backgroundColor: item.text.includes('Port :') ? 'rgba(52, 211, 153, 0.15)' : 'rgba(59, 130, 246, 0.12)',
              color: item.color || (item.text.includes('Port :') ? '#34D399' : '#93C5FD'),
              fontSize: 11,
              fontWeight: 500,
              cursor: item.command ? 'pointer' : 'default',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
            title={item.tooltip || item.text}
          >
            {renderIconForText(item.text)}
            <span>{cleanLabel(item.text) || item.text}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {rightExtItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleExtensionItemClick(item)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              borderRadius: 3,
              color: item.color || 'var(--text-statusbar)',
              fontSize: 11,
              cursor: item.command ? 'pointer' : 'default',
              border: 'none',
              background: 'transparent',
            }}
            title={item.tooltip || item.text}
          >
            {renderIconForText(item.text)}
            <span>{cleanLabel(item.text) || item.text}</span>
          </button>
        ))}

        {activeTab && (
          <>
            {(activeTab.language === 'cpp' || activeTab.language === 'c') && (
              <button
                onClick={() => layoutStore.openSettings('cpp-toolchain')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '1px 6px',
                  borderRadius: 3,
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  color: '#60A5FA',
                  fontSize: 10,
                  fontWeight: 600,
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  cursor: 'pointer',
                }}
                title="Bundled C++ Toolchain (GCC 16.2.0, GDB 17.2, CMake 4.4.3, Clangd 18.1.3)"
              >
                <span>GCC 16.2 · CMake · Clangd</span>
              </button>
            )}
            <span>Ln 1, Col 1</span>
            <span>Spaces: 2</span>
            <span>UTF-8</span>
            <span>LF</span>
            <span
              style={{
                color: 'var(--text-statusbar)',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {activeTab.language}
            </span>
          </>
        )}

        {!activeTab && <span>Ready</span>}
      </div>
    </div>
  );
};
