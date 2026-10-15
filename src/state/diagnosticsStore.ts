import { useState, useEffect } from 'react';

export interface DiagnosticItem {
  id: string;
  filePath: string;
  fileName: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source?: string;
}

export interface DiagnosticsState {
  problems: DiagnosticItem[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

let globalDiagnostics: DiagnosticsState = {
  problems: [],
  errorCount: 0,
  warningCount: 0,
  infoCount: 0,
};

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((cb) => cb());
}

export const diagnosticsStore = {
  getState: (): DiagnosticsState => globalDiagnostics,

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  setProblemsFromExtensionList: (rawList: Array<{ uri: string; diagnostics: any[] }>) => {
    const problems: DiagnosticItem[] = [];
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    for (const group of rawList || []) {
      const filePath = (group.uri || '').replace(/^file:\/\/\/?/, '').replace(/\//g, '\\');
      const fileName = filePath.split('\\').pop() || filePath;

      for (const d of group.diagnostics || []) {
        // VS Code severity: 0 = Error, 1 = Warning, 2 = Information, 3 = Hint
        let severity: 'error' | 'warning' | 'info' = 'error';
        if (d.severity === 1) {
          severity = 'warning';
          warningCount++;
        } else if (d.severity === 2 || d.severity === 3) {
          severity = 'info';
          infoCount++;
        } else {
          errorCount++;
        }

        problems.push({
          id: `diag_${filePath}_${d.range?.startLineNumber}_${d.range?.startColumn}_${Math.random().toString(36).slice(2, 6)}`,
          filePath,
          fileName,
          line: d.range?.startLineNumber || 1,
          column: d.range?.startColumn || 1,
          message: d.message || '',
          severity,
          source: d.source || 'Extension',
        });
      }
    }

    globalDiagnostics = {
      problems,
      errorCount,
      warningCount,
      infoCount,
    };
    notify();
  },

  clear: () => {
    globalDiagnostics = { problems: [], errorCount: 0, warningCount: 0, infoCount: 0 };
    notify();
  },
};

export function useDiagnostics(): DiagnosticsState {
  const [state, setState] = useState<DiagnosticsState>(diagnosticsStore.getState());

  useEffect(() => {
    const unsub = diagnosticsStore.subscribe(() => {
      setState({ ...diagnosticsStore.getState() });
    });
    return () => {
      unsub();
    };
  }, []);

  return state;
}
