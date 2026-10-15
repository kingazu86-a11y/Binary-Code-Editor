import React, { useState, useEffect, Suspense, lazy } from 'react';
import { EditorTabs } from './EditorTabs';
import { Breadcrumbs } from './Breadcrumbs';
import { EditorGroupItem } from '../types';
import { editorStore, useEditor } from '../state/editorStore';
import { Code2, X } from 'lucide-react';
import { EditorSkeleton } from './EditorSkeleton';
import { api } from '../services/api';

// ── Lazy-loaded editor viewers (loaded on-demand to eliminate initial bundle lag) ──
const MonacoInstance = lazy(() => import('./MonacoInstance').then((m) => ({ default: m.MonacoInstance })));
const DiffEditorView = lazy(() => import('./DiffEditorView').then((m) => ({ default: m.DiffEditorView })));
const ImageViewer = lazy(() => import('./ImageViewer').then((m) => ({ default: m.ImageViewer })));
const SvgSplitEditor = lazy(() => import('./SvgSplitEditor').then((m) => ({ default: m.SvgSplitEditor })));
const CustomEditorPanel = lazy(() => import('./CustomEditorPanel').then((m) => ({ default: m.CustomEditorPanel })));
const ExtensionDetailPanel = lazy(() => import('../extensions/ExtensionDetailPanel').then((m) => ({ default: m.ExtensionDetailPanel })));

interface EditorGroupProps {
  group: EditorGroupItem;
}

export const EditorGroup: React.FC<EditorGroupProps> = ({ group }) => {
  const { groups } = useEditor();
  const activeTab = group.tabs.find((t) => t.id === group.activeTabId);
  const [customEditors, setCustomEditors] = useState<any[]>([]);

  useEffect(() => {
    api.getExtensionCustomEditors().then((eds) => {
      if (Array.isArray(eds)) setCustomEditors(eds);
    });
  }, []);

  /** Determine which viewer to render for the active tab */
  const renderContent = () => {
    if (!activeTab) return null;

    if (activeTab.isLoading) {
      return <EditorSkeleton />;
    }

    if (activeTab.isExtensionDetail) {
      return (
        <Suspense fallback={<EditorSkeleton />}>
          <ExtensionDetailPanel
            key={activeTab.id}
            extensionId={activeTab.extensionId || ''}
            initialData={activeTab.extensionData}
          />
        </Suspense>
      );
    }

    // ── Image viewer ───────────────────────────────────────────────────
    if (activeTab.viewMode === 'image') {
      const isError = activeTab.content.startsWith('__ERROR__:');
      const errorMessage = isError ? activeTab.content.slice(10) : undefined;
      return (
        <Suspense fallback={<EditorSkeleton />}>
          <ImageViewer
            key={activeTab.id}
            tabId={activeTab.id}
            filePath={activeTab.filePath}
            fileName={activeTab.fileName}
            dataUrl={isError ? '' : activeTab.content}
            isError={isError}
            errorMessage={errorMessage}
          />
        </Suspense>
      );
    }

    // ── SVG split editor ───────────────────────────────────────────────
    if (activeTab.viewMode === 'svg') {
      return (
        <Suspense fallback={<EditorSkeleton />}>
          <SvgSplitEditor
            key={activeTab.id}
            tabId={activeTab.id}
            groupId={group.id}
            filePath={activeTab.filePath}
            content={activeTab.content}
          />
        </Suspense>
      );
    }

    // ── Custom Extension Editor ─────────────────────────────────────────
    const fileExt = activeTab.fileName.includes('.') ? `.${activeTab.fileName.split('.').pop()?.toLowerCase()}` : '';
    const matchingCustomEditor = customEditors.find((ce) =>
      ce.selector?.some((s: any) => {
        const pattern = s.filenamePattern?.toLowerCase() || '';
        return (pattern.startsWith('*.') && pattern.slice(1) === fileExt) || pattern === activeTab.fileName.toLowerCase();
      })
    );

    if (matchingCustomEditor || activeTab.viewMode === ('custom' as any)) {
      return (
        <Suspense fallback={<EditorSkeleton />}>
          <CustomEditorPanel
            key={activeTab.id}
            tabId={activeTab.id}
            filePath={activeTab.filePath}
            fileName={activeTab.fileName}
            viewType={matchingCustomEditor?.viewType || 'custom'}
            displayName={matchingCustomEditor?.displayName || 'Custom Viewer'}
          />
        </Suspense>
      );
    }

    // ── Code / Diff editor ─────────────────────────────────────────────
    return (
      <>
        <Breadcrumbs filePath={activeTab.filePath} />
        <Suspense fallback={<EditorSkeleton />}>
          {activeTab.isDiff ? (
            <DiffEditorView
              original={activeTab.originalContent || ''}
              modified={activeTab.modifiedContent || ''}
              language={activeTab.language}
            />
          ) : (
            <MonacoInstance
              key={activeTab.id}
              tabId={activeTab.id}
              groupId={group.id}
              filePath={activeTab.filePath}
              content={activeTab.content}
              language={activeTab.language}
            />
          )}
        </Suspense>
      </>
    );
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#0D0F12',
        overflow: 'hidden',
        position: 'relative',
      }}
      onClick={() => editorStore.setActiveGroup(group.id)}
    >
      {/* Tabs */}
      <EditorTabs groupId={group.id} tabs={group.tabs} activeTabId={group.activeTabId} />

      {/* Editor Body */}
      {activeTab ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {renderContent()}
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: '#12151B',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <Code2 size={24} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
              No Editor Open
            </p>
            <p style={{ fontSize: 11 }}>
              Select a file from the explorer or press{' '}
              <kbd style={{ backgroundColor: '#1A1F29', padding: '2px 5px', borderRadius: 3 }}>Ctrl+P</kbd> to open
            </p>
            {groups.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  editorStore.closeSplitGroup(group.id);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 4,
                  backgroundColor: '#161B22',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontSize: 11,
                  cursor: 'pointer',
                  marginTop: 10,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#161B22';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <X size={12} /> Close This Split Pane
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
