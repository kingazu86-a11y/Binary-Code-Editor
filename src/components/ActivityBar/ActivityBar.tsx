import React, { useState, useEffect } from 'react';
import {
  Files,
  Search,
  GitBranch,
  PlayCircle,
  Puzzle,
  Bot,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react';
import { useLayout, layoutStore } from '../../state/layoutStore';
import { ActivityTab } from '../../types';
import { useGit } from '../../state/gitStore';
import { api } from '../../services/api';

export const ActivityBar: React.FC = () => {
  const { activeActivityTab, sidebarVisible, aiPanelVisible, isSettingsOpen } = useLayout();
  const { status } = useGit();
  const [contributedItems, setContributedItems] = useState<any[]>([]);

  useEffect(() => {
    api.getExtensionActivityBar().then((items) => {
      if (Array.isArray(items)) setContributedItems(items);
    });
    const unsub = api.onExtensionViewsUpdated((data) => {
      if (data?.activityBar && Array.isArray(data.activityBar)) {
        setContributedItems(data.activityBar);
      }
    });
    return () => unsub();
  }, []);

  const gitChangesCount = status.modified.length + status.staged.length + status.untracked.length;

  const primaryItems: Array<{ id: string; label: string; icon: React.ReactNode; badge?: number | string }> = [
    { id: 'explorer', label: 'Explorer (Ctrl+Shift+E)', icon: <Files size={20} /> },
    { id: 'search', label: 'Search (Ctrl+Shift+F)', icon: <Search size={20} /> },
    { id: 'git', label: 'Source Control (Ctrl+Shift+G)', icon: <GitBranch size={20} />, badge: gitChangesCount > 0 ? gitChangesCount : undefined },
    { id: 'debug', label: 'Run & Debug (Ctrl+Shift+D)', icon: <PlayCircle size={20} /> },
    { id: 'extensions', label: 'Extensions (Ctrl+Shift+X)', icon: <Puzzle size={20} /> },
    ...contributedItems.map((item) => {
      let iconNode: React.ReactNode = <Sparkles size={20} />;
      if (item.icon) {
        const iconStr = String(item.icon).trim();
        if (iconStr.startsWith('<svg')) {
          const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(iconStr)}`;
          iconNode = <img src={dataUri} alt={item.title} style={{ width: 20, height: 20, objectFit: 'contain' }} />;
        } else if (iconStr.startsWith('data:') || iconStr.startsWith('http://') || iconStr.startsWith('https://')) {
          iconNode = (
            <img
              src={iconStr}
              alt={item.title}
              style={{ width: 20, height: 20, objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          );
        }
      }
      return {
        id: item.id,
        label: item.title,
        icon: iconNode,
        badge: item.badge,
      };
    }),
  ];

  return (
    <div
      style={{
        width: 'var(--activity-bar-width)',
        backgroundColor: 'var(--bg-activity-bar)',
        borderRight: '1px solid var(--border-activity-bar)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        zIndex: 30,
        userSelect: 'none',
      }}
    >
      {/* Top action icons */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%' }}>
        {primaryItems.map((item) => {
          const isActive = sidebarVisible && activeActivityTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => layoutStore.setActiveActivityTab(item.id as ActivityTab)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 6,
                position: 'relative',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                backgroundColor: isActive ? 'var(--bg-active)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              title={item.label}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              {/* Left active line indicator */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: -5,
                    width: 3,
                    height: 20,
                    borderRadius: '0 2px 2px 0',
                    backgroundColor: 'var(--accent-primary)',
                  }}
                />
              )}
              {item.icon}

              {/* Badge for git changes */}
              {item.badge !== undefined && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    backgroundColor: 'var(--accent-primary)',
                    color: '#FFF',
                    fontSize: 9,
                    fontWeight: 700,
                    minWidth: 14,
                    height: 14,
                    borderRadius: 7,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom action icons: AI & Settings */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%' }}>
        {/* Dedicated Binary AI Toggle Button */}
        <button
          onClick={() => layoutStore.toggleAIPanel()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 6,
            color: aiPanelVisible ? 'var(--text-primary)' : 'var(--text-muted)',
            backgroundColor: aiPanelVisible ? 'var(--bg-active)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: 'all 0.15s ease',
          }}
          title="Binary AI Agent (Ctrl+Shift+A)"
          onMouseEnter={(e) => {
            if (!aiPanelVisible) e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          onMouseLeave={(e) => {
            if (!aiPanelVisible) e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          {aiPanelVisible && (
            <div
              style={{
                position: 'absolute',
                left: -5,
                width: 3,
                height: 20,
                borderRadius: '0 2px 2px 0',
                backgroundColor: 'var(--accent-primary)',
              }}
            />
          )}
          <Bot size={20} />
        </button>

        {/* Settings button */}
        <button
          onClick={() => layoutStore.toggleSettings()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 6,
            color: isSettingsOpen ? 'var(--accent-primary)' : 'var(--text-muted)',
            backgroundColor: isSettingsOpen ? 'var(--bg-active)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Settings (Ctrl+,)"
        >
          <SettingsIcon size={20} />
        </button>
      </div>
    </div>
  );
};
