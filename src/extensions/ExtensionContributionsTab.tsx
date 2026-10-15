import React, { useState, useMemo } from 'react';
import {
  Search,
  Terminal,
  Sliders,
  Keyboard,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Info,
  Copy,
  Check,
} from 'lucide-react';
import { ExtensionContributions, ContributedCommand, ContributedConfigurationProperty } from './ExtensionDetailService';

interface ExtensionContributionsTabProps {
  contributes?: ExtensionContributions;
  extensionName: string;
}

export const ExtensionContributionsTab: React.FC<ExtensionContributionsTabProps> = ({
  contributes,
  extensionName,
}) => {
  const [activeSubSection, setActiveSubSection] = useState<'all' | 'commands' | 'settings' | 'keybindings'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Normalize commands
  const commands: ContributedCommand[] = useMemo(() => {
    return contributes?.commands || [];
  }, [contributes]);

  // Normalize settings/configuration
  const settingsList = useMemo(() => {
    const list: Array<{
      key: string;
      property: ContributedConfigurationProperty;
      sectionTitle?: string;
    }> = [];

    const configs = contributes?.configuration;
    if (!configs) return list;

    const configArray = Array.isArray(configs) ? configs : [configs];
    for (const cfg of configArray) {
      if (cfg.properties) {
        for (const [key, prop] of Object.entries(cfg.properties)) {
          list.push({
            key,
            property: prop,
            sectionTitle: cfg.title,
          });
        }
      }
    }

    return list;
  }, [contributes]);

  // Normalize keybindings
  const keybindings = useMemo(() => {
    return contributes?.keybindings || [];
  }, [contributes]);

  // Filter commands
  const filteredCommands = useMemo(() => {
    if (!searchQuery) return commands;
    const q = searchQuery.toLowerCase();
    return commands.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.command?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
    );
  }, [commands, searchQuery]);

  // Filter settings
  const filteredSettings = useMemo(() => {
    if (!searchQuery) return settingsList;
    const q = searchQuery.toLowerCase();
    return settingsList.filter(
      (s) =>
        s.key.toLowerCase().includes(q) ||
        s.property.description?.toLowerCase().includes(q) ||
        s.property.markdownDescription?.toLowerCase().includes(q)
    );
  }, [settingsList, searchQuery]);

  // Filter keybindings
  const filteredKeybindings = useMemo(() => {
    if (!searchQuery) return keybindings;
    const q = searchQuery.toLowerCase();
    return keybindings.filter(
      (k) =>
        k.command?.toLowerCase().includes(q) ||
        k.key?.toLowerCase().includes(q) ||
        k.when?.toLowerCase().includes(q)
    );
  }, [keybindings, searchQuery]);

  const hasAnyContributions = commands.length > 0 || settingsList.length > 0 || keybindings.length > 0;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  if (!hasAnyContributions) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}
      >
        <Sparkles size={36} style={{ marginBottom: 12, opacity: 0.5 }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
          No Feature Contributions
        </span>
        <p style={{ fontSize: 12, maxWidth: 360, marginTop: 6, lineHeight: 1.5 }}>
          {extensionName} does not register any explicit commands, configuration settings, or keybindings in its package manifest.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sub-header Filter & Tab Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 12,
        }}
      >
        {/* Pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setActiveSubSection('all')}
            style={{
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: activeSubSection === 'all' ? 'var(--accent-primary)' : '#161A22',
              color: activeSubSection === 'all' ? '#FFF' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            All Contributions
          </button>

          {commands.length > 0 && (
            <button
              onClick={() => setActiveSubSection('commands')}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                backgroundColor: activeSubSection === 'commands' ? 'var(--accent-primary)' : '#161A22',
                color: activeSubSection === 'commands' ? '#FFF' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Terminal size={12} />
              <span>Commands ({commands.length})</span>
            </button>
          )}

          {settingsList.length > 0 && (
            <button
              onClick={() => setActiveSubSection('settings')}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                backgroundColor: activeSubSection === 'settings' ? 'var(--accent-primary)' : '#161A22',
                color: activeSubSection === 'settings' ? '#FFF' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Sliders size={12} />
              <span>Settings ({settingsList.length})</span>
            </button>
          )}

          {keybindings.length > 0 && (
            <button
              onClick={() => setActiveSubSection('keybindings')}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                backgroundColor: activeSubSection === 'keybindings' ? 'var(--accent-primary)' : '#161A22',
                color: activeSubSection === 'keybindings' ? '#FFF' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Keyboard size={12} />
              <span>Keybindings ({keybindings.length})</span>
            </button>
          )}
        </div>

        {/* Filter Input */}
        <div style={{ position: 'relative', width: 220, display: 'flex', alignItems: 'center' }}>
          <Search size={12} style={{ position: 'absolute', left: 8, color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Filter contributions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 26,
              paddingRight: 8,
              height: 26,
              fontSize: 11,
              backgroundColor: '#0A0D12',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* ================= COMMANDS SECTION ================= */}
      {(activeSubSection === 'all' || activeSubSection === 'commands') && commands.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Terminal size={14} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Contributed Commands
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({commands.length})</span>
          </div>

          {filteredCommands.length === 0 ? (
            <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 11 }}>
              No commands matching "{searchQuery}".
            </div>
          ) : (
            <div
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                overflow: 'hidden',
                backgroundColor: '#0D0F12',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#131822', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)', width: '40%' }}>
                      Command Title
                    </th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)', width: '40%' }}>
                      Command Identifier
                    </th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)', width: '20%' }}>
                      Category
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCommands.map((cmd) => (
                    <tr
                      key={cmd.command}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '8px 12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {cmd.title || cmd.command}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#9CDCFE' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{cmd.command}</span>
                          <button
                            onClick={() => copyToClipboard(cmd.command, cmd.command)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: copiedId === cmd.command ? 'var(--color-success)' : 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: 2,
                            }}
                            title="Copy command ID"
                          >
                            {copiedId === cmd.command ? <Check size={11} /> : <Copy size={11} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                        {cmd.category ? (
                          <span
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              padding: '2px 6px',
                              borderRadius: 3,
                              fontSize: 10,
                            }}
                          >
                            {cmd.category}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= SETTINGS CONFIGURATION SECTION ================= */}
      {(activeSubSection === 'all' || activeSubSection === 'settings') && settingsList.length > 0 && (
        <div style={{ marginTop: activeSubSection === 'all' ? 12 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Sliders size={14} style={{ color: '#C084FC' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Configuration Settings
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({settingsList.length})</span>
          </div>

          {filteredSettings.length === 0 ? (
            <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 11 }}>
              No settings matching "{searchQuery}".
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredSettings.map(({ key, property, sectionTitle }) => (
                <div
                  key={key}
                  style={{
                    backgroundColor: '#0D0F12',
                    border: '1px solid var(--border-color)',
                    borderRadius: 6,
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <code
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#569CD6',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {key}
                      </code>
                      <button
                        onClick={() => copyToClipboard(key, key)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: copiedId === key ? 'var(--color-success)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 2,
                        }}
                        title="Copy setting name"
                      >
                        {copiedId === key ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {property.type && (
                        <span
                          style={{
                            fontSize: 10,
                            fontFamily: 'var(--font-mono)',
                            color: '#4EC9B0',
                            backgroundColor: 'rgba(78, 201, 176, 0.1)',
                            padding: '1px 6px',
                            borderRadius: 3,
                          }}
                        >
                          {property.type}
                        </span>
                      )}
                      {sectionTitle && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {sectionTitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 6px', lineHeight: 1.4 }}>
                    {property.description || property.markdownDescription || 'No description provided.'}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
                    {property.default !== undefined && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                        <span>Default:</span>
                        <code
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: '#CE9178',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            padding: '1px 5px',
                            borderRadius: 3,
                          }}
                        >
                          {JSON.stringify(property.default)}
                        </code>
                      </div>
                    )}

                    {property.enum && property.enum.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                        <span>Options:</span>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {property.enum.map((opt) => (
                            <span
                              key={String(opt)}
                              style={{
                                fontSize: 10,
                                fontFamily: 'var(--font-mono)',
                                color: '#DCDCAA',
                                backgroundColor: 'rgba(220, 220, 170, 0.1)',
                                padding: '1px 4px',
                                borderRadius: 3,
                              }}
                            >
                              {String(opt)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= KEYBINDINGS SECTION ================= */}
      {(activeSubSection === 'all' || activeSubSection === 'keybindings') && keybindings.length > 0 && (
        <div style={{ marginTop: activeSubSection === 'all' ? 12 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Keyboard size={14} style={{ color: '#10B981' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Default Keybindings
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({keybindings.length})</span>
          </div>

          {filteredKeybindings.length === 0 ? (
            <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 11 }}>
              No keybindings matching "{searchQuery}".
            </div>
          ) : (
            <div
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                overflow: 'hidden',
                backgroundColor: '#0D0F12',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#131822', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)', width: '35%' }}>
                      Command
                    </th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)', width: '30%' }}>
                      Keybinding
                    </th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)', width: '35%' }}>
                      When Context
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeybindings.map((kb, idx) => (
                    <tr
                      key={`${kb.command}_${idx}`}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    >
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#9CDCFE' }}>
                        {kb.command}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <kbd
                          style={{
                            backgroundColor: '#1E2430',
                            border: '1px solid var(--border-color)',
                            borderRadius: 4,
                            padding: '2px 7px',
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
                          }}
                        >
                          {kb.key || kb.win || kb.mac}
                        </kbd>
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                        {kb.when || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
