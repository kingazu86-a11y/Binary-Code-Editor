// Extension Host & Worker
export * from './host';
export * from './shim';

// Extensions Management
export * from './extensions/ExtensionRegistry';
export * from './extensions/ExtensionDownloaderService';
export * from './extensions/VsixInstallerService';
export * from './extensions/VSCodeExtensionManifestParser';
export * from './extensions/ExtensionHostProcess';

// Editor & UI Services
export * from './editor/EditorService';
export * from './editor/CustomEditorService';
export * from './editor/StatusBarService';
export * from './editor/DialogService';
export * from './editor/ViewRegistryService';
export * from './editor/MenuRegistryService';
export * from './editor/OutputChannelService';

// Workspace & System Services
export * from './workspace/WorkspaceService';
export * from './workspace/FileSystemService';
export * from './workspace/ConfigService';
export * from './workspace/TerminalService';
export * from './workspace/CommandRegistry';

// Language & LSP Services
export * from './lsp/LspClientService';
export * from './lsp/DiagnosticsService';
