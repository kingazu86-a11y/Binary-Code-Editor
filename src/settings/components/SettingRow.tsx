import React, { createContext, useContext, useMemo } from 'react';
import { SETTINGS_CATALOG } from '../settingsCatalog';

export interface SettingsSearchContextValue {
  searchQuery: string;
}

export const SettingsSearchContext = createContext<SettingsSearchContextValue>({
  searchQuery: '',
});

export const useSettingsSearch = () => useContext(SettingsSearchContext);

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <span
        style={{
          backgroundColor: 'rgba(59, 130, 246, 0.25)',
          color: 'var(--text-primary)',
          borderRadius: 2,
          padding: '0 2px',
        }}
      >
        {match}
      </span>
      {highlightMatch(after, query)}
    </>
  );
}

interface SettingRowProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  vertical?: boolean;
}

export const SettingRow: React.FC<SettingRowProps> = ({ title, description, children, vertical }) => {
  const { searchQuery } = useSettingsSearch();

  const isMatch = useMemo(() => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    if (title.toLowerCase().includes(q) || (description && description.toLowerCase().includes(q))) {
      return true;
    }
    const catalogItem = SETTINGS_CATALOG.find(
      (c) =>
        c.title.toLowerCase() === title.toLowerCase() ||
        title.toLowerCase().includes(c.title.toLowerCase()) ||
        c.title.toLowerCase().includes(title.toLowerCase())
    );
    if (catalogItem) {
      if (
        catalogItem.category.toLowerCase().includes(q) ||
        (catalogItem.keywords && catalogItem.keywords.some((k) => k.toLowerCase().includes(q)))
      ) {
        return true;
      }
    }
    return false;
  }, [searchQuery, title, description]);

  if (!isMatch) {
    return null;
  }

  if (vertical) {
    return (
      <div
        style={{
          padding: '12px 0',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: 3,
            wordBreak: 'normal',
            overflowWrap: 'break-word',
          }}
        >
          {highlightMatch(title, searchQuery)}
        </div>
        {description && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              lineHeight: 1.45,
              marginBottom: 10,
              wordBreak: 'normal',
              overflowWrap: 'break-word',
            }}
          >
            {highlightMatch(description, searchQuery)}
          </div>
        )}
        <div>{children}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid var(--border-subtle)',
        gap: '10px 20px',
      }}
    >
      <div style={{ flex: '1 1 240px', minWidth: 200, maxWidth: '100%' }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: 3,
            wordBreak: 'normal',
            overflowWrap: 'break-word',
          }}
        >
          {highlightMatch(title, searchQuery)}
        </div>
        {description && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              lineHeight: 1.45,
              wordBreak: 'normal',
              overflowWrap: 'break-word',
            }}
          >
            {highlightMatch(description, searchQuery)}
          </div>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexShrink: 0,
          minWidth: 140,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const SettingSectionHeader: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => {
  const { searchQuery } = useSettingsSearch();
  if (searchQuery.trim()) {
    return null;
  }

  return (
    <div style={{ marginTop: 18, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--border-color)' }}>
      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '0.2px',
          wordBreak: 'normal',
          overflowWrap: 'break-word',
        }}
      >
        {title}
      </h3>
      {subtitle && (
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginTop: 2,
            wordBreak: 'normal',
            overflowWrap: 'break-word',
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

export const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    style={{
      width: 40,
      height: 22,
      borderRadius: 11,
      backgroundColor: checked ? 'var(--accent-primary)' : 'var(--bg-card)',
      border: checked ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
      position: 'relative',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 0.2s ease',
      padding: 0,
      flexShrink: 0,
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: 2,
        left: checked ? 20 : 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        transition: 'left 0.2s ease',
      }}
    />
  </button>
);
