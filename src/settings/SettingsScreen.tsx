import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Sliders,
  Palette,
  Code2,
  FolderTree,
  Terminal,
  Keyboard,
  Puzzle,
  Bot,
  Shield,
  Briefcase,
  RotateCcw,
  X,
  Check,
  Cpu,
} from 'lucide-react';
import { useLayout, layoutStore } from '../state/layoutStore';
import { useWorkspace } from '../state/workspaceStore';
import { settingsStore } from '../state/settingsStore';
import { SETTINGS_CATALOG } from './settingsCatalog';
import { SettingsSearchContext } from './components/SettingRow';

// ── Lazy-load settings categories on-demand ─────────────────────────────────
const GeneralSettings = React.lazy(() => import('./categories/GeneralSettings').then(m => ({ default: m.GeneralSettings })));
const AppearanceSettings = React.lazy(() => import('./categories/AppearanceSettings').then(m => ({ default: m.AppearanceSettings })));
const EditorSettings = React.lazy(() => import('./categories/EditorSettings').then(m => ({ default: m.EditorSettings })));
const FilesSettings = React.lazy(() => import('./categories/FilesSettings').then(m => ({ default: m.FilesSettings })));
const TerminalSettings = React.lazy(() => import('./categories/TerminalSettings').then(m => ({ default: m.TerminalSettings })));
const KeyboardShortcutsSettings = React.lazy(() => import('./categories/KeyboardShortcutsSettings').then(m => ({ default: m.KeyboardShortcutsSettings })));
const ExtensionsSettings = React.lazy(() => import('./categories/ExtensionsSettings').then(m => ({ default: m.ExtensionsSettings })));
const AISettingsView = React.lazy(() => import('./categories/AISettingsView').then(m => ({ default: m.AISettingsView })));
const SecuritySettings = React.lazy(() => import('./categories/SecuritySettings').then(m => ({ default: m.SecuritySettings })));
const WorkspaceSettings = React.lazy(() => import('./categories/WorkspaceSettings').then(m => ({ default: m.WorkspaceSettings })));
const CppToolchainSettings = React.lazy(() => import('./categories/CppToolchainSettings').then(m => ({ default: m.CppToolchainSettings })));

const CategoryFallback: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 0' }}>
    <div style={{ width: 140, height: 18, backgroundColor: 'var(--bg-card)', borderRadius: 4, opacity: 0.7 }} />
    <div style={{ width: '100%', height: 44, backgroundColor: 'var(--bg-card)', borderRadius: 4, opacity: 0.5 }} />
    <div style={{ width: '100%', height: 44, backgroundColor: 'var(--bg-card)', borderRadius: 4, opacity: 0.3 }} />
  </div>
);


export type SettingsCategory =
  | 'general'
  | 'appearance'
  | 'editor'
  | 'files'
  | 'terminal'
  | 'keyboard'
  | 'extensions'
  | 'ai'
  | 'security'
  | 'workspace'
  | 'cpp';

interface CategoryItem {
  id: SettingsCategory;
  label: string;
  group: 'Preferences' | 'Tools & Features' | 'Environment';
  icon: React.ReactNode;
  keywords: string[];
}

const CATEGORIES: CategoryItem[] = [
  { id: 'general', label: 'General', group: 'Preferences', icon: <Sliders size={15} />, keywords: ['startup', 'confirm', 'autosave', 'telemetry'] },
  { id: 'appearance', label: 'Appearance', group: 'Preferences', icon: <Palette size={15} />, keywords: ['theme', 'scale', 'density', 'color', 'dark', 'midnight', 'cyber'] },
  { id: 'editor', label: 'Editor', group: 'Preferences', icon: <Code2 size={15} />, keywords: ['font', 'tab', 'indent', 'minimap', 'wordwrap', 'cursor', 'bracket', 'line'] },
  { id: 'files', label: 'Files', group: 'Preferences', icon: <FolderTree size={15} />, keywords: ['exclude', 'encoding', 'whitespace', 'newline', 'filesize'] },
  { id: 'terminal', label: 'Terminal', group: 'Preferences', icon: <Terminal size={15} />, keywords: ['shell', 'powershell', 'cmd', 'bash', 'font', 'scrollback', 'cwd'] },
  { id: 'cpp', label: 'C/C++ Toolchain', group: 'Tools & Features', icon: <Cpu size={15} />, keywords: ['c++', 'cpp', 'gcc', 'g++', 'gdb', 'compiler', 'debugger', 'toolchain', 'build', 'mingw'] },
  { id: 'keyboard', label: 'Keyboard Shortcuts', group: 'Tools & Features', icon: <Keyboard size={15} />, keywords: ['shortcut', 'keybinding', 'command', 'hotkey', 'conflict'] },
  { id: 'extensions', label: 'Extensions', group: 'Tools & Features', icon: <Puzzle size={15} />, keywords: ['plugin', 'addon', 'update', 'install', 'market'] },
  { id: 'ai', label: 'AI Configuration', group: 'Tools & Features', icon: <Bot size={15} />, keywords: ['openai', 'gemini', 'anthropic', 'ollama', 'model', 'api', 'key', 'prompt'] },
  { id: 'security', label: 'Security & Trust', group: 'Environment', icon: <Shield size={15} />, keywords: ['trust', 'sandbox', 'external', 'permission'] },
  { id: 'workspace', label: 'Workspace', group: 'Environment', icon: <Briefcase size={15} />, keywords: ['project', 'recent', 'folder', 'binary'] },
];

export const SettingsScreen: React.FC = () => {
  const { settingsCategory } = useLayout();
  const { workspacePath, folderName } = useWorkspace();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory | 'all'>(
    (settingsCategory as SettingsCategory) || 'general'
  );
  const previousCategoryRef = useRef<SettingsCategory>((settingsCategory as SettingsCategory) || 'general');
  const [scope, setScope] = useState<'user' | 'workspace'>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [resetConfirm, setResetConfirm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(900);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isNarrow = containerWidth < 700;

  useEffect(() => {
    if (settingsCategory && CATEGORIES.some((c) => c.id === settingsCategory)) {
      setActiveCategory(settingsCategory as SettingsCategory);
      previousCategoryRef.current = settingsCategory as SettingsCategory;
    }
  }, [settingsCategory]);

  // Handle Escape key to return to editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        layoutStore.closeSettings();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isSearching = searchQuery.trim().length > 0;
  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Find all matching settings items across the entire catalog
  const matchingCatalogItems = useMemo(() => {
    if (!normalizedQuery) return [];
    return SETTINGS_CATALOG.filter((item) => {
      return (
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery) ||
        item.category.toLowerCase().includes(normalizedQuery) ||
        (item.keywords && item.keywords.some((k) => k.toLowerCase().includes(normalizedQuery)))
      );
    });
  }, [normalizedQuery]);

  // Group counts by category
  const categoryMatchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of matchingCatalogItems) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, [matchingCatalogItems]);

  const totalMatchesCount = matchingCatalogItems.length;

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim()) {
      if (activeCategory !== 'all') {
        previousCategoryRef.current = activeCategory;
        setActiveCategory('all');
      }
    } else {
      setActiveCategory(previousCategoryRef.current || 'general');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveCategory(previousCategoryRef.current || 'general');
  };

  const handleResetCategory = async () => {
    if (activeCategory === 'all') return;
    await settingsStore.resetCategory(activeCategory as any, scope);
    setResetConfirm(true);
    setTimeout(() => setResetConfirm(false), 1500);
  };

  const filteredCategories = CATEGORIES.filter((cat) => {
    if (!isSearching) return true;
    const count = categoryMatchCounts[cat.id] || 0;
    if (count > 0) return true;
    return (
      cat.label.toLowerCase().includes(normalizedQuery) ||
      cat.keywords.some((k) => k.toLowerCase().includes(normalizedQuery))
    );
  });

  // Group filtered categories
  const groups: Array<{ name: string; items: CategoryItem[] }> = [
    { name: 'Preferences', items: filteredCategories.filter((c) => c.group === 'Preferences') },
    { name: 'Tools & Features', items: filteredCategories.filter((c) => c.group === 'Tools & Features') },
    { name: 'Environment', items: filteredCategories.filter((c) => c.group === 'Environment') },
  ].filter((g) => g.items.length > 0);

  const renderCategoryView = (catId: SettingsCategory) => {
    let content: React.ReactNode = null;
    switch (catId) {
      case 'general':
        content = <GeneralSettings scope={scope} />;
        break;
      case 'appearance':
        content = <AppearanceSettings scope={scope} />;
        break;
      case 'editor':
        content = <EditorSettings scope={scope} />;
        break;
      case 'files':
        content = <FilesSettings scope={scope} />;
        break;
      case 'terminal':
        content = <TerminalSettings scope={scope} />;
        break;
      case 'keyboard':
        content = <KeyboardShortcutsSettings />;
        break;
      case 'extensions':
        content = <ExtensionsSettings scope={scope} />;
        break;
      case 'ai':
        content = <AISettingsView scope={scope} />;
        break;
      case 'security':
        content = <SecuritySettings scope={scope} />;
        break;
      case 'workspace':
        content = <WorkspaceSettings scope={scope} onSwitchScope={setScope} />;
        break;
      case 'cpp':
        content = <CppToolchainSettings />;
        break;
      default:
        content = <GeneralSettings scope={scope} />;
        break;
    }
    return (
      <React.Suspense fallback={<CategoryFallback />}>
        {content}
      </React.Suspense>
    );
  };

  const renderActiveCategoryContent = () => {
    if (isSearching) {
      if (totalMatchesCount === 0) {
        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                color: 'var(--text-muted)',
              }}
            >
              <Search size={22} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              No settings found
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 380, lineHeight: 1.5, marginBottom: 20 }}>
              No settings matching &ldquo;<span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{searchQuery}</span>&rdquo;.
              Try searching for general keywords like <span style={{ color: 'var(--accent-primary)' }}>font</span>, <span style={{ color: 'var(--accent-primary)' }}>theme</span>, <span style={{ color: 'var(--accent-primary)' }}>autosave</span>, or <span style={{ color: 'var(--accent-primary)' }}>terminal</span>.
            </div>
            <button
              onClick={handleClearSearch}
              style={{
                padding: '6px 14px',
                borderRadius: 4,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Clear Search Filter
            </button>
          </div>
        );
      }

      if (activeCategory === 'all') {
        const matchingCategories = CATEGORIES.filter((c) => (categoryMatchCounts[c.id] || 0) > 0);
        return (
          <div>
            {matchingCategories.map((cat) => (
              <div key={cat.id} style={{ marginBottom: 32 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    paddingBottom: 8,
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: 10,
                  }}
                >
                  <span style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center' }}>
                    {cat.icon}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {cat.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-muted)',
                      padding: '1px 7px',
                      borderRadius: 10,
                    }}
                  >
                    {categoryMatchCounts[cat.id]} {categoryMatchCounts[cat.id] === 1 ? 'match' : 'matches'}
                  </span>
                </div>
                {renderCategoryView(cat.id)}
              </div>
            ))}
          </div>
        );
      }
    }

    return renderCategoryView(activeCategory as SettingsCategory);
  };

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        minWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-primary)',
        overflowX: 'auto',
        overflowY: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          minHeight: 44,
          backgroundColor: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isNarrow ? '6px 12px' : '0 16px',
          gap: isNarrow ? 8 : 14,
          zIndex: 10,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        {/* Left: Back Button, Title, and Scope Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isNarrow ? 8 : 12, flexWrap: 'wrap', flexShrink: 0 }}>
          <button
            onClick={() => layoutStore.closeSettings()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              borderRadius: 4,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              transition: 'background 0.1s, border-color 0.1s',
            }}
            title="Return to Editor (Esc)"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
          >
            <ArrowLeft size={13} />
            <span>Back</span>
            <kbd
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-panel)',
                padding: '1px 4px',
                borderRadius: 3,
                marginLeft: 2,
              }}
            >
              Esc
            </kbd>
          </button>

          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '0.2px',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            Settings
          </span>

          <div style={{ width: 1, height: 16, backgroundColor: 'var(--border-color)', margin: '0 2px', flexShrink: 0 }} />

          {/* Left-Aligned Scope Toggle (User Settings | Workspace) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              padding: 2,
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setScope('user')}
              style={{
                padding: '3px 10px',
                borderRadius: 3,
                fontSize: 11,
                fontWeight: scope === 'user' ? 600 : 400,
                backgroundColor: scope === 'user' ? 'var(--bg-card)' : 'transparent',
                color: scope === 'user' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                transition: 'all 0.1s',
              }}
            >
              User
            </button>
            <button
              onClick={() => {
                if (workspacePath) setScope('workspace');
              }}
              disabled={!workspacePath}
              style={{
                padding: '3px 10px',
                borderRadius: 3,
                fontSize: 11,
                fontWeight: scope === 'workspace' ? 600 : 400,
                backgroundColor: scope === 'workspace' ? 'var(--bg-card)' : 'transparent',
                color: !workspacePath
                  ? 'var(--text-muted)'
                  : scope === 'workspace'
                  ? 'var(--text-primary)'
                  : 'var(--text-muted)',
                border: 'none',
                opacity: workspacePath ? 1 : 0.4,
                cursor: workspacePath ? 'pointer' : 'not-allowed',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                transition: 'all 0.1s',
              }}
              title={workspacePath ? `Settings for ${folderName}` : 'Open a workspace folder to configure workspace settings'}
            >
              Workspace {workspacePath ? (isNarrow ? '' : `(${folderName})`) : ''}
            </button>
          </div>
        </div>

        {/* Right: Search Filter Input */}
        <div
          style={{
            position: 'relative',
            width: isNarrow ? '100%' : 220,
            maxWidth: 260,
            minWidth: 120,
            flex: isNarrow ? '1 1 100%' : '1 1 140px',
          }}
        >
          <Search size={13} style={{ position: 'absolute', left: 9, top: 8, color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search settings…"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              width: '100%',
              height: 28,
              paddingLeft: 28,
              paddingRight: searchQuery ? 26 : 8,
              fontSize: 12,
              borderRadius: 4,
              backgroundColor: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              style={{
                position: 'absolute',
                right: 6,
                top: 5,
                color: 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Main Settings Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Categories Navigation Sidebar */}
        <div
          style={{
            width: isNarrow ? 52 : 220,
            backgroundColor: 'var(--bg-panel)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            padding: isNarrow ? '8px 4px' : '12px 8px',
            overflowY: 'auto',
            gap: isNarrow ? 8 : 16,
            flexShrink: 0,
            transition: 'width 0.2s ease',
          }}
        >
          {/* Top "All Results" Button during Active Search */}
          {isSearching && (
            <button
              onClick={() => setActiveCategory('all')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isNarrow ? 'center' : 'space-between',
                textAlign: isNarrow ? 'center' : 'left',
                width: '100%',
                gap: isNarrow ? 0 : 8,
                padding: isNarrow ? '8px 0' : '7px 10px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: activeCategory === 'all' ? 600 : 400,
                color: activeCategory === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
                backgroundColor: activeCategory === 'all' ? 'var(--bg-active)' : 'transparent',
                border: 'none',
                borderLeft: !isNarrow && activeCategory === 'all' ? '2px solid var(--accent-primary)' : 'none',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.1s, color 0.1s',
                boxSizing: 'border-box',
                marginBottom: 2,
              }}
              title={`All Search Results (${totalMatchesCount})`}
              onMouseEnter={(e) => {
                if (activeCategory !== 'all') {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeCategory !== 'all') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {isNarrow && activeCategory === 'all' && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 6,
                    bottom: 6,
                    width: 3,
                    borderRadius: '0 2px 2px 0',
                    backgroundColor: 'var(--accent-primary)',
                  }}
                />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: isNarrow ? 0 : 8, minWidth: 0 }}>
                <span
                  style={{
                    width: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: activeCategory === 'all' ? 'var(--accent-primary)' : 'var(--text-muted)',
                    flexShrink: 0,
                  }}
                >
                  <Search size={14} />
                </span>
                {!isNarrow && (
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    All Results
                  </span>
                )}
              </div>
              {!isNarrow && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 10,
                    backgroundColor: activeCategory === 'all' ? 'var(--accent-primary)' : 'var(--bg-card)',
                    color: activeCategory === 'all' ? '#FFFFFF' : 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    flexShrink: 0,
                  }}
                >
                  {totalMatchesCount}
                </span>
              )}
            </button>
          )}

          {groups.map((group, gIdx) => (
            <div key={group.name} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {!isNarrow ? (
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    padding: '4px 10px',
                    marginBottom: 2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {group.name}
                </div>
              ) : (
                gIdx > 0 && <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 6px' }} />
              )}

              {/* Category Nav Items */}
              {group.items.map((cat) => {
                const isActive = activeCategory === cat.id;
                const matchCount = categoryMatchCounts[cat.id] || 0;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      layoutStore.setSettingsCategory(cat.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isNarrow ? 'center' : 'flex-start',
                      textAlign: isNarrow ? 'center' : 'left',
                      width: '100%',
                      gap: isNarrow ? 0 : 8,
                      padding: isNarrow ? '8px 0' : '7px 10px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      backgroundColor: isActive ? 'var(--bg-active)' : 'transparent',
                      border: 'none',
                      borderLeft: !isNarrow && isActive ? '2px solid var(--accent-primary)' : 'none',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background 0.1s, color 0.1s',
                      boxSizing: 'border-box',
                    }}
                    title={isSearching && matchCount > 0 ? `${cat.label} (${matchCount} matches)` : cat.label}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }
                    }}
                  >
                    {isNarrow && isActive && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 6,
                          bottom: 6,
                          width: 3,
                          borderRadius: '0 2px 2px 0',
                          backgroundColor: 'var(--accent-primary)',
                        }}
                      />
                    )}
                    <span
                      style={{
                        width: 18,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                        flexShrink: 0,
                      }}
                    >
                      {cat.icon}
                    </span>
                    {!isNarrow && (
                      <span
                        style={{
                          flex: 1,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {cat.label}
                      </span>
                    )}
                    {isSearching && matchCount > 0 && !isNarrow && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '0 5px',
                          borderRadius: 10,
                          backgroundColor: isActive ? 'var(--accent-subtle)' : 'var(--bg-card)',
                          color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                          border: '1px solid var(--border-color)',
                          flexShrink: 0,
                        }}
                      >
                        {matchCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Right Detail Pane */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-main)',
            overflowY: 'auto',
            padding: isNarrow ? '16px 16px' : '24px 36px',
            minWidth: 0,
          }}
        >
          <div style={{ maxWidth: 840, width: '100%', margin: '0 auto' }}>
            <SettingsSearchContext.Provider value={{ searchQuery }}>
              {/* Category Header Row with Reset Action */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 12,
                  borderBottom: '1px solid var(--border-color)',
                  marginBottom: 20,
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
                    {activeCategory === 'all' ? (
                      <Search size={16} style={{ color: 'var(--accent-primary)' }} />
                    ) : (
                      CATEGORIES.find((c) => c.id === activeCategory)?.icon
                    )}
                  </span>

                  {isNarrow ? (
                    <select
                      value={activeCategory}
                      onChange={(e) => {
                        setActiveCategory(e.target.value as any);
                        if (e.target.value !== 'all') {
                          layoutStore.setSettingsCategory(e.target.value as any);
                        }
                      }}
                      style={{
                        height: 28,
                        fontSize: 13,
                        fontWeight: 600,
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        borderRadius: 4,
                        padding: '2px 8px',
                        maxWidth: 260,
                        minWidth: 160,
                        cursor: 'pointer',
                      }}
                      title="Change settings category"
                    >
                      {isSearching && (
                        <option value="all">All Results ({totalMatchesCount})</option>
                      )}
                      {filteredCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label} {categoryMatchCounts[c.id] ? `(${categoryMatchCounts[c.id]})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {isSearching && activeCategory === 'all'
                        ? `Search Results: ${totalMatchesCount} ${totalMatchesCount === 1 ? 'setting' : 'settings'} found`
                        : isSearching
                        ? `${CATEGORIES.find((c) => c.id === activeCategory)?.label} Settings (${categoryMatchCounts[activeCategory] || 0} matching)`
                        : `${CATEGORIES.find((c) => c.id === activeCategory)?.label} Settings`}
                    </span>
                  )}

                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      padding: '2px 6px',
                      borderRadius: 3,
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-color)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {scope === 'user' ? 'Global User Scope' : `Workspace: ${folderName || 'Current'}`}
                  </span>
                </div>

                {activeCategory !== 'all' && activeCategory !== 'keyboard' && (
                  <button
                    onClick={handleResetCategory}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 4,
                      fontSize: 11,
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: resetConfirm ? 'var(--color-success)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.1s',
                    }}
                    title="Reset this category's settings to factory defaults"
                  >
                    {resetConfirm ? <Check size={12} /> : <RotateCcw size={12} />}
                    <span>{resetConfirm ? 'Reset Complete' : 'Reset Category'}</span>
                  </button>
                )}
              </div>

              {/* Active Category Form View */}
              {renderActiveCategoryContent()}
            </SettingsSearchContext.Provider>
          </div>
        </div>
      </div>
    </div>
  );
};
