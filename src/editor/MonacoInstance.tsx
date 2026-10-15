import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useSettings, settingsStore } from '../state/settingsStore';
import { editorStore } from '../state/editorStore';
import { useCppStore, cppStore } from '../state/cppStore';
import { MonacoExtensionBridge } from './monaco/MonacoExtensionBridge';
import { registerAllMonacoThemes } from './monacoWarmup';
import { EditorSkeleton } from './EditorSkeleton';

interface MonacoInstanceProps {
  tabId: string;
  groupId: string;
  filePath?: string;
  content: string;
  language: string;
}

export const MonacoInstance: React.FC<MonacoInstanceProps> = ({
  tabId,
  groupId,
  filePath,
  content,
  language,
}) => {
  const { editor: editorSettings, appearance: appearanceSettings, general: generalSettings } = useSettings();
  const { breakpoints, activeDebugFile, activeDebugLine, debuggerState } = useCppStore();
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const autoSaveTimerRef = useRef<any>(null);
  const decorationsCollectionRef = useRef<any>(null);

  const activeTheme = appearanceSettings?.theme || generalSettings?.theme || 'binary-dark';

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    registerAllMonacoThemes(monaco);
    monaco.editor.setTheme(activeTheme);

    // Initialize Monaco Extension Bridge (Providers & Diagnostics)
    MonacoExtensionBridge.init(monaco);

    // Sync initial model to Extension Host
    const model = editor.getModel();
    if (model) {
      MonacoExtensionBridge.syncModel(model, false);
      MonacoExtensionBridge.updateActiveEditor(model, editor.getSelection());
    }

    // Force wordWrap off by default so single lines do not break and gaps in line numbers are eliminated
    editor.updateOptions({
      wordWrap: 'off',
      wrappingStrategy: 'simple',
      wrappingIndent: 'none',
      glyphMargin: true,
      mouseWheelZoom: editorSettings.mouseWheelZoom !== false,
      scrollbar: {
        horizontal: 'auto',
        vertical: 'auto',
        horizontalScrollbarSize: 10,
        verticalScrollbarSize: 10,
        alwaysConsumeMouseWheel: false,
      },
    });

    // Handle Gutter Breakpoint Toggle Click
    editor.onMouseDown((e: any) => {
      if (
        filePath &&
        (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
          e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS)
      ) {
        const line = e.target.position?.lineNumber;
        if (line) {
          cppStore.toggleBreakpoint(filePath, line);
        }
      }
    });

    // Alt+Z shortcut to toggle word wrap
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyZ, () => {
      const currentWrap = editor.getOption(monaco.editor.EditorOption.wordWrap);
      const nextWrap = currentWrap === 'off' ? 'on' : 'off';
      editor.updateOptions({
        wordWrap: nextWrap,
        wrappingStrategy: 'simple',
        wrappingIndent: 'none',
      });
      settingsStore.updateSettings({
        editor: { ...settingsStore.getState().editor, wordWrap: nextWrap }
      });
    });

    // C++ Build, Run & Debug shortcuts inside Monaco
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyB, () => {
      cppStore.compileActiveFile();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.F5, () => {
      cppStore.runActiveFile();
    });

    editor.addCommand(monaco.KeyCode.F5, () => {
      if (cppStore.getState().debuggerState === 'paused') {
        cppStore.continue();
      } else {
        cppStore.startDebuggingActiveFile();
      }
    });

    editor.addCommand(monaco.KeyCode.F9, () => {
      const pos = editor.getPosition();
      if (pos && filePath) {
        cppStore.toggleBreakpoint(filePath, pos.lineNumber);
      }
    });

    editor.addCommand(monaco.KeyCode.F10, () => {
      cppStore.stepOver();
    });

    editor.addCommand(monaco.KeyCode.F11, () => {
      cppStore.stepInto();
    });

    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.F11, () => {
      cppStore.stepOut();
    });

    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.F5, () => {
      cppStore.stopDebugging();
    });

    // Track active selection changes for extensions
    editor.onDidChangeCursorSelection((e: any) => {
      MonacoExtensionBridge.updateActiveEditor(editor.getModel(), e.selection);
    });

    // Add Ctrl+S command to format and save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
      if (editorSettings.formatOnSave) {
        try {
          await editor.getAction('editor.action.formatDocument')?.run();
        } catch {}
      }
      const activeModel = editor.getModel();
      if (activeModel) {
        MonacoExtensionBridge.notifySave(activeModel);
      }
      editorStore.saveFile(tabId, groupId);
    });
  };

  // Update Breakpoint & Execution Line Gutter Decorations
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !filePath) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const normCurrent = filePath.toLowerCase().replace(/\\/g, '/');
    const newDecorations: any[] = [];

    // 1. Breakpoint Glyphs for this file
    const fileBreakpoints = breakpoints.filter(
      (b) => b.file.toLowerCase().replace(/\\/g, '/') === normCurrent
    );

    for (const bp of fileBreakpoints) {
      newDecorations.push({
        range: new monaco.Range(bp.line, 1, bp.line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: bp.enabled ? 'debug-breakpoint-glyph' : 'debug-breakpoint-disabled-glyph',
          glyphMarginHoverMessage: { value: `Breakpoint: Line ${bp.line} (${bp.enabled ? 'Enabled' : 'Disabled'})` },
        },
      });
    }

    // 2. Active Execution Line Highlight
    const isCurrentDebugFile =
      activeDebugFile && activeDebugFile.toLowerCase().replace(/\\/g, '/') === normCurrent;

    if (isCurrentDebugFile && activeDebugLine && debuggerState === 'paused') {
      newDecorations.push({
        range: new monaco.Range(activeDebugLine, 1, activeDebugLine, 1),
        options: {
          isWholeLine: true,
          className: 'debug-current-line',
          glyphMarginClassName: 'debug-current-line-glyph',
          glyphMarginHoverMessage: { value: 'Paused at execution pointer' },
        },
      });

      // Reveal line in center of editor
      try {
        editor.revealLineInCenter(activeDebugLine);
        editor.setPosition({ lineNumber: activeDebugLine, column: 1 });
      } catch {}
    }

    if (!decorationsCollectionRef.current) {
      decorationsCollectionRef.current = editor.createDecorationsCollection(newDecorations);
    } else {
      decorationsCollectionRef.current.set(newDecorations);
    }
  }, [breakpoints, activeDebugFile, activeDebugLine, debuggerState, filePath]);

  // Dynamic live options update
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: editorSettings.fontSize || 14,
        fontFamily: editorSettings.fontFamily || "'JetBrains Mono', 'Fira Code', Consolas, monospace",
        tabSize: editorSettings.tabSize || 2,
        insertSpaces: editorSettings.insertSpaces !== false,
        lineHeight: editorSettings.lineHeight || 22,
        lineNumbers: editorSettings.lineNumbers || 'on',
        cursorStyle: editorSettings.cursorStyle || 'line',
        cursorBlinking: editorSettings.cursorBlinking || 'smooth',
        minimap: { enabled: appearanceSettings?.showMinimap !== false && editorSettings.minimap !== false },
        wordWrap: (editorSettings.wordWrap === 'on' || editorSettings.wordWrap === 'wordWrapColumn') ? editorSettings.wordWrap : 'off',
        wrappingStrategy: 'simple',
        wrappingIndent: 'none',
        glyphMargin: true,
        bracketPairColorization: { enabled: editorSettings.bracketPairColorization !== false },
        smoothScrolling: editorSettings.smoothScrolling !== false,
        stickyScroll: { enabled: editorSettings.stickyScroll !== false },
        renderWhitespace: editorSettings.renderWhitespace || 'selection',
        mouseWheelZoom: editorSettings.mouseWheelZoom !== false,
        scrollbar: {
          horizontal: 'auto',
          vertical: 'auto',
          horizontalScrollbarSize: 10,
          verticalScrollbarSize: 10,
          alwaysConsumeMouseWheel: false,
        },
      });
    }
  }, [editorSettings, appearanceSettings]);

  // Live theme updates
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(activeTheme);
    }
  }, [activeTheme]);

  // Handle document content change with Auto-Save support
  const handleChange = (value: string | undefined) => {
    if (value !== undefined) {
      editorStore.updateContent(tabId, value, groupId);

      // Sync changes to Extension Host
      const model = editorRef.current?.getModel();
      if (model) {
        MonacoExtensionBridge.syncModel(model, true);
      }

      // Auto-save logic
      if (generalSettings?.autoSave === 'afterDelay') {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
        autoSaveTimerRef.current = setTimeout(async () => {
          if (editorSettings.formatOnSave && editorRef.current) {
            try {
              await editorRef.current.getAction('editor.action.formatDocument')?.run();
            } catch {}
          }
          const activeModel = editorRef.current?.getModel();
          if (activeModel) {
            MonacoExtensionBridge.notifySave(activeModel);
          }
          editorStore.saveFile(tabId, groupId);
        }, generalSettings.autoSaveDelay || 1000);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      const model = editorRef.current?.getModel();
      if (model) {
        MonacoExtensionBridge.notifyClose(model);
      }
    };
  }, []);

  // Sync document and active editor on tab / file change
  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        MonacoExtensionBridge.syncModel(model, false);
        MonacoExtensionBridge.updateActiveEditor(model, editorRef.current.getSelection());
      }
    }
  }, [tabId, filePath, language]);

  const minimapEnabled =
    appearanceSettings?.showMinimap !== false && editorSettings.minimap !== false;

  return (
    <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
      <Editor
        height="100%"
        path={filePath}
        language={language}
        value={content}
        theme={activeTheme}
        onChange={handleChange}
        onMount={handleEditorMount}
        loading={<EditorSkeleton />}
        options={{
          fontSize: editorSettings.fontSize || 14,
          fontFamily: editorSettings.fontFamily || "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          tabSize: editorSettings.tabSize || 2,
          insertSpaces: editorSettings.insertSpaces !== false,
          lineHeight: editorSettings.lineHeight || 22,
          lineNumbers: editorSettings.lineNumbers || 'on',
          cursorStyle: editorSettings.cursorStyle || 'line',
          cursorBlinking: editorSettings.cursorBlinking || 'smooth',
          minimap: { enabled: minimapEnabled },
          wordWrap: editorSettings.wordWrap || 'off',
          wrappingIndent: 'none',
          bracketPairColorization: { enabled: editorSettings.bracketPairColorization !== false },
          smoothScrolling: editorSettings.smoothScrolling !== false,
          stickyScroll: { enabled: editorSettings.stickyScroll !== false },
          renderWhitespace: editorSettings.renderWhitespace || 'selection',
          mouseWheelZoom: editorSettings.mouseWheelZoom !== false,
          fontLigatures: true,
          cursorSmoothCaretAnimation: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          glyphMargin: true,
          scrollbar: {
            horizontal: 'auto',
            vertical: 'auto',
            horizontalScrollbarSize: 10,
            verticalScrollbarSize: 10,
            alwaysConsumeMouseWheel: false,
          },
        }}
      />
    </div>
  );
};

