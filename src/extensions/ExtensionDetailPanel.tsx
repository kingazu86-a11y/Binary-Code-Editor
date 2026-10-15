import React, { useState, useEffect } from 'react';
import {
  Puzzle,
  Download,
  Star,
  ShieldCheck,
  ExternalLink,
  GitBranch,
  Github,
  AlertCircle,
  FileText,
  Sliders,
  History,
  Tag,
  Loader2,
  Trash2,
  Power,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Layers,
  Scale,
  Copy,
  Check,
} from 'lucide-react';
import { extensionDetailService, ExtensionDetailData } from './ExtensionDetailService';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ExtensionContributionsTab } from './ExtensionContributionsTab';
import { api } from '../services/api';
import { ExtensionInstallProgress } from '../types/electron';

interface ExtensionDetailPanelProps {
  extensionId: string;
  initialData?: any;
  onClose?: () => void;
}

export const ExtensionDetailPanel: React.FC<ExtensionDetailPanelProps> = ({
  extensionId,
  initialData,
  onClose,
}) => {
  const [data, setData] = useState<ExtensionDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'contributions' | 'changelog'>('overview');

  // Action states
  const [iconError, setIconError] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<ExtensionInstallProgress | null>(null);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    const unsub = api.onExtensionInstallProgress((prog: ExtensionInstallProgress) => {
      if (prog && prog.extensionId && data && prog.extensionId.toLowerCase() === data.id.toLowerCase()) {
        setInstallProgress(prog);
        if (prog.stage === 'completed' || prog.stage === 'error') {
          setTimeout(() => setInstallProgress(null), 3500);
        }
      }
    });
    return () => {
      unsub();
    };
  }, [data?.id]);

  const loadData = async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const detail = await extensionDetailService.getExtensionDetail(extensionId, {
        marketplaceItem: initialData,
        localManifest: initialData?.installedPath ? initialData : undefined,
        forceRefresh,
      });

      // Double-check against installed list so installed extensions never show install button
      if (!detail.installed) {
        try {
          const list = await api.listExtensions();
          const detailId = (detail.id || extensionId || '').toLowerCase();
          const detailName = (detail.name || '').toLowerCase();
          const isInst = list.some((e) => {
            const eId = (e.id || '').toLowerCase();
            const eName = (e.name || '').toLowerCase();
            return eId === detailId || eName === detailName || detailId.endsWith(`.${eName}`);
          });
          if (isInst) {
            detail.installed = true;
          }
        } catch {}
      }

      setData(detail);
    } catch (err: any) {
      console.error('Failed to load extension details:', err);
      setError(err.message || 'Failed to load extension details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIconError(false);
    loadData();
  }, [extensionId]);

  // Dynamic Action Triggers
  const handleInstall = async () => {
    if (!data) return;
    setIsInstalling(true);
    try {
      const res = await api.installExtension(data.id, data.downloadUrl);
      if (res.success) {
        setData((prev) => (prev ? { ...prev, installed: true, enabled: true } : prev));
        extensionDetailService.invalidateCache(data.id);
        setActionSuccessMessage(`Successfully installed ${data.displayName}`);
        setTimeout(() => setActionSuccessMessage(null), 4000);
      } else {
        alert(`Failed to install extension: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Installation error: ${err.message}`);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleUninstall = async () => {
    if (!data) return;
    if (!confirm(`Are you sure you want to uninstall "${data.displayName}"?`)) return;

    setIsUninstalling(true);
    try {
      const res = await api.uninstallExtension(data.id);
      if (res.success) {
        setData((prev) => (prev ? { ...prev, installed: false } : prev));
        extensionDetailService.invalidateCache(data.id);
        setActionSuccessMessage(`Uninstalled ${data.displayName}`);
        setTimeout(() => setActionSuccessMessage(null), 4000);
      } else {
        alert(`Failed to uninstall extension: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Uninstall error: ${err.message}`);
    } finally {
      setIsUninstalling(false);
    }
  };

  const handleToggle = async () => {
    if (!data) return;
    const nextState = !data.enabled;
    try {
      const success = await api.toggleExtension(data.id, nextState);
      if (success) {
        setData((prev) => (prev ? { ...prev, enabled: nextState } : prev));
      }
    } catch (err: any) {
      alert(`Error toggling extension: ${err.message}`);
    }
  };

  const handleCopyId = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (isLoading) {
    return (
      <div
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--vscode-editor-background, var(--bg-main))',
          color: 'var(--vscode-foreground, var(--text-secondary))',
          gap: 12,
        }}
      >
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
        <span style={{ fontSize: 13, fontWeight: 500 }}>Loading extension details for {extensionId}...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--vscode-editor-background, var(--bg-main))',
          color: 'var(--vscode-foreground, var(--text-secondary))',
          padding: 20,
          gap: 12,
          textAlign: 'center',
        }}
      >
        <AlertCircle size={32} style={{ color: 'var(--color-danger)' }} />
        <h3 style={{ fontSize: 16, color: 'var(--text-primary)' }}>Failed to load extension details</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 400 }}>{error}</p>
        <button
          onClick={() => loadData(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 4,
            fontSize: 12,
            backgroundColor: 'var(--accent-primary)',
            color: '#FFF',
            border: 'none',
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          <RefreshCw size={12} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const formatDownloads = (num: number) => {
    if (!num) return '0';
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const renderRatingStars = (rating?: number) => {
    if (rating === undefined || rating === null || rating <= 0) return null;
    const fullStars = Math.round(rating);
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#F59E0B' }}
        title={`Average rating: ${rating.toFixed(1)} / 5 (${data.reviewCount || 0} reviews)`}
      >
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={12}
            fill={s <= fullStars ? '#F59E0B' : 'transparent'}
            style={{ opacity: s <= fullStars ? 1 : 0.4 }}
          />
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 3 }}>
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  return (
    <div
      style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--vscode-editor-background, var(--bg-main))',
        color: 'var(--vscode-foreground, var(--text-primary))',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Top Success Banner */}
      {actionSuccessMessage && (
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
            color: 'var(--color-success)',
            padding: '6px 16px',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={14} />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Indeterminate Progress Bar during downloading, installing or uninstalling */}
      {(isInstalling || isUninstalling) && <div className="progress-bar-indeterminate" />}

      {/* ================= TOP HEADER BAR ================= */}
      <div
        style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-panel)',
          display: 'flex',
          gap: 18,
          alignItems: 'flex-start',
        }}
      >
        {/* Extension Icon (56x56px) */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 8,
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary)',
            flexShrink: 0,
            overflow: 'hidden',
            padding: 6,
            boxSizing: 'border-box',
          }}
        >
          {data.iconUrl && !iconError ? (
            <img
              src={data.iconUrl.trim().startsWith('<svg') ? `data:image/svg+xml;utf8,${encodeURIComponent(data.iconUrl.trim())}` : data.iconUrl}
              alt={data.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={() => setIconError(true)}
            />
          ) : (
            <Puzzle size={28} />
          )}
        </div>

        {/* Header Metadata & Actions */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                margin: 0,
                color: 'var(--text-primary)',
                letterSpacing: '-0.3px',
              }}
            >
              {data.displayName}
            </h1>
            <span
              style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              v{data.version}
            </span>
          </div>

          {/* Publisher & Quick Stats */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginTop: 6,
              fontSize: 12,
              color: 'var(--text-secondary)',
              flexWrap: 'wrap',
            }}
          >
            {/* Publisher with Verified Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {data.publisherDisplayName || data.publisher}
              </span>
              {data.verified && (
                <span title="Verified Publisher" style={{ display: 'flex', color: '#38BDF8' }}>
                  <ShieldCheck size={14} />
                </span>
              )}
            </div>

            {/* Downloads */}
            {data.downloads > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Download size={12} style={{ color: 'var(--text-muted)' }} />
                <span>{formatDownloads(data.downloads)} installs</span>
              </div>
            )}

            {/* Stars */}
            {renderRatingStars(data.rating)}

            {/* License */}
            {data.license && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Scale size={12} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{data.license}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              margin: '8px 0 14px',
              lineHeight: 1.45,
              maxWidth: 720,
            }}
          >
            {data.description || 'No description provided.'}
          </p>

          {/* Dynamic Action Triggers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {!data.installed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 160 }}>
                <button
                  onClick={handleInstall}
                  disabled={isInstalling || Boolean(installProgress && installProgress.stage !== 'error')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '6px 18px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: 'var(--vscode-button-background, var(--accent-primary))',
                    color: 'var(--vscode-button-foreground, #FFF)',
                    border: 'none',
                    cursor: (isInstalling || installProgress) ? 'default' : 'pointer',
                    opacity: (isInstalling || installProgress) ? 0.85 : 1,
                  }}
                >
                  {(isInstalling || (installProgress && installProgress.stage !== 'error')) ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>
                        {installProgress?.stage === 'downloading'
                          ? `Downloading ${installProgress.progress}%`
                          : installProgress?.stage === 'validating'
                          ? 'Validating...'
                          : installProgress?.stage === 'extracting'
                          ? `Extracting ${installProgress.progress}%`
                          : 'Installing...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Download size={13} />
                      <span>Install</span>
                    </>
                  )}
                </button>

                {/* Progress bar during install */}
                {(isInstalling || (installProgress && installProgress.stage !== 'error')) && (
                  <div
                    style={{
                      width: '100%',
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${installProgress?.progress ?? 25}%`,
                        backgroundColor: 'var(--accent-primary)',
                        borderRadius: 2,
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              data.installed && (
                <>
                  {/* Enable / Disable Button */}
                  <button
                    onClick={handleToggle}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: data.enabled ? 'rgba(16, 185, 129, 0.15)' : '#1E2430',
                      color: data.enabled ? 'var(--color-success)' : 'var(--text-muted)',
                      border: data.enabled ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Power size={12} />
                    <span>{data.enabled ? 'Disable' : 'Enable'}</span>
                  </button>

                  {/* Uninstall Button */}
                  {data.source !== 'builtin' && (
                    <button
                      onClick={handleUninstall}
                      disabled={isUninstalling}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        color: '#F87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        cursor: isUninstalling ? 'default' : 'pointer',
                        opacity: isUninstalling ? 0.7 : 1,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isUninstalling) e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.22)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
                      }}
                    >
                      {isUninstalling ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Uninstalling...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 size={12} />
                          <span>Uninstall</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )
            )}

            {/* Quick reload indicator if needed */}
            <button
              onClick={() => loadData(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 6,
                display: 'flex',
                alignItems: 'center',
              }}
              title="Refresh extension details"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ================= TAB NAVIGATION BAR ================= */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-panel)',
          gap: 16,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '9px 4px',
            fontSize: 12,
            fontWeight: 600,
            color: activeTab === 'overview' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'overview' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
          }}
        >
          <FileText size={13} />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('contributions')}
          style={{
            padding: '9px 4px',
            fontSize: 12,
            fontWeight: 600,
            color: activeTab === 'contributions' ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'contributions' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
          }}
        >
          <Sliders size={13} />
          <span>Feature Contributions</span>
          {data.contributes && (
            <span
              style={{
                fontSize: 10,
                padding: '1px 5px',
                borderRadius: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--text-secondary)',
              }}
            >
              {(data.contributes.commands?.length || 0) +
                (Array.isArray(data.contributes.configuration)
                  ? data.contributes.configuration.reduce((acc, c) => acc + Object.keys(c.properties || {}).length, 0)
                  : Object.keys(data.contributes.configuration?.properties || {}).length)}
            </span>
          )}
        </button>

        {data.changelogMarkdown && (
          <button
            onClick={() => setActiveTab('changelog')}
            style={{
              padding: '9px 4px',
              fontSize: 12,
              fontWeight: 600,
              color: activeTab === 'changelog' ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'changelog' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
            }}
          >
            <History size={13} />
            <span>Changelog</span>
          </button>
        )}
      </div>

      {/* ================= MAIN SPLIT CONTENT AREA ================= */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Left Column: Markdown / Contributions */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '24px 32px',
            backgroundColor: 'var(--vscode-editor-background, var(--bg-main))',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          {activeTab === 'overview' && (
            <MarkdownRenderer content={data.readmeMarkdown} />
          )}

          {activeTab === 'contributions' && (
            <ExtensionContributionsTab
              contributes={data.contributes}
              extensionName={data.displayName}
            />
          )}

          {activeTab === 'changelog' && (
            <MarkdownRenderer content={data.changelogMarkdown || '# Changelog\n\nNo changelog available.'} />
          )}
        </div>

        {/* ================= RIGHT-SIDE METADATA COLUMN ================= */}
        <div
          style={{
            width: 280,
            borderLeft: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-panel)',
            overflowY: 'auto',
            padding: '20px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          {/* Resources */}
          <div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: 8,
              }}
            >
              Resources
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {data.repository && (
                <a
                  href={data.repository}
                  onClick={(e) => {
                    e.preventDefault();
                    api.openExternalUrl(data.repository!);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--accent-primary)',
                    textDecoration: 'none',
                  }}
                >
                  <Github size={13} />
                  <span>Repository</span>
                  <ExternalLink size={10} style={{ opacity: 0.6 }} />
                </a>
              )}

              {data.homepage && (
                <a
                  href={data.homepage}
                  onClick={(e) => {
                    e.preventDefault();
                    api.openExternalUrl(data.homepage!);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--accent-primary)',
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={13} />
                  <span>Homepage</span>
                </a>
              )}

              <a
                href={`https://open-vsx.org/extension/${data.namespace}/${data.name}`}
                onClick={(e) => {
                  e.preventDefault();
                  api.openExternalUrl(`https://open-vsx.org/extension/${data.namespace}/${data.name}`);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--accent-primary)',
                  textDecoration: 'none',
                }}
              >
                <Layers size={13} />
                <span>Open VSX Registry</span>
                <ExternalLink size={10} style={{ opacity: 0.6 }} />
              </a>
            </div>
          </div>

          {/* More Info */}
          <div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: 8,
              }}
            >
              More Info
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11 }}>Published By</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {data.publisherDisplayName || data.publisher}
                </span>
              </div>

              {data.lastUpdated && (
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11 }}>Last Updated</span>
                  <span style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={11} style={{ color: 'var(--text-muted)' }} />
                    {data.lastUpdated}
                  </span>
                </div>
              )}

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11, marginBottom: 4 }}>Identifier</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <code
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: '#9CDCFE',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      padding: '3px 7px',
                      borderRadius: 4,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      userSelect: 'all',
                    }}
                  >
                    {data.id}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(data.id);
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 2000);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedId ? 'var(--color-success)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 2,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title={copiedId ? 'Copied!' : 'Copy Extension Identifier'}
                  >
                    {copiedId ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              {data.license && (
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11 }}>License</span>
                  <span style={{ color: 'var(--text-primary)' }}>{data.license}</span>
                </div>
              )}
            </div>
          </div>

          {/* Categories */}
          {data.categories && data.categories.length > 0 && (
            <div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                Categories
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {data.categories.map((cat) => (
                  <span
                    key={cat}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 4,
                      backgroundColor: 'rgba(59, 130, 246, 0.12)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {data.tags && data.tags.length > 0 && (
            <div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                Tags
              </span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {data.tags.slice(0, 16).map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 3,
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
