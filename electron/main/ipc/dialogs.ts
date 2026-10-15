import { dialog, BrowserWindow } from 'electron';

export function setupDialogHandlers(win: BrowserWindow) {
  // We register IPC handled in main.ts or modularly
}

export async function handleOpenFolder(win: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Open Folder in Binary',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
}

export async function handleOpenFile(win: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    title: 'Open File in Binary',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
}

export async function handleSaveFileDialog(win: BrowserWindow, defaultName?: string): Promise<string | null> {
  const result = await dialog.showSaveDialog(win, {
    title: 'Save File As',
    defaultPath: defaultName,
  });

  if (result.canceled || !result.filePath) {
    return null;
  }
  return result.filePath;
}
