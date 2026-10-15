import path from 'path';
import fs from 'fs-extra';
import { toolchainService } from '../toolchain/ToolchainService';
import { lspClientService } from './LspClientService';

export class ClangdService {
  private currentWorkspace: string | null = null;
  private isRunning = false;
  private disposers: Array<{ dispose(): void }> = [];

  async start(workspacePath?: string): Promise<boolean> {
    if (workspacePath) {
      this.currentWorkspace = workspacePath;
    }

    const info = await toolchainService.getToolchainInfo();
    if (!info.clangdPath || !fs.existsSync(info.clangdPath)) {
      console.warn('[ClangdService] Bundled clangd.exe not found at:', info.clangdPath);
      return false;
    }

    this.stop();

    const binDir = path.dirname(info.compilerPath || info.clangdPath);
    const queryDriverPattern = path.join(binDir, '*').replace(/\\/g, '/');

    const args = [
      '--background-index',
      '--header-insertion=iwyu',
      '--completion-style=detailed',
      '--function-arg-placeholders=true',
      `--query-driver=${queryDriverPattern}`,
    ];

    if (this.currentWorkspace) {
      const buildDir = path.join(this.currentWorkspace, 'build');
      if (fs.existsSync(path.join(buildDir, 'compile_commands.json'))) {
        args.push(`--compile-commands-dir=${buildDir}`);
      }
    }

    const env = toolchainService.getToolchainEnv();

    try {
      console.log(`[ClangdService] Spawning clangd for workspace: ${this.currentWorkspace || 'default'}`);

      const cppDisposer = lspClientService.registerLanguageServer('cpp', 'builtin-clangd', {
        command: info.clangdPath,
        args,
        options: {
          cwd: this.currentWorkspace || undefined,
          env,
        },
      });

      const cDisposer = lspClientService.registerLanguageServer('c', 'builtin-clangd', {
        command: info.clangdPath,
        args,
        options: {
          cwd: this.currentWorkspace || undefined,
          env,
        },
      });

      this.disposers.push(cppDisposer, cDisposer);
      this.isRunning = true;
      return true;
    } catch (err) {
      console.error('[ClangdService] Failed to start clangd:', err);
      return false;
    }
  }

  stop(): void {
    for (const d of this.disposers) {
      try {
        d.dispose();
      } catch {}
    }
    this.disposers = [];
    this.isRunning = false;
  }

  setWorkspace(workspacePath: string): void {
    if (this.currentWorkspace !== workspacePath) {
      this.currentWorkspace = workspacePath;
      if (this.isRunning) {
        this.start(workspacePath);
      }
    }
  }

  getStatus() {
    return {
      running: this.isRunning,
      workspace: this.currentWorkspace,
    };
  }
}

export const clangdService = new ClangdService();
