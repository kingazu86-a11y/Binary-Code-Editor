import React, { useEffect, useState } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Folder,
  ShieldCheck,
  Zap,
  Terminal,
  FileCode,
  Check,
  Layers,
  Box,
  Code2,
  Package,
  Plus,
} from 'lucide-react';
import { useCppStore, cppStore } from '../../state/cppStore';
import { workspaceStore } from '../../state/workspaceStore';
import { SettingRow } from '../components/SettingRow';

export const CppToolchainSettings: React.FC = () => {
  const {
    toolchainInfo,
    isLoadingToolchain,
    selectedStandard,
    selectedOptimization,
    warningFlags,
    libraryCatalog,
    projectLibraries,
  } = useCppStore();

  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    cppStore.fetchToolchainInfo();
    cppStore.loadLibraryCatalog();
    const ws = workspaceStore.getState().workspacePath;
    if (ws) {
      cppStore.loadProjectLibraries(ws);
    }
  }, []);

  const handleRefresh = () => {
    cppStore.fetchToolchainInfo(true);
  };

  const handleRunDiagnosticTest = async () => {
    setIsTesting(true);
    setTestStatus('Verifying bundled toolchain...');
    try {
      await cppStore.fetchToolchainInfo(true);
      const info = cppStore.getState().toolchainInfo;
      if (info && info.available) {
        setTestStatus(`Toolchain Verified: ${info.compilerVersion} | ${info.debuggerVersion} | ${info.cmakeVersion} | ${info.clangdVersion}`);
      } else {
        setTestStatus('Toolchain verification reported issues. See details below.');
      }
    } catch (err: any) {
      setTestStatus(`Test failed: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCreateConsoleProject = async () => {
    const ws = workspaceStore.getState().workspacePath;
    if (!ws) {
      setActionMessage('Please open a folder/workspace first.');
      return;
    }
    try {
      await cppStore.createConsoleProject(ws, 'ConsoleApp');
      setActionMessage('Created C++ Console Project in workspace!');
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleCreateCmakeProject = async () => {
    const ws = workspaceStore.getState().workspacePath;
    if (!ws) {
      setActionMessage('Please open a folder/workspace first.');
      return;
    }
    try {
      await cppStore.createCmakeProject(ws, 'CMakeApp');
      setActionMessage('Created CMake Project in workspace!');
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleAddLibrary = async (libId: string) => {
    const ws = workspaceStore.getState().workspacePath;
    if (!ws) {
      setActionMessage('Please open a workspace before adding libraries.');
      return;
    }
    const res = await cppStore.addLibraryToProject(ws, libId);
    setActionMessage(res.message);
    setTimeout(() => setActionMessage(null), 5000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Info Card */}
      <div
        style={{
          padding: 16,
          backgroundColor: 'var(--bg-card)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
              }}
            >
              <Cpu size={20} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Bundled C/C++ Development Environment
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Offline GCC/G++, GDB, CMake, Ninja, and LLVM Clangd IntelliSense
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleRefresh}
              disabled={isLoadingToolchain}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={12} className={isLoadingToolchain ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleRunDiagnosticTest}
              disabled={isTesting}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                backgroundColor: 'var(--accent-primary)',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <Zap size={12} />
              <span>{isTesting ? 'Verifying...' : 'Verify Toolchain'}</span>
            </button>
          </div>
        </div>

        {testStatus && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--color-success)',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={14} />
            <span>{testStatus}</span>
          </div>
        )}

        {actionMessage && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: 'var(--accent-primary)',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={14} />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Toolchain Components Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 10,
            marginTop: 4,
          }}
        >
          {/* G++ Compiler */}
          <div
            style={{
              padding: 12,
              borderRadius: 6,
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                G++ / GCC Compiler
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {toolchainInfo?.compilerVersion || 'Detecting...'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
              {toolchainInfo?.compilerPath || 'Not found'}
            </div>
          </div>

          {/* GDB Debugger */}
          <div
            style={{
              padding: 12,
              borderRadius: 6,
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                GDB Debugger (MI-3)
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {toolchainInfo?.debuggerVersion || 'Detecting...'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
              {toolchainInfo?.debuggerPath || 'Not found'}
            </div>
          </div>

          {/* CMake & Ninja */}
          <div
            style={{
              padding: 12,
              borderRadius: 6,
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                CMake & Ninja
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {toolchainInfo?.cmakeVersion || 'Detecting...'} | {toolchainInfo?.ninjaVersion || 'Ninja'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
              {toolchainInfo?.cmakePath || 'Not found'}
            </div>
          </div>

          {/* LLVM Clangd IntelliSense */}
          <div
            style={{
              padding: 12,
              borderRadius: 6,
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                Clangd IntelliSense
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {toolchainInfo?.clangdVersion || 'Detecting...'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Offline autocomplete, hover, definitions & diagnostics
            </div>
          </div>
        </div>
      </div>

      {/* Project Templates & Scaffolding */}
      <SettingRow
        title="Project Templates"
        description="Scaffold a starter C++ project structure in the active workspace."
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleCreateConsoleProject}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <Code2 size={13} style={{ color: 'var(--accent-primary)' }} />
            <span>New Console Project</span>
          </button>
          <button
            onClick={handleCreateCmakeProject}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <Box size={13} style={{ color: '#F59E0B' }} />
            <span>New CMake Project</span>
          </button>
        </div>
      </SettingRow>

      {/* Compiler Settings Rows */}
      <SettingRow
        title="C++ Language Standard"
        description="Select the default language standard passed to G++ during compilation (-std=c++XX)."
      >
        <select
          value={selectedStandard}
          onChange={(e) => cppStore.setStandard(e.target.value)}
          style={{
            height: 28,
            padding: '0 8px',
            fontSize: 12,
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 4,
          }}
        >
          <option value="c++11">ISO C++11 (-std=c++11)</option>
          <option value="c++14">ISO C++14 (-std=c++14)</option>
          <option value="c++17">ISO C++17 (-std=c++17)</option>
          <option value="c++20">ISO C++20 (-std=c++20) [Modern Recommended]</option>
          <option value="c++23">ISO C++23 (-std=c++23) [Latest]</option>
          <option value="gnu++20">GNU C++20 with extensions (-std=gnu++20)</option>
          <option value="gnu++23">GNU C++23 with extensions (-std=gnu++23)</option>
        </select>
      </SettingRow>

      <SettingRow
        title="Optimization Level"
        description="Optimization flag passed during compilation. -O0 is recommended for debugging."
      >
        <select
          value={selectedOptimization}
          onChange={(e) => cppStore.setOptimization(e.target.value)}
          style={{
            height: 28,
            padding: '0 8px',
            fontSize: 12,
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 4,
          }}
        >
          <option value="-O0">-O0 (No Optimization, Best for Debugging)</option>
          <option value="-Og">-Og (Optimize for Debugging)</option>
          <option value="-O1">-O1 (Basic Optimization)</option>
          <option value="-O2">-O2 (Recommended for Release)</option>
          <option value="-O3">-O3 (Maximum Speed Optimization)</option>
          <option value="-Os">-Os (Optimize for Binary Size)</option>
        </select>
      </SettingRow>

      {/* External C++ Libraries Section */}
      <div
        style={{
          padding: 16,
          backgroundColor: 'var(--bg-card)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Package size={16} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            Curated C++ Library Manager
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Quickly add common industry-standard libraries to your active workspace with automatic includes and CMake dependencies.
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 10,
          }}
        >
          {libraryCatalog.map((lib) => {
            const isInstalled = projectLibraries.includes(lib.id);
            return (
              <div
                key={lib.id}
                style={{
                  padding: 12,
                  borderRadius: 6,
                  backgroundColor: 'var(--bg-panel)',
                  border: isInstalled ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {lib.name}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {lib.bundledOffline && (
                      <span
                        style={{
                          fontSize: 9,
                          padding: '2px 6px',
                          borderRadius: 3,
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          color: 'var(--color-success)',
                          fontWeight: 500,
                        }}
                      >
                        Offline
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 9,
                        padding: '2px 6px',
                        borderRadius: 3,
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {lib.headerOnly ? 'Header-only' : 'Native'}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {lib.description}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <code style={{ fontSize: 10, color: 'var(--text-muted)' }}>{lib.headerInclude}</code>
                  <button
                    onClick={() => handleAddLibrary(lib.id)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      backgroundColor: isInstalled ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      color: isInstalled ? 'var(--color-success)' : 'var(--text-primary)',
                      fontSize: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {isInstalled ? <Check size={11} /> : <Plus size={11} />}
                    <span>{isInstalled ? 'Added' : 'Add'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SettingRow
        title="C++ Keyboard Shortcuts"
        description="Quick shortcuts for compiling, running, and debugging active C/C++ files."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Build / Compile Active File:</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#93C5FD' }}>Ctrl+Shift+B / F7</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Compile & Run in Terminal:</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#86EFAC' }}>Ctrl+F5</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Start / Continue Debugging:</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#FCD34D' }}>F5</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Toggle Gutter Breakpoint:</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#FCA5A5' }}>F9 / Gutter Click</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Step Over / Step Into / Step Out:</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#C084FC' }}>F10 / F11 / Shift+F11</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Stop Debugging Session:</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#EF4444' }}>Shift+F5</span>
          </div>
        </div>
      </SettingRow>
    </div>
  );
};
