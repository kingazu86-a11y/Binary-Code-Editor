import React from 'react';
import { useSettings, settingsStore } from '../../state/settingsStore';
import { SettingRow, SettingSectionHeader, ToggleSwitch } from '../components/SettingRow';

interface Props {
  scope: 'user' | 'workspace';
}

export const GeneralSettings: React.FC<Props> = ({ scope }) => {
  const settings = useSettings();
  const general = settings.general;

  const update = (field: string, val: any) => {
    settingsStore.updateSettings({
      general: { ...general, [field]: val },
    }, scope);
  };

  return (
    <div>
      <SettingSectionHeader
        title="General Preferences"
        subtitle="Manage startup behavior, workspace defaults, and application telemetry"
      />

      <SettingRow
        title="Startup Action"
        description="Controls what view or files appear when Binary opens without arguments."
      >
        <select
          value={general.startupAction || 'welcome'}
          onChange={(e) => update('startupAction', e.target.value)}
          style={{ width: '100%', maxWidth: 200, minWidth: 140, height: 28 }}
        >
          <option value="welcome">Open Welcome Page</option>
          <option value="reopenLast">Reopen Last Project</option>
          <option value="empty">Empty Workspace</option>
        </select>
      </SettingRow>

      <SettingRow
        title="Confirm File & Folder Deletion"
        description="Show a confirmation warning dialog before deleting files or folders."
      >
        <ToggleSwitch
          checked={general.confirmDelete !== false}
          onChange={(v) => update('confirmDelete', v)}
        />
      </SettingRow>

      <SettingRow
        title="Delete Files Permanently"
        description="Bypass the OS Recycle Bin / Trash and permanently delete files from disk immediately when deleting."
      >
        <ToggleSwitch
          checked={general.deletePermanently === true}
          onChange={(v) => update('deletePermanently', v)}
        />
      </SettingRow>

      <SettingRow
        title="Auto Save Mode"
        description="Controls how dirty files are automatically saved to disk."
      >
        <select
          value={general.autoSave || 'afterDelay'}
          onChange={(e) => update('autoSave', e.target.value)}
          style={{ width: '100%', maxWidth: 200, minWidth: 140, height: 28 }}
        >
          <option value="off">Off (Manual Ctrl+S)</option>
          <option value="afterDelay">After Delay</option>
          <option value="onFocusChange">On Window Focus Change</option>
        </select>
      </SettingRow>

      {general.autoSave === 'afterDelay' && (
        <SettingRow
          title="Auto Save Delay"
          description="Delay in milliseconds after the last keystroke before saving dirty buffers (default: 1000ms)."
        >
          <input
            type="number"
            min={100}
            max={30000}
            step={100}
            value={general.autoSaveDelay || 1000}
            onChange={(e) => update('autoSaveDelay', parseInt(e.target.value, 10) || 1000)}
            style={{ width: 120, height: 28 }}
          />
        </SettingRow>
      )}

      <SettingRow
        title="Anonymous Telemetry"
        description="Help improve Binary by sending anonymous crash diagnostics. Binary never collects source code or file contents."
      >
        <ToggleSwitch
          checked={general.telemetry === true}
          onChange={(v) => update('telemetry', v)}
        />
      </SettingRow>

      <SettingRow
        title="Default Projects Directory"
        description="Default folder path opened when clicking 'New Project' or 'Open Folder'."
      >
        <input
          type="text"
          placeholder="e.g. C:\Users\Projects"
          value={general.defaultProjectDir || ''}
          onChange={(e) => update('defaultProjectDir', e.target.value)}
          style={{ width: '100%', maxWidth: 260, minWidth: 160, height: 28 }}
        />
      </SettingRow>
    </div>
  );
};
