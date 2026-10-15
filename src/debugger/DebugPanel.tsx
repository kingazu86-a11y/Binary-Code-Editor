import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Square,
  Pause,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  CornerDownRight,
  CornerUpRight,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal as TermIcon,
  Sparkles,
} from 'lucide-react';
import { useCppStore, cppStore } from '../state/cppStore';
import { useWorkspace } from '../state/workspaceStore';
import { editorStore } from '../state/editorStore';
import { layoutStore } from '../state/layoutStore';

export const DebugPanel: React.FC = () => {
  const { workspacePath } = useWorkspace();
  const {
    debuggerState,
    breakpoints,
    callStack,
    variables,
    currentFrame,
    stoppedEvent,
    toolchainInfo,
    selectedStandard,
    activeDebugFile,
    activeDebugLine,
  } = useCppStore();

  const [watchList, setWatchList] = useState<Array<{ expr: string; value: string }>>([]);
  const [newWatchExpr, setNewWatchExpr] = useState('');
  const [showAddWatch, setShowAddWatch] = useState(false);

  // Section Collapse states
  const [varsOpen, setVarsOpen] = useState(true);
  const [watchOpen, setWatchOpen] = useState(true);
  const [stackOpen, setStackOpen] = useState(true);
  const [breakpointsOpen, setBreakpointsOpen] = useState(true);

  // Load toolchain info on mount
  useEffect(() => {
    if (!toolchainInfo) {
      cppStore.fetchToolchainInfo();
    }
  }, [toolchainInfo]);

  // Evaluate watch expressions on paused
  useEffect(() => {
    if (debuggerState === 'paused' && watchList.length > 0) {
      const updateWatches = async () => {
        const updated = await Promise.all(
          watchList.map(async (w) => {
            const val = await cppStore.evaluateExpression(w.expr);
            return { expr: w.expr, value: val };
          })
        );
        setWatchList(updated);
      };
      updateWatches();
    }
  }, [debuggerState, currentFrame]);

  const handleStartDebug = () => {
    cppStore.startDebuggingActiveFile(workspacePath || undefined);
  };

  const handleAddWatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchExpr.trim()) return;
    const expr = newWatchExpr.trim();
    let val = '<not debugging>';
    if (debuggerState === 'paused') {
      val = await cppStore.evaluateExpression(expr);
    }
    setWatchList((prev) => [...prev, { expr, value: val }]);
    setNewWatchExpr('');
    setShowAddWatch(false);
  };

  const handleRemoveWatch = (index: number) => {
    setWatchList((prev) => prev.filter((_, i) => i !== index));
  };

  const isDebugging = debuggerState === 'running' || debuggerState === 'paused' || debuggerState === 'launching' || debuggerState === 'compiling';
  const isPaused = debuggerState === 'paused';

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-panel)',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>RUN & DEBUG</span>
        {toolchainInfo?.available && (
          <span
            style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 4,
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--color-success)',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title={`Bundled: ${toolchainInfo.compilerVersion}\nDebugger: ${toolchainInfo.debuggerVersion}`}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
            Bundled GDB
          </span>
        )}
      </div>

      {/* Control Toolbar */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(255, 255, 255, 0.015)',
        }}
      >
        {/* Debug Action Buttons */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
          {debuggerState === 'idle' || debuggerState === 'stopped' || debuggerState === 'error' ? (
            <button
              onClick={handleStartDebug}
              style={{
                flex: 1,
                height: 28,
                borderRadius: 4,
                backgroundColor: 'var(--accent-primary)',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              title="Start C++ Debugging (F5)"
            >
              <Play size={13} fill="#FFFFFF" />
              <span>Debug Active File (F5)</span>
            </button>
          ) : (
            <>
              {/* Continue / Pause */}
              {isPaused ? (
                <button
                  onClick={() => cppStore.continue()}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    color: 'var(--color-success)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                  }}
                  title="Continue (F5)"
                >
                  <Play size={14} fill="var(--color-success)" />
                </button>
              ) : (
                <button
                  onClick={() => cppStore.pause()}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    color: 'var(--color-warning)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                  }}
                  title="Pause Execution"
                >
                  <Pause size={14} />
                </button>
              )}

              {/* Step Over (F10) */}
              <button
                onClick={() => cppStore.stepOver()}
                disabled={!isPaused}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  backgroundColor: isPaused ? 'var(--bg-card)' : 'transparent',
                  color: isPaused ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                  opacity: isPaused ? 1 : 0.4,
                }}
                title="Step Over (F10)"
              >
                <ArrowRight size={14} />
              </button>

              {/* Step Into (F11) */}
              <button
                onClick={() => cppStore.stepInto()}
                disabled={!isPaused}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  backgroundColor: isPaused ? 'var(--bg-card)' : 'transparent',
                  color: isPaused ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                  opacity: isPaused ? 1 : 0.4,
                }}
                title="Step Into (F11)"
              >
                <CornerDownRight size={14} />
              </button>

              {/* Step Out (Shift+F11) */}
              <button
                onClick={() => cppStore.stepOut()}
                disabled={!isPaused}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  backgroundColor: isPaused ? 'var(--bg-card)' : 'transparent',
                  color: isPaused ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                  opacity: isPaused ? 1 : 0.4,
                }}
                title="Step Out (Shift+F11)"
              >
                <CornerUpRight size={14} />
              </button>

              {/* Restart */}
              <button
                onClick={handleStartDebug}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                }}
                title="Restart Debugging"
              >
                <RotateCcw size={14} />
              </button>

              {/* Stop Debugging */}
              <button
                onClick={() => cppStore.stopDebugging()}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: 'var(--color-danger)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                }}
                title="Stop Debugging (Shift+F5)"
              >
                <Square size={14} />
              </button>
            </>
          )}
        </div>

        {/* State Banner */}
        {isDebugging && (
          <div
            style={{
              marginTop: 8,
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 11,
              backgroundColor: isPaused
                ? 'rgba(245, 158, 11, 0.15)'
                : debuggerState === 'compiling'
                ? 'rgba(59, 130, 246, 0.15)'
                : 'rgba(16, 185, 129, 0.15)',
              color: isPaused
                ? 'var(--color-warning)'
                : debuggerState === 'compiling'
                ? 'var(--accent-primary)'
                : 'var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {isPaused ? <AlertCircle size={13} /> : <Clock size={13} />}
            <span>
              {debuggerState === 'compiling'
                ? 'Compiling debug symbols...'
                : debuggerState === 'launching'
                ? 'Initializing GDB...'
                : isPaused
                ? `Paused: ${stoppedEvent?.functionName || 'line'} (${activeDebugFile ? activeDebugFile.split(/[\/\\]/).pop() : ''}:${activeDebugLine})`
                : 'Running (GDB attached)...'}
            </span>
          </div>
        )}
      </div>

      {/* Sections List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* 1. VARIABLES */}
        <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div
            onClick={() => setVarsOpen(!varsOpen)}
            style={{
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              backgroundColor: 'rgba(255,255,255,0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {varsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <span>VARIABLES (LOCALS & ARGS)</span>
            </div>
            {variables.length > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{variables.length}</span>
            )}
          </div>

          {varsOpen && (
            <div style={{ padding: '4px 0' }}>
              {variables.length === 0 ? (
                <div style={{ padding: '6px 16px', fontSize: 11, color: 'var(--text-muted)' }}>
                  {isPaused ? 'No local variables in current frame.' : 'Paused variables will appear here.'}
                </div>
              ) : (
                variables.map((v, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '3px 16px',
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      gap: 6,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span style={{ color: '#93C5FD', fontWeight: 500 }}>{v.name}:</span>
                    <span style={{ color: '#FCD34D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.value}
                    </span>
                    {v.type && (
                      <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 'auto' }}>
                        {v.type}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 2. WATCH EXPRESSIONS */}
        <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div
            style={{
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              backgroundColor: 'rgba(255,255,255,0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              onClick={() => setWatchOpen(!watchOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', flex: 1 }}
            >
              {watchOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <span>WATCH</span>
            </div>
            <button
              onClick={() => setShowAddWatch(true)}
              style={{ padding: 2, borderRadius: 2, color: 'var(--text-secondary)' }}
              title="Add Watch Expression"
            >
              <Plus size={13} />
            </button>
          </div>

          {watchOpen && (
            <div style={{ padding: '4px 0' }}>
              {showAddWatch && (
                <form onSubmit={handleAddWatch} style={{ padding: '4px 12px' }}>
                  <input
                    type="text"
                    value={newWatchExpr}
                    onChange={(e) => setNewWatchExpr(e.target.value)}
                    placeholder="Expression (e.g. x + 5, vector.size())..."
                    autoFocus
                    onBlur={() => { if (!newWatchExpr) setShowAddWatch(false); }}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--accent-primary)',
                      borderRadius: 4,
                      color: 'var(--text-primary)',
                    }}
                  />
                </form>
              )}

              {watchList.length === 0 && !showAddWatch ? (
                <div style={{ padding: '6px 16px', fontSize: 11, color: 'var(--text-muted)' }}>
                  No watch expressions. Click + to add.
                </div>
              ) : (
                watchList.map((w, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '3px 16px',
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      gap: 6,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <span style={{ color: '#C084FC' }}>{w.expr}:</span>
                    <span style={{ color: '#86EFAC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {w.value}
                    </span>
                    <button
                      onClick={() => handleRemoveWatch(idx)}
                      style={{ marginLeft: 'auto', color: 'var(--text-muted)', padding: 2 }}
                      title="Remove Watch"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 3. CALL STACK */}
        <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div
            onClick={() => setStackOpen(!stackOpen)}
            style={{
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              backgroundColor: 'rgba(255,255,255,0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {stackOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <span>CALL STACK</span>
            </div>
            {callStack.length > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{callStack.length}</span>
            )}
          </div>

          {stackOpen && (
            <div style={{ padding: '4px 0' }}>
              {callStack.length === 0 ? (
                <div style={{ padding: '6px 16px', fontSize: 11, color: 'var(--text-muted)' }}>
                  {isPaused ? 'No active stack frames.' : 'Not debugging.'}
                </div>
              ) : (
                callStack.map((frame) => {
                  const fileName = frame.file ? frame.file.split(/[\/\\]/).pop() : '';
                  const isTop = frame.level === 0;
                  return (
                    <div
                      key={frame.id}
                      onClick={() => {
                        if (frame.file) {
                          editorStore.openFile(frame.file);
                        }
                      }}
                      style={{
                        padding: '4px 16px',
                        fontSize: 11,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        backgroundColor: isTop ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                        borderLeft: isTop ? '2px solid var(--accent-primary)' : '2px solid transparent',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isTop ? 'rgba(59, 130, 246, 0.08)' : 'transparent')}
                      title={`Jump to ${frame.file}:${frame.line}`}
                    >
                      <span style={{ color: isTop ? 'var(--accent-primary)' : 'var(--text-primary)', fontWeight: 500 }}>
                        {frame.functionName}()
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                        {fileName} : {frame.line}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* 4. BREAKPOINTS */}
        <div>
          <div
            onClick={() => setBreakpointsOpen(!breakpointsOpen)}
            style={{
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              backgroundColor: 'rgba(255,255,255,0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {breakpointsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <span>BREAKPOINTS</span>
            </div>
            {breakpoints.length > 0 && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{breakpoints.length}</span>
            )}
          </div>

          {breakpointsOpen && (
            <div style={{ padding: '4px 0' }}>
              {breakpoints.length === 0 ? (
                <div style={{ padding: '6px 16px', fontSize: 11, color: 'var(--text-muted)' }}>
                  No breakpoints set. Click the editor gutter to toggle.
                </div>
              ) : (
                breakpoints.map((bp) => {
                  const fileName = bp.file.split(/[\/\\]/).pop() || bp.file;
                  return (
                    <div
                      key={`${bp.file}:${bp.line}`}
                      onClick={() => editorStore.openFile(bp.file)}
                      style={{
                        padding: '4px 16px',
                        fontSize: 11,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      title={`Jump to ${bp.file}:${bp.line}`}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: bp.enabled ? 'var(--color-danger)' : '#6B7280',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {fileName}
                      </span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        Line {bp.line}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cppStore.toggleBreakpoint(bp.file, bp.line);
                        }}
                        style={{ padding: 2, color: 'var(--text-muted)' }}
                        title="Remove Breakpoint"
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
