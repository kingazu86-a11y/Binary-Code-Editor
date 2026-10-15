import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

const DEFAULT_STATE: WindowState = {
  width: 1400,
  height: 900,
  isMaximized: false,
};

function getWindowStatePath(): string {
  return path.join(app.getPath('userData'), 'binary-window-state.json');
}

function loadWindowState(): WindowState {
  try {
    const filePath = getWindowStatePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return { ...DEFAULT_STATE, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Failed to load window state:', err);
  }
  return DEFAULT_STATE;
}

function saveWindowState(win: BrowserWindow) {
  try {
    const isMaximized = win.isMaximized();
    const bounds = win.getBounds();
    const state: WindowState = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized,
    };
    fs.writeFileSync(getWindowStatePath(), JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Failed to save window state:', err);
  }
}

export function createMainWindow(): BrowserWindow {
  const state = loadWindowState();

  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1000,
    minHeight: 650,
    frame: false, // Sleek modern custom IDE title bar
    titleBarStyle: 'hidden',
    backgroundColor: '#0D0F12',
    icon: path.join(__dirname, '../../public/logo.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Needed for node-pty bridge in main/preload setup
      spellcheck: false,
    },
    show: false,
  });

  if (state.isMaximized) {
    win.maximize();
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  let saveTimer: NodeJS.Timeout | null = null;
  const debouncedSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveWindowState(win), 500);
  };

  win.on('resize', debouncedSave);
  win.on('move', debouncedSave);
  win.on('close', () => saveWindowState(win));

  return win;
}
