import { Disposable, EventEmitter } from '../types';

export const tasks = {
  registerTaskProvider: (_type: string, _provider: any) => new Disposable(() => {}),
  fetchTasks: async (_filter?: any) => [],
  executeTask: async (_task: any) => ({ task: _task }),
  onDidStartTask: new EventEmitter<any>().event,
  onDidEndTask: new EventEmitter<any>().event,
  onDidStartTaskProcess: new EventEmitter<any>().event,
  onDidEndTaskProcess: new EventEmitter<any>().event,
};
