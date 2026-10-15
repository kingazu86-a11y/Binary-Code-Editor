import React from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useSettings } from '../state/settingsStore';

interface DiffEditorViewProps {
  original: string;
  modified: string;
  language: string;
}

export const DiffEditorView: React.FC<DiffEditorViewProps> = ({ original, modified, language }) => {
  const { editor: editorSettings } = useSettings();

  return (
    <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
      <DiffEditor
        original={original}
        modified={modified}
        language={language}
        theme="vs-dark"
        options={{
          renderSideBySide: true,
          readOnly: true,
          fontSize: editorSettings.fontSize || 14,
          mouseWheelZoom: editorSettings.mouseWheelZoom !== false,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontFamily: "'JetBrains Mono', Consolas, monospace",
          lineNumbers: 'on',
        }}
      />
    </div>
  );
};
