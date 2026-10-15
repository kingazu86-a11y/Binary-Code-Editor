import path from 'path';
import fs from 'fs-extra';
import { spawn, ChildProcess } from 'child_process';
import { toolchainService } from '../toolchain/ToolchainService';
import { compilerService, CompilerDiagnostic } from '../toolchain/CompilerService';

export interface ProjectBuildResult {
  success: boolean;
  exitCode: number | null;
  executablePath: string | null;
  diagnostics: CompilerDiagnostic[];
  stdout: string;
  stderr: string;
  commandExecuted: string;
}

export type CppProjectType = 'cmake' | 'simple' | 'single-file';

export class CppProjectService {
  private activeBuildProcess: ChildProcess | null = null;

  /**
   * Detects whether workspace is a CMake project, a simple multi-file project, or single-file.
   */
  async detectProjectType(workspaceDir: string): Promise<CppProjectType> {
    if (!workspaceDir || !fs.existsSync(workspaceDir)) return 'single-file';

    const cmakeFile = path.join(workspaceDir, 'CMakeLists.txt');
    if (await fs.pathExists(cmakeFile)) return 'cmake';

    const projConfig = path.join(workspaceDir, '.binary', 'project.json');
    if (await fs.pathExists(projConfig)) return 'simple';

    return 'single-file';
  }

  /**
   * Scaffolds a new C++ Console Project (multi-file with header & starter implementation).
   */
  async createConsoleProject(targetDir: string, projectName: string = 'ConsoleApp'): Promise<void> {
    await fs.ensureDir(targetDir);
    const srcDir = path.join(targetDir, 'src');
    const incDir = path.join(targetDir, 'include');
    const binMetaDir = path.join(targetDir, '.binary');
    await fs.ensureDir(srcDir);
    await fs.ensureDir(incDir);
    await fs.ensureDir(binMetaDir);

    const mainCpp = path.join(srcDir, 'main.cpp');
    const calcHpp = path.join(incDir, 'calculator.hpp');
    const calcCpp = path.join(srcDir, 'calculator.cpp');
    const projConfig = path.join(binMetaDir, 'project.json');
    const gitignore = path.join(targetDir, '.gitignore');

    await fs.writeFile(
      calcHpp,
      `#pragma once\n\n// Simple modular calculator header\nint add(int a, int b);\nint multiply(int a, int b);\n`
    );

    await fs.writeFile(
      calcCpp,
      `#include "calculator.hpp"\n\nint add(int a, int b) {\n    return a + b;\n}\n\nint multiply(int a, int b) {\n    return a * b;\n}\n`
    );

    await fs.writeFile(
      mainCpp,
      `#include <iostream>\n#include "calculator.hpp"\n\nint main() {\n    std::cout << "=== Welcome to ${projectName} (Binary IDE) ===" << std::endl;\n    int sum = add(20, 22);\n    int prod = multiply(6, 7);\n    std::cout << "Addition (20 + 22) = " << sum << std::endl;\n    std::cout << "Multiplication (6 * 7) = " << prod << std::endl;\n    return 0;\n}\n`
    );

    await fs.writeFile(
      projConfig,
      JSON.stringify(
        {
          name: projectName,
          type: 'console',
          standard: 'c++20',
          optimization: 'O2',
          sourcePatterns: ['src/**/*.cpp'],
          includeDirs: ['include'],
          buildDir: 'build',
          outputExe: `build/${projectName}.exe`,
        },
        null,
        2
      )
    );

    await fs.writeFile(
      gitignore,
      `# Binary C++ Project\nbuild/\n*.exe\n*.o\n*.obj\n.binary/cache/\n`
    );
  }

  /**
   * Scaffolds a new standard CMake project with CMakeLists.txt and Ninja configuration.
   */
  async createCmakeProject(targetDir: string, projectName: string = 'CMakeApp'): Promise<void> {
    await fs.ensureDir(targetDir);
    const srcDir = path.join(targetDir, 'src');
    const incDir = path.join(targetDir, 'include');
    await fs.ensureDir(srcDir);
    await fs.ensureDir(incDir);

    const cmakeLists = path.join(targetDir, 'CMakeLists.txt');
    const mainCpp = path.join(srcDir, 'main.cpp');
    const utilsHpp = path.join(incDir, 'utils.hpp');
    const utilsCpp = path.join(srcDir, 'utils.cpp');
    const gitignore = path.join(targetDir, '.gitignore');

    await fs.writeFile(
      cmakeLists,
      `cmake_minimum_required(VERSION 3.20)\nproject(${projectName} LANGUAGES CXX)\n\nset(CMAKE_CXX_STANDARD 20)\nset(CMAKE_CXX_STANDARD_REQUIRED ON)\nset(CMAKE_EXPORT_COMPILE_COMMANDS ON)\n\ninclude_directories(include)\n\nfile(GLOB_RECURSE SOURCES "src/*.cpp")\n\nadd_executable(${projectName} \${SOURCES})\n`
    );

    await fs.writeFile(
      utilsHpp,
      `#pragma once\n#include <string>\n\nstd::string getGreeting(const std::string& name);\n`
    );

    await fs.writeFile(
      utilsCpp,
      `#include "utils.hpp"\n\nstd::string getGreeting(const std::string& name) {\n    return "Hello, " + name + "! Welcome to CMake with Binary IDE.";\n}\n`
    );

    await fs.writeFile(
      mainCpp,
      `#include <iostream>\n#include "utils.hpp"\n\nint main() {\n    std::cout << getGreeting("Developer") << std::endl;\n    return 0;\n}\n`
    );

    await fs.writeFile(
      gitignore,
      `build/\n*.exe\n*.o\ncompile_commands.json\n`
    );
  }

  /**
   * Runs CMake configure step (-B build -G "Ninja" ...)
   */
  async configureCmake(workspaceDir: string, buildType: 'Debug' | 'Release' = 'Debug'): Promise<ProjectBuildResult> {
    const info = await toolchainService.getToolchainInfo();
    if (!info.cmakePath || !fs.existsSync(info.cmakePath)) {
      throw new Error(`Bundled CMake not found at ${info.cmakePath}`);
    }

    const buildDir = path.join(workspaceDir, 'build');
    await fs.ensureDir(buildDir);

    const gpp = info.compilerPath.replace(/\\/g, '/');
    const gcc = info.cCompilerPath.replace(/\\/g, '/');

    const args = [
      '-B',
      'build',
      '-G',
      'Ninja',
      `-DCMAKE_BUILD_TYPE=${buildType}`,
      '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON',
      `-DCMAKE_CXX_COMPILER=${gpp}`,
      `-DCMAKE_C_COMPILER=${gcc}`,
    ];

    return this.runToolchainProcess(info.cmakePath, args, workspaceDir);
  }

  /**
   * Builds the CMake project (--build build)
   */
  async buildCmake(workspaceDir: string, buildType: 'Debug' | 'Release' = 'Debug'): Promise<ProjectBuildResult> {
    const info = await toolchainService.getToolchainInfo();
    if (!info.cmakePath || !fs.existsSync(info.cmakePath)) {
      throw new Error(`Bundled CMake not found at ${info.cmakePath}`);
    }

    const buildDir = path.join(workspaceDir, 'build');
    if (!fs.existsSync(path.join(buildDir, 'build.ninja'))) {
      // Auto-configure if not yet configured
      const configRes = await this.configureCmake(workspaceDir, buildType);
      if (!configRes.success) return configRes;
    }

    const args = ['--build', 'build', '--config', buildType];
    const res = await this.runToolchainProcess(info.cmakePath, args, workspaceDir);

    // Look for generated executable in build/
    if (res.success) {
      res.executablePath = await this.findExecutableInBuildDir(buildDir);
    }
    return res;
  }

  /**
   * Cleans CMake build artifacts
   */
  async cleanCmake(workspaceDir: string): Promise<ProjectBuildResult> {
    const info = await toolchainService.getToolchainInfo();
    const buildDir = path.join(workspaceDir, 'build');

    if (info.cmakePath && fs.existsSync(path.join(buildDir, 'build.ninja'))) {
      const res = await this.runToolchainProcess(info.cmakePath, ['--build', 'build', '--target', 'clean'], workspaceDir);
      return res;
    }

    // Direct directory cleanup
    if (fs.existsSync(buildDir)) {
      await fs.remove(buildDir);
    }
    return {
      success: true,
      exitCode: 0,
      executablePath: null,
      diagnostics: [],
      stdout: 'Build directory cleaned.',
      stderr: '',
      commandExecuted: 'clean',
    };
  }

  /**
   * Builds a simple multi-file project based on .binary/project.json or file discovery.
   */
  async buildSimpleProject(workspaceDir: string, standard = 'c++20'): Promise<ProjectBuildResult> {
    const info = await toolchainService.getToolchainInfo();
    if (!info.compilerPath || !fs.existsSync(info.compilerPath)) {
      throw new Error(`Bundled G++ compiler not found at ${info.compilerPath}`);
    }

    const buildDir = path.join(workspaceDir, 'build');
    await fs.ensureDir(buildDir);

    // Collect all .cpp files in workspace (under src/ or root, excluding build/)
    const cppFiles: string[] = [];
    const collectFiles = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const ent of entries) {
        if (ent.isDirectory()) {
          if (ent.name !== 'build' && ent.name !== '.git' && ent.name !== 'node_modules') {
            await collectFiles(path.join(dir, ent.name));
          }
        } else if (ent.isFile() && (ent.name.endsWith('.cpp') || ent.name.endsWith('.cc'))) {
          cppFiles.push(path.join(dir, ent.name));
        }
      }
    };

    await collectFiles(workspaceDir);

    if (cppFiles.length === 0) {
      throw new Error(`No C++ source files (.cpp) found in workspace: ${workspaceDir}`);
    }

    const projectName = path.basename(workspaceDir).replace(/[^a-zA-Z0-9_-]/g, '_');
    const exePath = path.join(buildDir, `${projectName}.exe`);

    // Remove old executable to prevent stale launch
    if (await fs.pathExists(exePath)) {
      await fs.remove(exePath);
    }

    const includeDir = path.join(workspaceDir, 'include');
    const hasInclude = await fs.pathExists(includeDir);

    const args = [
      `-std=${standard}`,
      '-g3',
      '-O0',
      '-Wall',
      '-Wextra',
      '-fdiagnostics-color=never',
    ];

    if (hasInclude) {
      args.push(`-I${includeDir}`);
    }
    args.push(`-I${workspaceDir}`);

    args.push(...cppFiles);
    args.push('-o', exePath);

    const res = await this.runToolchainProcess(info.compilerPath, args, workspaceDir);
    if (res.success && (await fs.pathExists(exePath))) {
      res.executablePath = exePath;
    }
    return res;
  }

  cancelBuild(): boolean {
    if (this.activeBuildProcess) {
      this.activeBuildProcess.kill();
      this.activeBuildProcess = null;
      return true;
    }
    return false;
  }

  private async findExecutableInBuildDir(buildDir: string): Promise<string | null> {
    if (!fs.existsSync(buildDir)) return null;

    const files = await fs.readdir(buildDir);
    const exe = files.find((f) => f.endsWith('.exe'));
    if (exe) return path.join(buildDir, exe);

    const binSub = path.join(buildDir, 'bin');
    if (fs.existsSync(binSub)) {
      const subFiles = await fs.readdir(binSub);
      const subExe = subFiles.find((f) => f.endsWith('.exe'));
      if (subExe) return path.join(binSub, subExe);
    }

    return null;
  }

  private runToolchainProcess(
    exePath: string,
    args: string[],
    cwd: string
  ): Promise<ProjectBuildResult> {
    return new Promise((resolve) => {
      const env = toolchainService.getToolchainEnv();
      const proc = spawn(exePath, args, { cwd, env });
      this.activeBuildProcess = proc;

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => {
        stdout += d.toString('utf-8');
      });

      proc.stderr.on('data', (d) => {
        stderr += d.toString('utf-8');
      });

      proc.on('close', (code) => {
        this.activeBuildProcess = null;
        const diagnostics = compilerService.parseDiagnostics(stderr, cwd);
        const success = code === 0;

        resolve({
          success,
          exitCode: code,
          executablePath: null,
          diagnostics,
          stdout,
          stderr,
          commandExecuted: `${path.basename(exePath)} ${args.join(' ')}`,
        });
      });

      proc.on('error', (err) => {
        this.activeBuildProcess = null;
        resolve({
          success: false,
          exitCode: -1,
          executablePath: null,
          diagnostics: [],
          stdout,
          stderr: `Spawn error: ${err.message}`,
          commandExecuted: `${path.basename(exePath)} ${args.join(' ')}`,
        });
      });
    });
  }
}

export const cppProjectService = new CppProjectService();
