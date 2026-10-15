import React from 'react';
import { useSettings, settingsStore } from '../../state/settingsStore';
import { SettingRow, SettingSectionHeader, ToggleSwitch } from '../components/SettingRow';
import { layoutStore } from '../../state/layoutStore';
import { Puzzle, ExternalLink } from 'lucide-react';

interface Props {
  scope: 'user' | 'workspace';
}

export const ExtensionsSettings: React.FC<Props> = ({ scope }) => {
  const settings = useSettings();
  const extensions = settings.extensions || {
    autoUpdate: true,
    autoEnable: true,
    confirmInstall: true,
    developerMode: false,
  };

  const update = (field: string, val: any) => {
    settingsStore.updateSettings({
      extensions: { ...extensions, [field]: val },
    }, scope);
  };

  return (
    <div>
      <SettingSectionHeader
        title="Extension Management"
        subtitle="Configure plugin installation and sandbox runtime"
      />

      <SettingRow
        title="Auto Enable on Install"
        description="Automatically activate and register extension capabilities immediately upon installation."
      >
        <ToggleSwitch
          checked={extensions.autoEnable !== false}
          onChange={(v) => update('autoEnable', v)}
        />
      </SettingRow>

      <SettingRow
        title="Confirm Before Install"
        description="Prompt for user approval before installing third-party packages or unfamiliar manifests."
      >
        <ToggleSwitch
          checked={extensions.confirmInstall !== false}
          onChange={(v) => update('confirmInstall', v)}
        />
      </SettingRow>

      <SettingRow
        title="Extension Developer Mode"
        description="Enable debug logging and hot-reload triggers for developing custom Binary extensions."
      >
        <ToggleSwitch
          checked={extensions.developerMode === true}
          onChange={(v) => update('developerMode', v)}
        />
      </SettingRow>

      <div
        style={{
          marginTop: 24,
          padding: 16,
          borderRadius: 6,
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200, flex: 1 }}>
          <Puzzle size={22} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
              Installed Extensions & Themes
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Manage active language servers, syntax highlighters, and theme plugins.
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            layoutStore.closeSettings();
            layoutStore.setActiveActivityTab('extensions');
          }}
          style={{
            padding: '6px 14px',
            borderRadius: 4,
            backgroundColor: 'var(--accent-primary)',
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <span>Open Extensions Panel</span>
          <ExternalLink size={13} />
        </button>
      </div>
    </div>
  );
};
