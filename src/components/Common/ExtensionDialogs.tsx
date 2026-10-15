import React, { useState, useEffect, useRef } from 'react';
import {
  Info,
  AlertTriangle,
  AlertCircle,
  X,
  Check,
  RefreshCw,
  Copy,
  Terminal,
  Search,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../services/api';

export const ExtensionDialogs: React.FC = () => {
  const [currentMessage, setCurrentMessage] = useState<{
    dialogId: string;
    type: 'info' | 'warning' | 'error';
    message: string;
    items: string[];
  } | null>(null);

  const [inputBox, setInputBox] = useState<{
    dialogId: string;
    options: any;
    value: string;
  } | null>(null);

  const [quickPick, setQuickPick] = useState<{
    dialogId: string;
    items: any[];
    options: any;
    query: string;
    selectedIndex: number;
  } | null>(null);

  const [crashBanner, setCrashBanner] = useState<{ error: string; crashedAt: string } | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const quickPickInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubMsg = api.onDialogShowMessage((data) => {
      setCurrentMessage(data);
      setCopiedMessage(false);
    });
    const unsubInput = api.onDialogShowInputBox((data) =>
      setInputBox({ dialogId: data.dialogId, options: data.options, value: data.options?.value || '' })
    );
    const unsubQP = api.onDialogShowQuickPick((data) =>
      setQuickPick({ dialogId: data.dialogId, items: data.items, options: data.options, query: '', selectedIndex: 0 })
    );
    const unsubCrash = api.onExtensionHostCrashed((data) => setCrashBanner(data));

    return () => {
      unsubMsg();
      unsubInput();
      unsubQP();
      unsubCrash();
    };
  }, []);

  // Global ESC key to close active dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (currentMessage) {
          handleMessageChoice(undefined);
        } else if (inputBox) {
          handleInputCancel();
        } else if (quickPick) {
          handleQuickPickSelect(undefined);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMessage, inputBox, quickPick]);

  // Focus inputs when opened
  useEffect(() => {
    if (inputBox && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [inputBox]);

  useEffect(() => {
    if (quickPick && quickPickInputRef.current) {
      quickPickInputRef.current.focus();
    }
  }, [quickPick]);

  const handleMessageChoice = (item?: string) => {
    if (currentMessage) {
      api.resolveDialog(currentMessage.dialogId, item);
      setCurrentMessage(null);
      setCopiedMessage(false);
    }
  };

  const handleInputSubmit = () => {
    if (inputBox) {
      api.resolveDialog(inputBox.dialogId, inputBox.value);
      setInputBox(null);
    }
  };

  const handleInputCancel = () => {
    if (inputBox) {
      api.resolveDialog(inputBox.dialogId, undefined);
      setInputBox(null);
    }
  };

  const handleQuickPickSelect = (item?: any) => {
    if (quickPick) {
      api.resolveDialog(quickPick.dialogId, item);
      setQuickPick(null);
    }
  };

  const restartHost = async () => {
    setIsRestarting(true);
    try {
      await api.restartExtensionHost();
      setCrashBanner(null);
    } catch (err) {
      console.error('Failed to restart Extension Host:', err);
    } finally {
      setIsRestarting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  // Helper to determine whether the message looks like a code/terminal error (multiline or has stack/path)
  const isDetailedError = (msg: string) => {
    return (
      msg.includes('\n') ||
      msg.includes('Error:') ||
      msg.includes('at ') ||
      msg.includes('Failed to run') ||
      msg.length > 180
    );
  };

  return (
    <>
      {/* ================= CRASH BANNER ================= */}
      {crashBanner && (
        <div
          style={{
            position: 'fixed',
            top: 48,
            right: 20,
            maxWidth: 'min(460px, calc(100vw - 40px))',
            backgroundColor: 'rgba(20, 24, 33, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 10,
            padding: '12px 16px',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.65), 0 0 1px rgba(239, 68, 68, 0.5)',
            backdropFilter: 'blur(8px)',
          }}
          className="animate-fade-in"
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--color-danger, #EF4444)',
            }}
          >
            <AlertCircle size={18} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary, #E6EAF0)' }}>
              Extension Host Terminated
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--text-secondary, #8B929E)',
                marginTop: 3,
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                lineHeight: 1.4,
              }}
            >
              {crashBanner.error}
              {crashBanner.crashedAt && (
                <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-muted, #5C6370)', marginTop: 2 }}>
                  at {crashBanner.crashedAt}
                </span>
              )}
            </div>

            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={restartHost}
                disabled={isRestarting}
                style={{
                  padding: '5px 12px',
                  backgroundColor: 'var(--accent-primary, #3B82F6)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: isRestarting ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: isRestarting ? 0.7 : 1,
                  transition: 'background-color 0.15s ease',
                }}
              >
                <RefreshCw size={12} className={isRestarting ? 'animate-spin' : ''} />
                <span>{isRestarting ? 'Restarting...' : 'Restart Host'}</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => setCrashBanner(null)}
            title="Dismiss"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #5C6370)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ================= EXTENSION MESSAGE BOX (ALERT / CONFIRM) ================= */}
      {currentMessage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 99998,
          }}
          onClick={() => handleMessageChoice(undefined)}
        >
          <div
            style={{
              width: 'min(540px, calc(100vw - 32px))',
              maxHeight: 'min(620px, calc(100vh - 48px))',
              backgroundColor: 'var(--bg-modal, #12151B)',
              border: '1px solid var(--border-menu, #252B35)',
              borderRadius: 12,
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-in"
          >
            {/* Top Color Accent Line */}
            <div
              style={{
                height: 3,
                backgroundColor:
                  currentMessage.type === 'error'
                    ? 'var(--color-danger, #EF4444)'
                    : currentMessage.type === 'warning'
                    ? 'var(--color-warning, #F59E0B)'
                    : 'var(--accent-primary, #3B82F6)',
              }}
            />

            {/* Dialog Header */}
            <div
              style={{
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor:
                      currentMessage.type === 'error'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : currentMessage.type === 'warning'
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(59, 130, 246, 0.15)',
                    color:
                      currentMessage.type === 'error'
                        ? 'var(--color-danger, #EF4444)'
                        : currentMessage.type === 'warning'
                        ? 'var(--color-warning, #F59E0B)'
                        : 'var(--accent-primary, #3B82F6)',
                    flexShrink: 0,
                  }}
                >
                  {currentMessage.type === 'error' ? (
                    <AlertCircle size={16} />
                  ) : currentMessage.type === 'warning' ? (
                    <AlertTriangle size={16} />
                  ) : (
                    <Info size={16} />
                  )}
                </div>

                <div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.8px',
                      textTransform: 'uppercase',
                      color:
                        currentMessage.type === 'error'
                          ? 'var(--color-danger, #EF4444)'
                          : currentMessage.type === 'warning'
                          ? 'var(--color-warning, #F59E0B)'
                          : 'var(--accent-primary, #3B82F6)',
                    }}
                  >
                    {currentMessage.type === 'error'
                      ? 'Extension Error'
                      : currentMessage.type === 'warning'
                      ? 'Extension Warning'
                      : 'Extension Notice'}
                  </span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #E6EAF0)' }}>
                    Message from Extension
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => copyToClipboard(currentMessage.message)}
                  title="Copy message content"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 8px',
                    borderRadius: 5,
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                    color: copiedMessage ? 'var(--color-success, #10B981)' : 'var(--text-secondary, #8B929E)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  {copiedMessage ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedMessage ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={() => handleMessageChoice(undefined)}
                  title="Close (Esc)"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted, #5C6370)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                    e.currentTarget.style.color = '#EF4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted, #5C6370)';
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Dialog Scrollable Body */}
            <div
              className="dialog-content-scroll"
              style={{
                padding: '16px 20px',
                maxHeight: 380,
                flex: 1,
              }}
            >
              {isDetailedError(currentMessage.message) ? (
                <div
                  className="dialog-content-scroll"
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: '#090C10',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: 'var(--text-primary, #E6EAF0)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    maxHeight: 260,
                  }}
                >
                  {currentMessage.message}
                </div>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    color: 'var(--text-primary, #E6EAF0)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {currentMessage.message}
                </p>
              )}
            </div>

            {/* Dialog Footer Actions */}
            <div
              style={{
                padding: '12px 18px',
                borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              {currentMessage.items.length === 0 ? (
                <button
                  onClick={() => handleMessageChoice('OK')}
                  autoFocus
                  style={{
                    padding: '7px 18px',
                    backgroundColor: 'var(--accent-primary, #3B82F6)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                  }}
                >
                  OK
                </button>
              ) : (
                currentMessage.items.map((item, idx) => {
                  const isPrimary = idx === 0;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleMessageChoice(item)}
                      autoFocus={isPrimary}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: isPrimary ? 'var(--accent-primary, #3B82F6)' : 'rgba(255, 255, 255, 0.05)',
                        color: isPrimary ? '#FFFFFF' : 'var(--text-primary, #E6EAF0)',
                        border: isPrimary
                          ? 'none'
                          : '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
                        borderRadius: 6,
                        fontSize: 12.5,
                        fontWeight: isPrimary ? 600 : 500,
                        cursor: 'pointer',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isPrimary) e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(255,255,255,0.08))';
                      }}
                      onMouseLeave={(e) => {
                        if (!isPrimary) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }}
                    >
                      {item}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= INPUT BOX ================= */}
      {inputBox && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 99998,
          }}
          onClick={handleInputCancel}
        >
          <div
            style={{
              width: 'min(500px, calc(100vw - 32px))',
              backgroundColor: 'var(--bg-modal, #12151B)',
              border: '1px solid var(--border-menu, #252B35)',
              borderRadius: 12,
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.06)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-in"
          >
            {/* Input Header */}
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #E6EAF0)' }}>
                {inputBox.options?.title || 'Extension Input'}
              </div>
              <button
                onClick={handleInputCancel}
                title="Cancel (Esc)"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted, #5C6370)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: '16px 18px' }}>
              {inputBox.options?.prompt && (
                <div
                  style={{
                    fontSize: 12.5,
                    marginBottom: 12,
                    color: 'var(--text-secondary, #8B929E)',
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {inputBox.options.prompt}
                </div>
              )}

              <input
                ref={inputRef}
                type={inputBox.options?.password ? 'password' : 'text'}
                value={inputBox.value}
                placeholder={inputBox.options?.placeHolder || 'Type your response...'}
                onChange={(e) => setInputBox({ ...inputBox, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInputSubmit();
                  else if (e.key === 'Escape') handleInputCancel();
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 13,
                  backgroundColor: '#0A0D12',
                  color: 'var(--text-primary, #E6EAF0)',
                  border: '1px solid var(--border-color, #252B35)',
                  borderRadius: 6,
                  outline: 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary, #3B82F6)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color, #252B35)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            <div
              style={{
                padding: '12px 18px',
                borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              <button
                onClick={handleInputCancel}
                style={{
                  padding: '6px 14px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary, #8B929E)',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleInputSubmit}
                style={{
                  padding: '6px 18px',
                  backgroundColor: 'var(--accent-primary, #3B82F6)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= QUICK PICK PALETTE ================= */}
      {quickPick && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '60px',
            paddingLeft: 16,
            paddingRight: 16,
            zIndex: 99998,
          }}
          onClick={() => handleQuickPickSelect(undefined)}
        >
          <div
            style={{
              width: 'min(580px, calc(100vw - 32px))',
              maxHeight: 'min(480px, 80vh)',
              backgroundColor: 'var(--bg-modal, #12151B)',
              border: '1px solid var(--border-menu, #252B35)',
              borderRadius: 12,
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-in"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 14px',
                borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                gap: 10,
              }}
            >
              <Search size={15} style={{ color: 'var(--text-muted, #5C6370)', flexShrink: 0 }} />
              <input
                ref={quickPickInputRef}
                type="text"
                placeholder={quickPick.options?.placeHolder || 'Type to filter items...'}
                value={quickPick.query}
                onChange={(e) => setQuickPick({ ...quickPick, query: e.target.value, selectedIndex: 0 })}
                onKeyDown={(e) => {
                  const filtered = quickPick.items.filter((item) => {
                    const label = typeof item === 'string' ? item : item.label || '';
                    return label.toLowerCase().includes(quickPick.query.toLowerCase());
                  });

                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setQuickPick({
                      ...quickPick,
                      selectedIndex: Math.min(filtered.length - 1, quickPick.selectedIndex + 1),
                    });
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setQuickPick({
                      ...quickPick,
                      selectedIndex: Math.max(0, quickPick.selectedIndex - 1),
                    });
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filtered[quickPick.selectedIndex]) {
                      handleQuickPickSelect(filtered[quickPick.selectedIndex]);
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleQuickPickSelect(undefined);
                  }
                }}
                style={{
                  width: '100%',
                  fontSize: 13,
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary, #E6EAF0)',
                  border: 'none',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => handleQuickPickSelect(undefined)}
                title="Close (Esc)"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted, #5C6370)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
              {(() => {
                const filtered = quickPick.items.filter((item) => {
                  const label = typeof item === 'string' ? item : item.label || '';
                  return label.toLowerCase().includes(quickPick.query.toLowerCase());
                });

                if (filtered.length === 0) {
                  return (
                    <div
                      style={{
                        padding: '24px 16px',
                        textAlign: 'center',
                        fontSize: 12,
                        color: 'var(--text-muted, #5C6370)',
                      }}
                    >
                      No matching items found
                    </div>
                  );
                }

                return filtered.map((item, idx) => {
                  const label = typeof item === 'string' ? item : item.label;
                  const desc = typeof item === 'object' ? item.description : undefined;
                  const detail = typeof item === 'object' ? item.detail : undefined;
                  const isSelected = idx === quickPick.selectedIndex;

                  return (
                    <div
                      key={idx}
                      onClick={() => handleQuickPickSelect(item)}
                      style={{
                        padding: '8px 12px',
                        fontSize: 12.5,
                        borderRadius: 6,
                        cursor: 'pointer',
                        color: isSelected ? '#FFFFFF' : 'var(--text-primary, #E6EAF0)',
                        backgroundColor: isSelected ? 'var(--accent-primary, #3B82F6)' : 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={() => setQuickPick({ ...quickPick, selectedIndex: idx })}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {label}
                        </span>
                        {desc && (
                          <span
                            style={{
                              fontSize: 11,
                              color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-muted, #5C6370)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {desc}
                          </span>
                        )}
                      </div>
                      {detail && (
                        <div
                          style={{
                            fontSize: 11,
                            color: isSelected ? 'rgba(255,255,255,0.6)' : 'var(--text-secondary, #8B929E)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {detail}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
