import React from 'react';
import { useSettings, settingsStore } from '../../state/settingsStore';
import { SettingRow, SettingSectionHeader, ToggleSwitch, useSettingsSearch } from '../components/SettingRow';
import { ShieldCheck, AlertOctagon } from 'lucide-react';

interface Props {
  scope: 'user' | 'workspace';
}

export const SecuritySettings: React.FC<Props> = ({ scope }) => {
  const settings = useSettings();
  const { searchQuery } = useSettingsSearch();
  const security = settings.security || {
    trustWorkspace: true,
    allowNodeInTerminal: true,
    warnExternalLinks: true,
    isolateExtensionProcesses: false,
  };

  const update = (field: string, val: any) => {
    settingsStore.updateSettings({
      security: { ...security, [field]: val },
    }, scope);
  };

  const showTrustBanner =
    !searchQuery.trim() ||
    'trust workspace permissions security'.includes(searchQuery.toLowerCase().trim());

  return (
    <div>
      <SettingSectionHeader
        title="Security & Trust Policies"
        subtitle="Manage workspace execution privileges, external link safety, and process isolation"
      />

      {showTrustBanner && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 6,
            backgroundColor: security.trustWorkspace ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: security.trustWorkspace ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
          }}
        >
        {security.trustWorkspace ? (
          <ShieldCheck size={20} style={{ color: '#10B981', flexShrink: 0 }} />
        ) : (
          <AlertOctagon size={20} style={{ color: '#F59E0B', flexShrink: 0 }} />
        )}
        <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--text-primary)' }}>
          {security.trustWorkspace
            ? 'Workspace is currently Trusted. Real PTY terminal execution, file system modifications, and task runners are authorized.'
            : 'Restricted Mode: Scripts and external build commands will require explicit manual permission.'}
        </div>
        </div>
      )}

      <SettingRow
        title="Trust Current Workspace"
        description="Grants full execution rights to tasks, npm scripts, and terminal commands in opened directories."
      >
        <ToggleSwitch
          checked={security.trustWorkspace !== false}
          onChange={(v) => update('trustWorkspace', v)}
        />
      </SettingRow>

      <SettingRow
        title="Warn Before Opening External Links"
        description="Show a security prompt before launching URLs in the system web browser from terminal or editor links."
      >
        <ToggleSwitch
          checked={security.warnExternalLinks !== false}
          onChange={(v) => update('warnExternalLinks', v)}
        />
      </SettingRow>

      <SettingRow
        title="Isolate Extension Runtimes"
        description="Execute third-party extension handlers in separate sandboxed worker threads to isolate memory."
      >
        <ToggleSwitch
          checked={security.isolateExtensionProcesses === true}
          onChange={(v) => update('isolateExtensionProcesses', v)}
        />
      </SettingRow>
    </div>
  );
};
