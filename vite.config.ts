import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import os from 'os';
import fs from 'fs';

function binaryExtensionsDevPlugin() {
  const getExtensionsDirectory = () => {
    const p = path.join(os.homedir(), '.binary', 'extensions');
    if (!fs.existsSync(p)) {
      try { fs.mkdirSync(p, { recursive: true }); } catch {}
    }
    return p;
  };

  const getStatePath = () => {
    return path.join(os.homedir(), '.binary', 'binary-extensions-state.json');
  };

  const getRegistryPath = () => {
    return path.join(os.homedir(), '.binary', 'extensions', 'registry.json');
  };

  const loadState = (): Record<string, boolean> => {
    try {
      const regPath = getRegistryPath();
      if (fs.existsSync(regPath)) {
        const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
        if (reg?.extensions) {
          const map: Record<string, boolean> = {};
          for (const [k, v] of Object.entries(reg.extensions as Record<string, any>)) {
            map[k] = Boolean(v.enabled);
          }
          return map;
        }
      }
      const p = getStatePath();
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {}
    return {};
  };

  const saveState = (state: Record<string, boolean>) => {
    try {
      fs.writeFileSync(getStatePath(), JSON.stringify(state, null, 2), 'utf8');
      const regPath = getRegistryPath();
      if (fs.existsSync(regPath)) {
        const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
        if (reg?.extensions) {
          for (const [id, enabled] of Object.entries(state)) {
            if (reg.extensions[id]) reg.extensions[id].enabled = enabled;
          }
          fs.writeFileSync(regPath, JSON.stringify(reg, null, 2), 'utf8');
        }
      }
    } catch {}
  };

  return {
    name: 'binary-extensions-dev-plugin',
    configureServer(server: any) {
      server.middlewares.use('/__api/extensions', (req: any, res: any, next: any) => {
        const url = req.url || '';

        if (req.method === 'GET' && (url === '' || url === '/')) {
          try {
            const list: any[] = [];
            const state = loadState();
            const binaryDir = getExtensionsDirectory();

            if (fs.existsSync(binaryDir)) {
              const scannedFolders: string[] = [];
              const installedSub = path.join(binaryDir, 'installed');
              if (fs.existsSync(installedSub)) {
                try {
                  const subEntries = fs.readdirSync(installedSub, { withFileTypes: true });
                  for (const ent of subEntries) {
                    if (ent.isDirectory() && !ent.name.startsWith('.')) {
                      scannedFolders.push(path.join(installedSub, ent.name));
                    }
                  }
                } catch {}
              }

              const reserved = new Set(['installed', 'staging', 'disabled', 'quarantine']);
              const rootEntries = fs.readdirSync(binaryDir, { withFileTypes: true });
              for (const ent of rootEntries) {
                if (ent.isDirectory() && !ent.name.startsWith('.') && !reserved.has(ent.name)) {
                  scannedFolders.push(path.join(binaryDir, ent.name));
                }
              }

              const seenIds = new Set<string>();

              for (const rootFolder of scannedFolders) {
                const folderName = path.basename(rootFolder);
                let manifestPath = path.join(rootFolder, 'package.json');
                let contentFolder = rootFolder;

                if (!fs.existsSync(manifestPath)) {
                  const inner = path.join(rootFolder, 'extension', 'package.json');
                  if (fs.existsSync(inner)) {
                    manifestPath = inner;
                    contentFolder = path.join(rootFolder, 'extension');
                  } else {
                    continue;
                  }
                }

                try {
                  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                  const publisher = raw.publisher || folderName.split('.')[0] || 'community';
                  const extName = raw.name || folderName;
                  const id = `${publisher}.${extName}`;
                  if (seenIds.has(id.toLowerCase())) continue;
                  seenIds.add(id.toLowerCase());
                  const isEnabled = state[id] !== undefined ? state[id] : true;

                  let iconUri: string | undefined = undefined;
                  if (raw.icon) {
                    const iconPath = path.join(contentFolder, raw.icon);
                    if (fs.existsSync(iconPath)) {
                      try {
                        const ext = path.extname(iconPath).toLowerCase().replace('.', '');
                        const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext || 'png'}`;
                        const b64 = fs.readFileSync(iconPath).toString('base64');
                        iconUri = `data:${mime};base64,${b64}`;
                      } catch {}
                    }
                  }

                  list.push({
                    id,
                    name: extName,
                    displayName: raw.displayName || extName,
                    version: raw.version || '1.0.0',
                    description: raw.description || '',
                    author: typeof raw.author === 'string' ? raw.author : raw.author?.name || publisher,
                    icon: iconUri,
                    enabled: isEnabled,
                    categories: Array.isArray(raw.categories) ? raw.categories : ['Other'],
                    source: 'binary',
                    installedPath: rootFolder,
                    contributes: raw.contributes,
                    main: raw.main || '',
                  });
                } catch {}
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(list));
            return;
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
        }

        if (req.method === 'POST' && url.startsWith('/toggle')) {
          let body = '';
          req.on('data', (c: Buffer) => (body += c));
          req.on('end', () => {
            try {
              const { id, enabled } = JSON.parse(body);
              const state = loadState();
              state[id] = enabled;
              saveState(state);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        if (req.method === 'POST' && url.startsWith('/uninstall')) {
          let body = '';
          req.on('data', (c: Buffer) => (body += c));
          req.on('end', () => {
            try {
              const { id } = JSON.parse(body);
              const binaryDir = getExtensionsDirectory();
              const idLower = (id || '').toLowerCase();
              const dirsToCheck = [binaryDir, path.join(binaryDir, 'installed')];

              for (const dir of dirsToCheck) {
                if (!fs.existsSync(dir)) continue;
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                  if (!entry.isDirectory()) continue;
                  const entryLower = entry.name.toLowerCase();
                  if (entryLower === idLower || entryLower.startsWith(`${idLower}-`)) {
                    fs.rmSync(path.join(dir, entry.name), { recursive: true, force: true });
                  }
                }
              }

              const state = loadState();
              delete state[id];
              saveState(state);

              const regPath = getRegistryPath();
              if (fs.existsSync(regPath)) {
                try {
                  const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
                  if (reg?.extensions) {
                    delete reg.extensions[id];
                    delete reg.extensions[idLower];
                    fs.writeFileSync(regPath, JSON.stringify(reg, null, 2), 'utf8');
                  }
                } catch {}
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), binaryExtensionsDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
