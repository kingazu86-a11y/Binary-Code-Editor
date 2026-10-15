import { TestItem, TestItemCollection, EventEmitter } from '../types';

export const tests = {
  createTestController: (id: string, label: string) => {
    const items = new TestItemCollection();
    return {
      id,
      label,
      items,
      createTestItem: (itemId: string, itemLabel: string, uri?: any) => {
        return new TestItem(itemId, itemLabel, uri);
      },
      createRunProfile: (label: string, group: any, runHandler: any, isDefault?: boolean) => ({
        label,
        group,
        runHandler,
        isDefault: !!isDefault,
        dispose: () => {},
      }),
      resolveHandler: undefined,
      refreshHandler: undefined,
      dispose: () => {
        items.replace([]);
      },
    };
  },
  createTestItem: (id: string, label: string, uri?: any) => new TestItem(id, label, uri),
  createTestObserver: () => ({ dispose: () => {} }),
  createTestRun: (_request: any, _name?: string, _persist?: boolean) => ({
    name: _name || 'Test Run',
    token: {
      isCancellationRequested: false,
      onCancellationRequested: new EventEmitter<any>().event,
    },
    isPersisted: !!_persist,
    enqueued: () => {},
    started: () => {},
    passed: () => {},
    failed: () => {},
    errored: () => {},
    skipped: () => {},
    appendOutput: () => {},
    end: () => {},
  }),
};
