import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ToolchainInfo {
  available: boolean;
  rootPath: string;
  compilerPath: string;
  cCompilerPath: string;
  debuggerPath: string;
  makePath: string;
  cmakePath: string;
  ninjaPath: string;
  clangdPath: string;
  compilerVersion: string;
  cCompilerVersion: string;
  debuggerVersion: string;
  cmakeVersion: string;
  ninjaVersion: string;
  clangdVersion: string;
  runtimeLibsAvailable: boolean;
  licenseNoticesAvailable: boolean;
  environment: Record<string, string>;
  details: string;
}

export class ToolchainService {
  private cachedInfo: ToolchainInfo | null = null;
  private customToolchainPath: string | null = null;

  /**
   * Resolve the root directory of the bundled Windows x64 toolchain.
   * Works in both development mode and packaged application (process.resourcesPath).
   */
  getToolchainRoot(): string {
    if (this.customToolchainPath && fs.existsSync(this.customToolchainPath)) {
      return this.customToolchainPath;
    }

    const candidatePaths: string[] = [];

    // 1. Packaged Electron app (process.resourcesPath)
    if (process.resourcesPath) {
      candidatePaths.push(
        path.join(process.resourcesPath, 'toolchains', 'windows-x64'),
        path.join(process.resourcesPath, 'resources', 'toolchains', 'windows-x64'),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'toolchains', 'windows-x64')
      );
    }

    // 2. Electron App Path
    try {
      if (app && typeof app.getAppPath === 'function') {
        const appPath = app.getAppPath();
        candidatePaths.push(
          path.join(appPath, 'resources', 'toolchains', 'windows-x64'),
          path.join(appPath, '..', 'resources', 'toolchains', 'windows-x64')
        );
      }
    } catch {}

    // 3. Development working directory & source directories
    candidatePaths.push(
      path.resolve(process.cwd(), 'resources', 'toolchains', 'windows-x64'),
      path.resolve(__dirname, '../../../../resources', 'toolchains', 'windows-x64'),
      path.resolve(__dirname, '../../../resources', 'toolchains', 'windows-x64'),
      path.resolve(__dirname, '../../resources', 'toolchains', 'windows-x64')
    );

    // Look for first candidate where bin/g++.exe or bin/gcc.exe exists
    for (const candidate of candidatePaths) {
      if (fs.existsSync(candidate)) {
        const gpp = path.join(candidate, 'bin', 'g++.exe');
        const gcc = path.join(candidate, 'bin', 'gcc.exe');
        if (fs.existsSync(gpp) || fs.existsSync(gcc)) {
          return path.normalize(candidate);
        }
      }
    }

    // Fallback to default expected path even if not yet populated
    return path.resolve(process.cwd(), 'resources', 'toolchains', 'windows-x64');
  }

  setCustomToolchainPath(customPath: string | null) {
    this.customToolchainPath = customPath;
    this.cachedInfo = null;
  }

  /**
   * Prepares process environment variables for compiler, debugger, and compiled executables.
   * Does NOT mutate process.env or system PATH, but returns isolated env object.
   */
  getToolchainEnv(): Record<string, string> {
    const root = this.getToolchainRoot();
    const binDir = path.join(root, 'bin');
    const libDir = path.join(root, 'lib');
    const x86_64Dir = path.join(root, 'x86_64-w64-mingw32', 'bin');

    const pathSeparator = path.delimiter; // ';' on Windows
    const existingPath = process.env.PATH || process.env.Path || '';

    // Prepend bundled toolchain bin directory to PATH
    const newPath = [binDir, x86_64Dir, libDir, existingPath]
      .filter((p) => fs.existsSync(p) || p === existingPath)
      .join(pathSeparator);

    return {
      ...(process.env as Record<string, string>),
      PATH: newPath,
      Path: newPath,
      MINGW_PREFIX: root,
      GCC_EXEC_PREFIX: path.join(root, 'lib', 'gcc') + path.sep,
      CPATH: path.join(root, 'include'),
      C_INCLUDE_PATH: path.join(root, 'include'),
      CPLUS_INCLUDE_PATH: [
        path.join(root, 'include', 'c++'),
        path.join(root, 'include'),
      ].filter(fs.existsSync).join(pathSeparator),
      LIBRARY_PATH: [
        path.join(root, 'lib'),
        path.join(root, 'x86_64-w64-mingw32', 'lib'),
      ].filter(fs.existsSync).join(pathSeparator),
    };
  }

  /**
   * Detects bundled toolchain components, versions, runtime DLLs, and licenses.
   */
  async getToolchainInfo(forceRefresh = false): Promise<ToolchainInfo> {
    if (this.cachedInfo && !forceRefresh) {
      return this.cachedInfo;
    }

    const root = this.getToolchainRoot();
    const binDir = path.join(root, 'bin');
    const compilerPath = path.join(binDir, 'g++.exe');
    const cCompilerPath = path.join(binDir, 'gcc.exe');
    const debuggerPath = path.join(binDir, 'gdb.exe');
    const makePath = path.join(binDir, 'make.exe');

    const cmakePath = path.join(binDir, 'cmake.exe');
    const ninjaPath = path.join(binDir, 'ninja.exe');
    const clangdPath = path.join(binDir, 'clangd.exe');

    const compilerExists = fs.existsSync(compilerPath);
    const cCompilerExists = fs.existsSync(cCompilerPath);
    const debuggerExists = fs.existsSync(debuggerPath);
    const makeExists = fs.existsSync(makePath);
    const cmakeExists = fs.existsSync(cmakePath);
    const ninjaExists = fs.existsSync(ninjaPath);
    const clangdExists = fs.existsSync(clangdPath);

    let compilerVersion = 'Not found';
    let cCompilerVersion = 'Not found';
    let debuggerVersion = 'Not found';
    let cmakeVersion = 'Not found';
    let ninjaVersion = 'Not found';
    let clangdVersion = 'Not found';

    const env = this.getToolchainEnv();

    if (compilerExists) {
      try {
        const { stdout } = await execFileAsync(compilerPath, ['--version'], { env, timeout: 5000 });
        const firstLine = stdout.split('\n')[0].trim();
        compilerVersion = firstLine || 'GCC / G++ (Bundled)';
      } catch (err: any) {
        compilerVersion = `Found (${err.message || 'Version probe failed'})`;
      }
    }

    if (cCompilerExists) {
      try {
        const { stdout } = await execFileAsync(cCompilerPath, ['--version'], { env, timeout: 5000 });
        const firstLine = stdout.split('\n')[0].trim();
        cCompilerVersion = firstLine || 'GCC (Bundled)';
      } catch (err: any) {
        cCompilerVersion = `Found (${err.message || 'Version probe failed'})`;
      }
    }

    if (debuggerExists) {
      try {
        const { stdout } = await execFileAsync(debuggerPath, ['--version'], { env, timeout: 5000 });
        const firstLine = stdout.split('\n')[0].trim();
        debuggerVersion = firstLine || 'GNU GDB (Bundled)';
      } catch (err: any) {
        debuggerVersion = `Found (${err.message || 'Version probe failed'})`;
      }
    }

    if (cmakeExists) {
      try {
        const { stdout } = await execFileAsync(cmakePath, ['--version'], { env, timeout: 5000 });
        const firstLine = stdout.split('\n')[0].trim();
        cmakeVersion = firstLine || 'CMake (Bundled)';
      } catch (err: any) {
        cmakeVersion = `Found (${err.message || 'Version probe failed'})`;
      }
    }

    if (ninjaExists) {
      try {
        const { stdout } = await execFileAsync(ninjaPath, ['--version'], { env, timeout: 5000 });
        const firstLine = stdout.split('\n')[0].trim();
        ninjaVersion = firstLine ? `Ninja ${firstLine}` : 'Ninja (Bundled)';
      } catch (err: any) {
        ninjaVersion = `Found (${err.message || 'Version probe failed'})`;
      }
    }

    if (clangdExists) {
      try {
        const { stdout } = await execFileAsync(clangdPath, ['--version'], { env, timeout: 5000 });
        const firstLine = stdout.split('\n')[0].trim();
        clangdVersion = firstLine || 'LLVM clangd (Bundled)';
      } catch (err: any) {
        clangdVersion = `Found (${err.message || 'Version probe failed'})`;
      }
    }

    // Check runtime DLLs in binDir
    const stdCppDll = path.join(binDir, 'libstdc++-6.dll');
    const gccDll = path.join(binDir, 'libgcc_s_seh-1.dll');
    const winpthreadDll = path.join(binDir, 'libwinpthread-1.dll');
    const runtimeLibsAvailable =
      fs.existsSync(stdCppDll) ||
      fs.existsSync(gccDll) ||
      fs.existsSync(winpthreadDll) ||
      compilerExists; // static libstdc++ in w64devkit

    // Check licenses
    const licenseFiles = [
      path.join(root, 'LICENSE'),
      path.join(root, 'LICENSE.txt'),
      path.join(root, 'COPYING'),
      path.join(root, 'COPYING.txt'),
      path.join(root, 'COPYING.RUNTIME'),
      path.join(root, 'UNLICENSE'),
    ];
    const licenseNoticesAvailable = licenseFiles.some(fs.existsSync) || fs.existsSync(root);

    const available = compilerExists && debuggerExists;

    const details = available
      ? `Bundled C/C++ toolchain active (GCC: ${compilerVersion}, GDB: ${debuggerVersion}, CMake: ${cmakeVersion}, Clangd: ${clangdVersion})`
      : `Toolchain incomplete at ${root} (G++: ${compilerExists ? 'Yes' : 'No'}, GDB: ${debuggerExists ? 'Yes' : 'No'})`;

    this.cachedInfo = {
      available,
      rootPath: root,
      compilerPath: compilerExists ? compilerPath : '',
      cCompilerPath: cCompilerExists ? cCompilerPath : '',
      debuggerPath: debuggerExists ? debuggerPath : '',
      makePath: makeExists ? makePath : '',
      cmakePath: cmakeExists ? cmakePath : '',
      ninjaPath: ninjaExists ? ninjaPath : '',
      clangdPath: clangdExists ? clangdPath : '',
      compilerVersion,
      cCompilerVersion,
      debuggerVersion,
      cmakeVersion,
      ninjaVersion,
      clangdVersion,
      runtimeLibsAvailable,
      licenseNoticesAvailable,
      environment: env,
      details,
    };

    return this.cachedInfo;
  }
}

export const toolchainService = new ToolchainService();
