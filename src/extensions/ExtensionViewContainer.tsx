import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Folder, File, RefreshCw, Sparkles, Terminal } from 'lucide-react';
import { api } from '../services/api';
import { TreeItem } from '../types/extensionApi';

interface Props {
  containerId: string;
}

export const ExtensionViewContainer: React.FC<Props> = ({ containerId }) => {
  const [views, setViews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState<Record<string, TreeItem[]>>({});
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const loadViews = async () => {
    setLoading(true);
    try {
      const list = await api.getExtensionViews(containerId);
      setViews(list);

      // Fetch root items for each tree view
      const map: Record<string, TreeItem[]> = {};
      for (const view of list) {
        const children = await api.getTreeChildren(view.id);
        map[view.id] = children;
      }
      setTreeData(map);
    } catch (err) {
      console.error('[ExtensionViewContainer] Failed to load views:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadViews();
    const unsub = api.onExtensionViewsUpdated(() => {
      loadViews();
    });
    return () => unsub();
  }, [containerId]);

  const toggleNode = async (viewId: string, item: TreeItem) => {
    const key = `${viewId}:${item.id || item.label}`;
    const nextState = !expandedNodes[key];
    setExpandedNodes((prev) => ({ ...prev, [key]: nextState }));

    // If expanding and has no children loaded, fetch them
    if (nextState && item.id) {
      const children = await api.getTreeChildren(viewId, item.id);
      if (children.length > 0) {
        setTreeData((prev) => {
          const existing = prev[viewId] || [];
          return {
            ...prev,
            [viewId]: [...existing, ...children],
          };
        });
      }
    }
  };

  const handleItemClick = async (item: TreeItem) => {
    if (item.command) {
      try {
        await api.executeExtensionCommand(item.command.command, ...(item.command.arguments || []));
      } catch (err) {
        console.error('[ExtensionViewContainer] Error executing item command:', err);
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-panel)',
        color: 'var(--text-primary)',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-tab-bar)',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {containerId.toUpperCase()}
        </span>
        <button
          onClick={loadViews}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 2,
            borderRadius: 3,
          }}
          title="Refresh Views"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          Loading views...
        </div>
      ) : views.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          <Sparkles size={24} style={{ margin: '0 auto 8px', color: 'var(--accent-primary)', opacity: 0.6 }} />
          <div>No views contributed for container '{containerId}'</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {views.map((view) => {
            const items = treeData[view.id] || [];
            return (
              <div key={view.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                {/* View Section Title */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <span>{view.name}</span>
                </div>

                {/* Tree Items */}
                <div style={{ padding: '4px 0' }}>
                  {items.length === 0 ? (
                    <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-muted)' }}>
                      (No items)
                    </div>
                  ) : (
                    items.map((item, idx) => {
                      const key = `${view.id}:${item.id || item.label}`;
                      const isExpanded = Boolean(expandedNodes[key]);
                      const hasChildren = item.collapsibleState !== undefined && item.collapsibleState > 0;

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (hasChildren) toggleNode(view.id, item);
                            else handleItemClick(item);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 12px',
                            fontSize: 12,
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            borderRadius: 4,
                            margin: '1px 6px',
                            transition: 'background-color 0.1s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          {hasChildren ? (
                            isExpanded ? <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                          ) : (
                            <span style={{ width: 14 }} />
                          )}

                          {hasChildren ? (
                            <Folder size={14} style={{ color: '#38BDF8' }} />
                          ) : (
                            <File size={14} style={{ color: 'var(--text-muted)' }} />
                          )}

                          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.label}
                          </span>

                          {item.description && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {item.description}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
