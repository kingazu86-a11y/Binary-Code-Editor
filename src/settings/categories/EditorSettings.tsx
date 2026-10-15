import React from 'react';
import { useSettings, settingsStore } from '../../state/settingsStore';
import { SettingRow, SettingSectionHeader, ToggleSwitch } from '../components/SettingRow';

interface Props {
  scope: 'user' | 'workspace';
}

export const EditorSettings: React.FC<Props> = ({ scope }) => {
  const settings = useSettings();
  const editor = settings.editor;

  const update = (field: string, val: any) => {
    settingsStore.updateSettings({
      editor: { ...editor, [field]: val },
    }, scope);
  };

  return (
    <div>
      <SettingSectionHeader
        title="Font & Typography"
        subtitle="Manage code editor text rendering, typeface, and line dimensions"
      />

      <SettingRow
        title="Font Family"
        description="Controls the font family used inside code editor tabs and diff views."
      >
        <input
          type="text"
          value={editor.fontFamily || "'JetBrains Mono', 'Fira Code', Consolas, monospace"}
          onChange={(e) => update('fontFamily', e.target.value)}
          style={{ width: '100%', maxWidth: 280, minWidth: 160, height: 28 }}
        />
      </SettingRow>

      <SettingRow
        title="Font Size"
        description="Controls the font size in pixels (default: 14px)."
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="range"
            min={10}
            max={28}
            value={editor.fontSize || 14}
            onChange={(e) => update('fontSize', parseInt(e.target.value, 10))}
            style={{ width: 120 }}
          />
          <span style={{ fontSize: 12, minWidth: 35, textAlign: 'right' }}>
            {editor.fontSize || 14}px
          </span>
        </div>
      </SettingRow>

      <SettingRow
        title="Line Height"
        description="Controls the line height in pixels for editor code lines (default: 22px)."
      >
        <input
          type="number"
          min={14}
          max={40}
          value={editor.lineHeight || 22}
          onChange={(e) => update('lineHeight', parseInt(e.target.value, 10) || 22)}
          style={{ width: 100, height: 28 }}
        />
      </SettingRow>

      <SettingSectionHeader
        title="Indentation & Formatting"
        subtitle="Configure tab behavior, indentation size, and save-time format actions"
      />

      <SettingRow
        title="Tab Size"
        description="The number of spaces a tab is equal to."
      >
        <select
          value={editor.tabSize || 2}
          onChange={(e) => update('tabSize', parseInt(e.target.value, 10))}
          style={{ width: 120, height: 28 }}
        >
          <option value={2}>2 Spaces</option>
          <option value={4}>4 Spaces</option>
          <option value={8}>8 Spaces</option>
        </select>
      </SettingRow>

      <SettingRow
        title="Insert Spaces"
        description="Insert spaces when pressing Tab instead of a literal tab character."
      >
        <ToggleSwitch
          checked={editor.insertSpaces !== false}
          onChange={(v) => update('insertSpaces', v)}
        />
      </SettingRow>

      <SettingRow
        title="Format On Save"
        description="Format a document on save automatically using Monaco's built-in document formatter."
      >
        <ToggleSwitch
          checked={editor.formatOnSave !== false}
          onChange={(v) => update('formatOnSave', v)}
        />
      </SettingRow>

      <SettingSectionHeader
        title="Editor Visuals & Cursor"
        subtitle="Configure line numbers, word wrap, bracket pairs, minimap, and cursor animations"
      />

      <SettingRow
        title="Line Numbers"
        description="Controls the display of line numbers in the editor margin."
      >
        <select
          value={editor.lineNumbers || 'on'}
          onChange={(e) => update('lineNumbers', e.target.value)}
          style={{ width: 140, height: 28 }}
        >
          <option value="on">On</option>
          <option value="off">Off</option>
          <option value="relative">Relative</option>
        </select>
      </SettingRow>

      <SettingRow
        title="Word Wrap"
        description="Controls how code lines wrap when exceeding viewport width."
      >
        <select
          value={editor.wordWrap || 'off'}
          onChange={(e) => update('wordWrap', e.target.value)}
          style={{ width: 140, height: 28 }}
        >
          <option value="off">Off (Horizontal Scroll)</option>
          <option value="on">On (Wrap to Viewport)</option>
        </select>
      </SettingRow>

      <SettingRow
        title="Cursor Style"
        description="Controls the visual cursor style rendered in active code editors."
      >
        <select
          value={editor.cursorStyle || 'line'}
          onChange={(e) => update('cursorStyle', e.target.value)}
          style={{ width: 140, height: 28 }}
        >
          <option value="line">Line (Default)</option>
          <option value="block">Block</option>
          <option value="underline">Underline</option>
          <option value="line-thin">Line Thin</option>
        </select>
      </SettingRow>

      <SettingRow
        title="Cursor Blinking"
        description="Controls the blinking animation style of the cursor."
      >
        <select
          value={editor.cursorBlinking || 'smooth'}
          onChange={(e) => update('cursorBlinking', e.target.value)}
          style={{ width: 140, height: 28 }}
        >
          <option value="smooth">Smooth Animation</option>
          <option value="blink">Standard Blink</option>
          <option value="phase">Phase</option>
          <option value="solid">Solid (No Blink)</option>
        </select>
      </SettingRow>

      <SettingRow
        title="Bracket Pair Colorization"
        description="Controls whether matching brackets are rendered in distinct matching colors."
      >
        <ToggleSwitch
          checked={editor.bracketPairColorization !== false}
          onChange={(v) => update('bracketPairColorization', v)}
        />
      </SettingRow>

      <SettingRow
        title="Smooth Scrolling"
        description="Controls whether editor scrolls using an animated transition."
      >
        <ToggleSwitch
          checked={editor.smoothScrolling !== false}
          onChange={(v) => update('smoothScrolling', v)}
        />
      </SettingRow>

      <SettingRow
        title="Sticky Scroll"
        description="Shows the current class, function, or scope header pinned to the top of the editor while scrolling."
      >
        <ToggleSwitch
          checked={editor.stickyScroll !== false}
          onChange={(v) => update('stickyScroll', v)}
        />
      </SettingRow>

      <SettingRow
        title="Render Whitespace"
        description="Controls how whitespace characters are visually rendered in the editor."
      >
        <select
          value={editor.renderWhitespace || 'selection'}
          onChange={(e) => update('renderWhitespace', e.target.value)}
          style={{ width: 140, height: 28 }}
        >
          <option value="none">None</option>
          <option value="selection">In Selection Only</option>
          <option value="boundary">Boundary Whitespace</option>
          <option value="all">All Whitespace</option>
        </select>
      </SettingRow>

      <SettingRow
        title="Mouse Wheel Zoom"
        description="Zoom the font of the editor when using the mouse wheel / scrollbar while holding Ctrl, or pinching / dragging on touchpad."
      >
        <ToggleSwitch
          checked={editor.mouseWheelZoom !== false}
          onChange={(v) => update('mouseWheelZoom', v)}
        />
      </SettingRow>
    </div>
  );
};
