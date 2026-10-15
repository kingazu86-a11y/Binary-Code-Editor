import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { toolchainService } from './ToolchainService';

export interface DiagnosticItem {
  id: string;
  filePath: string;
  fileName: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source: string;
}

export type CompilerDiagnostic = DiagnosticItem;

export interface CompileOptions {
  sourceFilePath: string;
  workspacePath?: string;
  outputBinaryPath?: string;
  standard?: string; // 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23' | 'c99' | 'c11' | 'c17'
  optimization?: string; // '-O0' | '-O1' | '-O2' | '-O3' | '-Og' | '-Os'
  debugSymbols?: boolean;
  warningFlags?: string[];
  extraFlags?: string[];
  defines?: string[];
  includePaths?: string[];
  libPaths?: string[];
  libraries?: string[];
  timeoutMs?: number;
}

export interface CompileResult {
  success: boolean;
  exitCode: number;
  output: string;
  executablePath: string;
  diagnostics: DiagnosticItem[];
  durationMs: number;
  error?: string;
}

export class CompilerService {
  /**
   * Parse GCC/G++ diagnostic output into structured items.
   * Typical GCC format:
   *   C:\path\to\file.cpp:12:5: error: 'cout' was not declared in this scope
   *   C:\path\to\file.cpp:14:10: warning: unused variable 'x' [-Wunused-variable]
   *   C:\path\to\file.cpp:15:3: note: suggested alternative: 'char'
   */
  parseGccDiagnostics(rawOutput: string, defaultFilePath: string = ''): DiagnosticItem[] {
    const diagnostics: DiagnosticItem[] = [];
    const lines = rawOutput.split(/\r?\n/);

    // Regex matching: file:line:col: (fatal error|error|warning|note|info): message
    // Also handles Windows drive letters like C:/...
    const diagRegex = /^((?:[a-zA-Z]:[\\/]|[\.\/\\])?[^:\r\n]+):(\d+):(\d+):\s+(fatal error|error|warning|note|info):\s+(.*)$/i;

    for (const line of lines) {
      const match = line.match(diagRegex);
      if (match) {
        const [, matchedPath, lineStr, colStr, rawSeverity, message] = match;
        const lineNum = parseInt(lineStr, 10) || 1;
        const colNum = parseInt(colStr, 10) || 1;

        let severity: 'error' | 'warning' | 'info' = 'error';
        const lowerSev = rawSeverity.toLowerCase();
        if (lowerSev === 'warning') {
          severity = 'warning';
        } else if (lowerSev === 'note' || lowerSev === 'info') {
          severity = 'info';
        } else {
          severity = 'error';
        }

        // Normalize filePath
        let resolvedPath = matchedPath;
        if (!path.isAbsolute(resolvedPath)) {
          let baseDir = process.cwd();
          if (defaultFilePath) {
            try {
              if (fs.existsSync(defaultFilePath) && fs.statSync(defaultFilePath).isDirectory()) {
                baseDir = defaultFilePath;
              } else {
                baseDir = path.dirname(defaultFilePath);
              }
            } catch {
              baseDir = path.dirname(defaultFilePath);
            }
          }
          resolvedPath = path.resolve(baseDir, resolvedPath);
        }
        resolvedPath = path.normalize(resolvedPath);
        const fileName = path.basename(resolvedPath);

        diagnostics.push({
          id: `diag_gcc_${fileName}_${lineNum}_${colNum}_${Math.random().toString(36).substring(2, 7)}`,
          filePath: resolvedPath,
          fileName,
          line: lineNum,
          column: colNum,
          message: `${rawSeverity}: ${message.trim()}`,
          severity,
          source: 'GCC/G++',
        });
      }
    }

    return diagnostics;
  }

  /**
   * Alias for parseGccDiagnostics
   */
  parseDiagnostics(rawOutput: string, defaultFilePath: string = ''): DiagnosticItem[] {
    return this.parseGccDiagnostics(rawOutput, defaultFilePath);
  }

  /**
   * Determine default output binary path for a source file.
   */
  resolveOutputBinaryPath(sourceFilePath: string, workspacePath?: string): string {
    const parsed = path.parse(sourceFilePath);
    const exeName = `${parsed.name}.exe`;

    if (workspacePath && fs.existsSync(workspacePath)) {
      const buildDir = path.join(workspacePath, '.binary', 'build');
      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
      }
      return path.join(buildDir, exeName);
    }

    // Fallback alongside source file
    return path.join(parsed.dir, exeName);
  }

  /**
   * Compile a C or C++ source file.
   */
  async compile(options: CompileOptions): Promise<CompileResult> {
    const startTime = Date.now();
    const info = await toolchainService.getToolchainInfo();

    if (!info.available) {
      return {
        success: false,
        exitCode: -1,
        output: `Error: Bundled C++ toolchain is not available.\n${info.details}`,
        executablePath: '',
        diagnostics: [],
        durationMs: 0,
        error: 'Toolchain unavailable',
      };
    }

    const { sourceFilePath, workspacePath } = options;
    if (!sourceFilePath || !fs.existsSync(sourceFilePath)) {
      return {
        success: false,
        exitCode: -1,
        output: `Error: Source file not found at "${sourceFilePath}"`,
        executablePath: '',
        diagnostics: [],
        durationMs: 0,
        error: 'Source file not found',
      };
    }

    const ext = path.extname(sourceFilePath).toLowerCase();
    const isC = ext === '.c';
    const compilerExecutable = isC ? info.cCompilerPath : info.compilerPath;

    if (!compilerExecutable || !fs.existsSync(compilerExecutable)) {
      return {
        success: false,
        exitCode: -1,
        output: `Error: Compiler executable not found at "${compilerExecutable}"`,
        executablePath: '',
        diagnostics: [],
        durationMs: 0,
        error: 'Compiler executable not found',
      };
    }

    const outputBinaryPath = options.outputBinaryPath || this.resolveOutputBinaryPath(sourceFilePath, workspacePath);

    // Delete existing binary so outdated executables are never accidentally run on build failure
    try {
      if (fs.existsSync(outputBinaryPath)) {
        fs.unlinkSync(outputBinaryPath);
      }
    } catch (err) {
      console.warn(`[CompilerService] Could not remove old binary at ${outputBinaryPath}:`, err);
    }

    // Ensure output directory exists
    const outDir = path.dirname(outputBinaryPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Prepare arguments
    const args: string[] = [sourceFilePath, '-o', outputBinaryPath];

    // Standard
    if (!isC) {
      const cppStd = options.standard || 'c++17';
      args.push(`-std=${cppStd}`);
    } else {
      const cStd = options.standard || 'c11';
      args.push(`-std=${cStd}`);
    }

    // Debug symbols (use -g3 for maximum GDB debugging detail)
    if (options.debugSymbols !== false) {
      args.push('-g3');
    }

    // Optimization
    if (options.optimization) {
      args.push(options.optimization);
    } else if (options.debugSymbols !== false) {
      args.push('-O0');
    }

    // Warnings
    const warningFlags = options.warningFlags || ['-Wall', '-Wextra'];
    args.push(...warningFlags);

    // Defines
    if (options.defines && Array.isArray(options.defines)) {
      for (const d of options.defines) {
        args.push(`-D${d}`);
      }
    }

    // Include paths
    if (options.includePaths && Array.isArray(options.includePaths)) {
      for (const inc of options.includePaths) {
        if (inc) args.push(`-I${inc}`);
      }
    }

    // Library paths
    if (options.libPaths && Array.isArray(options.libPaths)) {
      for (const lib of options.libPaths) {
        if (lib) args.push(`-L${lib}`);
      }
    }

    // Libraries
    if (options.libraries && Array.isArray(options.libraries)) {
      for (const lib of options.libraries) {
        if (lib) args.push(`-l${lib}`);
      }
    }

    // Extra flags
    if (options.extraFlags && Array.isArray(options.extraFlags)) {
      args.push(...options.extraFlags);
    }

    const env = toolchainService.getToolchainEnv();
    const workingDir = workspacePath || path.dirname(sourceFilePath);

    return new Promise<CompileResult>((resolve) => {
      let stdoutData = '';
      let stderrData = '';
      let timedOut = false;

      const timeout = setTimeout(() => {
        timedOut = true;
        try {
          proc.kill();
        } catch {}
      }, options.timeoutMs || 30000);

      const proc = spawn(compilerExecutable, args, {
        cwd: workingDir,
        env,
        windowsHide: true,
      });

      proc.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        const durationMs = Date.now() - startTime;
        resolve({
          success: false,
          exitCode: -1,
          output: `Compiler process error: ${err.message}\nCommand: "${compilerExecutable}" ${args.join(' ')}`,
          executablePath: '',
          diagnostics: [],
          durationMs,
          error: err.message,
        });
      });

      proc.on('close', (code) => {
        clearTimeout(timeout);
        const durationMs = Date.now() - startTime;
        const fullOutput = (stdoutData + (stderrData ? (stdoutData ? '\n' : '') + stderrData : '')).trim();

        if (timedOut) {
          resolve({
            success: false,
            exitCode: -1,
            output: `${fullOutput}\n[Error] Compilation timed out after ${options.timeoutMs || 30000}ms.`,
            executablePath: '',
            diagnostics: [],
            durationMs,
            error: 'Compilation timed out',
          });
          return;
        }

        const diagnostics = this.parseGccDiagnostics(fullOutput, sourceFilePath);
        const success = code === 0 && fs.existsSync(outputBinaryPath);

        resolve({
          success,
          exitCode: code ?? (success ? 0 : 1),
          output: fullOutput || (success ? 'Build succeeded with 0 errors.' : `Build failed with exit code ${code}.`),
          executablePath: success ? outputBinaryPath : '',
          diagnostics,
          durationMs,
        });
      });
    });
  }
}

export const compilerService = new CompilerService();
