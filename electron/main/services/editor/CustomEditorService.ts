import path from 'path';
import { ContributedCustomEditor } from '../../../../src/types/extensionApi';

export class CustomEditorService {
  private editors = new Map<string, ContributedCustomEditor & { extensionId: string }>();

  registerCustomEditor(extensionId: string, editor: ContributedCustomEditor): void {
    this.editors.set(editor.viewType, {
      ...editor,
      extensionId,
    });
  }

  getCustomEditorForFile(filePath: string): (ContributedCustomEditor & { extensionId: string }) | undefined {
    const fileName = path.basename(filePath).toLowerCase();
    const ext = path.extname(filePath).toLowerCase();

    for (const editor of this.editors.values()) {
      for (const sel of editor.selector) {
        const pattern = sel.filenamePattern.toLowerCase();
        if (pattern.startsWith('*.')) {
          const targetExt = pattern.slice(1);
          if (ext === targetExt) {
            return editor;
          }
        } else if (pattern === fileName) {
          return editor;
        }
      }
    }
    return undefined;
  }

  getAllCustomEditors(): Array<ContributedCustomEditor & { extensionId: string }> {
    return Array.from(this.editors.values());
  }

  clearExtension(extensionId: string): void {
    const norm = extensionId.toLowerCase();
    for (const [viewType, editor] of this.editors.entries()) {
      if (editor.extensionId.toLowerCase() === norm) {
        this.editors.delete(viewType);
      }
    }
  }
}

export const customEditorService = new CustomEditorService();
