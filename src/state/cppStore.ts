import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { editorStore } from './editorStore';
import { layoutStore } from './layoutStore';
import { terminalStore } from './terminalStore';
import { diagnosticsStore } from './diagnosticsStore';
import {
  CppToolchainInfo,
  CppCompileResult,
  CppDebuggerState,
  CppBreakpointInfo,
  CppStackFrame,
  CppDebugVariable,
  CppStoppedEvent,
  CppLibraryInfo,
  CppProjectBuildResult,
} from '../types/electron';

export interface CppStoreState {
  toolchainInfo: CppToolchainInfo | null;
  isLoadingToolchain: boolean;
  selectedStandard: string;
  selectedOptimization: string;
  warningFlags: string[];
  isBuilding: boolean;
  lastBuildResult: CppCompileResult | null;
  projectType: 'cmake' | 'simple' | 'single-file';
  libraryCatalog: CppLibraryInfo[];
  projectLibraries: string[];
  debuggerState: CppDebuggerState;
  breakpoints: CppBreakpointInfo[];
  currentFrame: CppStackFrame | null;
  callStack: CppStackFrame[];
  variables: CppDebugVariable[];
  debugOutput: Array<{ type: string; text: string; time: number }>;
  stoppedEvent: CppStoppedEvent | null;
  activeDebugFile: string | null;
  activeDebugLine: number | null;
}

let globalState: CppStoreState = {
  toolchainInfo: null,
  isLoadingToolchain: false,
  selectedStandard: 'c++20',
  selectedOptimization: '-O0',
  warningFlags: ['-Wall', '-Wextra'],
  isBuilding: false,
  lastBuildResult: null,
  projectType: 'single-file',
  libraryCatalog: [],
  projectLibraries: [],
  debuggerState: 'idle',
  breakpoints: [],
  currentFrame: null,
  callStack: [],
  variables: [],
  debugOutput: [],
  stoppedEvent: null,
  activeDebugFile: null,
  activeDebugLine: null,
};

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((cb) => cb());
}

let initializedListeners = false;

function initDebuggerListeners() {
  if (initializedListeners) return;
  initializedListeners = true;

  api.onCppDebuggerStateChanged((state: CppDebuggerState) => {
    globalState = { ...globalState, debuggerState: state };
    if (state === 'idle' || state === 'stopped') {
      globalState = {
        ...globalState,
        activeDebugFile: null,
        activeDebugLine: null,
        currentFrame: null,
      };
    }
    notify();
  });

  api.onCppDebuggerStopped((event: CppStoppedEvent) => {
    const activeFile = event.file || null;
    const activeLine = event.line || null;

    globalState = {
      ...globalState,
      debuggerState: 'paused',
      stoppedEvent: event,
      activeDebugFile: activeFile,
      activeDebugLine: activeLine,
      currentFrame: event.frame || null,
    };

    // If source file stopped, open it in editor and navigate to line
    if (activeFile) {
      editorStore.openFile(activeFile);
    }

    notify();
  });

  api.onCppDebuggerContinued(() => {
    globalState = {
      ...globalState,
      debuggerState: 'running',
      activeDebugLine: null,
      stoppedEvent: null,
    };
    notify();
  });

  api.onCppDebuggerCallStack((frames: CppStackFrame[]) => {
    globalState = {
      ...globalState,
      callStack: frames,
      currentFrame: frames.length > 0 ? frames[0] : null,
    };
    notify();
  });

  api.onCppDebuggerVariables((variables: CppDebugVariable[]) => {
    globalState = { ...globalState, variables };
    notify();
  });

  api.onCppDebuggerOutput((data: { type: string; text: string }) => {
    globalState = {
      ...globalState,
      debugOutput: [...globalState.debugOutput, { ...data, time: Date.now() }],
    };
    notify();
  });

  api.onCppDebuggerTerminated((data: { exitCode: number; error?: string }) => {
    globalState = {
      ...globalState,
      debuggerState: 'idle',
      activeDebugFile: null,
      activeDebugLine: null,
      currentFrame: null,
      callStack: [],
      variables: [],
      stoppedEvent: null,
    };
    notify();
  });

  api.onCppDebuggerBreakpointChanged((bp: CppBreakpointInfo) => {
    const existingIdx = globalState.breakpoints.findIndex(
      (b) => b.file.toLowerCase() === bp.file.toLowerCase() && b.line === bp.line
    );
    let updated = [...globalState.breakpoints];
    if (existingIdx !== -1) {
      updated[existingIdx] = bp;
    } else {
      updated.push(bp);
    }
    globalState = { ...globalState, breakpoints: updated };
    notify();
  });
}

export const cppStore = {
  getState: (): CppStoreState => globalState,

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setStandard: (standard: string) => {
    globalState = { ...globalState, selectedStandard: standard };
    notify();
  },

  setOptimization: (opt: string) => {
    globalState = { ...globalState, selectedOptimization: opt };
    notify();
  },

  fetchToolchainInfo: async (forceRefresh = false) => {
    initDebuggerListeners();
    globalState = { ...globalState, isLoadingToolchain: true };
    notify();

    try {
      const info = await api.cppGetToolchainInfo(forceRefresh);
      globalState = { ...globalState, toolchainInfo: info, isLoadingToolchain: false };
    } catch (err) {
      console.error('[cppStore] Failed to load toolchain info:', err);
      globalState = { ...globalState, isLoadingToolchain: false };
    }
    notify();
  },

  /**
   * Helper to ensure active file is saved before compile/run/debug.
   */
  saveActiveFileIfNeeded: async (): Promise<string | null> => {
    const editorState = editorStore.getState();
    const activeGroup = editorState.groups.find((g) => g.id === editorState.activeGroupId) || editorState.groups[0];
    const activeTab = activeGroup?.tabs.find((t) => t.id === activeGroup.activeTabId);

    if (!activeTab || !activeTab.filePath) {
      return null;
    }

    if (activeTab.isDirty) {
      await editorStore.saveFile(activeTab.id, activeGroup.id);
    }

    return activeTab.filePath;
  },

  /**
   * Build/Compile the currently active C/C++ file.
   */
  compileActiveFile: async (workspacePath?: string): Promise<CppCompileResult | null> => {
    const filePath = await cppStore.saveActiveFileIfNeeded();
    if (!filePath) {
      console.warn('[cppStore] No active file to compile.');
      return null;
    }

    globalState = { ...globalState, isBuilding: true };
    notify();

    try {
      const res = await api.cppCompile({
        sourceFilePath: filePath,
        workspacePath,
        standard: globalState.selectedStandard,
        optimization: globalState.selectedOptimization,
        debugSymbols: true,
        warningFlags: globalState.warningFlags,
      });

      globalState = { ...globalState, isBuilding: false, lastBuildResult: res };

      // Update diagnostics in Problems panel & Monaco markers
      if (res.diagnostics) {
        const diagGroup = [{
          uri: filePath,
          diagnostics: res.diagnostics.map((d) => ({
            severity: d.severity === 'error' ? 0 : d.severity === 'warning' ? 1 : 2,
            message: d.message,
            range: {
              startLineNumber: d.line,
              startColumn: d.column,
              endLineNumber: d.line,
              endColumn: d.column + 10,
            },
            source: d.source,
          })),
        }];
        diagnosticsStore.setProblemsFromExtensionList(diagGroup);
      }

      if (!res.success) {
        layoutStore.setBottomPanelTab('problems');
      }

      notify();
      return res;
    } catch (err: any) {
      globalState = {
        ...globalState,
        isBuilding: false,
        lastBuildResult: {
          success: false,
          exitCode: -1,
          output: err.message,
          executablePath: '',
          diagnostics: [],
          durationMs: 0,
          error: err.message,
        },
      };
      notify();
      return null;
    }
  },

  /**
   * Compile and Run the active file in the integrated terminal.
   */
  runActiveFile: async (workspacePath?: string) => {
    const res = await cppStore.compileActiveFile(workspacePath);
    if (!res || !res.success || !res.executablePath) {
      // Build failed; do not launch outdated executable
      return false;
    }

    // Switch to Terminal bottom panel tab
    layoutStore.setBottomPanelTab('terminal');

    const workingDir = workspacePath || '';
    const exePath = res.executablePath;

    // Use terminalStore to run executable in integrated PTY terminal
    const terminalState = terminalStore.getState();
    let termId = terminalState.activeTerminalId;

    if (!termId || terminalState.terminals.length === 0) {
      termId = await terminalStore.createTerminal(workingDir || undefined, 'powershell');
    }

    // Wait a brief tick to ensure PTY is ready and send execution command
    setTimeout(() => {
      const activeId = terminalStore.getState().activeTerminalId || termId;
      if (activeId) {
        // Send command to run the executable wrapped cleanly with quotes
        const cmd = `& "${exePath}"\r\n`;
        terminalStore.writeTerminal(activeId, cmd);
      }
    }, 150);

    return true;
  },

  /**
   * Start GDB debugging on the active file.
   */
  startDebuggingActiveFile: async (workspacePath?: string, stopAtEntry = false) => {
    initDebuggerListeners();
    const filePath = await cppStore.saveActiveFileIfNeeded();
    if (!filePath) {
      console.warn('[cppStore] No active file to debug.');
      return false;
    }

    globalState = {
      ...globalState,
      debuggerState: 'compiling',
      debugOutput: [
        { type: 'log', text: `[Debug] Initializing debugger for ${filePath}...\n`, time: Date.now() },
      ],
    };
    notify();

    // Switch sidebar to Debug panel or bottom panel to Debug
    layoutStore.setActiveActivityTab('debug');

    try {
      const res = await api.cppStartDebugging({
        sourceFilePath: filePath,
        workspacePath,
        standard: globalState.selectedStandard,
        stopAtEntry,
      });

      if (!res.success) {
        globalState = { ...globalState, debuggerState: 'error' };
        if (res.compileResult && !res.compileResult.success) {
          layoutStore.setBottomPanelTab('problems');
        }
        notify();
        return false;
      }

      return true;
    } catch (err: any) {
      console.error('[cppStore] Error starting debug:', err);
      globalState = { ...globalState, debuggerState: 'error' };
      notify();
      return false;
    }
  },

  continue: async () => {
    return api.cppContinue();
  },

  stepOver: async () => {
    return api.cppStepOver();
  },

  stepInto: async () => {
    return api.cppStepInto();
  },

  stepOut: async () => {
    return api.cppStepOut();
  },

  pause: async () => {
    return api.cppPause();
  },

  stopDebugging: async () => {
    await api.cppStopDebug();
    globalState = {
      ...globalState,
      debuggerState: 'idle',
      activeDebugFile: null,
      activeDebugLine: null,
      currentFrame: null,
    };
    notify();
  },

  toggleBreakpoint: async (file: string, line: number) => {
    const res = await api.cppToggleBreakpoint(file, line);
    const existing = globalState.breakpoints.filter(
      (b) => !(b.file.toLowerCase() === file.toLowerCase() && b.line === line)
    );

    if (res.action === 'added' && res.breakpoint) {
      globalState = {
        ...globalState,
        breakpoints: [...existing, res.breakpoint],
      };
    } else {
      globalState = { ...globalState, breakpoints: existing };
    }
    notify();
  },

  evaluateExpression: async (expr: string): Promise<string> => {
    return api.cppEvaluateExpression(expr);
  },

  clearDebugOutput: () => {
    globalState = { ...globalState, debugOutput: [] };
    notify();
  },

  detectProjectType: async (workspaceDir: string) => {
    const type = await api.cppDetectProjectType(workspaceDir);
    globalState = { ...globalState, projectType: type };
    notify();
    return type;
  },

  createConsoleProject: async (targetDir: string, projectName?: string) => {
    await api.cppCreateConsoleProject(targetDir, projectName);
    globalState = { ...globalState, projectType: 'simple' };
    notify();
  },

  createCmakeProject: async (targetDir: string, projectName?: string) => {
    await api.cppCreateCmakeProject(targetDir, projectName);
    globalState = { ...globalState, projectType: 'cmake' };
    notify();
  },

  configureCmake: async (workspaceDir: string, buildType?: 'Debug' | 'Release'): Promise<CppProjectBuildResult> => {
    globalState = { ...globalState, isBuilding: true };
    notify();
    try {
      const res = await api.cppConfigureCmake(workspaceDir, buildType);
      return res;
    } finally {
      globalState = { ...globalState, isBuilding: false };
      notify();
    }
  },

  buildCmake: async (workspaceDir: string, buildType?: 'Debug' | 'Release'): Promise<CppProjectBuildResult> => {
    globalState = { ...globalState, isBuilding: true };
    notify();
    try {
      const res = await api.cppBuildCmake(workspaceDir, buildType);
      return res;
    } finally {
      globalState = { ...globalState, isBuilding: false };
      notify();
    }
  },

  cleanCmake: async (workspaceDir: string): Promise<CppProjectBuildResult> => {
    return api.cppCleanCmake(workspaceDir);
  },

  buildSimpleProject: async (workspaceDir: string, standard?: string): Promise<CppProjectBuildResult> => {
    globalState = { ...globalState, isBuilding: true };
    notify();
    try {
      const res = await api.cppBuildSimpleProject(workspaceDir, standard || globalState.selectedStandard);
      return res;
    } finally {
      globalState = { ...globalState, isBuilding: false };
      notify();
    }
  },

  loadLibraryCatalog: async () => {
    const catalog = await api.cppGetLibraryCatalog();
    globalState = { ...globalState, libraryCatalog: catalog };
    notify();
    return catalog;
  },

  loadProjectLibraries: async (workspaceDir: string) => {
    const libs = await api.cppGetProjectLibraries(workspaceDir);
    globalState = { ...globalState, projectLibraries: libs };
    notify();
    return libs;
  },

  addLibraryToProject: async (workspaceDir: string, libraryId: string) => {
    const res = await api.cppAddLibraryToProject(workspaceDir, libraryId);
    if (res.success) {
      await cppStore.loadProjectLibraries(workspaceDir);
    }
    return res;
  },
};

export function useCppStore(): CppStoreState {
  const [state, setState] = useState<CppStoreState>(cppStore.getState());

  useEffect(() => {
    const unsub = cppStore.subscribe(() => {
      setState({ ...cppStore.getState() });
    });
    return () => {
      unsub();
    };
  }, []);

  return state;
}

