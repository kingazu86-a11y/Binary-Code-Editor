import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import {
  ContributedActivityBarItem,
  ContributedView,
  TreeItem,
} from '../../../../src/types/extensionApi';

export class ViewRegistryService extends EventEmitter {
  private activityBarItems = new Map<string, ContributedActivityBarItem & { extensionId: string; badge?: number | string }>();
  private views = new Map<string, ContributedView & { extensionId: string }>();
  private treeProviders = new Map<string, { extensionId: string }>();
  private win: BrowserWindow | null = null;
  private rpcDispatcher: ((method: string, args: any[]) => Promise<any>) | null = null;

  setWindow(win: BrowserWindow | null): void {
    this.win = win;
  }

  setRpcDispatcher(dispatcher: (method: string, args: any[]) => Promise<any>): void {
    this.rpcDispatcher = dispatcher;
  }

  registerActivityBarItem(extensionId: string, item: ContributedActivityBarItem): void {
    this.activityBarItems.set(item.id, {
      ...item,
      extensionId,
    });
    this.notifyRenderer();
  }

  registerView(extensionId: string, view: ContributedView): void {
    this.views.set(view.id, {
      ...view,
      extensionId,
    });
    this.notifyRenderer();
  }

  registerTreeProvider(extensionId: string, viewId: string): void {
    this.treeProviders.set(viewId, { extensionId });
  }

  getActivityBarItems(): Array<ContributedActivityBarItem & { extensionId: string; badge?: number | string }> {
    return Array.from(this.activityBarItems.values()).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  getViewsForContainer(containerId: string): Array<ContributedView & { extensionId: string }> {
    return Array.from(this.views.values()).filter((v) => v.container === containerId);
  }

  getAllViews(): Array<ContributedView & { extensionId: string }> {
    return Array.from(this.views.values());
  }

  setActivityBarBadge(containerId: string, badge?: number | string): void {
    const item = this.activityBarItems.get(containerId);
    if (item) {
      item.badge = badge;
      this.notifyRenderer();
    }
  }

  async getTreeChildren(viewId: string, elementId?: string): Promise<TreeItem[]> {
    if (this.rpcDispatcher) {
      try {
        const result = await this.rpcDispatcher('views:getChildren', [viewId, elementId]);
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error(`[ViewRegistryService] Error getting tree children for ${viewId}:`, err);
      }
    }
    return [];
  }

  async getTreeItem(viewId: string, elementId: string): Promise<TreeItem | null> {
    if (this.rpcDispatcher) {
      try {
        return await this.rpcDispatcher('views:getTreeItem', [viewId, elementId]);
      } catch (err) {
        console.error(`[ViewRegistryService] Error getting tree item for ${viewId}:`, err);
      }
    }
    return null;
  }

  clearExtension(extensionId: string): void {
    const norm = extensionId.toLowerCase();
    for (const [id, item] of this.activityBarItems.entries()) {
      if (item.extensionId.toLowerCase() === norm) {
        this.activityBarItems.delete(id);
      }
    }
    for (const [id, view] of this.views.entries()) {
      if (view.extensionId.toLowerCase() === norm) {
        this.views.delete(id);
      }
    }
    for (const [id, provider] of this.treeProviders.entries()) {
      if (provider.extensionId.toLowerCase() === norm) {
        this.treeProviders.delete(id);
      }
    }
    this.notifyRenderer();
  }

  private notifyRenderer(): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send('extensions:viewsUpdated', {
        activityBar: this.getActivityBarItems(),
        views: this.getAllViews(),
      });
    }
  }
}

export const viewRegistryService = new ViewRegistryService();
