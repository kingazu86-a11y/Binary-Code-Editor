import React, { useState } from 'react';
import { useSettings, settingsStore } from '../../state/settingsStore';
import { SettingRow, SettingSectionHeader, ToggleSwitch } from '../components/SettingRow';
import { Plus, X } from 'lucide-react';

interface Props {
  scope: 'user' | 'workspace';
}

export const FilesSettings: React.FC<Props> = ({ scope }) => {
  const settings = useSettings();
  const files = settings.files || {
    exclude: [],
    autoSave: 'afterDelay',
    autoSaveDelay: 1000,
    defaultEncoding: 'utf-8',
    trimTrailingWhitespace: true,
    insertFinalNewline: true,
    maxFileSizeMB: 20,
  };

  const [newExcludePattern, setNewExcludePattern] = useState('');

  const update = (field: string, val: any) => {
    settingsStore.updateSettings({
      files: { ...files, [field]: val },
    }, scope);
  };

  const handleAddExclude = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExcludePattern.trim()) return;
    const current = files.exclude || [];
    if (!current.includes(newExcludePattern.trim())) {
      update('exclude', [...current, newExcludePattern.trim()]);
    }
    setNewExcludePattern('');
  };

  const handleRemoveExclude = (pattern: string) => {
    const current = files.exclude || [];
    update('exclude', current.filter((p) => p !== pattern));
  };

  return (
    <div>
      <SettingSectionHeader
        title="Files & Workspace Excludes"
        subtitle="Manage file exclusion filters, character encodings, and save cleanup"
      />

      <SettingRow
        title="Excluded Glob Patterns"
        description="Files matching these glob patterns will be hidden from the File Explorer and skipped during Global Search."
        vertical
      >
        {/* Existing chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {(files.exclude || []).length === 0 ? (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
              No exclude patterns configured. All folders (.git, node_modules, dist, build, .next, etc.) are visible.
            </span>
          ) : (
            (files.exclude || []).map((pattern) => (
              <span
                key={pattern}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 8px',
                  borderRadius: 4,
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                }}
              >
                {pattern}
                <button
                  type="button"
                  onClick={() => handleRemoveExclude(pattern)}
                  style={{ color: 'var(--text-muted)', display: 'inline-flex', padding: 0 }}
                  title="Remove pattern"
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <X size={12} />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Add pattern input */}
        <form onSubmit={handleAddExclude} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <input
            type="text"
            placeholder="e.g. **/temp or **/.cache"
            value={newExcludePattern}
            onChange={(e) => setNewExcludePattern(e.target.value)}
            style={{ width: '100%', maxWidth: 240, minWidth: 160, height: 28, fontFamily: 'var(--font-mono)' }}
          />
          <button
            type="submit"
            style={{
              padding: '0 10px',
              height: 28,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Plus size={13} />
            <span>Add Pattern</span>
          </button>
        </form>
      </SettingRow>

      <SettingRow
        title="Default File Encoding"
        description="The default character encoding to use when reading and writing workspace files."
      >
        <select
          value={files.defaultEncoding || 'utf-8'}
          onChange={(e) => update('defaultEncoding', e.target.value)}
          style={{ width: 140, height: 28 }}
        >
          <option value="utf-8">UTF-8</option>
          <option value="utf-16le">UTF-16 LE</option>
          <option value="windows1252">Windows 1252</option>
          <option value="iso-8859-1">ISO-8859-1</option>
        </select>
      </SettingRow>

      <SettingRow
        title="Trim Trailing Whitespace"
        description="When saving a file, automatically trim unneeded trailing whitespace characters from ends of lines."
      >
        <ToggleSwitch
          checked={files.trimTrailingWhitespace !== false}
          onChange={(v) => update('trimTrailingWhitespace', v)}
        />
      </SettingRow>

      <SettingRow
        title="Insert Final Newline"
        description="When saving a file, automatically ensure the file ends with a trailing newline character."
      >
        <ToggleSwitch
          checked={files.insertFinalNewline !== false}
          onChange={(v) => update('insertFinalNewline', v)}
        />
      </SettingRow>

      <SettingRow
        title="Max File Size (MB)"
        description="Maximum file size in Megabytes that can be opened into Monaco editor tabs."
      >
        <input
          type="number"
          min={1}
          max={100}
          value={files.maxFileSizeMB || 20}
          onChange={(e) => update('maxFileSizeMB', parseInt(e.target.value, 10) || 20)}
          style={{ width: 100, height: 28 }}
        />
      </SettingRow>
    </div>
  );
};
