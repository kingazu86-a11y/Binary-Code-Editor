import { BrowserWindow } from 'electron';
import os from 'os';
import fs from 'fs';

let pty: any = null;
try {
  pty = require('node-pty');
  console.log('[TerminalManager] node-pty loaded successfully.');
} catch (err) {
  console.error('[TerminalManager] Failed to load node-pty:', err);
}

interface TerminalInstance {
  id: string;
  ptyProcess: any;
  cwd: string;
  shell: string;
}

export class TerminalManager {
  private terminals = new Map<string, TerminalInstance>();
  private win: BrowserWindow | null = null;

  setWindow(win: BrowserWindow) {
    this.win = win;
  }

  resolveShell(requestedShell?: string): string {
    const isWin = process.platform === 'win32';
    if (!requestedShell || requestedShell === 'default') {
      return isWin ? 'powershell.exe' : (process.env.SHELL || '/bin/bash');
    }

    const lower = requestedShell.toLowerCase();
    if (lower.includes('cmd')) {
      return process.env.COMSPEC || 'cmd.exe';
    }

    if (lower.includes('powershell') || lower.includes('pwsh')) {
      return 'powershell.exe';
    }

    if (lower.includes('bash')) {
      if (isWin) {
        const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe';
        if (fs.existsSync(gitBash)) return gitBash;
        return 'bash.exe';
      }
      return process.env.SHELL || '/bin/bash';
    }

    return requestedShell;
  }

  createTerminal(options: {
    id: string;
    cwd?: string;
    shell?: string;
    cols?: number;
    rows?: number;
  }): boolean {
    const { id, cols = 80, rows = 24 } = options;
    let cwd = options.cwd;
    if (!cwd || !fs.existsSync(cwd)) {
      if (process.env.INIT_CWD && fs.existsSync(process.env.INIT_CWD)) {
        cwd = process.env.INIT_CWD;
      } else if (process.cwd() && fs.existsSync(process.cwd())) {
        cwd = process.cwd();
      } else {
        cwd = os.homedir();
      }
    }

    const shell = this.resolveShell(options.shell);

    // If existing terminal with same ID, kill it first
    if (this.terminals.has(id)) {
      this.killTerminal(id);
    }

    if (!pty || typeof pty.spawn !== 'function') {
      console.error('[TerminalManager] node-pty is not available to spawn terminal.');
      return false;
    }

    try {
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: Math.max(10, cols),
        rows: Math.max(5, rows),
        cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        },
      });

      ptyProcess.onData((data: string) => {
        if (this.win && !this.win.isDestroyed()) {
          this.win.webContents.send(`terminal:data:${id}`, data);
        }
      });

      ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
        console.log(`[TerminalManager] Terminal ${id} exited with code ${exitCode}`);
        if (this.win && !this.win.isDestroyed()) {
          this.win.webContents.send(`terminal:exit:${id}`, exitCode);
        }
        this.terminals.delete(id);
      });

      this.terminals.set(id, { id, ptyProcess, cwd, shell });
      console.log(`[TerminalManager] Created real PTY terminal ${id} (${shell}) in ${cwd}`);
      return true;
    } catch (err: any) {
      console.error(`[TerminalManager] Error spawning PTY for ${id}:`, err);
      if (this.win && !this.win.isDestroyed()) {
        this.win.webContents.send(
          `terminal:data:${id}`,
          `\r\n\x1b[31mFailed to launch terminal process (${shell}): ${err.message}\x1b[0m\r\n`
        );
      }
      return false;
    }
  }

  writeTerminal(id: string, data: string): void {
    const inst = this.terminals.get(id);
    if (!inst || !inst.ptyProcess) return;

    try {
      inst.ptyProcess.write(data);
    } catch (err) {
      console.error(`[TerminalManager] Error writing to terminal ${id}:`, err);
    }
  }

  resizeTerminal(id: string, cols: number, rows: number): void {
    const inst = this.terminals.get(id);
    if (!inst || !inst.ptyProcess) return;

    try {
      const safeCols = Math.max(10, Math.floor(cols));
      const safeRows = Math.max(5, Math.floor(rows));
      inst.ptyProcess.resize(safeCols, safeRows);
    } catch (err) {
      // Ignore normal resize edge errors during layout shifts
    }
  }

  killTerminal(id: string): void {
    const inst = this.terminals.get(id);
    if (!inst) return;

    try {
      if (inst.ptyProcess && typeof inst.ptyProcess.kill === 'function') {
        inst.ptyProcess.kill();
      }
    } catch (err) {
      console.error(`[TerminalManager] Error killing terminal ${id}:`, err);
    }

    this.terminals.delete(id);
  }

  killAll(): void {
    for (const [id] of this.terminals) {
      this.killTerminal(id);
    }
  }
}

export const terminalManager = new TerminalManager();
