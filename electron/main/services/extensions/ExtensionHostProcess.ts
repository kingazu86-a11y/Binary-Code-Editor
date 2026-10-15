import { fork, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import { commandRegistry } from '../workspace/CommandRegistry';
import { statusBarService } from '../editor/StatusBarService';
import { outputChannelService } from '../editor/OutputChannelService';
import { diagnosticsService } from '../lsp/DiagnosticsService';
import { dialogService } from '../editor/DialogService';

export interface ExtensionHostStatus {
  running: boolean;
  pid: number | null;
  uptime: number;
  memoryUsage?: number;
  cpuUsage?: number;
  activeExtensionsCount: number;
  activeExtensions: string[];
}

export interface ExtensionLifecycleItem {
  id: string;
  status: 'inactive' | 'activating' | 'active' | 'deactivating' | 'error' | 'crashed';
  activatedAt?: number;
  error?: string;
  stack?: string;
}

export class ExtensionHostProcess extends EventEmitter {
  private child: ChildProcess | null = null;
  private startTime = 0;
  private msgIdCounter = 1;
  private pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void; timer: NodeJS.Timeout }>();
  private activeExtensions = new Set<string>();
  private lifecycleStatusMap = new Map<string, ExtensionLifecycleItem>();
  private pingIntervalTimer: NodeJS.Timeout | null = null;
  private isRestarting = false;
  private restartCount = 0;
  private lastRestartTime = 0;
  private currentWorkspacePath: string | null = null;

  constructor() {
    super();
  }

  public async start(workspacePath?: string): Promise<boolean> {
    if (this.child && !this.child.killed) {
      return true;
    }

    if (workspacePath) {
      this.currentWorkspacePath = workspacePath;
    }

    // Rate-limiting restart loops (max 5 restarts in 30 seconds)
    const now = Date.now();
    if (now - this.lastRestartTime < 30000) {
      this.restartCount++;
      if (this.restartCount > 5) {
        console.error('[ExtensionHostProcess] Too many crash restarts in 30 seconds. Disabling auto-restart.');
        return false;
      }
    } else {
      this.restartCount = 1;
      this.lastRestartTime = now;
    }

    try {
      const candidatePaths = [
        path.join(__dirname, 'extensionHostWorker.js'),
        path.join(process.cwd(), 'dist-electron', 'main', 'extensionHostWorker.js'),
        path.join(__dirname, 'services', 'extensionHostWorker.js'),
      ];

      let scriptToFork = candidatePaths.find((p) => fs.existsSync(p));

      // In development / ts-node runtime environment fallback
      const execArgv: string[] = [];
      if (!scriptToFork) {
        const tsWorkerPath = path.join(__dirname, 'extensionHostWorker.ts');
        if (fs.existsSync(tsWorkerPath)) {
          let hasTsNode = false;
          try {
            require.resolve('ts-node/register');
            hasTsNode = true;
          } catch {}
          if (hasTsNode) {
            scriptToFork = tsWorkerPath;
            execArgv.push('-r', 'ts-node/register');
          }
        }
      }

      if (!scriptToFork) {
        console.error('[ExtensionHostProcess] extensionHostWorker.js not found. Extension Host cannot be started.');
        return false;
      }

      this.child = fork(scriptToFork, [], {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' },
        execArgv,
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      });

      this.startTime = Date.now();

      this.child.stdout?.on('data', (data) => {
        const str = data.toString('utf-8');
        outputChannelService.append('Extension Host', str);
      });

      this.child.stderr?.on('data', (data) => {
        const str = data.toString('utf-8');
        outputChannelService.append('Extension Host Errors', str);
        console.warn('[ExtensionHostProcess worker stderr]:', str);
      });

      this.child.on('message', (msg: any) => this.handleWorkerMessage(msg));

      this.child.on('exit', (code, signal) => {
        console.warn(`[ExtensionHostProcess] Worker exited with code ${code}, signal ${signal}`);
        this.handleProcessCrash(code, signal);
      });

      this.child.on('error', (err) => {
        console.error('[ExtensionHostProcess] Worker process error:', err);
      });

      // Start health check ping timer
      this.startHealthCheck();

      // Initialize worker with current workspace context
      await this.sendRequest('host/init', { workspacePath: this.currentWorkspacePath });

      console.log(`[ExtensionHostProcess] Process spawned successfully (PID: ${this.child.pid})`);
      this.emit('started', this.child.pid);
      return true;
    } catch (err) {
      console.error('[ExtensionHostProcess] Failed to start Extension Host child process:', err);
      return false;
    }
  }

  public async stop(): Promise<void> {
    this.stopHealthCheck();
    this.rejectAllPendingRequests('Extension Host shutting down');

    if (this.child) {
      try {
        this.child.kill('SIGTERM');
      } catch {}
      this.child = null;
    }
    this.activeExtensions.clear();
    this.emit('stopped');
  }

  public async restart(workspacePath?: string): Promise<ExtensionHostStatus> {
    this.isRestarting = true;
    await this.stop();
    await new Promise((res) => setTimeout(res, 500));
    await this.start(workspacePath || this.currentWorkspacePath || undefined);
    this.isRestarting = false;
    return this.getStatus();
  }

  public getStatus(): ExtensionHostStatus {
    const isRunning = !!(this.child && !this.child.killed && this.child.connected);
    return {
      running: isRunning,
      pid: this.child ? this.child.pid || null : null,
      uptime: isRunning ? Math.round((Date.now() - this.startTime) / 1000) : 0,
      activeExtensionsCount: this.activeExtensions.size,
      activeExtensions: Array.from(this.activeExtensions),
    };
  }

  public getLifecycleStatusList(): ExtensionLifecycleItem[] {
    return Array.from(this.lifecycleStatusMap.values());
  }

  public getHostDashboard() {
    const status = this.getStatus();
    return {
      totalExtensions: this.activeExtensions.size,
      running: status.running ? this.activeExtensions.size : 0,
      stopped: 0,
      crashed: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      extensions: Array.from(this.activeExtensions).map((id) => ({
        id,
        status: 'running',
      })),
    };
  }

  public async activateExtension(id: string, installedPath: string, main: string, manifest?: any): Promise<{ success: boolean; error?: string }> {
    if (!this.child || !this.child.connected) {
      const started = await this.start();
      if (!started) return { success: false, error: 'Failed to start Extension Host process' };
    }

    this.lifecycleStatusMap.set(id, { id, status: 'activating' });

    try {
      const res = await this.sendRequest('extension/activate', {
        id,
        installedPath,
        main,
        manifest,
      });

      if (res && res.success) {
        this.activeExtensions.add(id);
        this.lifecycleStatusMap.set(id, { id, status: 'active', activatedAt: Date.now() });
        return { success: true };
      } else {
        const error = res?.error || 'Failed to activate extension';
        this.lifecycleStatusMap.set(id, { id, status: 'error', error, stack: res?.stack });
        return { success: false, error };
      }
    } catch (err: any) {
      const error = err.message || String(err);
      this.lifecycleStatusMap.set(id, { id, status: 'error', error });
      return { success: false, error };
    }
  }

  public async deactivateExtension(id: string): Promise<{ success: boolean; error?: string }> {
    if (!this.child || !this.child.connected) {
      this.activeExtensions.delete(id);
      this.lifecycleStatusMap.delete(id);
      return { success: true };
    }

    this.lifecycleStatusMap.set(id, { id, status: 'deactivating' });

    try {
      const res = await this.sendRequest('extension/deactivate', { id });
      this.activeExtensions.delete(id);
      this.lifecycleStatusMap.delete(id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  public async executeCommand(commandId: string, ...args: any[]): Promise<any> {
    if (!this.child || !this.child.connected) {
      throw new Error(`Cannot execute command '${commandId}': Extension Host is not running.`);
    }

    const res = await this.sendRequest('command/execute', { commandId, args });
    if (res && res.success) {
      return res.result;
    }
    throw new Error(res?.error || `Command execution failed for ${commandId}`);
  }

  public async sendWorkspaceChanged(folderPath: string): Promise<void> {
    this.currentWorkspacePath = folderPath;
    if (this.child && this.child.connected) {
      await this.sendRequest('workspace/changed', { folderPath }).catch(() => {});
    }
  }

  private sendRequest(type: string, payload: any, timeoutMs = 15000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.child || !this.child.connected) {
        return reject(new Error('Extension Host process disconnected'));
      }

      const msgId = this.msgIdCounter++;
      const timer = setTimeout(() => {
        this.pendingRequests.delete(msgId);
        reject(new Error(`Extension Host request timeout for ${type} (msgId: ${msgId})`));
      }, timeoutMs);

      this.pendingRequests.set(msgId, { resolve, reject, timer });

      this.child.send({
        msgId,
        type,
        payload,
      });
    });
  }

  private handleWorkerMessage(msg: any) {
    if (!msg || typeof msg !== 'object') return;

    // Handle RPC responses
    if (msg.msgId && this.pendingRequests.has(msg.msgId)) {
      const pending = this.pendingRequests.get(msg.msgId)!;
      clearTimeout(pending.timer);
      this.pendingRequests.delete(msg.msgId);
      pending.resolve(msg.payload);
      return;
    }

    // Handle Worker Notifications & Events
    const { type, payload } = msg;

    switch (type) {
      case 'window/showMessage':
        if (payload?.type === 'error') {
          dialogService.showErrorMessage(payload.message, payload.items);
        } else if (payload?.type === 'warning') {
          dialogService.showWarningMessage(payload.message, payload.items);
        } else {
          dialogService.showInformationMessage(payload.message, payload.items);
        }
        break;

      case 'output/append':
        outputChannelService.append(payload.name || 'Extension Output', payload.value || '');
        break;

      case 'output/clear':
        outputChannelService.clear(payload.name || 'Extension Output');
        break;

      case 'statusBar/set':
        statusBarService.setEntry(payload.extensionId || 'ext', {
          id: payload.id,
          text: payload.text,
          tooltip: payload.tooltip,
          color: payload.color,
          backgroundColor: payload.backgroundColor,
          command: payload.command,
          alignment: payload.alignment,
          priority: payload.priority,
        });
        break;

      case 'statusBar/hide':
        if (payload?.id) {
          statusBarService.removeEntry(payload.id);
        }
        break;

      case 'diagnostics/set':
        if (payload?.name && payload?.diagnostics) {
          diagnosticsService.setDiagnostics(payload.name, payload.diagnostics, payload.extensionId);
        }
        break;

      case 'commands/register':
        if (payload?.commandId) {
          commandRegistry.registerCommand(
            payload.commandId,
            {
              title: payload.commandId,
              category: payload.extensionId || 'Extension',
              handler: (...args: any[]) => this.executeCommand(payload.commandId, ...args),
            },
            payload.extensionId
          );
        }
        break;

      case 'commands/unregister':
        if (payload?.commandId) {
          commandRegistry.unregisterCommand(payload.commandId);
        }
        break;

      case 'commands/execute':
        if (payload?.commandId) {
          commandRegistry.executeCommand(payload.commandId, ...(payload.args || [])).catch((err) => {
            console.warn(`[ExtensionHostProcess] Failed to execute command '${payload.commandId}':`, err?.message || err);
          });
        }
        break;

      case 'extension/activated':
        if (payload?.id) {
          this.activeExtensions.add(payload.id);
          this.lifecycleStatusMap.set(payload.id, { id: payload.id, status: 'active', activatedAt: payload.time });
        }
        break;

      case 'extension/deactivated':
        if (payload?.id) {
          this.activeExtensions.delete(payload.id);
          this.lifecycleStatusMap.delete(payload.id);
        }
        break;

      case 'host/uncaughtException':
      case 'host/unhandledRejection':
        console.warn(`[ExtensionHostProcess] Worker warning (${type}):`, payload);
        break;
    }
  }

  private handleProcessCrash(code: number | null, signal: string | null) {
    this.stopHealthCheck();
    this.rejectAllPendingRequests(`Extension Host crashed (code: ${code}, signal: ${signal})`);

    for (const extId of this.activeExtensions) {
      this.lifecycleStatusMap.set(extId, {
        id: extId,
        status: 'crashed',
        error: `Worker process exited with code ${code}`,
      });
    }

    this.child = null;
    this.emit('crashed', { code, signal });

    // Auto-restart if not manually restarting
    if (!this.isRestarting) {
      console.log('[ExtensionHostProcess] Attempting automatic restart of Extension Host process...');
      setTimeout(() => {
        this.start().catch((err) => console.error('[ExtensionHostProcess] Auto-restart failed:', err));
      }, 1000);
    }
  }

  private startHealthCheck() {
    this.stopHealthCheck();
    this.pingIntervalTimer = setInterval(() => {
      if (this.child && this.child.connected) {
        this.sendRequest('ping', {}, 5000).catch((err) => {
          console.warn('[ExtensionHostProcess] Health check ping timed out:', err.message);
        });
      }
    }, 15000);
  }

  private stopHealthCheck() {
    if (this.pingIntervalTimer) {
      clearInterval(this.pingIntervalTimer);
      this.pingIntervalTimer = null;
    }
  }

  private rejectAllPendingRequests(reason: string) {
    for (const [msgId, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
    }
    this.pendingRequests.clear();
  }
}

export const extensionHostProcess = new ExtensionHostProcess();
