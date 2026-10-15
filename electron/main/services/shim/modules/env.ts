export const env = {
  appName: 'Binary IDE',
  appRoot: process.cwd(),
  language: 'en',
  machineId: 'binary-machine-id',
  sessionId: 'binary-session-id',
  uiKind: 1, // Desktop
  clipboard: {
    readText: async (): Promise<string> => '',
    writeText: async (_text: string): Promise<void> => {},
  },
};
