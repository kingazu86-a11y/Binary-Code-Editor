import { Uri, Disposable, EventEmitter } from '../types';

export const debug = {
  activeDebugSession: undefined,
  activeDebugConsole: {
    append: () => {},
    appendLine: () => {},
  },
  breakpoints: [],
  onDidReceiveDebugSessionCustomEvent: new EventEmitter<any>().event,
  onDidStartDebugSession: new EventEmitter<any>().event,
  onDidTerminateDebugSession: new EventEmitter<any>().event,
  onDidChangeActiveDebugSession: new EventEmitter<any>().event,
  onDidChangeBreakpoints: new EventEmitter<any>().event,
  registerDebugConfigurationProvider: (_debugType: string, _provider: any, _triggerKind?: number) => {
    return new Disposable(() => {});
  },
  registerDebugAdapterDescriptorFactory: (_debugType: string, _factory: any) => {
    return new Disposable(() => {});
  },
  startDebugging: async (_folder: any, _nameOrConfig: any, _parentSessionOrOptions?: any) => {
    return false;
  },
  stopDebugging: async (_session?: any) => {},
  asDebugSourceUri: (source: any) => Uri.file(typeof source === 'string' ? source : ''),
};
