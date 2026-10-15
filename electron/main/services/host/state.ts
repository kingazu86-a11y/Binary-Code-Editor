export interface ActiveExtension {
  id: string;
  manifest: any;
  instance: any;
  context: any;
  subscriptions: { dispose(): any }[];
}

export const activeExtensionsMap = new Map<string, ActiveExtension>();

export function isTelemetryError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err) || '').toLowerCase();
  const stack = (err.stack || '').toLowerCase();
  return (
    msg.includes('dc.services.visualstudio.com') ||
    stack.includes('dc.services.visualstudio.com') ||
    msg.includes('vortex.data.microsoft.com') ||
    stack.includes('vortex.data.microsoft.com') ||
    msg.includes('applicationinsights') ||
    stack.includes('applicationinsights') ||
    (err.code === 'ENOTFOUND' && (msg.includes('visualstudio') || msg.includes('microsoft')))
  );
}
