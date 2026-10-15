import React from 'react';
import { useSettings, settingsStore } from '../../state/settingsStore';
import { SettingRow, SettingSectionHeader, ToggleSwitch } from '../components/SettingRow';

interface Props {
  scope: 'user' | 'workspace';
}

export const AppearanceSettings: React.FC<Props> = ({ scope }) => {
  const settings = useSettings();
  const appearance = settings.appearance || {
    theme: 'binary-dark',
    uiScale: 100,
    density: 'comfortable',
    sidebarPosition: 'left',
    showActivityBar: true,
    showStatusBar: true,
    showMinimap: true,
  };

  const update = (field: string, val: any) => {
    settingsStore.updateSettings({
      appearance: { ...appearance, [field]: val },
    }, scope);
  };

  return (
    <div>
      <SettingSectionHeader
        title="Theme & Visual Styling"
        subtitle="Customize the color palette, typography, and density of Binary's user interface"
      />

      <SettingRow
        title="Color Theme"
        description="Select the color scheme for the editor, activity bar, sidebars, and panels."
      >
        <select
          value={appearance.theme || 'binary-dark'}
          onChange={(e) => update('theme', e.target.value)}
          style={{ width: '100%', maxWidth: 240, minWidth: 160, height: 28 }}
        >
          <option value="binary-dark">Binary Dark (Default)</option>
          <option value="binary-light">Binary Light (Simple Light)</option>
          <option value="binary-midnight">Binary Midnight (Sapphire Navy)</option>
          <option value="binary-cyber">Binary Cyber (Obsidian & Slate)</option>
          <option value="binary-nord">Binary Nord (Arctic Slate)</option>
          <option value="binary-monokai">Binary Monokai (Pro Charcoal)</option>
        </select>
      </SettingRow>

      <SettingRow
        title="UI Scaling"
        description="Adjust the global zoom level of the interface, text, and icons."
      >
        <select
          value={appearance.uiScale || 100}
          onChange={(e) => update('uiScale', parseInt(e.target.value, 10))}
          style={{ width: '100%', maxWidth: 160, minWidth: 120, height: 28 }}
        >
          <option value={80}>80% (Small)</option>
          <option value={90}>90% (Compact)</option>
          <option value={100}>100% (Default)</option>
          <option value={110}>110% (Medium)</option>
          <option value={120}>120% (Large)</option>
        </select>
      </SettingRow>

      <SettingRow
        title="Interface Density"
        description="Choose between spacious comfortable layout or compact developer layout with smaller margins."
      >
        <select
          value={appearance.density || 'comfortable'}
          onChange={(e) => update('density', e.target.value)}
          style={{ width: '100%', maxWidth: 180, minWidth: 120, height: 28 }}
        >
          <option value="comfortable">Comfortable</option>
          <option value="compact">Compact</option>
        </select>
      </SettingRow>

      <SettingSectionHeader
        title="Window Layout Elements"
        subtitle="Show or hide primary interface chrome and bars"
      />

      <SettingRow
        title="Primary Activity Bar"
        description="Show or hide the far-left vertical icon bar with Explorer, Search, Git, and Settings icons."
      >
        <ToggleSwitch
          checked={appearance.showActivityBar !== false}
          onChange={(v) => update('showActivityBar', v)}
        />
      </SettingRow>

      <SettingRow
        title="Bottom Status Bar"
        description="Show or hide the footer bar showing active branch, problems count, line/col, and encoding."
      >
        <ToggleSwitch
          checked={appearance.showStatusBar !== false}
          onChange={(v) => update('showStatusBar', v)}
        />
      </SettingRow>

      <SettingRow
        title="Editor Code Minimap"
        description="Show an overview code preview minimap on the right edge of the editor."
      >
        <ToggleSwitch
          checked={appearance.showMinimap !== false}
          onChange={(v) => update('showMinimap', v)}
        />
      </SettingRow>
    </div>
  );
};
