import React, { useState } from 'react';
import {
  X,
  Pin,
  Circle,
  SplitSquareHorizontal,
  SplitSquareVertical,
  MoreHorizontal,
  FileCode,
  ArrowLeftRight,
  Maximize2,
  Puzzle,
  Loader2,
  Image as ImageIcon,
  Play,
  Bug,
  Hammer,
} from 'lucide-react';
import { EditorTabItem } from '../types';
import { useEditor, editorStore } from '../state/editorStore';
import { workspaceStore } from '../state/workspaceStore';
import { useCppStore, cppStore } from '../state/cppStore';

interface EditorTabsProps {
  groupId: string;
  tabs: EditorTabItem[];
  activeTabId: string | null;
}

export const EditorTabs: React.FC<EditorTabsProps> = ({ groupId, tabs, activeTabId }) => {
  const { groups, splitDirection } = useEditor();
  const { isBuilding, debuggerState } = useCppStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isCppFile = activeTab && (
    activeTab.language === 'cpp' ||
    activeTab.language === 'c' ||
    /\.(cpp|cc|cxx|c|hpp|h)$/i.test(activeTab.fileName || '')
  );

  const handleTabClick = (tabId: string) => {
    editorStore.setActiveTab(tabId, groupId);
    const clickedTab = tabs.find((t) => t.id === tabId);
    if (clickedTab?.filePath && !clickedTab.isExtensionDetail && !clickedTab.filePath.startsWith('extension:')) {
      workspaceStore.setSelectedPath(clickedTab.filePath);
    }
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    editorStore.closeTab(tabId, groupId);
    setTimeout(() => {
      const activeGroup = editorStore.getState().groups.find((g) => g.id === groupId);
      const activeTab = activeGroup?.tabs.find((t) => t.id === activeGroup.activeTabId);
      if (activeTab?.filePath && !activeTab.isExtensionDetail && !activeTab.filePath.startsWith('extension:')) {
        workspaceStore.setSelectedPath(activeTab.filePath);
      }
    }, 0);
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  };

  return (
    <div
      style={{
        height: 35,
        backgroundColor: 'var(--bg-tab-bar)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Tab List */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          overflowX: 'auto',
          flex: 1,
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '0 12px',
                backgroundColor: isActive ? 'var(--bg-tab-active)' : 'transparent',
                borderRight: '1px solid var(--border-subtle)',
                borderTop: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 12,
                cursor: 'pointer',
                position: 'relative',
                minWidth: 100,
                maxWidth: 200,
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {tab.isLoading ? (
                <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
              ) : tab.viewMode === 'image' ? (
                <ImageIcon size={13} style={{ color: '#38BDF8', flexShrink: 0 }} />
              ) : tab.viewMode === 'svg' ? (
                <SplitSquareVertical size={13} style={{ color: '#FB923C', flexShrink: 0 }} />
              ) : tab.isExtensionDetail ? (
                <Puzzle size={13} style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
              ) : tab.isDiff ? (
                <ArrowLeftRight size={13} style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
              ) : (
                <FileCode size={13} style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
              )}

              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  fontStyle: tab.isDiff ? 'italic' : 'normal',
                }}
              >
                {tab.fileName}
              </span>

              {/* Dirty indicator or Close button */}
              {tab.isDirty ? (
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  style={{
                    padding: 2,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Unsaved changes (Click to close)"
                >
                  <Circle size={8} style={{ fill: 'var(--accent-primary)', color: 'var(--accent-primary)' }} />
                </button>
              ) : (
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  style={{
                    padding: 2,
                    borderRadius: 3,
                    color: 'var(--text-muted)',
                    opacity: isActive ? 1 : 0.6,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                  title="Close (Ctrl+W)"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Right Controls: C++ Actions & Split editors */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px' }}>
        {isCppFile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 6, paddingRight: 6, borderRight: '1px solid var(--border-subtle)' }}>
            {/* Build C++ File */}
            <button
              onClick={() => cppStore.compileActiveFile(workspaceStore.getState().workspacePath || undefined)}
              disabled={isBuilding}
              style={{
                padding: '3px 6px',
                borderRadius: 3,
                color: isBuilding ? 'var(--accent-primary)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              title="Build / Compile C++ with Bundled G++ (Ctrl+Shift+B)"
            >
              {isBuilding ? <Loader2 size={13} className="animate-spin" /> : <Hammer size={13} />}
              <span style={{ fontSize: 11 }}>Build</span>
            </button>

            {/* Run C++ Executable */}
            <button
              onClick={() => cppStore.runActiveFile(workspaceStore.getState().workspacePath || undefined)}
              disabled={isBuilding}
              style={{
                padding: '3px 6px',
                borderRadius: 3,
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)')}
              title="Compile & Run in Terminal (Ctrl+F5)"
            >
              <Play size={11} fill="currentColor" />
              <span style={{ fontSize: 11 }}>Run</span>
            </button>

            {/* Debug C++ with GDB */}
            <button
              onClick={() => cppStore.startDebuggingActiveFile(workspaceStore.getState().workspacePath || undefined)}
              disabled={isBuilding || debuggerState === 'running'}
              style={{
                padding: '3px 6px',
                borderRadius: 3,
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)')}
              title="Debug with Bundled GDB (F5)"
            >
              <Bug size={12} />
              <span style={{ fontSize: 11 }}>Debug</span>
            </button>
          </div>
        )}

        <button
          onClick={() => editorStore.splitEditor('horizontal')}
          style={{ padding: 4, borderRadius: 3, color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          title="Split Editor Right (Ctrl+\)"
        >
          <SplitSquareHorizontal size={14} />
        </button>

        <button
          onClick={() => editorStore.splitEditor('vertical')}
          style={{ padding: 4, borderRadius: 3, color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          title="Split Editor Down"
        >
          <SplitSquareVertical size={14} />
        </button>

        {groups.length > 1 && (
          <>
            {/* Toggle Split Orientation */}
            <button
              onClick={() => editorStore.toggleSplitDirection()}
              style={{ padding: 4, borderRadius: 3, color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              title={`Switch to ${splitDirection === 'horizontal' ? 'Vertical (Rows)' : 'Horizontal (Columns)'} Split`}
            >
              <ArrowLeftRight size={13} />
            </button>

            {/* Turn Off Split / Revert to Single Editor */}
            <button
              onClick={() => editorStore.resetToSingle()}
              style={{ padding: 4, borderRadius: 3, color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              title="Turn Off Split / Single Editor"
            >
              <Maximize2 size={13} />
            </button>

            {/* Close This Split Pane */}
            <button
              onClick={() => editorStore.closeSplitGroup(groupId)}
              style={{
                padding: 4,
                borderRadius: 3,
                color: 'var(--text-muted)',
                marginLeft: 2,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-danger)';
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Close Split Pane"
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>

      {/* Tab Context Menu */}
      {contextMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setContextMenu(null)}
          />
          <div
            className="context-menu animate-fade-in"
            style={{
              position: 'fixed',
              left: contextMenu.x,
              top: contextMenu.y,
              backgroundColor: 'var(--bg-menu)',
              border: '1px solid var(--border-menu)',
              borderRadius: 6,
              boxShadow: 'var(--shadow-menu)',
              zIndex: 1000,
              minWidth: 160,
              width: 'max-content',
              padding: '4px 0',
              whiteSpace: 'nowrap',
            }}
          >
            <button
              onClick={() => {
                editorStore.closeTab(contextMenu.tabId, groupId);
                setContextMenu(null);
              }}
              style={{ width: '100%', padding: '6px 14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'left', fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Close
            </button>
            <button
              onClick={() => {
                editorStore.closeOtherTabs(contextMenu.tabId, groupId);
                setContextMenu(null);
              }}
              style={{ width: '100%', padding: '6px 14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'left', fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Close Others
            </button>
            <button
              onClick={() => {
                editorStore.closeAllTabs(groupId);
                setContextMenu(null);
              }}
              style={{ width: '100%', padding: '6px 14px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'left', fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Close All
            </button>
          </div>
        </>
      )}
    </div>
  );
};
