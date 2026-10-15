import { api } from '../../services/api';
import { expandEmmetAbbreviation } from '../emmet/EmmetEngine';
import { diagnosticsStore } from '../../state/diagnosticsStore';

let isInitialized = false;

export class MonacoExtensionBridge {
  static init(monaco: any): void {
    if (isInitialized || !monaco) return;
    isInitialized = true;

    // Ensure 'svg' language is registered with proper XML/SVG Monarch tokenizer & syntax rules
    try {
      const existingLangs = monaco.languages.getLanguages();
      const hasSvg = existingLangs.some((l: any) => l.id === 'svg');
      if (!hasSvg) {
        monaco.languages.register({
          id: 'svg',
          extensions: ['.svg'],
          aliases: ['SVG', 'svg'],
          mimetypes: ['image/svg+xml'],
        });
      }

      monaco.languages.setMonarchTokensProvider('svg', {
        defaultToken: '',
        tokenPostfix: '.xml',
        ignoreCase: true,
        tokenizer: {
          root: [
            [/[^<&]+/, ''],
            { include: '@whitespace' },
            [/(<)(!DOCTYPE)/, ['delimiter', 'metatag']],
            [/(<)(!--)/, ['delimiter', 'comment'], '@comment'],
            [/(<)(\?)/, ['delimiter', 'metatag'], '@pi'],
            [/(<\/)([\w\-:]+)(>)/, ['delimiter', 'tag', 'delimiter']],
            [/(<)([\w\-:]+)/, ['delimiter', { token: 'tag', next: '@tag' }]],
            [/&[\w\#]+;/, 'string.escape'],
          ],
          tag: [
            [/[ \t\r\n]+/, 'white'],
            [/([\w\-:]+)(=)/, ['attribute.name', 'delimiter']],
            [/"([^"]*)"/, 'attribute.value'],
            [/'([^']*)'/, 'attribute.value'],
            [/[\w\-:]+/, 'attribute.name'],
            [/\/?>/, 'delimiter', '@pop'],
          ],
          whitespace: [[/[ \t\r\n]+/, 'white']],
          comment: [
            [/[^-]+/, 'comment'],
            [/-->/, 'comment', '@pop'],
            [/[-]/, 'comment'],
          ],
          pi: [
            [/[^?]+/, 'metatag'],
            [/\?>/, 'metatag', '@pop'],
            [/[?]/, 'metatag'],
          ],
        },
      });

      monaco.languages.setLanguageConfiguration('svg', {
        comments: {
          blockComment: ['<!--', '-->'],
        },
        brackets: [['<', '>']],
        autoClosingPairs: [
          { open: '<', close: '>' },
          { open: "'", close: "'" },
          { open: '"', close: '"' },
        ],
        surroundingPairs: [
          { open: '<', close: '>' },
          { open: "'", close: "'" },
          { open: '"', close: '"' },
        ],
      });
    } catch (err) {
      console.warn('[MonacoExtensionBridge] Failed to register SVG tokenizer:', err);
    }

    const supportedLanguages = [
      'javascript',
      'typescript',
      'javascriptreact',
      'typescriptreact',
      'html',
      'css',
      'scss',
      'less',
      'json',
      'jsonc',
      'markdown',
      'python',
      'xml',
      'svg',
      'yaml',
      'c',
      'cpp',
      'csharp',
      'java',
      'rust',
      'go',
      'sql',
      'shell',
    ];

    // 1. Register Generalized Document Formatting Provider
    for (const lang of supportedLanguages) {
      monaco.languages.registerDocumentFormattingEditProvider(lang, {
        provideDocumentFormattingEdits: async (model: any, options: any) => {
          try {
            const uriStr = model.uri.toString();
            const edits = await api.provideExtensionFormatting(uriStr, options);
            if (Array.isArray(edits) && edits.length > 0) {
              return edits.map((e: any) => ({
                range: new monaco.Range(
                  e.range.startLineNumber,
                  e.range.startColumn,
                  e.range.endLineNumber,
                  e.range.endColumn
                ),
                text: e.text,
              }));
            }
          } catch (err) {
            console.error('[MonacoExtensionBridge] Formatting provider error:', err);
          }
          return [];
        },
      });
    }

    // 2. Register Generalized Completion Provider (Emmet + Extension Host)
    for (const lang of supportedLanguages) {
      monaco.languages.registerCompletionItemProvider(lang, {
        triggerCharacters: ['.', '#', ':', '>', '+', '*', '!', '-', ' ', '/', '$'],
        provideCompletionItems: async (model: any, position: any, context: any) => {
          const suggestions: any[] = [];
          const lineContent = model.getLineContent(position.lineNumber);
          const textBeforeCursor = lineContent.substring(0, position.column - 1);

          // A. Emmet Expansion check for HTML/CSS/JSX
          const isEmmetLang = ['html', 'css', 'scss', 'less', 'javascriptreact', 'typescriptreact'].includes(lang);
          if (isEmmetLang) {
            const match = textBeforeCursor.match(/([a-zA-Z0-9_#.:>+*\[\]={}$-]+|!)$/);
            if (match) {
              const abbr = match[1];
              const emmetRes = expandEmmetAbbreviation(abbr, lang);
              if (emmetRes) {
                suggestions.push({
                  label: abbr,
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  detail: emmetRes.detail,
                  documentation: { value: '```html\n' + emmetRes.snippet.replace(/\$\{\d+:?([^}]*)\}/g, '$1').replace(/\$0/g, '') + '\n```' },
                  insertText: emmetRes.snippet,
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  range: new monaco.Range(
                    position.lineNumber,
                    position.column - abbr.length,
                    position.lineNumber,
                    position.column
                  ),
                  sortText: '0000', // Ensure Emmet snippet ranks at top
                });
              }
            }
          }

          // B. Extension Host Completions
          try {
            const uriStr = model.uri.toString();
            const extItems = await api.provideExtensionCompletions(
              uriStr,
              { line: position.lineNumber - 1, character: position.column - 1 },
              context
            );

            if (Array.isArray(extItems)) {
              for (const item of extItems) {
                suggestions.push({
                  label: item.label,
                  kind: item.kind || monaco.languages.CompletionItemKind.Property,
                  detail: item.detail || '',
                  documentation: item.documentation,
                  insertText: item.insertText,
                  insertTextRules:
                    item.insertTextRules === 4
                      ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                      : undefined,
                  filterText: item.filterText,
                });
              }
            }
          } catch (err) {
            console.error('[MonacoExtensionBridge] Completion provider error:', err);
          }

          return { suggestions };
        },
      });
    }

    // 3. Register Hover Provider
    for (const lang of supportedLanguages) {
      monaco.languages.registerHoverProvider(lang, {
        provideHover: async (model: any, position: any) => {
          try {
            const uriStr = model.uri.toString();
            const hover = await api.provideExtensionHover(uriStr, {
              line: position.lineNumber - 1,
              character: position.column - 1,
            });
            if (hover && hover.contents) {
              return {
                contents: hover.contents,
                range: hover.range
                  ? new monaco.Range(
                      hover.range.startLineNumber,
                      hover.range.startColumn,
                      hover.range.endLineNumber,
                      hover.range.endColumn
                    )
                  : undefined,
              };
            }
          } catch (err) {
            console.error('[MonacoExtensionBridge] Hover provider error:', err);
          }
          return null;
        },
      });
    }

    // 4. Register Definition Provider
    for (const lang of supportedLanguages) {
      monaco.languages.registerDefinitionProvider(lang, {
        provideDefinition: async (model: any, position: any) => {
          try {
            const uriStr = model.uri.toString();
            const defs = await api.provideExtensionDefinition(uriStr, {
              line: position.lineNumber - 1,
              character: position.column - 1,
            });
            if (Array.isArray(defs) && defs.length > 0) {
              return defs.map((d: any) => ({
                uri: monaco.Uri.parse(d.uri),
                range: new monaco.Range(
                  d.range.startLineNumber,
                  d.range.startColumn,
                  d.range.endLineNumber,
                  d.range.endColumn
                ),
              }));
            }
          } catch (err) {
            console.error('[MonacoExtensionBridge] Definition provider error:', err);
          }
          return [];
        },
      });
    }

    // 5. Register Code Actions Provider
    for (const lang of supportedLanguages) {
      monaco.languages.registerCodeActionProvider(lang, {
        provideCodeActions: async (model: any, range: any, context: any) => {
          try {
            const uriStr = model.uri.toString();
            const rawActions = await api.provideExtensionCodeActions(
              uriStr,
              {
                startLine: range.startLineNumber,
                startColumn: range.startColumn,
                endLine: range.endLineNumber,
                endColumn: range.endColumn,
              },
              context
            );

            if (Array.isArray(rawActions) && rawActions.length > 0) {
              const actions = rawActions.map((action: any) => ({
                title: action.title,
                kind: action.kind,
                isPreferred: action.isPreferred,
                command: action.command
                  ? {
                      id: action.command.command || action.command,
                      title: action.command.title || action.title,
                      arguments: action.command.arguments,
                    }
                  : undefined,
                edit: action.edit
                  ? {
                      edits: (action.edit.edits || []).map((e: any) => ({
                        resource: monaco.Uri.parse(e.resource?.toString() || uriStr),
                        textEdit: {
                          range: new monaco.Range(
                            e.range?.startLineNumber || 1,
                            e.range?.startColumn || 1,
                            e.range?.endLineNumber || 1,
                            e.range?.endColumn || 1
                          ),
                          text: e.text || '',
                        },
                      })),
                    }
                  : undefined,
              }));
              return {
                actions,
                dispose: () => {},
              };
            }
          } catch (err) {
            console.error('[MonacoExtensionBridge] Code actions provider error:', err);
          }
          return { actions: [], dispose: () => {} };
        },
      });
    }

    // 6. Register Document Symbol Provider
    for (const lang of supportedLanguages) {
      monaco.languages.registerDocumentSymbolProvider(lang, {
        provideDocumentSymbols: async (model: any) => {
          try {
            const uriStr = model.uri.toString();
            const rawSymbols = await api.provideExtensionSymbols(uriStr);
            if (Array.isArray(rawSymbols) && rawSymbols.length > 0) {
              const mapSymbol = (s: any): any => ({
                name: s.name,
                detail: s.detail || '',
                kind: s.kind ?? monaco.languages.SymbolKind.Variable,
                range: new monaco.Range(
                  s.range.startLineNumber,
                  s.range.startColumn,
                  s.range.endLineNumber,
                  s.range.endColumn
                ),
                selectionRange: new monaco.Range(
                  s.selectionRange.startLineNumber,
                  s.selectionRange.startColumn,
                  s.selectionRange.endLineNumber,
                  s.selectionRange.endColumn
                ),
                children: Array.isArray(s.children) ? s.children.map(mapSymbol) : undefined,
              });
              return rawSymbols.map(mapSymbol);
            }
          } catch (err) {
            console.error('[MonacoExtensionBridge] Document symbol provider error:', err);
          }
          return [];
        },
      });
    }

    // 7. Register Reference Provider
    for (const lang of supportedLanguages) {
      monaco.languages.registerReferenceProvider(lang, {
        provideReferences: async (model: any, position: any, context: any) => {
          try {
            const uriStr = model.uri.toString();
            const rawRefs = await api.provideExtensionReferences(
              uriStr,
              { line: position.lineNumber - 1, character: position.column - 1 },
              context
            );
            if (Array.isArray(rawRefs) && rawRefs.length > 0) {
              return rawRefs.map((r: any) => ({
                uri: monaco.Uri.parse(r.uri),
                range: new monaco.Range(
                  r.range.startLineNumber,
                  r.range.startColumn,
                  r.range.endLineNumber,
                  r.range.endColumn
                ),
              }));
            }
          } catch (err) {
            console.error('[MonacoExtensionBridge] Reference provider error:', err);
          }
          return [];
        },
      });
    }

    // 8. Diagnostics Listener -> Updates Monaco Editor Markers & Problems Panel
    api.onExtensionDiagnosticsUpdated((rawList: Array<{ uri: string; diagnostics: any[] }>) => {
      diagnosticsStore.setProblemsFromExtensionList(rawList);

      for (const group of rawList) {
        const models = monaco.editor.getModels();
        for (const m of models) {
          if (m.uri.toString().toLowerCase() === group.uri.toLowerCase() || m.uri.fsPath.toLowerCase() === group.uri.toLowerCase()) {
            const markers = (group.diagnostics || []).map((d: any) => ({
              severity:
                d.severity === 0
                  ? monaco.MarkerSeverity.Error
                  : d.severity === 1
                  ? monaco.MarkerSeverity.Warning
                  : monaco.MarkerSeverity.Info,
              message: d.message,
              startLineNumber: d.range?.startLineNumber || 1,
              startColumn: d.range?.startColumn || 1,
              endLineNumber: d.range?.endLineNumber || 1,
              endColumn: d.range?.endColumn || 1,
              source: d.source || 'Extension',
            }));
            monaco.editor.setModelMarkers(m, 'extension-diagnostics', markers);
          }
        }
      }
    });

    console.log('[MonacoExtensionBridge] Monaco extension language providers successfully registered.');
  }

  // --- Document Sync Helpers ---
  static async syncModel(model: any, isDirty: boolean = false): Promise<void> {
    if (!model) return;
    try {
      const uriStr = model.uri.toString();
      const lang = model.getLanguageId();
      const version = model.getVersionId();
      const text = model.getValue();
      await api.syncExtensionDoc(uriStr, lang, version, text, isDirty);
    } catch (err) {
      console.error('[MonacoExtensionBridge] Error syncing model:', err);
    }
  }

  static async notifySave(model: any): Promise<void> {
    if (!model) return;
    try {
      const uriStr = model.uri.toString();
      await api.saveExtensionDoc(uriStr);
    } catch (err) {
      console.error('[MonacoExtensionBridge] Error notifying save:', err);
    }
  }

  static async notifyClose(model: any): Promise<void> {
    if (!model) return;
    try {
      const uriStr = model.uri.toString();
      await api.closeExtensionDoc(uriStr);
    } catch (err) {
      console.error('[MonacoExtensionBridge] Error notifying close:', err);
    }
  }

  static async updateActiveEditor(model: any, selection?: any): Promise<void> {
    if (!model) return;
    try {
      const uriStr = model.uri.toString();
      await api.setExtensionActiveEditor(uriStr, selection);
    } catch (err) {
      console.error('[MonacoExtensionBridge] Error updating active editor:', err);
    }
  }
}
