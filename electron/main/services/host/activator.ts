import path from 'path';
import fs from 'fs';
import {
  createExtensionContext,
  setActiveExtensionId,
  registerExtensionMetadata,
  unregisterExtensionMetadata,
} from '../shim';
import { activeExtensionsMap } from './state';

export async function handleActivateExtension(payload: { id: string; installedPath: string; main: string; manifest?: any }) {
  const { id, installedPath, main, manifest } = payload;
  const idLower = id.toLowerCase();

  if (activeExtensionsMap.has(idLower)) {
    return { success: true, alreadyActive: true };
  }

  if (!installedPath || !main) {
    return { success: false, error: `Invalid extension payload for ${id}: missing installedPath or main entry` };
  }

  let entryFile = path.isAbsolute(main) ? main : path.join(installedPath, main);
  if (!fs.existsSync(entryFile)) {
    const candidates = [
      `${entryFile}.js`,
      `${entryFile}.cjs`,
      `${entryFile}.mjs`,
      path.join(entryFile, 'index.js'),
      path.join(installedPath, 'extension', main),
      path.join(installedPath, 'extension', `${main}.js`),
      path.join(installedPath, 'extension.js'),
      path.join(installedPath, 'dist', 'extension.js'),
      path.join(installedPath, 'out', 'extension.js'),
      path.join(installedPath, 'dist', 'index.js'),
      path.join(installedPath, 'out', 'index.js'),
      path.join(installedPath, 'index.js'),
    ];
    const found = candidates.find((c) => fs.existsSync(c));
    if (found) {
      entryFile = found;
    } else {
      return { success: false, error: `Main entry script not found: ${entryFile}` };
    }
  }

  try {
    const { context, subscriptions } = createExtensionContext(id, installedPath, manifest);
    setActiveExtensionId(id);

    // Register metadata shim
    registerExtensionMetadata(id, {
      id,
      extensionPath: installedPath,
      isActive: true,
      packageJSON: manifest || {},
    });

    // Clear Node require cache for fresh activation if previously cached
    delete require.cache[require.resolve(entryFile)];

    const moduleInstance = require(entryFile);

    if (typeof moduleInstance.activate === 'function') {
      await Promise.resolve(moduleInstance.activate(context));
    }

    activeExtensionsMap.set(idLower, {
      id,
      manifest,
      instance: moduleInstance,
      context,
      subscriptions,
    });

    if (process.send) {
      process.send({
        type: 'extension/activated',
        payload: { id, time: Date.now() },
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error(`[ExtensionHostWorker] Error activating extension ${id}:`, err);
    unregisterExtensionMetadata(id);
    const errMsg = err ? (err.message || String(err)) : 'Unknown activation error';
    return { success: false, error: errMsg, stack: err?.stack };
  }
}

export async function handleDeactivateExtension(payload: { id: string }) {
  const idLower = payload.id.toLowerCase();
  const active = activeExtensionsMap.get(idLower);
  if (!active) {
    return { success: true };
  }

  try {
    if (active.instance && typeof active.instance.deactivate === 'function') {
      await Promise.resolve(active.instance.deactivate());
    }

    for (const sub of active.subscriptions) {
      try {
        sub.dispose();
      } catch {}
    }

    activeExtensionsMap.delete(idLower);
    unregisterExtensionMetadata(payload.id);

    if (process.send) {
      process.send({
        type: 'extension/deactivated',
        payload: { id: payload.id },
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error(`[ExtensionHostWorker] Error deactivating extension ${payload.id}:`, err);
    return { success: false, error: err.message || String(err) };
  }
}
