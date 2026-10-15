/**
 * Types and schema definitions for the VS Code-compatible Extension Registry
 * and Extension Manifest Parser in Binary IDE.
 */

export type ExtensionState =
  | 'discovered'
  | 'parsing'
  | 'invalid'
  | 'validating'
  | 'installed'
  | 'enabled'
  | 'disabled'
  | 'corrupted'
  | 'quarantined';

export type ExtensionType =
  | 'node'
  | 'web'
  | 'theme'
  | 'language'
  | 'snippet'
  | 'grammar'
  | 'mixed'
  | 'unknown';

export interface VSCodeEngineCompatibility {
  compatible: boolean;
  requiredVSCodeVersion?: string;
  notes?: string;
}

export interface ContributionPoints {
  commands?: Array<{ command: string; title: string; category?: string; icon?: string }>;
  menus?: Record<string, any[]>;
  keybindings?: Array<{ command: string; key: string; mac?: string; when?: string }>;
  configuration?: Record<string, any> | Array<Record<string, any>>;
  languages?: Array<{ id: string; extensions?: string[]; aliases?: string[]; configuration?: string }>;
  grammars?: Array<{ language?: string; scopeName: string; path: string }>;
  snippets?: Array<{ language: string; path: string }>;
  themes?: Array<{ id?: string; label: string; uiTheme: string; path: string }>;
  iconThemes?: Array<{ id: string; label: string; path: string }>;
  colors?: Array<{ id: string; description: string; defaults: any }>;
  views?: Record<string, any[]>;
  viewsContainers?: Record<string, any[]>;
  debuggers?: any[];
  taskDefinitions?: any[];
  problemMatchers?: any[];
  terminal?: any;
  jsonValidation?: any[];
  semanticTokenScopes?: any[];
  customEditors?: any[];
  [key: string]: any;
}

export interface NormalizedManifest {
  id: string;
  name: string;
  publisher: string;
  version: string;
  displayName: string;
  description: string;
  main?: string;
  browser?: string;
  extensionKind?: string[] | string;
  engines?: {
    vscode?: string;
    [key: string]: any;
  };
  activationEvents: string[];
  extensionDependencies: string[];
  extensionPack: string[];
  categories: string[];
  keywords: string[];
  contributes: ContributionPoints;
  installPath: string;
  manifestPath: string;
  manifestValid: boolean;
  validationErrors: string[];
  extensionType: ExtensionType;
  compatibility: VSCodeEngineCompatibility;
  rawManifest: Record<string, any>;
  icon?: string;
  homepage?: string;
  repository?: any;
  bugs?: any;
  license?: string;
  galleryBanner?: any;
  preview?: boolean;
  badges?: any[];
}

export interface RegistryExtensionEntry {
  id: string;
  publisher: string;
  name: string;
  displayName: string;
  version: string;
  description: string;
  installPath: string;
  enabled: boolean;
  state: ExtensionState;
  installedAt: string;
  updatedAt: string;
  manifestValid: boolean;
  extensionType: ExtensionType;
  validationErrors?: string[];
  manifest?: NormalizedManifest;
  icon?: string;
  source?: 'binary' | 'vscode' | 'builtin' | 'unpacked' | 'marketplace';
}

export interface RegistrySchema {
  schemaVersion: number;
  extensions: Record<string, RegistryExtensionEntry>;
}

export interface ManifestParseResult {
  valid: boolean;
  manifest?: NormalizedManifest;
  errors: string[];
  errorCode?: 'EXTENSION_PATH_TRAVERSAL' | 'INVALID_MANIFEST' | 'MISSING_MANIFEST' | 'CORRUPTED_JSON';
}
