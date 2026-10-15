import React, { useState } from 'react';
import { Settings, Sliders, Terminal, Bot, Code2, Check } from 'lucide-react';
import { useSettings, settingsStore } from '../state/settingsStore';

export const SettingsView: React.FC = () => {
  const settings = useSettings();
  const [activeCategory, setActiveCategory] = useState<'general' | 'editor' | 'terminal' | 'ai'>('general');
  const [savedBadge, setSavedBadge] = useState(false);

  const triggerSavedNotice = () => {
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 1500);
  };

  const updateGeneral = (field: string, val: any) => {
    settingsStore.updateSettings({
      general: { ...settings.general, [field]: val },
    });
    triggerSavedNotice();
  };

  const updateEditor = (field: string, val: any) => {
    settingsStore.updateSettings({
      editor: { ...settings.editor, [field]: val },
    });
    triggerSavedNotice();
  };

  const updateTerminal = (field: string, val: any) => {
    settingsStore.updateSettings({
      terminal: { ...settings.terminal, [field]: val },
    });
    triggerSavedNotice();
  };

  const updateAI = (field: string, val: any) => {
    settingsStore.updateSettings({
      ai: { ...settings.ai, [field]: val },
    });
    triggerSavedNotice();
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-panel)',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>SETTINGS</span>
        {savedBadge && (
          <span style={{ fontSize: 10, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Check size={11} /> Saved
          </span>
        )}
      </div>

      {/* Tabs Row */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 8px', overflowX: 'auto' }}>
        {[
          { id: 'general', label: 'General', icon: <Sliders size={13} /> },
          { id: 'editor', label: 'Editor', icon: <Code2 size={13} /> },
          { id: 'terminal', label: 'Terminal', icon: <Terminal size={13} /> },
          { id: 'ai', label: 'AI', icon: <Bot size={13} /> },
        ].map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              style={{
                flex: 1,
                minWidth: 55,
                padding: '6px 4px',
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                gap: 4,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              title={tab.label}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Settings Form Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {activeCategory === 'general' && (
          <>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Theme
              </label>
              <select
                value={settings.general.theme}
                onChange={(e) => updateGeneral('theme', e.target.value)}
                style={{ width: '100%', height: 26 }}
              >
                <option value="binary-dark">Binary Dark (Default)</option>
                <option value="binary-light">Binary Light (Simple Light)</option>
                <option value="binary-midnight">Binary Midnight</option>
                <option value="binary-cyber">Binary Cyber (Slate)</option>
                <option value="binary-nord">Binary Nord</option>
                <option value="binary-monokai">Binary Monokai</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Auto Save
              </label>
              <select
                value={settings.general.autoSave}
                onChange={(e) => updateGeneral('autoSave', e.target.value)}
                style={{ width: '100%', height: 26 }}
              >
                <option value="off">Off</option>
                <option value="afterDelay">After Delay (1000ms)</option>
                <option value="onFocusChange">On Focus Change</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Font Family
              </label>
              <input
                type="text"
                value={settings.general.fontFamily}
                onChange={(e) => updateGeneral('fontFamily', e.target.value)}
                style={{ width: '100%', height: 26 }}
              />
            </div>
          </>
        )}

        {activeCategory === 'editor' && (
          <>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Font Size ({settings.editor.fontSize}px)
              </label>
              <input
                type="number"
                min={10}
                max={32}
                value={settings.editor.fontSize}
                onChange={(e) => updateEditor('fontSize', parseInt(e.target.value, 10))}
                style={{ width: '100%', height: 26 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Tab Size
              </label>
              <select
                value={settings.editor.tabSize}
                onChange={(e) => updateEditor('tabSize', parseInt(e.target.value, 10))}
                style={{ width: '100%', height: 26 }}
              >
                <option value={2}>2 Spaces</option>
                <option value={4}>4 Spaces</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Word Wrap
              </label>
              <select
                value={settings.editor.wordWrap}
                onChange={(e) => updateEditor('wordWrap', e.target.value)}
                style={{ width: '100%', height: 26 }}
              >
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Minimap</span>
              <input
                type="checkbox"
                checked={settings.editor.minimap}
                onChange={(e) => updateEditor('minimap', e.target.checked)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Sticky Scroll</span>
              <input
                type="checkbox"
                checked={settings.editor.stickyScroll}
                onChange={(e) => updateEditor('stickyScroll', e.target.checked)}
              />
            </div>
          </>
        )}

        {activeCategory === 'terminal' && (
          <>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Default Shell
              </label>
              <select
                value={settings.terminal.defaultShell}
                onChange={(e) => updateTerminal('defaultShell', e.target.value)}
                style={{ width: '100%', height: 26 }}
              >
                <option value="powershell">PowerShell</option>
                <option value="cmd">Command Prompt (CMD)</option>
                <option value="bash">Bash (if installed)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Terminal Font Size ({settings.terminal.fontSize}px)
              </label>
              <input
                type="number"
                min={10}
                max={24}
                value={settings.terminal.fontSize}
                onChange={(e) => updateTerminal('fontSize', parseInt(e.target.value, 10))}
                style={{ width: '100%', height: 26 }}
              />
            </div>
          </>
        )}

        {activeCategory === 'ai' && (
          <>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                AI Provider
              </label>
              <select
                value={settings.ai.provider}
                onChange={(e) => updateAI('provider', e.target.value)}
                style={{ width: '100%', height: 26 }}
              >
                <option value="builtin">Built-in Intelligent Engine (Offline)</option>
                <option value="openai">OpenAI Compatible API</option>
                <option value="ollama">Ollama (Local LLM)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                API Endpoint URL
              </label>
              <input
                type="text"
                value={settings.ai.endpoint}
                onChange={(e) => updateAI('endpoint', e.target.value)}
                placeholder="http://localhost:11434/v1"
                style={{ width: '100%', height: 26 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                API Key
              </label>
              <input
                type="password"
                value={settings.ai.apiKey}
                onChange={(e) => updateAI('apiKey', e.target.value)}
                placeholder="sk-..."
                style={{ width: '100%', height: 26 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Model
              </label>
              <input
                type="text"
                value={settings.ai.model}
                onChange={(e) => updateAI('model', e.target.value)}
                placeholder="gpt-4o, llama3, etc."
                style={{ width: '100%', height: 26 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Auto-Approve Safe Tools</span>
              <input
                type="checkbox"
                checked={settings.ai.autoApproveSafeTools}
                onChange={(e) => updateAI('autoApproveSafeTools', e.target.checked)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
