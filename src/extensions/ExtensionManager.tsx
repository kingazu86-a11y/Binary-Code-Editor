import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Puzzle,
  Check,
  Download,
  Trash2,
  RefreshCw,
  FolderInput,
  Loader2,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Copy,
  Terminal,
  Activity,
  MoreHorizontal,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../services/api';
import { editorStore } from '../state/editorStore';
import { ExtensionManifest, MarketplaceExtensionItem, ExtensionInstallProgress } from '../types/electron';
import { Skeleton } from '../components/Common/SkeletonShimmer';

const ExtensionIcon: React.FC<{ src?: string; alt: string; size?: number }> = ({ src, alt, size = 16 }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return <Puzzle size={size} />;
  }

  const cleanSrc = src.trim().startsWith('<svg')
    ? `data:image/svg+xml;utf8,${encodeURIComponent(src.trim())}`
    : src;

  return (
    <img
      src={cleanSrc}
      alt={alt}
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      onError={() => setHasError(true)}
    />
  );
};

export const ExtensionManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace' | 'developer'>('installed');
  const [extensions, setExtensions] = useState<ExtensionManifest[]>([]);
  const [lifecycleMap, setLifecycleMap] = useState<Record<string, { status: string; timeMs?: number; error?: string; stack?: string }>>({});
  const [errorModal, setErrorModal] = useState<{ id: string; name: string; error?: string; stack?: string } | null>(null);
  const [copiedError, setCopiedError] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [vscodeCount, setVscodeCount] = useState<number>(0);
  const [uninstallingIds, setUninstallingIds] = useState<Set<string>>(new Set());
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [dismissedVscodeSync, setDismissedVscodeSync] = useState(false);

  useEffect(() => {
    if (!showMoreMenu) return;
    const onDocClick = () => setShowMoreMenu(false);
    window.addEventListener('click', onDocClick);
    return () => window.removeEventListener('click', onDocClick);
  }, [showMoreMenu]);

  // Developer Mode State
  const [hostStatus, setHostStatus] = useState<any>(null);
  const [unpackedPath, setUnpackedPath] = useState('');
  const [unpackedLoading, setUnpackedLoading] = useState(false);
  const [unpackedMessage, setUnpackedMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Marketplace Search State
  const [marketplaceQuery, setMarketplaceQuery] = useState('');
  const [selectedMarketplaceCategory, setSelectedMarketplaceCategory] = useState<string>('All');
  const [marketplaceResults, setMarketplaceResults] = useState<MarketplaceExtensionItem[]>([]);
  const [isSearchingMarketplace, setIsSearchingMarketplace] = useState(false);
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());
  const [installProgressMap, setInstallProgressMap] = useState<Record<string, ExtensionInstallProgress>>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = api.onExtensionInstallProgress((prog: ExtensionInstallProgress) => {
      if (!prog || !prog.extensionId) return;
      const key = prog.extensionId.toLowerCase();
      setInstallProgressMap((prev) => ({
        ...prev,
        [key]: prog,
      }));

      if (prog.stage === 'completed') {
        setTimeout(() => {
          setInstallProgressMap((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }, 2500);
      } else if (prog.stage === 'error') {
        setTimeout(() => {
          setInstallProgressMap((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }, 6000);
      }
    });

    return () => {
      unsub();
    };
  }, []);

  const searchTimerRef = useRef<any>(null);

  const loadHostStatus = async () => {
    try {
      const st = await api.getExtensionHostStatus();
      setHostStatus(st);
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'developer') {
      loadHostStatus();
      const timer = setInterval(loadHostStatus, 2500);
      return () => clearInterval(timer);
    }
  }, [activeTab]);

  // Reset marketplace search state when leaving marketplace tab
  useEffect(() => {
    if (activeTab !== 'marketplace') {
      setHasSearched(false);
      setMarketplaceError(null);
    }
  }, [activeTab]);

  const handleBrowseUnpacked = async () => {
    try {
      const folder = await api.openFolderDialog();
      if (folder) setUnpackedPath(folder);
    } catch {}
  };

  const handleLoadUnpacked = async () => {
    if (!unpackedPath) return;
    setUnpackedLoading(true);
    setUnpackedMessage(null);
    try {
      const res = await api.loadUnpackedExtension(unpackedPath);
      if (res.success) {
        setUnpackedMessage({
          type: 'success',
          text: `Loaded: ${res.extension?.displayName || res.extension?.name}`,
        });
        await loadExtensions();
        await loadHostStatus();
      } else {
        setUnpackedMessage({ type: 'error', text: res.error || 'Failed to load unpacked extension' });
      }
    } catch (err: any) {
      setUnpackedMessage({ type: 'error', text: err.message });
    } finally {
      setUnpackedLoading(false);
    }
  };

  const handleRestartHost = async () => {
    try {
      await api.restartExtensionHost();
      await loadHostStatus();
      await loadExtensions();
    } catch (err: any) {
      alert(`Restart error: ${err.message}`);
    }
  };

  const loadExtensions = async () => {
    try {
      const [list, lifecycle, vsCount] = await Promise.all([
        api.listExtensions().catch(() => []),
        api.getExtensionLifecycle().catch(() => []),
        api.getVSCodeExtensionCount().catch(() => 0),
      ]);
      setExtensions(Array.isArray(list) ? list : []);
      setVscodeCount(typeof vsCount === 'number' ? vsCount : 0);
      const lMap: Record<string, any> = {};
      if (Array.isArray(lifecycle)) {
        for (const item of lifecycle) {
          if (item?.id) lMap[item.id.toLowerCase()] = item;
          if (item?.name) lMap[item.name.toLowerCase()] = item;
        }
      }
      setLifecycleMap(lMap);
    } catch (err) {
      console.error('Failed to load extensions:', err);
      setExtensions([]);
    }
  };

  useEffect(() => {
    loadExtensions();
    const unsub = api.onExtensionsChanged?.(() => {
      loadExtensions();
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Debounced search for Marketplace API
  useEffect(() => {
    if (activeTab !== 'marketplace') return;

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = setTimeout(async () => {
      setIsSearchingMarketplace(true);
      setMarketplaceError(null);
      try {
        const queryTerm = [
          marketplaceQuery.trim(),
          selectedMarketplaceCategory !== 'All' ? selectedMarketplaceCategory.toLowerCase() : '',
        ]
          .filter(Boolean)
          .join(' ');

        const results = await api.searchMarketplaceExtensions(queryTerm);
        if (Array.isArray(results) && results.length === 0 && !queryTerm) {
          // API returned empty on a default query — likely not available
          setMarketplaceError('Could not connect to the extension marketplace. Check your network connection.');
        } else {
          setMarketplaceResults(results);
        }
      } catch (err: any) {
        console.error('Marketplace search error:', err);
        setMarketplaceError(err?.message || 'Failed to load extensions from marketplace.');
      } finally {
        setIsSearchingMarketplace(false);
        setHasSearched(true);
      }
    }, 350);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [marketplaceQuery, selectedMarketplaceCategory, activeTab]);

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    const success = await api.toggleExtension(id, !currentEnabled);
    if (success) {
      setExtensions((prev) =>
        prev.map((e) => (e.id === id ? { ...e, enabled: !currentEnabled } : e))
      );
    }
  };

  const handleImportVSCode = async () => {
    setIsImporting(true);
    setImportStatus(null);
    try {
      const res = await api.importVSCodeExtensions();
      if (res.success) {
        setExtensions(res.extensions);
        setImportStatus(`Synced ${res.count} extensions from VS Code.`);
      } else {
        setImportStatus('No new extensions found to import.');
      }
    } catch (err) {
      setImportStatus('Failed to import VS Code extensions.');
    } finally {
      setIsImporting(false);
      setTimeout(() => setImportStatus(null), 4000);
    }
  };

  const handleInstallExtension = async (item: MarketplaceExtensionItem) => {
    setInstallingIds((prev) => new Set(prev).add(item.id));
    try {
      const res = await api.installExtension(item.id, item.downloadUrl);
      if (res.success) {
        // Mark as installed in marketplace list
        setMarketplaceResults((prev) =>
          prev.map((m) => (m.id === item.id ? { ...m, installed: true } : m))
        );
        // Refresh installed list
        await loadExtensions();
      } else {
        alert(`Failed to install extension: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Installation error: ${err.message}`);
    } finally {
      setInstallingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleUninstall = async (id: string) => {
    const ext = extensions.find((e) => e.id.toLowerCase() === id.toLowerCase());
    const name = ext?.displayName || ext?.name || id;
    if (!confirm(`Are you sure you want to uninstall "${name}"?`)) return;

    setUninstallingIds((prev) => new Set(prev).add(id.toLowerCase()));
    try {
      const res = await api.uninstallExtension(id);
      if (res.success) {
        setExtensions((prev) => prev.filter((e) => e.id.toLowerCase() !== id.toLowerCase()));
        await loadExtensions();
      } else {
        alert(`Failed to uninstall extension: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Uninstall error: ${err.message || 'Unknown error'}`);
    } finally {
      setUninstallingIds((prev) => {
        const next = new Set(prev);
        next.delete(id.toLowerCase());
        return next;
      });
    }
  };

  const categories = ['All', 'Themes', 'Programming Languages', 'Linters', 'SCM Providers', 'Other'];

  const getExtensionStatus = (ext: ExtensionManifest) => {
    if (!ext.enabled) {
      return { status: 'DISABLED', label: 'Disabled', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.15)' };
    }
    const live = lifecycleMap[ext.id.toLowerCase()] || lifecycleMap[ext.name.toLowerCase()];
    if (!live) {
      return { status: 'INSTALLED', label: 'Installed', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.12)' };
    }
    if (live.status === 'ACTIVE') {
      return {
        status: 'ACTIVE',
        label: live.timeMs ? `Active (+${live.timeMs}ms)` : 'Active',
        color: '#10B981',
        bg: 'rgba(16, 185, 129, 0.15)',
        live,
      };
    }
    if (live.status === 'ACTIVATING') {
      return {
        status: 'ACTIVATING',
        label: 'Activating',
        color: '#3B82F6',
        bg: 'rgba(59, 130, 246, 0.15)',
        live,
      };
    }
    if (live.status === 'FAILED') {
      return {
        status: 'FAILED',
        label: 'Failed',
        color: '#EF4444',
        bg: 'rgba(239, 68, 68, 0.15)',
        live,
      };
    }
    return { status: 'INSTALLED', label: 'Installed', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.12)', live };
  };

  const safeExtensions = Array.isArray(extensions) ? extensions : [];
  const activeCount = safeExtensions.filter((e) => e && getExtensionStatus(e).status === 'ACTIVE').length;
  const failedCount = safeExtensions.filter((e) => e && getExtensionStatus(e).status === 'FAILED').length;
  const vscodeExtCount = safeExtensions.filter((e) => e && e.source === 'vscode').length;

  const filteredInstalled = safeExtensions.filter((e) => {
    if (!e) return false;
    const q = (query || '').toLowerCase();
    const displayName = (e.displayName || e.name || '').toLowerCase();
    const description = (e.description || '').toLowerCase();
    const name = (e.name || '').toLowerCase();
    const author = (e.author || '').toLowerCase();

    const matchesQuery =
      !q ||
      displayName.includes(q) ||
      description.includes(q) ||
      name.includes(q) ||
      author.includes(q);

    const matchesCat =
      selectedCategory === 'All' || (Array.isArray(e.categories) && e.categories.includes(selectedCategory));
    return matchesQuery && matchesCat;
  });

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-panel)',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* Header with Title & Action Controls */}
      <div
        style={{
          padding: '10px 14px 0',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-panel)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {activeTab === 'developer' && (
              <button
                onClick={() => setActiveTab('installed')}
                title="Back to extensions"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2,
                  marginRight: 2,
                }}
              >
                <ArrowLeft size={14} />
              </button>
            )}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
              }}
            >
              {activeTab === 'developer' ? 'DEVELOPER TOOLS' : 'EXTENSIONS'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}>
            <button
              onClick={() => loadExtensions()}
              title="Refresh extensions"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                borderRadius: 4,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <RefreshCw size={13} />
            </button>

            {/* More Options Menu Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMoreMenu((prev) => !prev);
              }}
              title="More Actions..."
              style={{
                background: showMoreMenu ? 'var(--bg-hover)' : 'transparent',
                border: 'none',
                color: showMoreMenu ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                borderRadius: 4,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => {
                if (!showMoreMenu) e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              <MoreHorizontal size={14} />
            </button>

            {/* Dropdown Menu */}
            {showMoreMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  width: 200,
                  backgroundColor: 'var(--bg-card, var(--bg-panel))',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                  padding: '4px 0',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <button
                  onClick={() => {
                    setActiveTab(activeTab === 'developer' ? 'installed' : 'developer');
                    setShowMoreMenu(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    fontSize: 11,
                    color: 'var(--text-primary)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Activity size={12} style={{ color: 'var(--accent-primary)' }} />
                  <span>{activeTab === 'developer' ? 'View Installed' : 'Developer Tools'}</span>
                </button>

                {vscodeCount > 0 && (
                  <button
                    onClick={() => {
                      handleImportVSCode();
                      setShowMoreMenu(false);
                    }}
                    disabled={isImporting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 12px',
                      fontSize: 11,
                      color: 'var(--text-primary)',
                      background: 'transparent',
                      border: 'none',
                      cursor: isImporting ? 'default' : 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      opacity: isImporting ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <FolderInput size={12} style={{ color: 'var(--accent-primary)' }} />
                    <span>Import from VS Code ({vscodeCount})</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    loadExtensions();
                    setShowMoreMenu(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    fontSize: 11,
                    color: 'var(--text-primary)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <RefreshCw size={12} />
                  <span>Refresh Extensions</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Switcher: 2 clean tabs filling full width without overflow */}
        {activeTab !== 'developer' && (
          <div style={{ display: 'flex', width: '100%', gap: 0 }}>
            <button
              onClick={() => setActiveTab('installed')}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: 11,
                fontWeight: 600,
                color: activeTab === 'installed' ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'installed' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                background: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                minWidth: 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Installed</span>
              <span
                style={{
                  backgroundColor: activeTab === 'installed' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
                  color: activeTab === 'installed' ? 'var(--accent-primary)' : 'var(--text-muted)',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {extensions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('marketplace')}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: 11,
                fontWeight: 600,
                color: activeTab === 'marketplace' ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'marketplace' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                background: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                minWidth: 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              <Sparkles size={12} style={{ color: activeTab === 'marketplace' ? 'var(--accent-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Marketplace</span>
            </button>
          </div>
        )}
      </div>

      {/* Indeterminate Progress Bar during downloads, imports or searches */}
      {(installingIds.size > 0 || isSearchingMarketplace || isImporting) && (
        <div className="progress-bar-indeterminate" />
      )}

      {/* ================= INSTALLED TAB ================= */}
      {activeTab === 'installed' && (
        <>
          {/* VS Code Extensions Sync Notification (Compact & Dismissible) */}
          {vscodeCount > 0 && !dismissedVscodeSync && (
            <div
              style={{
                margin: '8px 10px 4px',
                padding: '6px 10px',
                borderRadius: 5,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                <FolderInput size={12} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {vscodeCount} VS Code extensions found
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={handleImportVSCode}
                  disabled={isImporting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 3,
                    fontSize: 10,
                    fontWeight: 600,
                    backgroundColor: 'var(--accent-primary)',
                    color: '#FFF',
                    border: 'none',
                    cursor: isImporting ? 'default' : 'pointer',
                    opacity: isImporting ? 0.7 : 1,
                  }}
                >
                  {isImporting ? <Loader2 size={10} className="animate-spin" /> : null}
                  <span>{isImporting ? 'Syncing...' : 'Sync'}</span>
                </button>
                <button
                  onClick={() => setDismissedVscodeSync(true)}
                  title="Dismiss"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}
          {importStatus && (
            <div style={{ padding: '4px 12px', fontSize: 10, color: 'var(--color-success)', fontWeight: 500 }}>
              {importStatus}
            </div>
          )}

          {/* Search Filter for Installed */}
          <div style={{ padding: '8px 10px 6px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={12} style={{ position: 'absolute', left: 8, color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search installed extensions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: 26,
                  paddingRight: query ? 24 : 8,
                  height: 26,
                  fontSize: 11,
                  borderRadius: 4,
                  backgroundColor: 'var(--bg-card, #1A1F29)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  style={{
                    position: 'absolute',
                    right: 6,
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Installed Extensions List */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 8px' }}>
            {filteredInstalled.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                {query ? `No installed extensions matching "${query}".` : 'No installed extensions.'}
              </div>
            ) : (
              filteredInstalled.map((ext) => {
                const statusInfo = getExtensionStatus(ext);
                return (
                  <div
                    key={ext.id}
                    onClick={() => editorStore.openExtensionDetail(ext.id, ext)}
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: '8px',
                      borderBottom: '1px solid var(--border-subtle)',
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      width: '100%',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: ext.enabled ? 'var(--accent-primary)' : 'var(--text-muted)',
                        flexShrink: 0,
                        overflow: 'hidden',
                        padding: 3,
                        boxSizing: 'border-box',
                      }}
                    >
                      <ExtensionIcon src={ext.icon} alt={ext.name} size={16} />
                    </div>

                    {/* Body */}
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, width: '100%', minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: ext.enabled ? 'var(--text-primary)' : 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                            minWidth: 0,
                          }}
                          title={ext.displayName}
                        >
                          {ext.displayName}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          {statusInfo.status === 'FAILED' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setErrorModal({
                                  id: ext.id,
                                  name: ext.displayName,
                                  error: statusInfo.live?.error || 'Unknown activation error',
                                  stack: statusInfo.live?.stack,
                                });
                              }}
                              style={{
                                fontSize: 9,
                                padding: '1px 5px',
                                borderRadius: 3,
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                color: 'var(--color-danger)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                                cursor: 'pointer',
                              }}
                              title="Click to inspect activation failure"
                            >
                              <AlertTriangle size={9} />
                              Failed
                            </button>
                          )}

                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            v{ext.version}
                          </span>
                        </div>
                      </div>

                      <p
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          margin: '2px 0 4px',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={ext.description}
                      >
                        {ext.description || 'No description provided.'}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, gap: 6, width: '100%', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0, overflow: 'hidden' }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ext.author}>
                            {ext.author}
                          </span>
                          {ext.source === 'vscode' && (
                            <span
                              style={{
                                fontSize: 9,
                                padding: '0 4px',
                                borderRadius: 2,
                                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                                color: 'var(--accent-primary)',
                                fontWeight: 500,
                                flexShrink: 0,
                              }}
                            >
                              VS Code
                            </span>
                          )}
                          {ext.source === 'builtin' && (
                            <span
                              style={{
                                fontSize: 9,
                                padding: '0 4px',
                                borderRadius: 2,
                                backgroundColor: 'rgba(192, 132, 252, 0.12)',
                                color: '#C084FC',
                                fontWeight: 500,
                                flexShrink: 0,
                              }}
                            >
                              Built-in
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggle(ext.id, ext.enabled);
                            }}
                            style={{
                              padding: '2px 7px',
                              borderRadius: 3,
                              fontSize: 10,
                              fontWeight: 500,
                              backgroundColor: 'transparent',
                              color: ext.enabled ? 'var(--text-secondary)' : 'var(--text-muted)',
                              border: '1px solid var(--border-subtle)',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                              e.currentTarget.style.color = 'var(--text-primary)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = ext.enabled ? 'var(--text-secondary)' : 'var(--text-muted)';
                            }}
                          >
                            {ext.enabled ? 'Disable' : 'Enable'}
                          </button>

                          {ext.source !== 'builtin' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUninstall(ext.id);
                              }}
                              disabled={uninstallingIds.has(ext.id.toLowerCase())}
                              style={{
                                padding: '2px 4px',
                                borderRadius: 3,
                                display: 'flex',
                                alignItems: 'center',
                                color: 'var(--text-muted)',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: uninstallingIds.has(ext.id.toLowerCase()) ? 'default' : 'pointer',
                                opacity: uninstallingIds.has(ext.id.toLowerCase()) ? 0.6 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (!uninstallingIds.has(ext.id.toLowerCase())) {
                                  e.currentTarget.style.color = 'var(--color-danger)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--text-muted)';
                              }}
                              title="Uninstall Extension"
                            >
                              {uninstallingIds.has(ext.id.toLowerCase()) ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <Trash2 size={11} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ================= MARKETPLACE TAB ================= */}
      {activeTab === 'marketplace' && (
        <>
          {/* Search Input for Marketplace */}
          <div style={{ padding: '8px 10px 6px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={12} style={{ position: 'absolute', left: 8, color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search extensions in Marketplace..."
                value={marketplaceQuery}
                onChange={(e) => setMarketplaceQuery(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: 26,
                  paddingRight: marketplaceQuery ? 24 : 8,
                  height: 26,
                  fontSize: 11,
                  borderRadius: 4,
                  backgroundColor: 'var(--bg-card, #1A1F29)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
                autoFocus
              />
              {marketplaceQuery && (
                <button
                  onClick={() => setMarketplaceQuery('')}
                  style={{
                    position: 'absolute',
                    right: 6,
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills for Marketplace */}
          <div
            style={{
              display: 'flex',
              gap: 5,
              padding: '0 10px 8px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {['All', 'Themes', 'Programming Languages', 'Linters', 'Formatters', 'SCM Providers'].map((cat) => {
              const isSelected = selectedMarketplaceCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedMarketplaceCategory(cat)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 10,
                    fontWeight: isSelected ? 600 : 400,
                    backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-card)',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Marketplace Results List */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 8px' }}>
            {isSearchingMarketplace ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 4px' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: '8px 6px',
                      borderBottom: '1px solid var(--border-subtle)',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Skeleton width={32} height={32} borderRadius={4} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Skeleton width="55%" height={12} borderRadius={3} />
                        <Skeleton width={45} height={18} borderRadius={4} style={{ opacity: 0.5 }} />
                      </div>
                      <Skeleton width="90%" height={10} borderRadius={3} style={{ opacity: 0.6 }} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                        <Skeleton width={50} height={9} borderRadius={2} style={{ opacity: 0.4 }} />
                        <Skeleton width={40} height={9} borderRadius={2} style={{ opacity: 0.4 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : marketplaceError ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <AlertTriangle size={24} style={{ color: '#F59E0B', opacity: 0.8 }} />
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 220 }}>
                  {marketplaceError}
                </p>
                <button
                  onClick={() => {
                    setHasSearched(false);
                    setMarketplaceError(null);
                    setMarketplaceResults([]);
                    // re-trigger the effect by bumping the query
                    const q = marketplaceQuery;
                    setMarketplaceQuery('__retry__');
                    setTimeout(() => setMarketplaceQuery(q), 10);
                  }}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 5,
                    fontSize: 11,
                    fontWeight: 600,
                    backgroundColor: 'var(--accent-primary)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            ) : !hasSearched ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                Loading extensions...
              </div>
            ) : marketplaceResults.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                {marketplaceQuery
                  ? `No extensions found for "${marketplaceQuery}". Try "prettier", "python", or "theme".`
                  : 'No extensions available.'}
              </div>
            ) : (
              marketplaceResults.map((item) => {
                const isInstalling = installingIds.has(item.id);
                const itemId = (item.id || '').toLowerCase();
                const itemName = (item.name || '').toLowerCase();
                const itemDot = itemId.indexOf('.');
                const itemPureName = itemDot !== -1 ? itemId.slice(itemDot + 1) : itemId;

                const isInstalled =
                  item.installed ||
                  safeExtensions.some((e) => {
                    const eId = (e.id || '').toLowerCase();
                    const eName = (e.name || '').toLowerCase();
                    const eDot = eId.indexOf('.');
                    const ePureName = eDot !== -1 ? eId.slice(eDot + 1) : eId;
                    return (
                      eId === itemId ||
                      eName === itemName ||
                      eName === itemPureName ||
                      ePureName === itemName ||
                      ePureName === itemPureName ||
                      (e.installedPath && e.installedPath.toLowerCase().includes(itemPureName))
                    );
                  });

                return (
                  <div
                    key={item.id}
                    onClick={() => editorStore.openExtensionDetail(item.id, item)}
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: '8px',
                      borderBottom: '1px solid var(--border-subtle)',
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      width: '100%',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-primary)',
                        flexShrink: 0,
                        overflow: 'hidden',
                        padding: 3,
                        boxSizing: 'border-box',
                      }}
                    >
                      <ExtensionIcon src={item.icon} alt={item.name} size={16} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, width: '100%', minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                            minWidth: 0,
                          }}
                          title={item.displayName}
                        >
                          {item.displayName}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                          v{item.version}
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          margin: '2px 0 4px',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={item.description}
                      >
                        {item.description || 'No description available.'}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, gap: 6, width: '100%', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-muted)', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.publisher}>
                            {item.publisher}
                          </span>
                          {item.downloadCount !== undefined && item.downloadCount > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                              <Download size={10} />
                              {item.downloadCount >= 1000000
                                ? `${(item.downloadCount / 1000000).toFixed(1)}M`
                                : item.downloadCount >= 1000
                                ? `${(item.downloadCount / 1000).toFixed(0)}k`
                                : item.downloadCount}
                            </span>
                          )}
                        </div>

                        {/* Install / Progress / Installed Button */}
                        <div style={{ flexShrink: 0 }}>
                          {isInstalled ? (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                                padding: '2px 6px',
                                borderRadius: 3,
                                fontSize: 10,
                                fontWeight: 500,
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                color: 'var(--color-success)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Check size={10} />
                              <span>Installed</span>
                            </div>
                          ) : (() => {
                            const progressInfo = installProgressMap[item.id.toLowerCase()];
                            const inProgress = isInstalling || (progressInfo && progressInfo.stage !== 'completed' && progressInfo.stage !== 'error');

                            if (progressInfo?.stage === 'error') {
                              return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-danger)', fontSize: 10 }}>
                                  <AlertTriangle size={11} />
                                  <span title={progressInfo.error || 'Installation failed'}>Failed</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleInstallExtension(item);
                                    }}
                                    style={{
                                      padding: '1px 5px',
                                      fontSize: 9,
                                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                      color: 'var(--color-danger)',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      borderRadius: 3,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Retry
                                  </button>
                                </div>
                              );
                            }

                            if (inProgress) {
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, maxWidth: 120, minWidth: 75 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--accent-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                    <Loader2 size={10} className="animate-spin" />
                                    <span style={{ fontSize: 9 }}>
                                      {progressInfo?.stage === 'downloading'
                                        ? `${progressInfo.progress}%${progressInfo.speed ? ` · ${progressInfo.speed}` : ''}`
                                        : progressInfo?.stage === 'validating'
                                        ? 'Validating...'
                                        : progressInfo?.stage === 'extracting'
                                        ? `${progressInfo.progress || 65}% Extracting`
                                        : 'Installing...'}
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      width: '100%',
                                      height: 3,
                                      borderRadius: 2,
                                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <div
                                      style={{
                                        height: '100%',
                                        width: `${progressInfo?.progress ?? 20}%`,
                                        backgroundColor: 'var(--accent-primary)',
                                        borderRadius: 2,
                                        transition: 'width 0.2s ease',
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInstallExtension(item);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '2px 8px',
                                  borderRadius: 3,
                                  fontSize: 10,
                                  fontWeight: 500,
                                  backgroundColor: 'var(--accent-primary)',
                                  color: '#FFF',
                                  border: 'none',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <Download size={10} />
                                <span>Install</span>
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ================= DEVELOPER TAB ================= */}
      {activeTab === 'developer' && (
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Back button */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => setActiveTab('installed')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 8px',
                borderRadius: 4,
                fontSize: 11,
                color: 'var(--text-secondary)',
                backgroundColor: 'transparent',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <ArrowLeft size={12} />
              <span>Back to Extensions</span>
            </button>
          </div>

          {/* Extension Host Status Card */}
          <div
            style={{
              padding: '12px',
              borderRadius: 6,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={13} style={{ color: hostStatus?.running ? 'var(--color-success)' : 'var(--text-muted)' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Extension Host Runtime
                </span>
              </div>
              <button
                onClick={handleRestartHost}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 7px',
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: 500,
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <RefreshCw size={10} />
                <span>Restart</span>
              </button>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-muted)' }}>
              <div>Status: <span style={{ color: hostStatus?.running ? 'var(--color-success)' : 'var(--text-muted)', fontWeight: 500 }}>{hostStatus?.running ? 'Running' : 'Idle'}</span></div>
              {hostStatus?.pid && <div>PID: <span style={{ color: 'var(--text-primary)' }}>{hostStatus.pid}</span></div>}
              {hostStatus?.uptime ? <div>Uptime: <span style={{ color: 'var(--text-primary)' }}>{hostStatus.uptime}s</span></div> : null}
            </div>
          </div>

          {/* Load Unpacked Extension */}
          <div
            style={{
              padding: '12px',
              borderRadius: 6,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FolderInput size={13} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                Load Unpacked Extension
              </span>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Select a local folder containing a <code style={{ color: 'var(--text-secondary)' }}>package.json</code> manifest to test in development.
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder="Folder path..."
                value={unpackedPath}
                onChange={(e) => setUnpackedPath(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 26,
                  fontSize: 11,
                  padding: '0 8px',
                  borderRadius: 4,
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleBrowseUnpacked}
                style={{
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                Browse...
              </button>
            </div>
            <button
              onClick={handleLoadUnpacked}
              disabled={!unpackedPath || unpackedLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 500,
                backgroundColor: 'var(--accent-primary)',
                color: '#FFF',
                border: 'none',
                cursor: !unpackedPath || unpackedLoading ? 'default' : 'pointer',
                opacity: !unpackedPath || unpackedLoading ? 0.6 : 1,
              }}
            >
              {unpackedLoading ? <Loader2 size={11} className="animate-spin" /> : null}
              <span>Load Extension</span>
            </button>
            {unpackedMessage && (
              <div
                style={{
                  fontSize: 10,
                  padding: '5px 8px',
                  borderRadius: 4,
                  backgroundColor: unpackedMessage.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: unpackedMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
                  border: `1px solid ${unpackedMessage.type === 'success' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                }}
              >
                {unpackedMessage.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= ACTIVATION ERROR MODAL ================= */}
      {errorModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => {
            setErrorModal(null);
            setCopiedError(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(620px, calc(100vw - 32px))',
              maxHeight: 'min(640px, calc(100vh - 48px))',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--bg-modal, #0D1117)',
              borderRadius: 12,
              border: '1px solid var(--border-menu, #30363D)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.06)',
              overflow: 'hidden',
            }}
            className="animate-fade-in"
          >
            {/* Top Accent Line */}
            <div style={{ height: 3, backgroundColor: 'var(--color-danger, #EF4444)' }} />

            {/* Modal Header */}
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid var(--border-subtle, #21262D)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-danger, #EF4444)',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={17} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary, #F0F6FC)',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Extension Activation Failure
                  </h3>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-secondary, #8B949E)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {errorModal.name} ({errorModal.id})
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setErrorModal(null);
                  setCopiedError(false);
                }}
                title="Close (Esc)"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #8B949E)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 6,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #8B949E)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Failure Reason
                </span>
                <div
                  style={{
                    marginTop: 6,
                    padding: '10px 14px',
                    borderRadius: 8,
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.22)',
                    color: '#F87171',
                    fontSize: 12,
                    fontFamily: 'var(--font-mono, monospace)',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    maxHeight: 180,
                    overflowY: 'auto',
                  }}
                >
                  {errorModal.error || 'Unknown activation error'}
                </div>
              </div>

              {errorModal.stack && (
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #8B949E)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Stack Trace
                  </span>
                  <pre
                    style={{
                      marginTop: 6,
                      padding: 12,
                      borderRadius: 8,
                      backgroundColor: '#090C10',
                      border: '1px solid var(--border-color, #21262D)',
                      color: 'var(--text-secondary, #C9D1D9)',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono, monospace)',
                      lineHeight: 1.45,
                      maxHeight: 220,
                      overflowY: 'auto',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {errorModal.stack}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 18px',
                borderTop: '1px solid var(--border-subtle, #21262D)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                gap: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
              }}
            >
              <button
                onClick={() => {
                  const text = `Extension: ${errorModal.name} (${errorModal.id})\nError: ${errorModal.error}\nStack:\n${errorModal.stack || 'No stack trace'}`;
                  navigator.clipboard.writeText(text);
                  setCopiedError(true);
                  setTimeout(() => setCopiedError(false), 2000);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 12,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: copiedError ? 'var(--color-success, #10B981)' : 'var(--text-primary, #C9D1D9)',
                  border: '1px solid var(--border-color, #30363D)',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {copiedError ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedError ? 'Copied' : 'Copy Error Details'}</span>
              </button>
              <button
                onClick={() => {
                  setErrorModal(null);
                  setCopiedError(false);
                }}
                style={{
                  padding: '6px 16px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: 'var(--accent-primary)',
                  color: '#FFF',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
