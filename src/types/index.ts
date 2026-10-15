export * from './electron.d';

export type ActivityTab = 'explorer' | 'search' | 'git' | 'debug' | 'extensions' | 'settings';

export type BottomTab = 'problems' | 'output' | 'terminal' | 'debug';

export interface EditorTabItem {
  id: string;
  filePath: string;
  fileName: string;
  isDirty: boolean;
  isPinned: boolean;
  isLoading?: boolean;
  content: string;
  savedContent: string;
  language: string;
  cursorPosition?: { line: number; column: number };
  scrollPosition?: { scrollTop: number; scrollLeft: number };
  isDiff?: boolean;
  originalContent?: string;
  modifiedContent?: string;
  isExtensionDetail?: boolean;
  extensionId?: string;
  extensionData?: any;
  /** 'code' | 'image' | 'svg' – determines which viewer to render */
  viewMode?: 'code' | 'image' | 'svg';
}

export interface EditorGroupItem {
  id: string;
  tabs: EditorTabItem[];
  activeTabId: string | null;
}

export type SplitDirection = 'horizontal' | 'vertical';

export interface MarkerProblem {
  id: string;
  filePath: string;
  fileName: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  source?: string;
}

export interface OutputChannel {
  id: string;
  name: string;
  logs: string[];
}

export interface KeybindingItem {
  id: string;
  command: string;
  title: string;
  key: string;
  category: string;
  isCustom?: boolean;
}
