import React, { useEffect, useState, lazy, Suspense } from 'react';
import { TitleBar } from '../components/TitleBar/TitleBar';
import { ActivityBar } from '../components/ActivityBar/ActivityBar';
import { StatusBar } from '../components/StatusBar/StatusBar';
import { ExtensionDialogs } from '../components/Common/ExtensionDialogs';
import { FileExplorer } from '../explorer/FileExplorer';
import { EditorArea } from '../editor/EditorArea';
import { useLayout, layoutStore } from '../state/layoutStore';
import { useWorkspace } from '../state/workspaceStore';
import { useEditor } from '../state/editorStore';
import { useSettings } from '../state/settingsStore';
import { useGlobalKeyboardShortcuts } from '../state/keyboardShortcutsStore';
import { BottomTab } from '../types';
import { X, Loader2 } from 'lucide-react';

// ── Lazy-loaded feature panels (loaded on-demand to eliminate initial startup lag) ──
const GlobalSearch = lazy(() => import('../search/GlobalSearch').then((m) => ({ default: m.GlobalSearch })));
const SourceControl = lazy(() => import('../source-control/SourceControl').then((m) => ({ default: m.SourceControl })));
const DebugPanel = lazy(() => import('../debugger/DebugPanel').then((m) => ({ default: m.DebugPanel })));
const ExtensionManager = lazy(() => import('../extensions/ExtensionManager').then((m) => ({ default: m.ExtensionManager })));
const ExtensionViewContainer = lazy(() => import('../extensions/ExtensionViewContainer').then((m) => ({ default: m.ExtensionViewContainer })));
const SettingsScreen = lazy(() => import('../settings/SettingsScreen').then((m) => ({ default: m.SettingsScreen })));
const WelcomeScreen = lazy(() => import('../components/WelcomeScreen/WelcomeScreen').then((m) => ({ default: m.WelcomeScreen })));
const TerminalPanel = lazy(() => import('../terminal/TerminalPanel').then((m) => ({ default: m.TerminalPanel })));
const ProblemsPanel = lazy(() => import('../problems/ProblemsPanel').then((m) => ({ default: m.ProblemsPanel })));
const OutputPanel = lazy(() => import('../output/OutputPanel').then((m) => ({ default: m.OutputPanel })));
const AIAgentPanel = lazy(() => import('../ai/AIAgentPanel').then((m) => ({ default: m.AIAgentPanel })));
const CommandPalette = lazy(() => import('../components/CommandPalette/CommandPalette').then((m) => ({ default: m.CommandPalette })));
const QuickOpen = lazy(() => import('../components/QuickOpen/QuickOpen').then((m) => ({ default: m.QuickOpen })));

const PanelLoadingFallback: React.FC<{ message?: string }> = ({ message }) => (
  <div
    style={{
      flex: 1,
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-muted)',
      gap: 8,
      fontSize: 11,
      backgroundColor: 'transparent',
    }}
  >
    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
    {message && <span>{message}</span>}
  </div>
);

export const MainLayout: React.FC = () => {
  const layout = useLayout();
  const { workspacePath } = useWorkspace();
  const { groups } = useEditor();
  const settings = useSettings();

  // Mount centralized global keyboard shortcuts dispatcher
  useGlobalKeyboardShortcuts();

  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);
  const [isResizingAI, setIsResizingAI] = useState(false);

  // Drag handlers for panels
  const startSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    const onMove = (moveEvent: MouseEvent) => {
      layoutStore.setSidebarWidth(moveEvent.clientX - 48); // 48 is activity bar width
    };
    const onUp = () => {
      setIsResizingSidebar(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startBottomResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingBottom(true);
    const onMove = (moveEvent: MouseEvent) => {
      layoutStore.setBottomPanelHeight(window.innerHeight - moveEvent.clientY - 24); // 24 status bar
    };
    const onUp = () => {
      setIsResizingBottom(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startAIResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingAI(true);
    const onMove = (moveEvent: MouseEvent) => {
      layoutStore.setAIPanelWidth(window.innerWidth - moveEvent.clientX);
    };
    const onUp = () => {
      setIsResizingAI(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Render active sidebar content
  const renderSidebarContent = () => {
    switch (layout.activeActivityTab) {
      case 'explorer':
        return <FileExplorer />;
      case 'search':
        return (
          <Suspense fallback={<PanelLoadingFallback message="Loading Search..." />}>
            <GlobalSearch />
          </Suspense>
        );
      case 'git':
        return (
          <Suspense fallback={<PanelLoadingFallback message="Loading Source Control..." />}>
            <SourceControl />
          </Suspense>
        );
      case 'debug':
        return (
          <Suspense fallback={<PanelLoadingFallback message="Loading Debugger..." />}>
            <DebugPanel />
          </Suspense>
        );
      case 'extensions':
        return (
          <Suspense fallback={<PanelLoadingFallback message="Loading Extensions..." />}>
            <ExtensionManager />
          </Suspense>
        );
      case 'settings':
        return <FileExplorer />;
      default:
        return (
          <Suspense fallback={<PanelLoadingFallback />}>
            <ExtensionViewContainer containerId={layout.activeActivityTab} />
          </Suspense>
        );
    }
  };

  const hasOpenTabs = groups.some((g) => g.tabs.length > 0);

  return (
    <div className="binary-layout">
      {/* Title Bar */}
      <TitleBar />

      {/* Main Center Body */}
      <div className="binary-main-body">
        {/* Left Activity Bar */}
        {!layout.isZenMode && settings.appearance?.showActivityBar !== false && <ActivityBar />}

        {/* Sidebar */}
        {!layout.isZenMode && layout.sidebarVisible && (
          <div
            style={{
              width: layout.sidebarWidth,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--bg-panel)',
              borderRight: '1px solid var(--border-color)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {renderSidebarContent()}
          </div>
        )}

        {/* Sidebar Drag Resizer Handle */}
        {!layout.isZenMode && layout.sidebarVisible && (
          <div
            onMouseDown={startSidebarResize}
            className={`resizer-x ${isResizingSidebar ? 'resizing' : ''}`}
          />
        )}

        {/* Center Content: Editor & Bottom Panel OR Dedicated Settings Screen */}
        <div
          className="binary-content-area"
          style={layout.isSettingsOpen ? { minWidth: 440, overflowX: 'auto' } : undefined}
        >
          {layout.isSettingsOpen ? (
            <Suspense fallback={<PanelLoadingFallback message="Loading Settings..." />}>
              <SettingsScreen />
            </Suspense>
          ) : (
            <>
              {/* Top: Editor Area or Welcome Screen */}
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                {workspacePath || hasOpenTabs ? (
                  <EditorArea />
                ) : (
                  <Suspense fallback={<PanelLoadingFallback message="Loading..." />}>
                    <WelcomeScreen />
                  </Suspense>
                )}
              </div>

              {/* Bottom Panel Resizer Handle */}
              {!layout.isZenMode && layout.bottomPanelVisible && (
                <div
                  onMouseDown={startBottomResize}
                  className={`resizer-y ${isResizingBottom ? 'resizing' : ''}`}
                />
              )}

              {/* Bottom Panel */}
              {!layout.isZenMode && layout.bottomPanelVisible && (
                <div
                  style={{
                    height: layout.bottomPanelHeight,
                    backgroundColor: 'var(--bg-panel)',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {/* Bottom Panel Tab Strip */}
                  <div
                    style={{
                      height: 30,
                      backgroundColor: 'var(--bg-tab-bar)',
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 8px',
                      userSelect: 'none',
                    }}
                  >
                    {/* Tab Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {(['problems', 'output', 'terminal', 'debug'] as BottomTab[]).map((tab) => {
                        const isActive = layout.bottomPanelTab === tab;
                        return (
                          <button
                            key={tab}
                            onClick={() => layoutStore.setBottomPanelTab(tab)}
                            style={{
                              padding: '3px 8px',
                              fontSize: 11,
                              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                              borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              fontWeight: isActive ? 600 : 400,
                            }}
                          >
                            {tab}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        onClick={() => layoutStore.toggleBottomPanel()}
                        style={{ padding: 2, borderRadius: 3, color: 'var(--text-muted)' }}
                        title="Close Panel"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Panel Content */}
                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                    <Suspense fallback={<PanelLoadingFallback message="Loading..." />}>
                      {layout.bottomPanelTab === 'terminal' && <TerminalPanel />}
                      {layout.bottomPanelTab === 'problems' && <ProblemsPanel />}
                      {layout.bottomPanelTab === 'output' && <OutputPanel />}
                      {layout.bottomPanelTab === 'debug' && <OutputPanel />}
                    </Suspense>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* AI Panel Resizer Handle */}
        {!layout.isZenMode && layout.aiPanelVisible && (
          <div
            onMouseDown={startAIResize}
            className={`resizer-x ${isResizingAI ? 'resizing' : ''}`}
          />
        )}

        {/* Right AI Agent Panel */}
        {!layout.isZenMode && layout.aiPanelVisible && (
          <div style={{ width: Math.max(300, layout.aiPanelWidth), minWidth: 300, height: '100%', display: 'flex', overflow: 'hidden' }}>
            <Suspense fallback={<PanelLoadingFallback message="Initializing AI Agent..." />}>
              <AIAgentPanel />
            </Suspense>
          </div>
        )}
      </div>

      {/* Status Bar */}
      {!layout.isZenMode && settings.appearance?.showStatusBar !== false && <StatusBar />}

      {/* Global Modals & Palettes (mounted on-demand) */}
      {layout.commandPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette />
        </Suspense>
      )}
      {layout.quickOpenOpen && (
        <Suspense fallback={null}>
          <QuickOpen />
        </Suspense>
      )}
      <ExtensionDialogs />
    </div>
  );
};
