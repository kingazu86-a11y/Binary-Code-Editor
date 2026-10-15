import path from 'path';
import { Uri, workspaceState, executeCommandInternal } from '../shim';
import { activeExtensionsMap } from './state';
import { handleActivateExtension, handleDeactivateExtension } from './activator';

export async function handleInit(payload: any) {
  if (payload?.workspacePath) {
    workspaceState.rootPath = payload.workspacePath;
    workspaceState.name = path.basename(payload.workspacePath);
    workspaceState.workspaceFolders = [
      {
        uri: Uri.file(payload.workspacePath),
        name: workspaceState.name,
        index: 0,
      },
    ];
  }
  if (payload?.config) {
    workspaceState.config = payload.config;
  }
  return { success: true };
}

export async function handleExecuteCommand(payload: { commandId: string; args: any[] }) {
  try {
    const res = await executeCommandInternal(payload.commandId, ...(payload.args || []));
    return { success: true, result: res };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

export async function dispatchMessage(msg: any): Promise<void> {
  if (!msg || typeof msg !== 'object') return;

  const { msgId, type, payload } = msg;

  if (type === 'ping') {
    if (process.send) {
      process.send({
        msgId,
        type: 'pong',
        payload: {
          uptime: process.uptime(),
          pid: process.pid,
          memoryUsage: process.memoryUsage(),
          activeExtensions: Array.from(activeExtensionsMap.keys()),
        },
      });
    }
    return;
  }

  let result: any = null;

  try {
    switch (type) {
      case 'host/init':
        result = await handleInit(payload);
        break;
      case 'extension/activate':
        result = await handleActivateExtension(payload);
        break;
      case 'extension/deactivate':
        result = await handleDeactivateExtension(payload);
        break;
      case 'command/execute':
        result = await handleExecuteCommand(payload);
        break;
      case 'workspace/changed':
        if (payload?.folderPath) {
          workspaceState.rootPath = payload.folderPath;
          workspaceState.name = path.basename(payload.folderPath);
        }
        result = { success: true };
        break;
      default:
        result = { success: false, error: `Unknown worker action: ${type}` };
        break;
    }
  } catch (err: any) {
    result = { success: false, error: err.message || String(err) };
  }

  if (msgId && process.send) {
    process.send({ msgId, type: `${type}/reply`, payload: result });
  }
}
