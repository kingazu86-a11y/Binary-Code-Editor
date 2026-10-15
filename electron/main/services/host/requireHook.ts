import Module from 'module';
import { vscodeShim } from '../shim';

// ─────────────────────────────────────────────────────────────────────────────
// Require Hook Setup for `require('vscode')`
// ─────────────────────────────────────────────────────────────────────────────

export function setupRequireHook() {
  const originalResolveFilename = (Module as any)._resolveFilename;
  (Module as any)._resolveFilename = function (request: string, parent: any, isMain: boolean, options: any) {
    if (request === 'vscode') {
      return 'vscode';
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  const originalLoad = (Module as any)._load;
  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === 'vscode') {
      return vscodeShim;
    }
    return originalLoad.call(this, request, parent, isMain);
  };
}
