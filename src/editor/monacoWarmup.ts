import { loader } from '@monaco-editor/react';

let monacoInstance: any = null;
let warmupPromise: Promise<any> | null = null;
let themesRegistered = false;

export const registerAllMonacoThemes = (monaco: any) => {
  if (themesRegistered || !monaco?.editor?.defineTheme) return;
  themesRegistered = true;

  // 1. Binary Dark (Default)
  monaco.editor.defineTheme('binary-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5C6370', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'C678DD', fontStyle: 'bold' },
      { token: 'string', foreground: '98C379' },
      { token: 'number', foreground: 'D19A66' },
      { token: 'type', foreground: 'E5C07B' },
      { token: 'function', foreground: '61AFEF' },
      { token: 'variable', foreground: 'E06C75' },
    ],
    colors: {
      'editor.background': '#0D0F12',
      'editor.foreground': '#E6EAF0',
      'editorLineNumber.foreground': '#4B5263',
      'editorLineNumber.activeForeground': '#E6EAF0',
      'editor.selectionBackground': '#264F78',
      'editor.lineHighlightBackground': '#141820',
      'editorCursor.foreground': '#3B82F6',
      'editorWhitespace.foreground': '#2A303C',
      'editorIndentGuide.background': '#1E232B',
      'editorIndentGuide.activeBackground': '#3B4252',
      'minimap.background': '#0D0F12',
    },
  });

  // 2. Binary Midnight (Sapphire Navy)
  monaco.editor.defineTheme('binary-midnight', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '4B5E78', fontStyle: 'italic' },
      { token: 'keyword', foreground: '93C5FD', fontStyle: 'bold' },
      { token: 'string', foreground: '6EE7B7' },
      { token: 'number', foreground: 'FCD34D' },
      { token: 'type', foreground: 'A5B4FC' },
      { token: 'function', foreground: '60A5FA' },
      { token: 'variable', foreground: 'F472B6' },
    ],
    colors: {
      'editor.background': '#080C14',
      'editor.foreground': '#E2E8F0',
      'editorLineNumber.foreground': '#334155',
      'editorLineNumber.activeForeground': '#93C5FD',
      'editor.selectionBackground': '#1E3A8A',
      'editor.lineHighlightBackground': '#0F172A',
      'editorCursor.foreground': '#60A5FA',
      'editorWhitespace.foreground': '#1E293B',
      'editorIndentGuide.background': '#131D31',
      'editorIndentGuide.activeBackground': '#1E3A8A',
      'minimap.background': '#080C14',
    },
  });

  // 3. Binary Cyber (Obsidian & Slate)
  monaco.editor.defineTheme('binary-cyber', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '4B6275', fontStyle: 'italic' },
      { token: 'keyword', foreground: '38BDF8', fontStyle: 'bold' },
      { token: 'string', foreground: '4ADE80' },
      { token: 'number', foreground: 'F472B6' },
      { token: 'type', foreground: '2DD4BF' },
      { token: 'function', foreground: '60A5FA' },
      { token: 'variable', foreground: 'E2E8F0' },
    ],
    colors: {
      'editor.background': '#06090E',
      'editor.foreground': '#F1F5F9',
      'editorLineNumber.foreground': '#1E293B',
      'editorLineNumber.activeForeground': '#38BDF8',
      'editor.selectionBackground': '#1E3A5F',
      'editor.lineHighlightBackground': '#0F1722',
      'editorCursor.foreground': '#38BDF8',
      'editorWhitespace.foreground': '#1E293B',
      'editorIndentGuide.background': '#101923',
      'editorIndentGuide.activeBackground': '#38BDF8',
      'minimap.background': '#06090E',
    },
  });

  // 4. Binary Nord (Arctic Slate)
  monaco.editor.defineTheme('binary-nord', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '616E88', fontStyle: 'italic' },
      { token: 'keyword', foreground: '81A1C1', fontStyle: 'bold' },
      { token: 'string', foreground: 'A3BE8C' },
      { token: 'number', foreground: 'B48EAD' },
      { token: 'type', foreground: '8FBCBB' },
      { token: 'function', foreground: '88C0D0' },
      { token: 'variable', foreground: 'D8DEE9' },
    ],
    colors: {
      'editor.background': '#242933',
      'editor.foreground': '#ECEFF4',
      'editorLineNumber.foreground': '#4C566A',
      'editorLineNumber.activeForeground': '#88C0D0',
      'editor.selectionBackground': '#434C5E',
      'editor.lineHighlightBackground': '#2E3440',
      'editorCursor.foreground': '#88C0D0',
      'editorWhitespace.foreground': '#3B4252',
      'editorIndentGuide.background': '#2E3440',
      'editorIndentGuide.activeBackground': '#4C566A',
      'minimap.background': '#242933',
    },
  });

  // 5. Binary Monokai (Pro Charcoal)
  monaco.editor.defineTheme('binary-monokai', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '75715E', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'F92672', fontStyle: 'bold' },
      { token: 'string', foreground: 'E6DB74' },
      { token: 'number', foreground: 'AE81FF' },
      { token: 'type', foreground: '66D9EF' },
      { token: 'function', foreground: 'A6E22E' },
      { token: 'variable', foreground: 'FD971F' },
    ],
    colors: {
      'editor.background': '#1E1F1C',
      'editor.foreground': '#F8F8F2',
      'editorLineNumber.foreground': '#59574D',
      'editorLineNumber.activeForeground': '#A6E22E',
      'editor.selectionBackground': '#49483E',
      'editor.lineHighlightBackground': '#272822',
      'editorCursor.foreground': '#F8F8F0',
      'editorWhitespace.foreground': '#3B3A32',
      'editorIndentGuide.background': '#272822',
      'editorIndentGuide.activeBackground': '#49483E',
      'minimap.background': '#1E1F1C',
    },
  });

  // 6. Binary Light (Modern Clean Light)
  monaco.editor.defineTheme('binary-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6E7781', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'CF222E', fontStyle: 'bold' },
      { token: 'string', foreground: '0A3069' },
      { token: 'number', foreground: '0550AE' },
      { token: 'type', foreground: '953800', fontStyle: 'bold' },
      { token: 'class', foreground: '953800', fontStyle: 'bold' },
      { token: 'function', foreground: '8250DF' },
      { token: 'variable', foreground: '24292F' },
      { token: 'constant', foreground: '0550AE' },
      { token: 'operator', foreground: 'CF222E' },
      { token: 'tag', foreground: '116329' },
      { token: 'attribute.name', foreground: '0550AE' },
      { token: 'delimiter', foreground: '57606A' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#24292F',
      'editorLineNumber.foreground': '#8C959F',
      'editorLineNumber.activeForeground': '#24292F',
      'editor.selectionBackground': '#B4D5FE80',
      'editor.lineHighlightBackground': '#F6F8FA',
      'editorCursor.foreground': '#0969DA',
      'editorWhitespace.foreground': '#D0D7DE',
      'editorIndentGuide.background': '#D8DEE4',
      'editorIndentGuide.activeBackground': '#8C959F',
      'minimap.background': '#FFFFFF',
    },
  });
};

/**
 * Pre-warms Monaco in the background so that the first editor open is instantaneous.
 */
export async function warmupMonaco(): Promise<any> {
  if (monacoInstance) return monacoInstance;
  if (warmupPromise) return warmupPromise;

  warmupPromise = (async () => {
    try {
      const monaco = await loader.init();
      monacoInstance = monaco;
      registerAllMonacoThemes(monaco);
      return monaco;
    } catch (err) {
      console.warn('[MonacoWarmup] Background warmup encountered error:', err);
      return null;
    }
  })();

  return warmupPromise;
}

export function getWarmedMonaco(): any {
  return monacoInstance;
}
