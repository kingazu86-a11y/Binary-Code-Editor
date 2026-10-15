import { BrowserWindow } from 'electron';
import path from 'path';
import { gdbSession, DebuggerState, BreakpointInfo, StackFrame, DebugVariable, StoppedEvent } from './GdbSession';
import { compilerService, CompileResult } from '../toolchain/CompilerService';

export interface DebugLaunchOptions {
  sourceFilePath: string;
  workspacePath?: string;
  standard?: string;
  args?: string[];
  stopAtEntry?: boolean;
}

export class GdbDebuggerService {
  private win: BrowserWindow | null = null;
  private persistentBreakpoints = new Map<string, { file: string; line: number; enabled: boolean }>();

  setWindow(win: BrowserWindow) {
    this.win = win;
    this.bindEvents();
  }

  private bindEvents() {
    gdbSession.on('stateChanged', (state: DebuggerState) => {
      this.sendToRenderer('debugger:stateChanged', state);
    });

    gdbSession.on('stopped', (event: StoppedEvent) => {
      this.sendToRenderer('debugger:stopped', event);
    });

    gdbSession.on('continued', () => {
      this.sendToRenderer('debugger:continued', {});
    });

    gdbSession.on('callStack', (frames: StackFrame[]) => {
      this.sendToRenderer('debugger:callStack', frames);
    });

    gdbSession.on('variables', (variables: DebugVariable[]) => {
      this.sendToRenderer('debugger:variables', variables);
    });

    gdbSession.on('output', (data: { type: string; text: string }) => {
      this.sendToRenderer('debugger:output', data);
    });

    gdbSession.on('terminated', (data: { exitCode: number; error?: string }) => {
      this.sendToRenderer('debugger:terminated', data);
    });

    gdbSession.on('breakpointChanged', (bp: BreakpointInfo) => {
      this.sendToRenderer('debugger:breakpointChanged', bp);
    });
  }

  private sendToRenderer(channel: string, payload: any) {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send(channel, payload);
    }
  }

  /**
   * Complete Debug Workflow:
   * 1. Compile source file with debug symbols (-g3 -O0)
   * 2. If compilation fails, return error & diagnostics without launching
   * 3. Start GDB session with compiled executable
   * 4. Sync existing persistent breakpoints into GDB
   * 5. Start execution (or pause at entry if requested)
   */
  async startDebugging(options: DebugLaunchOptions): Promise<{ success: boolean; compileResult?: CompileResult; error?: string }> {
    const { sourceFilePath, workspacePath, standard, args, stopAtEntry } = options;

    this.sendToRenderer('debugger:stateChanged', 'compiling');
    this.sendToRenderer('debugger:output', {
      type: 'log',
      text: `[Debugger] Compiling ${path.basename(sourceFilePath)} with debug symbols...\n`,
    });

    // 1. Build with debug symbols
    const compileResult = await compilerService.compile({
      sourceFilePath,
      workspacePath,
      standard: standard || 'c++17',
      debugSymbols: true,
      optimization: '-O0',
    });

    if (!compileResult.success || !compileResult.executablePath) {
      this.sendToRenderer('debugger:stateChanged', 'idle');
      this.sendToRenderer('debugger:output', {
        type: 'error',
        text: `[Debugger] Build failed:\n${compileResult.output}\n`,
      });
      return { success: false, compileResult, error: 'Compilation failed' };
    }

    this.sendToRenderer('debugger:output', {
      type: 'log',
      text: `[Debugger] Build succeeded. Starting GDB session on ${path.basename(compileResult.executablePath)}...\n`,
    });

    try {
      // 2. Start GDB session
      await gdbSession.startSession(compileResult.executablePath, args || [], workspacePath);

      // 3. Sync registered persistent breakpoints
      for (const [, bp] of this.persistentBreakpoints) {
        if (bp.enabled) {
          await gdbSession.setBreakpoint(bp.file, bp.line);
        }
      }

      // If stop at entry requested, set temporary breakpoint at main
      if (stopAtEntry) {
        await gdbSession.sendCommand('-break-insert -t main');
      }

      // 4. Run executable in GDB
      await gdbSession.run();

      return { success: true, compileResult };
    } catch (err: any) {
      this.sendToRenderer('debugger:stateChanged', 'error');
      this.sendToRenderer('debugger:output', {
        type: 'error',
        text: `[Debugger] Failed to start GDB session: ${err.message}\n`,
      });
      return { success: false, compileResult, error: err.message };
    }
  }

  // Debugger Controls
  async continue(): Promise<boolean> {
    return gdbSession.continue();
  }

  async stepOver(): Promise<boolean> {
    return gdbSession.next();
  }

  async stepInto(): Promise<boolean> {
    return gdbSession.step();
  }

  async stepOut(): Promise<boolean> {
    return gdbSession.finish();
  }

  async pause(): Promise<boolean> {
    return gdbSession.pause();
  }

  async stop(): Promise<void> {
    await gdbSession.stopSession();
  }

  async getCallStack(): Promise<StackFrame[]> {
    return gdbSession.getCallStack();
  }

  async getVariables(): Promise<DebugVariable[]> {
    return gdbSession.getVariables();
  }

  async evaluateExpression(expr: string): Promise<string> {
    return gdbSession.evaluateExpression(expr);
  }

  // Breakpoints Management
  async addBreakpoint(file: string, line: number): Promise<BreakpointInfo> {
    const key = `${path.normalize(file)}:${line}`;
    this.persistentBreakpoints.set(key, { file, line, enabled: true });

    if (gdbSession.getState() !== 'idle') {
      return gdbSession.setBreakpoint(file, line);
    }

    return {
      id: Math.floor(Math.random() * 10000),
      file,
      line,
      verified: true,
      enabled: true,
    };
  }

  async removeBreakpoint(file: string, line: number): Promise<boolean> {
    const key = `${path.normalize(file)}:${line}`;
    this.persistentBreakpoints.delete(key);

    if (gdbSession.getState() !== 'idle') {
      return gdbSession.removeBreakpointAt(file, line);
    }
    return true;
  }

  async toggleBreakpoint(file: string, line: number): Promise<{ action: 'added' | 'removed'; breakpoint?: BreakpointInfo }> {
    const key = `${path.normalize(file)}:${line}`;
    if (this.persistentBreakpoints.has(key)) {
      await this.removeBreakpoint(file, line);
      return { action: 'removed' };
    } else {
      const bp = await this.addBreakpoint(file, line);
      return { action: 'added', breakpoint: bp };
    }
  }

  getBreakpoints(): Array<{ file: string; line: number; enabled: boolean }> {
    return Array.from(this.persistentBreakpoints.values());
  }

  getStatus(): { state: DebuggerState } {
    return { state: gdbSession.getState() };
  }
}

export const gdbDebuggerService = new GdbDebuggerService();
