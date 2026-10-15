import React from 'react';
import { useSettings, settingsStore } from '../../state/settingsStore';
import { SettingRow, SettingSectionHeader, ToggleSwitch } from '../components/SettingRow';

interface Props {
  scope: 'user' | 'workspace';
}

export const TerminalSettings: React.FC<Props> = ({ scope }) => {
  const settings = useSettings();
  const terminal = settings.terminal || {
    defaultShell: 'powershell',
    fontSize: 13,
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    lineHeight: 18,
    cursorStyle: 'block',
    cursorBlink: true,
    scrollback: 5000,
    workingDirectory: 'workspace',
    copyOnSelect: true,
  };

  const update = (field: string, val: any) => {
    settingsStore.updateSettings({
      terminal: { ...terminal, [field]: val },
    }, scope);
  };

  return (
    <div>
      <SettingSectionHeader
        title="Terminal Shell & Environment"
        subtitle="Manage the integrated terminal shell profile, working directory, and PTY processes"
      />

      <SettingRow
        title="Default Shell Profile"
        description="The default command shell spawned when opening a new integrated terminal tab."
      >
        <select
          value={terminal.defaultShell || 'powershell'}
          onChange={(e) => update('defaultShell', e.target.value)}
          style={{ width: '100%', maxWidth: 220, minWidth: 140, height: 28 }}
        >
          <option value="powershell">Windows PowerShell</option>
          <option value="cmd">Command Prompt (cmd.exe)</option>
          <option value="bash">Git Bash / Bash</option>
        </select>
      </SettingRow>

      <SettingRow
        title="Initial Working Directory"
        description="Where newly created terminal tabs should start by default."
      >
        <select
          value={terminal.workingDirectory || 'workspace'}
          onChange={(e) => update('workingDirectory', e.target.value)}
          style={{ width: '100%', maxWidth: 220, minWidth: 140, height: 28 }}
        >
          <option value="workspace">Workspace Root Directory</option>
          <option value="home">User Home Directory</option>
          <option value="custom">Custom Specified Directory</option>
        </select>
      </SettingRow>

      {terminal.workingDirectory === 'custom' && (
        <SettingRow
          title="Custom Working Directory Path"
          description="Absolute path to use as the current working directory for new terminals."
        >
          <input
            type="text"
            placeholder="C:\my\custom\path"
            value={terminal.customCwd || ''}
            onChange={(e) => update('customCwd', e.target.value)}
            style={{ width: '100%', maxWidth: 280, minWidth: 160, height: 28 }}
          />
        </SettingRow>
      )}

      <SettingSectionHeader
        title="Terminal Visuals & Buffer"
        subtitle="Configure font dimensions, cursor styles, and scrollback memory"
      />

      <SettingRow
        title="Terminal Font Family"
        description="Font family used inside the integrated terminal instance."
      >
        <input
          type="text"
          value={terminal.fontFamily || "'JetBrains Mono', Consolas, monospace"}
          onChange={(e) => update('fontFamily', e.target.value)}
          style={{ width: '100%', maxWidth: 260, minWidth: 160, height: 28 }}
        />
      </SettingRow>

      <SettingRow
        title="Terminal Font Size"
        description="Font size in pixels for terminal output (default: 13px)."
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="range"
            min={10}
            max={24}
            value={terminal.fontSize || 13}
            onChange={(e) => update('fontSize', parseInt(e.target.value, 10))}
            style={{ width: 120 }}
          />
          <span style={{ fontSize: 12, minWidth: 35, textAlign: 'right' }}>
            {terminal.fontSize || 13}px
          </span>
        </div>
      </SettingRow>

      <SettingRow
        title="Cursor Style"
        description="Visual style of the terminal cursor."
      >
        <select
          value={terminal.cursorStyle || 'block'}
          onChange={(e) => update('cursorStyle', e.target.value)}
          style={{ width: 140, height: 28 }}
        >
          <option value="block">Block</option>
          <option value="underline">Underline</option>
          <option value="bar">Vertical Bar</option>
        </select>
      </SettingRow>

      <SettingRow
        title="Cursor Blinking"
        description="Enable smooth blinking animation for the terminal cursor."
      >
        <ToggleSwitch
          checked={terminal.cursorBlink !== false}
          onChange={(v) => update('cursorBlink', v)}
        />
      </SettingRow>

      <SettingRow
        title="Scrollback Buffer Lines"
        description="The maximum number of lines kept in the terminal scrollback history."
      >
        <input
          type="number"
          min={500}
          max={50000}
          step={500}
          value={terminal.scrollback || 5000}
          onChange={(e) => update('scrollback', parseInt(e.target.value, 10) || 5000)}
          style={{ width: 120, height: 28 }}
        />
      </SettingRow>

      <SettingRow
        title="Copy on Select"
        description="Automatically copy selected terminal text directly to clipboard without needing Ctrl+Shift+C."
      >
        <ToggleSwitch
          checked={terminal.copyOnSelect !== false}
          onChange={(v) => update('copyOnSelect', v)}
        />
      </SettingRow>
    </div>
  );
};
