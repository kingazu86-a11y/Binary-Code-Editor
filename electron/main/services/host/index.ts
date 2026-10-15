import { setIpcSender, createExtensionContext } from '../shim';
import { setupRequireHook } from './requireHook';
import { dispatchMessage } from './dispatcher';
import { isTelemetryError } from './state';

process.env['VSCODE_TELEMETRY_OPT_OUT'] = '1';
process.env['TELEMETRY_DISABLED'] = '1';

// Setup require hook for require('vscode')
setupRequireHook();

// Setup IPC channel back to parent process
setIpcSender((channel: string, payload: any) => {
  if (typeof process.send === 'function') {
    process.send({ type: channel, payload });
  }
});

// Setup message dispatch loop
process.on('message', async (msg: any) => {
  await dispatchMessage(msg);
});

// Fault Isolation & Protection
process.on('uncaughtException', (err: any) => {
  if (isTelemetryError(err)) {
    console.warn('[ExtensionHostWorker] Telemetry network warning (suppressed):', err?.message || err);
    return;
  }
  console.error('[ExtensionHostWorker] Uncaught exception:', err);
  if (process.send) {
    process.send({ type: 'host/uncaughtException', payload: { error: err.message, stack: err.stack } });
  }
});

process.on('unhandledRejection', (reason: any) => {
  if (isTelemetryError(reason)) {
    console.warn('[ExtensionHostWorker] Telemetry network warning (suppressed):', reason?.message || reason);
    return;
  }
  console.error('[ExtensionHostWorker] Unhandled promise rejection:', reason);
  if (process.send) {
    process.send({
      type: 'host/unhandledRejection',
      payload: { error: reason?.message || String(reason), stack: reason?.stack },
    });
  }
});

console.log(`[ExtensionHostWorker] Worker started successfully (PID: ${process.pid})`);

// Exported for testing and external consumers
export { createExtensionContext };
export * from './state';
export * from './activator';
export * from './dispatcher';
export * from './requireHook';
