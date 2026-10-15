import { ContributedMenuItem } from '../../../../src/types/extensionApi';
import { commandRegistry } from '../workspace/CommandRegistry';

export interface ResolvedMenuItem {
  command: string;
  title: string;
  category?: string;
  icon?: string;
  group?: string;
  alt?: string;
  extensionId?: string;
}

export class MenuRegistryService {
  // Map of location -> ContributedMenuItem[]
  private menus = new Map<string, Array<ContributedMenuItem & { extensionId: string }>>();

  registerMenuItem(location: string, item: ContributedMenuItem, extensionId: string): void {
    const list = this.menus.get(location) || [];
    list.push({ ...item, extensionId });
    this.menus.set(location, list);
  }

  getMenuItems(location: string, customContext?: Record<string, any>): ResolvedMenuItem[] {
    const items = this.menus.get(location) || [];
    const resolved: ResolvedMenuItem[] = [];

    for (const item of items) {
      if (!item.when || item.when === 'true') {
        const cmd = commandRegistry.getCommand(item.command);
        resolved.push({
          command: item.command,
          title: cmd?.title || item.command,
          category: cmd?.category,
          icon: cmd?.icon,
          group: item.group,
          alt: item.alt,
          extensionId: item.extensionId,
        });
      }
    }

    return resolved;
  }

  clearExtension(extensionId: string): void {
    const norm = extensionId.toLowerCase();
    for (const [loc, items] of this.menus.entries()) {
      const filtered = items.filter((i) => i.extensionId.toLowerCase() !== norm);
      this.menus.set(loc, filtered);
    }
  }
}

export const menuRegistryService = new MenuRegistryService();
