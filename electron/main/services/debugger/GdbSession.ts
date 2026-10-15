import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { toolchainService } from '../toolchain/ToolchainService';
import { GdbMiParser, MiRecord, MiResultRecord } from './GdbMiParser';

export type DebuggerState = 'idle' | 'compiling' | 'launching' | 'running' | 'paused' | 'stopped' | 'error';

export interface BreakpointInfo {
  id: number;
  file: string;
  line: number;
  verified: boolean;
  enabled: boolean;
}

export interface StackFrame {
  id: number;
  level: number;
  functionName: string;
  file: string;
  line: number;
  address: string;
}

export interface DebugVariable {
  name: string;
  value: string;
  type?: string;
  hasChildren?: boolean;
}

export interface StoppedEvent {
  reason: 'breakpoint-hit' | 'step-end' | 'function-finished' | 'signal-received' | 'exception' | 'exited' | 'unknown';
  file?: string;
  line?: number;
  functionName?: string;
  frame?: StackFrame;
  description?: string;
  exitCode?: number;
}

export class GdbSession extends EventEmitter {
  private gdbProcess: ChildProcess | null = null;
  private tokenCounter = 1;
  private pendingCommands = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void; cmd: string }>();
  private state: DebuggerState = 'idle';
  private breakpoints = new Map<number, BreakpointInfo>();
  private fileBreakpoints = new Map<string, number>(); // "file:line" -> id
  private buffer = '';
  private currentExecutable: string | null = null;

  getState(): DebuggerState {
    return this.state;
  }

  private setState(newState: DebuggerState) {
    if (this.state !== newState) {
      this.state = newState;
      this.emit('stateChanged', newState);
    }
  }

  /**
   * Send a GDB/MI command and await the result record.
   */
  sendCommand(cmd: string, timeoutMs = 15000): Promise<MiResultRecord> {
    return new Promise((resolve, reject) => {
      if (!this.gdbProcess || !this.gdbProcess.stdin) {
        return reject(new Error('GDB process is not running.'));
      }

      const token = this.tokenCounter++;
      const fullCmd = `${token}${cmd}\n`;

      const timer = setTimeout(() => {
        if (this.pendingCommands.has(token)) {
          this.pendingCommands.delete(token);
          reject(new Error(`Command timed out: ${cmd}`));
        }
      }, timeoutMs);

      this.pendingCommands.set(token, {
        resolve: (record: MiResultRecord) => {
          clearTimeout(timer);
          resolve(record);
        },
        reject: (err: any) => {
          clearTimeout(timer);
          reject(err);
        },
        cmd,
      });

      try {
        this.gdbProcess.stdin.write(fullCmd);
      } catch (err: any) {
        this.pendingCommands.delete(token);
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  /**
   * Start a new GDB debugging session with target executable.
   */
  async startSession(executablePath: string, args: string[] = [], cwd?: string): Promise<boolean> {
    await this.stopSession();

    const info = await toolchainService.getToolchainInfo();
    if (!info.available || !info.debuggerPath) {
      throw new Error(`Bundled GDB debugger is not available.\n${info.details}`);
    }

    if (!fs.existsSync(executablePath)) {
      throw new Error(`Target executable not found at: ${executablePath}`);
    }

    this.currentExecutable = executablePath;
    this.setState('launching');

    const workingDir = cwd || path.dirname(executablePath);
    const env = toolchainService.getToolchainEnv();

    try {
      this.gdbProcess = spawn(info.debuggerPath, ['--interpreter=mi3', '--nx', '--quiet'], {
        cwd: workingDir,
        env,
        windowsHide: true,
      });

      this.gdbProcess.stdout?.on('data', (data) => this.handleGdbData(data.toString()));
      this.gdbProcess.stderr?.on('data', (data) => {
        this.emit('output', { type: 'log', text: data.toString() });
      });

      this.gdbProcess.on('error', (err) => {
        console.error('[GdbSession] GDB spawn error:', err);
        this.setState('error');
        this.emit('terminated', { exitCode: -1, error: err.message });
      });

      this.gdbProcess.on('close', (code) => {
        console.log('[GdbSession] GDB process terminated with code', code);
        this.cleanup();
        this.setState('idle');
        this.emit('terminated', { exitCode: code ?? 0 });
      });

      // Escape Windows path backslashes for GDB
      const escapedExePath = executablePath.replace(/\\/g, '/');
      const escapedCwd = workingDir.replace(/\\/g, '/');

      // 1. Set working directory in GDB
      await this.sendCommand(`-environment-cd "${escapedCwd}"`);

      // 2. Load executable and symbols
      const fileRes = await this.sendCommand(`-file-exec-and-symbols "${escapedExePath}"`);
      if (fileRes.class === 'error') {
        throw new Error(fileRes.data.msg || 'Failed to load executable into GDB');
      }

      // 3. Pass CLI arguments if present
      if (args && args.length > 0) {
        const escapedArgs = args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(' ');
        await this.sendCommand(`-exec-arguments ${escapedArgs}`);
      }

      // 4. Disable pagination
      await this.sendCommand('-gdb-set pagination off');
      await this.sendCommand('-gdb-set confirm off');

      this.emit('output', { type: 'console', text: `Loaded symbols for: ${path.basename(executablePath)}\n` });
      return true;
    } catch (err: any) {
      this.cleanup();
      this.setState('error');
      throw err;
    }
  }

  /**
   * Launch and begin execution of the target program.
   */
  async run(): Promise<boolean> {
    try {
      this.setState('running');
      const res = await this.sendCommand('-exec-run');
      return res.class === 'running' || res.class === 'done';
    } catch (err: any) {
      this.setState('error');
      this.emit('output', { type: 'error', text: `Failed to start execution: ${err.message}\n` });
      throw err;
    }
  }

  /**
   * Set breakpoint at specified file and line.
   */
  async setBreakpoint(file: string, line: number): Promise<BreakpointInfo> {
    const key = `${path.normalize(file)}:${line}`;
    const normalizedFile = file.replace(/\\/g, '/');

    try {
      const res = await this.sendCommand(`-break-insert -f "${normalizedFile}:${line}"`);
      if (res.class === 'done' && res.data.bkpt) {
        const bkptData = res.data.bkpt;
        const id = parseInt(bkptData.number, 10);
        const info: BreakpointInfo = {
          id,
          file,
          line,
          verified: true,
          enabled: bkptData.enabled === 'y',
        };
        this.breakpoints.set(id, info);
        this.fileBreakpoints.set(key, id);
        this.emit('breakpointChanged', info);
        return info;
      }
    } catch (err: any) {
      console.warn(`[GdbSession] Failed to insert breakpoint at ${normalizedFile}:${line}:`, err.message);
    }

    const fallbackId = this.tokenCounter++;
    const fallbackInfo: BreakpointInfo = {
      id: fallbackId,
      file,
      line,
      verified: false,
      enabled: true,
    };
    this.breakpoints.set(fallbackId, fallbackInfo);
    this.fileBreakpoints.set(key, fallbackId);
    return fallbackInfo;
  }

  /**
   * Remove breakpoint by ID.
   */
  async removeBreakpoint(breakpointId: number): Promise<boolean> {
    try {
      await this.sendCommand(`-break-delete ${breakpointId}`);
    } catch {}
    const bp = this.breakpoints.get(breakpointId);
    if (bp) {
      const key = `${path.normalize(bp.file)}:${bp.line}`;
      this.fileBreakpoints.delete(key);
      this.breakpoints.delete(breakpointId);
    }
    return true;
  }

  /**
   * Remove breakpoint by file and line.
   */
  async removeBreakpointAt(file: string, line: number): Promise<boolean> {
    const key = `${path.normalize(file)}:${line}`;
    const id = this.fileBreakpoints.get(key);
    if (id !== undefined) {
      return this.removeBreakpoint(id);
    }
    return false;
  }

  /**
   * Enable or disable a breakpoint.
   */
  async enableBreakpoint(breakpointId: number, enabled: boolean): Promise<boolean> {
    try {
      if (enabled) {
        await this.sendCommand(`-break-enable ${breakpointId}`);
      } else {
        await this.sendCommand(`-break-disable ${breakpointId}`);
      }
      const bp = this.breakpoints.get(breakpointId);
      if (bp) {
        bp.enabled = enabled;
        this.emit('breakpointChanged', bp);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Step Over (next source line)
   */
  async next(): Promise<boolean> {
    try {
      this.setState('running');
      const res = await this.sendCommand('-exec-next');
      return res.class === 'running' || res.class === 'done';
    } catch (err: any) {
      this.emit('output', { type: 'error', text: `Step Over error: ${err.message}\n` });
      return false;
    }
  }

  /**
   * Step Into (into function call)
   */
  async step(): Promise<boolean> {
    try {
      this.setState('running');
      const res = await this.sendCommand('-exec-step');
      return res.class === 'running' || res.class === 'done';
    } catch (err: any) {
      this.emit('output', { type: 'error', text: `Step Into error: ${err.message}\n` });
      return false;
    }
  }

  /**
   * Step Out (finish current frame)
   */
  async finish(): Promise<boolean> {
    try {
      this.setState('running');
      const res = await this.sendCommand('-exec-finish');
      return res.class === 'running' || res.class === 'done';
    } catch (err: any) {
      this.emit('output', { type: 'error', text: `Step Out error: ${err.message}\n` });
      return false;
    }
  }

  /**
   * Continue execution until next breakpoint or termination.
   */
  async continue(): Promise<boolean> {
    try {
      this.setState('running');
      const res = await this.sendCommand('-exec-continue');
      return res.class === 'running' || res.class === 'done';
    } catch (err: any) {
      this.emit('output', { type: 'error', text: `Continue error: ${err.message}\n` });
      return false;
    }
  }

  /**
   * Pause / Interrupt execution
   */
  async pause(): Promise<boolean> {
    try {
      const res = await this.sendCommand('-exec-interrupt');
      return res.class === 'done';
    } catch (err: any) {
      this.emit('output', { type: 'error', text: `Pause error: ${err.message}\n` });
      return false;
    }
  }

  /**
   * Retrieve current call stack frames from GDB.
   */
  async getCallStack(): Promise<StackFrame[]> {
    try {
      const res = await this.sendCommand('-stack-list-frames');
      if (res.class === 'done' && res.data.stack) {
        const rawFrames = Array.isArray(res.data.stack) ? res.data.stack : [res.data.stack];
        const frames: StackFrame[] = [];

        for (const item of rawFrames) {
          const frameObj = item.frame || item;
          if (frameObj) {
            frames.push({
              id: parseInt(frameObj.level, 10) || 0,
              level: parseInt(frameObj.level, 10) || 0,
              functionName: frameObj.func || 'anonymous',
              file: frameObj.fullname || frameObj.file || '',
              line: parseInt(frameObj.line, 10) || 0,
              address: frameObj.addr || '',
            });
          }
        }

        this.emit('callStack', frames);
        return frames;
      }
    } catch (err: any) {
      console.warn('[GdbSession] Failed to query call stack:', err.message);
    }
    return [];
  }

  /**
   * Retrieve local variables and parameters for current frame.
   */
  async getVariables(): Promise<DebugVariable[]> {
    try {
      const res = await this.sendCommand('-stack-list-variables --all-values');
      if (res.class === 'done' && res.data.variables) {
        const rawVars = Array.isArray(res.data.variables) ? res.data.variables : [res.data.variables];
        const variables: DebugVariable[] = [];

        for (const item of rawVars) {
          if (item && item.name) {
            variables.push({
              name: item.name,
              value: item.value || '{...}',
              type: item.type,
            });
          }
        }

        this.emit('variables', variables);
        return variables;
      }
    } catch (err: any) {
      console.warn('[GdbSession] Failed to query variables:', err.message);
    }
    return [];
  }

  /**
   * Evaluate expression in current frame context.
   */
  async evaluateExpression(expression: string): Promise<string> {
    try {
      const escaped = expression.replace(/"/g, '\\"');
      const res = await this.sendCommand(`-data-evaluate-expression "${escaped}"`);
      if (res.class === 'done' && res.data.value !== undefined) {
        return res.data.value;
      }
      if (res.class === 'error') {
        return `<Error: ${res.data.msg || 'evaluation failed'}>`;
      }
    } catch (err: any) {
      return `<Error: ${err.message}>`;
    }
    return '<undefined>';
  }

  /**
   * Stop session and kill GDB process.
   */
  async stopSession(): Promise<void> {
    if (this.gdbProcess) {
      try {
        await this.sendCommand('-gdb-exit', 1000);
      } catch {}
      this.cleanup();
    }
    this.setState('idle');
  }

  private cleanup() {
    if (this.gdbProcess) {
      try {
        this.gdbProcess.kill('SIGKILL');
      } catch {}
      this.gdbProcess = null;
    }
    this.pendingCommands.forEach(({ reject }) => reject(new Error('Debugger session ended.')));
    this.pendingCommands.clear();
    this.breakpoints.clear();
    this.fileBreakpoints.clear();
    this.currentExecutable = null;
    this.buffer = '';
  }

  /**
   * Handle incoming raw stdout lines from GDB process.
   */
  private handleGdbData(chunk: string) {
    this.buffer += chunk;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || ''; // Keep incomplete trailing fragment

    for (const line of lines) {
      const record = GdbMiParser.parseLine(line);
      if (!record) continue;

      if (record.type === 'result') {
        const token = record.token;
        if (token && this.pendingCommands.has(token)) {
          const pending = this.pendingCommands.get(token)!;
          this.pendingCommands.delete(token);
          pending.resolve(record);
        }
      } else if (record.type === 'exec') {
        this.handleExecAsync(record);
      } else if (record.type === 'console') {
        this.emit('output', { type: 'console', text: record.content });
      } else if (record.type === 'target') {
        this.emit('output', { type: 'target', text: record.content });
      } else if (record.type === 'log') {
        this.emit('output', { type: 'log', text: record.content });
      }
    }
  }

  /**
   * Process async execution events from GDB (stopped, running, exited).
   */
  private async handleExecAsync(record: any) {
    const asyncClass = record.class;
    const data = record.data || {};

    if (asyncClass === 'running') {
      this.setState('running');
      this.emit('continued', {});
      return;
    }

    if (asyncClass === 'stopped') {
      const reason = data.reason || 'unknown';

      if (reason === 'exited-normally' || reason === 'exited') {
        const exitCode = data['exit-code'] ? parseInt(data['exit-code'], 10) : 0;
        this.emit('output', { type: 'console', text: `\nProgram exited with code ${exitCode}\n` });
        this.setState('stopped');
        this.emit('terminated', { exitCode });
        return;
      }

      this.setState('paused');

      let frame: StackFrame | undefined;
      let file: string | undefined;
      let line: number | undefined;
      let functionName: string | undefined;

      if (data.frame) {
        const f = data.frame;
        file = f.fullname || f.file;
        line = parseInt(f.line, 10);
        functionName = f.func;
        frame = {
          id: parseInt(f.level, 10) || 0,
          level: parseInt(f.level, 10) || 0,
          functionName: f.func || '',
          file: file || '',
          line: line || 0,
          address: f.addr || '',
        };
      }

      const stoppedEvent: StoppedEvent = {
        reason: reason as any,
        file,
        line,
        functionName,
        frame,
        description: data['signal-meaning'] || reason,
      };

      this.emit('stopped', stoppedEvent);

      // Auto-query stack and variables on pause
      await Promise.allSettled([this.getCallStack(), this.getVariables()]);
    }
  }
}

export const gdbSession = new GdbSession();
