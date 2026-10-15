import React, { useState } from 'react';
import { AboutDialog } from './AboutDialog';
import {
  Minus,
  Square,
  X,
  Search,
  Bot,
  Terminal,
  PanelLeft,
  Settings as SettingsIcon,
  Play,
  SplitSquareHorizontal,
} from 'lucide-react';
import { api } from '../../services/api';
import { useWorkspace, workspaceStore } from '../../state/workspaceStore';
import { useLayout, layoutStore } from '../../state/layoutStore';
import { editorStore } from '../../state/editorStore';
import { executeCommand } from '../../state/keyboardShortcutsStore';

interface TitleBarProps {
  onOpenSettings?: () => void;
}

interface MenuItem {
  label?: string;
  shortcut?: string;
  action?: () => void;
  type?: 'separator';
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

function formatCompactShortcut(shortcut?: string): string {
  if (!shortcut) return '';
  return shortcut
    .replace(/Ctrl\+K\s+Ctrl\+/gi, 'Ctrl+K ')
    .replace(/Ctrl\+K\s+/gi, 'Ctrl+K ')
    .replace(/Shift/gi, '⇧')
    .replace(/Control/gi, 'Ctrl')
    .replace(/Down/gi, '↓')
    .replace(/Up/gi, '↑')
    .replace(/Left/gi, '←')
    .replace(/Right/gi, '→')
    .trim();
}

export const TitleBar: React.FC<TitleBarProps> = ({ onOpenSettings }) => {
  const { folderName, workspacePath } = useWorkspace();
  const { sidebarVisible, bottomPanelVisible, aiPanelVisible } = useLayout();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  const menus: MenuSection[] = [
    {
      title: 'File',
      items: [
        { label: 'New File', shortcut: 'Ctrl+N', action: () => executeCommand('file.new') },
        { label: 'Open File...', shortcut: 'Ctrl+O', action: () => executeCommand('file.openFile') },
        { label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O', action: () => executeCommand('file.openFolder') },
        { type: 'separator' },
        { label: 'Save', shortcut: 'Ctrl+S', action: () => executeCommand('file.save') },
        { label: 'Save All', shortcut: 'Ctrl+K S', action: () => executeCommand('file.saveAll') },
        { type: 'separator' },
        { label: 'Close Active Tab', shortcut: 'Ctrl+W', action: () => executeCommand('file.closeActiveTab') },
        { label: 'Close All Tabs', shortcut: 'Ctrl+K W', action: () => executeCommand('file.closeAllTabs') },
        { type: 'separator' },
        { label: 'Preferences: Settings', shortcut: 'Ctrl+,', action: () => layoutStore.openSettings() },
        { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S', action: () => layoutStore.openSettings('keyboard') },
      ],
    },
    {
      title: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => {} },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: () => {} },
        { type: 'separator' },
        { label: 'Cut', shortcut: 'Ctrl+X', action: () => {} },
        { label: 'Copy', shortcut: 'Ctrl+C', action: () => {} },
        { label: 'Paste', shortcut: 'Ctrl+V', action: () => {} },
        { type: 'separator' },
        { label: 'Find', shortcut: 'Ctrl+F', action: () => {} },
        { label: 'Replace', shortcut: 'Ctrl+H', action: () => {} },
      ],
    },
    {
      title: 'Selection',
      items: [
        { label: 'Select All', shortcut: 'Ctrl+A', action: () => {} },
        { label: 'Copy Line Down', shortcut: 'Shift+Alt+Down', action: () => {} },
      ],
    },
    {
      title: 'View',
      items: [
        { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: () => layoutStore.setCommandPaletteOpen(true) },
        { label: 'Quick Open...', shortcut: 'Ctrl+P', action: () => layoutStore.setQuickOpenOpen(true) },
        { type: 'separator' },
        { label: 'Show File Explorer', shortcut: 'Ctrl+Shift+E', action: () => layoutStore.setActiveActivityTab('explorer') },
        { label: 'Show Search in Files', shortcut: 'Ctrl+Shift+F', action: () => layoutStore.setActiveActivityTab('search') },
        { label: 'Show Source Control', shortcut: 'Ctrl+Shift+G', action: () => layoutStore.setActiveActivityTab('git') },
        { label: 'Show Extensions', shortcut: 'Ctrl+Shift+X', action: () => layoutStore.setActiveActivityTab('extensions') },
        { type: 'separator' },
        { label: 'Toggle Primary Sidebar', shortcut: 'Ctrl+B', action: () => layoutStore.toggleSidebar() },
        { label: 'Toggle Panel', shortcut: 'Ctrl+J', action: () => layoutStore.toggleBottomPanel() },
        { label: 'Toggle Binary AI', shortcut: 'Ctrl+Shift+A', action: () => layoutStore.toggleAIPanel() },
        { label: 'Toggle Zen Mode', shortcut: 'Ctrl+K Z', action: () => layoutStore.toggleZenMode() },
        { type: 'separator' },
        { label: 'Split Editor Right', shortcut: 'Ctrl+\\', action: () => editorStore.splitEditor('horizontal') },
        { label: 'Split Editor Down', action: () => editorStore.splitEditor('vertical') },
        { label: 'Toggle Split Orientation', action: () => editorStore.toggleSplitDirection() },
        { label: 'Single Editor (Turn Off Split)', action: () => editorStore.resetToSingle() },
      ],
    },
    {
      title: 'Run',
      items: [
        { label: 'Start Debugging', shortcut: 'F5', action: () => layoutStore.setActiveActivityTab('debug') },
        { label: 'Run Without Debugging', shortcut: 'Ctrl+F5', action: () => layoutStore.setBottomPanelTab('terminal') },
      ],
    },
    {
      title: 'Terminal',
      items: [
        { label: 'New Terminal', shortcut: 'Ctrl+Shift+`', action: () => executeCommand('terminal.new') },
        { label: 'Toggle Terminal', shortcut: 'Ctrl+`', action: () => executeCommand('view.toggleTerminal') },
      ],
    },
    {
      title: 'Help',
      items: [
        { label: 'Welcome Screen', action: () => workspaceStore.setWorkspace(null) },
        { label: 'Keyboard Shortcuts Reference', shortcut: 'Ctrl+K Ctrl+S', action: () => layoutStore.openSettings('keyboard') },
        { label: 'About Binary', action: () => setShowAbout(true) },
      ],
    },
  ];

  return (
    <>
    <div
      style={{
        height: 'var(--titlebar-height)',
        backgroundColor: 'var(--bg-titlebar)',
        borderBottom: '1px solid var(--border-titlebar)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        WebkitAppRegion: 'drag',
        fontSize: 12,
        zIndex: 50,
        position: 'relative',
      } as React.CSSProperties}
    >
      {/* Left: Brand & Menus */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              backgroundColor: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              fontWeight: 700,
              fontSize: 10,
            }}
          >
            01
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>BINARY</span>
        </div>

        {/* Menu Bar */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {menus.map((m) => (
            <div key={m.title} style={{ position: 'relative' }}>
              <button
                onClick={() => setActiveMenu(activeMenu === m.title ? null : m.title)}
                onMouseEnter={() => {
                  if (activeMenu) setActiveMenu(m.title);
                }}
                style={{
                  padding: '3px 7px',
                  borderRadius: 3,
                  fontSize: 12,
                  color: activeMenu === m.title ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: activeMenu === m.title ? 'var(--bg-active)' : 'transparent',
                }}
              >
                {m.title}
              </button>

              {/* Dropdown menu */}
              {activeMenu === m.title && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    onClick={() => setActiveMenu(null)}
                  />
                  <div
                    className="dropdown-menu animate-fade-in"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 4,
                      backgroundColor: 'var(--bg-menu)',
                      border: '1px solid var(--border-menu)',
                      borderRadius: 6,
                      boxShadow: 'var(--shadow-menu)',
                      minWidth: 230,
                      width: 'max-content',
                      maxWidth: 360,
                      padding: '4px 0',
                      zIndex: 100,
                    }}
                  >
                    {m.items.map((item, idx) => {
                      if (item.type === 'separator') {
                        return (
                          <div
                            key={idx}
                            style={{ height: 1, backgroundColor: 'var(--border-color)', margin: '4px 0' }}
                          />
                        );
                      }
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveMenu(null);
                            item.action?.();
                          }}
                          style={{
                            width: '100%',
                            padding: '5px 12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: 'var(--text-primary)',
                            fontSize: 12,
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            gap: 16,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{item.label}</span>
                          {item.shortcut && (
                            <span
                              style={{
                                fontSize: 10,
                                fontFamily: 'var(--font-mono)',
                                color: 'var(--text-muted)',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                padding: '1px 5px',
                                borderRadius: 3,
                                backgroundColor: 'var(--bg-panel-secondary)',
                                border: '1px solid var(--border-subtle)',
                                letterSpacing: '0.2px',
                              }}
                            >
                              {formatCompactShortcut(item.shortcut)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Center: Command / Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          WebkitAppRegion: 'no-drag',
          flex: 1,
          maxWidth: 420,
          margin: '0 16px',
        } as React.CSSProperties}
      >
        <button
          onClick={() => layoutStore.setCommandPaletteOpen(true)}
          style={{
            width: '100%',
            height: 24,
            backgroundColor: 'var(--bg-titlebar-search)',
            border: '1px solid var(--border-color)',
            borderRadius: 5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: 'var(--text-secondary)',
            fontSize: 11,
            padding: '0 12px',
          }}
          title="Search files or commands (Ctrl+Shift+P)"
        >
          <Search size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {folderName ? `${folderName}` : 'Binary'} — Code. Build. Execute.
          </span>
          <span
            style={{
              backgroundColor: 'var(--bg-titlebar-search-kbd)',
              border: '1px solid var(--border-subtle)',
              padding: '1px 5px',
              borderRadius: 3,
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              marginLeft: 'auto',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            Ctrl+P
          </span>
        </button>
      </div>

      {/* Right: Quick Toggles & Window Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Toggle AI Button (icon only) */}
        <button
          onClick={() => layoutStore.toggleAIPanel()}
          style={{
            width: 26,
            height: 24,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: aiPanelVisible ? 'var(--bg-active)' : 'transparent',
            color: aiPanelVisible ? 'var(--text-primary)' : 'var(--text-muted)',
            border: '1px solid var(--border-color)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Toggle Binary AI (Ctrl+Shift+A)"
          onMouseEnter={(e) => {
            if (!aiPanelVisible) e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            if (!aiPanelVisible) e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <Bot size={13} />
        </button>

        {/* Toggle Terminal Button */}
        <button
          onClick={() => layoutStore.toggleBottomPanel()}
          style={{
            padding: '4px 6px',
            borderRadius: 4,
            color: bottomPanelVisible ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
          title="Toggle Terminal (Ctrl+`)"
        >
          <Terminal size={14} />
        </button>

        {/* Toggle Sidebar Button */}
        <button
          onClick={() => layoutStore.toggleSidebar()}
          style={{
            padding: '4px 6px',
            borderRadius: 4,
            color: sidebarVisible ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
          title="Toggle Sidebar (Ctrl+B)"
        >
          <PanelLeft size={14} />
        </button>

        <div style={{ width: 1, height: 14, backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

        {/* Window controls */}
        <button
          onClick={() => api.minimizeWindow()}
          style={{ width: 28, height: 28, borderRadius: 3, color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="Minimize"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={() => api.maximizeWindow()}
          style={{ width: 28, height: 28, borderRadius: 3, color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="Maximize"
        >
          <Square size={11} />
        </button>
        <button
          onClick={() => api.closeWindow()}
          style={{ width: 28, height: 28, borderRadius: 3, color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#E11D48';
            e.currentTarget.style.color = '#FFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          title="Close"
        >
          <X size={13} />
        </button>
      </div>
    </div>

    <AboutDialog open={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
};
