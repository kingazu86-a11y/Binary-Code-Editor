import { BrowserWindow, ipcMain } from 'electron';
import { toolchainService, ToolchainInfo } from '../services/toolchain/ToolchainService';
import { compilerService, CompileOptions, CompileResult } from '../services/toolchain/CompilerService';
import { gdbDebuggerService, DebugLaunchOptions } from '../services/debugger/GdbDebuggerService';
import { cppProjectService } from '../services/project/CppProjectService';
import { cppLibraryService } from '../services/libraries/CppLibraryService';

export class CppIpcService {
  private win: BrowserWindow | null = null;

  setWindow(win: BrowserWindow) {
    this.win = win;
    gdbDebuggerService.setWindow(win);
  }

  registerIpcHandlers() {
    // Toolchain Management
    ipcMain.handle('cpp:getToolchainInfo', (_e, forceRefresh?: boolean): Promise<ToolchainInfo> => {
      return toolchainService.getToolchainInfo(forceRefresh);
    });

    // Compilation
    ipcMain.handle('cpp:compile', (_e, options: CompileOptions): Promise<CompileResult> => {
      return compilerService.compile(options);
    });

    // Debugging
    ipcMain.handle('cpp:startDebugging', (_e, options: DebugLaunchOptions) => {
      return gdbDebuggerService.startDebugging(options);
    });

    ipcMain.handle('cpp:continue', () => {
      return gdbDebuggerService.continue();
    });

    ipcMain.handle('cpp:stepOver', () => {
      return gdbDebuggerService.stepOver();
    });

    ipcMain.handle('cpp:stepInto', () => {
      return gdbDebuggerService.stepInto();
    });

    ipcMain.handle('cpp:stepOut', () => {
      return gdbDebuggerService.stepOut();
    });

    ipcMain.handle('cpp:pause', () => {
      return gdbDebuggerService.pause();
    });

    ipcMain.handle('cpp:stop', () => {
      return gdbDebuggerService.stop();
    });

    ipcMain.handle('cpp:getCallStack', () => {
      return gdbDebuggerService.getCallStack();
    });

    ipcMain.handle('cpp:getVariables', () => {
      return gdbDebuggerService.getVariables();
    });

    ipcMain.handle('cpp:evaluateExpression', (_e, expr: string) => {
      return gdbDebuggerService.evaluateExpression(expr);
    });

    ipcMain.handle('cpp:addBreakpoint', (_e, file: string, line: number) => {
      return gdbDebuggerService.addBreakpoint(file, line);
    });

    ipcMain.handle('cpp:removeBreakpoint', (_e, file: string, line: number) => {
      return gdbDebuggerService.removeBreakpoint(file, line);
    });

    ipcMain.handle('cpp:toggleBreakpoint', (_e, file: string, line: number) => {
      return gdbDebuggerService.toggleBreakpoint(file, line);
    });

    ipcMain.handle('cpp:getBreakpoints', () => {
      return gdbDebuggerService.getBreakpoints();
    });

    ipcMain.handle('cpp:getDebugStatus', () => {
      return gdbDebuggerService.getStatus();
    });

    // Project System & CMake
    ipcMain.handle('cpp:detectProjectType', (_e, workspaceDir: string) => {
      return cppProjectService.detectProjectType(workspaceDir);
    });

    ipcMain.handle('cpp:createConsoleProject', (_e, targetDir: string, projectName?: string) => {
      return cppProjectService.createConsoleProject(targetDir, projectName);
    });

    ipcMain.handle('cpp:createCmakeProject', (_e, targetDir: string, projectName?: string) => {
      return cppProjectService.createCmakeProject(targetDir, projectName);
    });

    ipcMain.handle('cpp:configureCmake', (_e, workspaceDir: string, buildType?: 'Debug' | 'Release') => {
      return cppProjectService.configureCmake(workspaceDir, buildType);
    });

    ipcMain.handle('cpp:buildCmake', (_e, workspaceDir: string, buildType?: 'Debug' | 'Release') => {
      return cppProjectService.buildCmake(workspaceDir, buildType);
    });

    ipcMain.handle('cpp:cleanCmake', (_e, workspaceDir: string) => {
      return cppProjectService.cleanCmake(workspaceDir);
    });

    ipcMain.handle('cpp:buildSimpleProject', (_e, workspaceDir: string, standard?: string) => {
      return cppProjectService.buildSimpleProject(workspaceDir, standard);
    });

    ipcMain.handle('cpp:cancelProjectBuild', () => {
      return cppProjectService.cancelBuild();
    });

    // External Libraries Management
    ipcMain.handle('cpp:getLibraryCatalog', () => {
      return cppLibraryService.getCatalog();
    });

    ipcMain.handle('cpp:getProjectLibraries', (_e, workspaceDir: string) => {
      return cppLibraryService.getProjectLibraries(workspaceDir);
    });

    ipcMain.handle('cpp:addLibraryToProject', (_e, workspaceDir: string, libraryId: string) => {
      return cppLibraryService.addLibraryToProject(workspaceDir, libraryId);
    });
  }
}

export const cppIpcService = new CppIpcService();
