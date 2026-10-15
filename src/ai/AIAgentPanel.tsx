import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Trash2,
  Loader2,
  X,
  Plus,
  Mic,
  MicOff,
  ChevronDown,
  ChevronRight,
  FileCode,
  Paperclip,
  Check,
  Cpu,
  History,
} from 'lucide-react';
import { useAI, aiStore } from '../state/aiStore';
import { useLayout, layoutStore } from '../state/layoutStore';
import { useSettings, settingsStore } from '../state/settingsStore';
import { useEditor, editorStore } from '../state/editorStore';
import { api } from '../services/api';
import { AIChatMessage } from './AIChatMessage';
import { AIConfirmationModal } from './AIConfirmationModal';
import { AIRecentChatsModal } from './AIRecentChatsModal';
import { AIModelType } from '../types/electron';

interface AIModelOption {
  id: string;
  name: string;
  provider: string;
  badge: string;
  supportedEfforts: AIModelType[];
  defaultEffort?: AIModelType;
  desc?: string;
}

interface ModelTypeOption {
  id: AIModelType;
  label: string;
  badge: string;
  desc: string;
}

const MODEL_TYPE_OPTIONS: ModelTypeOption[] = [
  { id: 'low', label: 'Low', badge: 'Fast', desc: 'Fast & concise responses, minimal reasoning tokens' },
  { id: 'medium', label: 'Medium', badge: 'Balanced', desc: 'Balanced speed and standard reasoning' },
  { id: 'high', label: 'High', badge: 'Deep Reasoning', desc: 'Maximum thinking effort & deep problem analysis' },
  { id: 'thinking', label: 'Thinking', badge: 'Extended Think', desc: 'Extended chain-of-thought reasoning for hard problems' },
];

const AVAILABLE_MODELS: AIModelOption[] = [
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    badge: 'Reasoning',
    supportedEfforts: ['low', 'medium', 'high', 'thinking'],
    defaultEffort: 'high',
    desc: 'Advanced reasoning, deep logic & coding',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'Google',
    badge: 'Fast',
    supportedEfforts: ['low', 'medium'],
    defaultEffort: 'low',
    desc: 'High-speed responses & lightweight tasks',
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    badge: 'Coding',
    supportedEfforts: ['low', 'medium', 'high', 'thinking'],
    defaultEffort: 'high',
    desc: 'State-of-the-art coding & architecture',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    badge: 'Omni',
    supportedEfforts: ['low', 'medium', 'high'],
    defaultEffort: 'high',
    desc: 'Flagship versatile multimodal model',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    badge: 'Light',
    supportedEfforts: ['low'],
    defaultEffort: 'low',
    desc: 'Ultra-fast, cost-efficient everyday tasks',
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    badge: 'Code',
    supportedEfforts: ['low', 'medium'],
    defaultEffort: 'medium',
    desc: 'Efficient coding & software engineering',
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    badge: 'Thinking',
    supportedEfforts: ['thinking', 'high'],
    defaultEffort: 'thinking',
    desc: 'Deep mathematical & analytical reasoning',
  },
  {
    id: 'llama3.3',
    name: 'Llama 3.3',
    provider: 'Ollama',
    badge: 'Local',
    supportedEfforts: ['low', 'medium'],
    defaultEffort: 'low',
    desc: 'Local open-weights language model',
  },
];

interface AttachedFile {
  path: string;
  name: string;
}

export const AIAgentPanel: React.FC = () => {
  const { messages, isGenerating, sessions } = useAI();
  const settings = useSettings();
  const { groups } = useEditor();

  const [inputPrompt, setInputPrompt] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isRecentChatsOpen, setIsRecentChatsOpen] = useState(false);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [activeSubmenu, setActiveSubmenu] = useState<{
    model: AIModelOption;
    rect: { top: number; bottom: number; left: number; right: number };
  } | null>(null);

  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const submenuTimerRef = useRef<any>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const currentModelId = settings.ai?.model || 'gemini-1.5-pro';
  const currentModel =
    AVAILABLE_MODELS.find((m) => m.id === currentModelId) || AVAILABLE_MODELS[0];

  const rawModelType: AIModelType = settings.ai?.modelType || 'high';
  const currentModelType: AIModelType = currentModel.supportedEfforts.includes(rawModelType)
    ? rawModelType
    : currentModel.defaultEffort || currentModel.supportedEfforts[0] || 'low';

  const currentModelTypeObj =
    MODEL_TYPE_OPTIONS.find((t) => t.id === currentModelType) || MODEL_TYPE_OPTIONS[0];

  const activeTab = editorStore.getActiveTab();
  const openTabs = groups[0]?.tabs || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Update dropdown coordinates and keep strictly within viewport bounds
  const updateDropdownCoords = () => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const menuWidth = 195;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8));
    setDropdownCoords({ top: rect.bottom + 4, left });
  };

  useEffect(() => {
    if (isModelDropdownOpen) {
      updateDropdownCoords();
      window.addEventListener('resize', updateDropdownCoords);
      window.addEventListener('scroll', updateDropdownCoords, true);
      return () => {
        window.removeEventListener('resize', updateDropdownCoords);
        window.removeEventListener('scroll', updateDropdownCoords, true);
      };
    } else {
      setActiveSubmenu(null);
    }
  }, [isModelDropdownOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideDropdownTrigger = dropdownRef.current && dropdownRef.current.contains(target);
      const isInsideDropdownMenu = dropdownMenuRef.current && dropdownMenuRef.current.contains(target);
      const isInsideSubmenu = submenuRef.current && submenuRef.current.contains(target);

      if (!isInsideDropdownTrigger && !isInsideDropdownMenu && !isInsideSubmenu) {
        setIsModelDropdownOpen(false);
        setActiveSubmenu(null);
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(target)) {
        setIsAttachMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup Speech Recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (submenuTimerRef.current) {
        clearTimeout(submenuTimerRef.current);
      }
    };
  }, []);

  const handleSelectModel = (modelId: string, specificType?: AIModelType) => {
    const targetModel = AVAILABLE_MODELS.find((m) => m.id === modelId) || AVAILABLE_MODELS[0];
    let newType = specificType;
    if (!newType) {
      if (targetModel.supportedEfforts.includes(currentModelType)) {
        newType = currentModelType;
      } else {
        newType = targetModel.defaultEffort || targetModel.supportedEfforts[0] || 'low';
      }
    }

    settingsStore.updateSettings({
      ai: { ...settings.ai, model: modelId, modelType: newType },
    });
    setIsModelDropdownOpen(false);
    setActiveSubmenu(null);
  };

  const handleModelMouseEnter = (m: AIModelOption, e: React.MouseEvent<HTMLDivElement>) => {
    if (submenuTimerRef.current) {
      clearTimeout(submenuTimerRef.current);
      submenuTimerRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveSubmenu({
      model: m,
      rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
    });
  };

  const handleModelMouseLeave = () => {
    if (submenuTimerRef.current) clearTimeout(submenuTimerRef.current);
    submenuTimerRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 180);
  };

  const handleSubmenuMouseEnter = () => {
    if (submenuTimerRef.current) {
      clearTimeout(submenuTimerRef.current);
      submenuTimerRef.current = null;
    }
  };

  const handleSubmenuMouseLeave = () => {
    if (submenuTimerRef.current) clearTimeout(submenuTimerRef.current);
    submenuTimerRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 180);
  };

  const handleModelClick = (m: AIModelOption) => {
    handleSelectModel(m.id);
    setActiveSubmenu(null);
    setIsModelDropdownOpen(false);
  };

  const handleSelectEffort = (modelId: string, effortId: AIModelType) => {
    handleSelectModel(modelId, effortId);
    setActiveSubmenu(null);
    setIsModelDropdownOpen(false);
  };

  // Speech-to-Text (STT) Toggle
  const toggleSpeechToText = () => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      alert('Speech Recognition (STT) is not supported in this environment.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript.trim();
            if (transcript) {
              setInputPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
            }
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed starting speech recognition:', err);
      setIsListening(false);
    }
  };

  // Attach active file
  const handleAttachActiveFile = () => {
    if (!activeTab?.filePath) return;
    const path = activeTab.filePath;
    const name = activeTab.fileName;
    if (!attachedFiles.some((f) => f.path === path)) {
      setAttachedFiles((prev) => [...prev, { path, name }]);
    }
    setIsAttachMenuOpen(false);
  };

  // Attach a tab
  const handleAttachTab = (tabPath: string, tabName: string) => {
    if (!attachedFiles.some((f) => f.path === tabPath)) {
      setAttachedFiles((prev) => [...prev, { path: tabPath, name: tabName }]);
    }
    setIsAttachMenuOpen(false);
  };

  // Browse local files
  const handleBrowseFiles = async () => {
    setIsAttachMenuOpen(false);
    const selected = await api.openFileDialog();
    if (selected) {
      const name = selected.split(/[/\\]/).pop() || selected;
      if (!attachedFiles.some((f) => f.path === selected)) {
        setAttachedFiles((prev) => [...prev, { path: selected, name }]);
      }
    }
  };

  const removeAttachedFile = (pathToRemove: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.path !== pathToRemove));
  };

  const handleSend = () => {
    if ((!inputPrompt.trim() && attachedFiles.length === 0) || isGenerating) return;
    const text = inputPrompt;
    const files = [...attachedFiles];
    setInputPrompt('');
    setAttachedFiles([]);
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }
    aiStore.sendMessage(text, files);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-main)',
        borderLeft: '1px solid var(--border-color)',
        overflow: 'hidden',
        position: 'relative',
        color: 'var(--text-primary)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        style={{
          height: 38,
          backgroundColor: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          userSelect: 'none',
          position: 'relative',
          zIndex: 20,
        }}
      >
        {/* Left: Bot Icon & Merged Model+Effort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1, overflow: 'hidden' }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              backgroundColor: 'var(--bg-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              flexShrink: 0,
            }}
            title="Binary AI Agent"
          >
            <Bot size={13} />
          </div>

          {/* Unified Model + Effort Dropdown Trigger */}
          <div ref={dropdownRef} style={{ position: 'relative', minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <button
              onClick={() => {
                if (!isModelDropdownOpen) updateDropdownCoords();
                setIsModelDropdownOpen(!isModelDropdownOpen);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: isModelDropdownOpen ? 'var(--bg-hover)' : 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                height: 24,
                overflow: 'hidden',
                maxWidth: '100%',
                minWidth: 0,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              title={`Model: ${currentModel.name} · Effort: ${currentModelTypeObj.label}`}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = isModelDropdownOpen
                  ? 'var(--bg-hover)'
                  : 'var(--bg-card)')
              }
            >
              <Cpu size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span
                style={{
                  fontWeight: 500,
                  flexShrink: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {currentModel.name}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 9, flexShrink: 0 }}>·</span>
              <span
                style={{
                  color: 'var(--text-muted)',
                  fontSize: 9,
                  flexShrink: 0,
                  letterSpacing: '0.02em',
                }}
              >
                {{ low: 'L', medium: 'M', high: 'H', thinking: 'T' }[currentModelType] ?? currentModelTypeObj.label.charAt(0).toUpperCase()}
              </span>
              <ChevronDown
                size={10}
                style={{ color: 'var(--text-muted)', marginLeft: 1, flexShrink: 0 }}
              />
            </button>

            {/* Models Dropdown Menu (Clamped to avoid screen overflow) */}
            {isModelDropdownOpen && (
              <div
                ref={dropdownMenuRef}
                style={{
                  position: 'fixed',
                  top: dropdownCoords.top,
                  left: dropdownCoords.left,
                  width: 195,
                  maxHeight: 380,
                  overflowY: 'auto',
                  backgroundColor: 'var(--bg-menu)',
                  border: '1px solid var(--border-menu)',
                  borderRadius: 6,
                  boxShadow: 'var(--shadow-menu, 0 8px 24px rgba(0,0,0,0.45))',
                  padding: '4px 0',
                  zIndex: 9999,
                }}
              >
                <div
                  style={{
                    padding: '4px 10px 4px',
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid var(--border-subtle)',
                    marginBottom: 2,
                  }}
                >
                  Models
                </div>

                {AVAILABLE_MODELS.map((m) => {
                  const isSelectedModel = m.id === currentModelId;
                  const isSubmenuActive = activeSubmenu?.model.id === m.id;

                  return (
                    <div
                      key={m.id}
                      onMouseEnter={(e) => handleModelMouseEnter(m, e)}
                      onMouseLeave={handleModelMouseLeave}
                      onClick={() => handleModelClick(m)}
                      style={{
                        margin: '1px 4px',
                        padding: '5px 8px',
                        borderRadius: 4,
                        backgroundColor:
                          isSubmenuActive || isSelectedModel
                            ? 'var(--bg-hover)'
                            : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 6,
                        transition: 'all 0.1s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: isSelectedModel ? 600 : 400,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {m.name}
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            padding: '0 4px',
                            borderRadius: 3,
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border-subtle)',
                            lineHeight: '14px',
                            flexShrink: 0,
                          }}
                        >
                          {m.badge}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          flexShrink: 0,
                        }}
                      >
                        {isSelectedModel && (
                          <Check
                            size={12}
                            style={{ color: 'var(--accent-color, #3b82f6)' }}
                          />
                        )}
                        <ChevronRight
                          size={11}
                          style={{
                            color: isSubmenuActive
                              ? 'var(--text-primary)'
                              : 'var(--text-muted)',
                            opacity: 0.8,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Effort Subdropdown Menu (Low / Medium / High) */}
            {isModelDropdownOpen && activeSubmenu && (
              <div
                ref={submenuRef}
                onMouseEnter={handleSubmenuMouseEnter}
                onMouseLeave={handleSubmenuMouseLeave}
                style={{
                  position: 'fixed',
                  top: Math.max(
                    8,
                    Math.min(
                      activeSubmenu.rect.top - 2,
                      window.innerHeight -
                        (40 + activeSubmenu.model.supportedEfforts.length * 48) -
                        8
                    )
                  ),
                  left:
                    activeSubmenu.rect.right + 185 + 8 <= window.innerWidth
                      ? activeSubmenu.rect.right + 2
                      : Math.max(8, activeSubmenu.rect.left - 185 - 2),
                  width: 185,
                  backgroundColor: 'var(--bg-menu)',
                  border: '1px solid var(--border-menu)',
                  borderRadius: 6,
                  boxShadow: 'var(--shadow-menu, 0 8px 24px rgba(0,0,0,0.45))',
                  padding: '4px 0',
                  zIndex: 10000,
                }}
              >
                <div
                  style={{
                    padding: '4px 10px 4px',
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid var(--border-subtle)',
                    marginBottom: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Effort Level</span>
                  <span style={{ fontSize: 9, opacity: 0.75, fontWeight: 400 }}>
                    {activeSubmenu.model.name}
                  </span>
                </div>

                {activeSubmenu.model.supportedEfforts.map((effortId) => {
                  const effortOption =
                    MODEL_TYPE_OPTIONS.find((t) => t.id === effortId) || {
                      id: effortId,
                      label: effortId,
                      badge: '',
                      desc: '',
                    };
                  const isSelectedModel =
                    activeSubmenu.model.id === currentModelId;
                  const isEffortActive =
                    isSelectedModel && currentModelType === effortId;

                  return (
                    <div
                      key={effortId}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectEffort(activeSubmenu.model.id, effortId);
                      }}
                      style={{
                        margin: '2px 4px',
                        padding: '5px 8px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        backgroundColor: isEffortActive
                          ? 'var(--bg-active, rgba(59, 130, 246, 0.12))'
                          : 'transparent',
                        transition: 'all 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isEffortActive) {
                          e.currentTarget.style.backgroundColor =
                            'var(--bg-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isEffortActive) {
                          e.currentTarget.style.backgroundColor =
                            'transparent';
                        }
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: isEffortActive ? 600 : 500,
                              color: isEffortActive
                                ? 'var(--accent-color, #3b82f6)'
                                : 'var(--text-primary)',
                            }}
                          >
                            {effortOption.label}
                          </span>
                          {effortOption.badge && (
                            <span
                              style={{
                                fontSize: 9,
                                padding: '0 4px',
                                borderRadius: 3,
                                backgroundColor: 'var(--bg-card)',
                                color: 'var(--text-muted)',
                                border: '1px solid var(--border-subtle)',
                                lineHeight: '13px',
                              }}
                            >
                              {effortOption.badge}
                            </span>
                          )}
                        </div>

                        {isEffortActive && (
                          <Check
                            size={12}
                            style={{ color: 'var(--accent-color, #3b82f6)' }}
                          />
                        )}
                      </div>

                      {effortOption.desc && (
                        <div
                          style={{
                            fontSize: 9.5,
                            color: 'var(--text-muted)',
                            lineHeight: 1.25,
                            marginTop: 2,
                          }}
                        >
                          {effortOption.desc}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {/* New Chat Button (+) */}
          <button
            onClick={() => {
              aiStore.createSession();
              setInputPrompt('');
              setAttachedFiles([]);
            }}
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="New Chat"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <Plus size={14} />
          </button>

          {/* Recent Chats Button */}
          <button
            onClick={() => setIsRecentChatsOpen(true)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isRecentChatsOpen ? 'var(--bg-hover)' : 'transparent',
              border: 'none',
              color: isRecentChatsOpen ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.15s ease',
            }}
            title={`Recent Chats (${sessions.length})`}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              if (!isRecentChatsOpen) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }
            }}
          >
            <History size={13} />
            {sessions.length > 1 && (
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-color, #3b82f6)',
                }}
              />
            )}
          </button>

          <button
            onClick={() => aiStore.clearHistory()}
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Clear Chat History"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={() => layoutStore.toggleAIPanel()}
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Close AI Panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── Messages Scroll Area ───────────────────────────────────── */}
      <div
        className="chat-selectable"
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%', minWidth: 0, boxSizing: 'border-box', userSelect: 'text' }}
      >
        {messages.map((msg) => (
          <AIChatMessage key={msg.id} message={msg} />
        ))}
        {isGenerating && (
          <div
            style={{
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--text-muted)',
              fontSize: 12,
            }}
          >
            <Loader2 size={13} className="animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Box & Tooling Area ───────────────────────────────── */}
      <div
        style={{
          padding: '8px 10px',
          backgroundColor: 'var(--bg-panel)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {/* Attached Files Chips Bar */}
        {attachedFiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 4 }}>
            {attachedFiles.map((file) => (
              <div
                key={file.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '2px 8px',
                  borderRadius: 4,
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  fontSize: 11,
                  color: 'var(--text-primary)',
                }}
              >
                <FileCode size={11} style={{ color: 'var(--text-muted)' }} />
                <span>{file.name}</span>
                <button
                  onClick={() => removeAttachedFile(file.path)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          rows={2}
          value={inputPrompt}
          placeholder={
            isListening
              ? 'Listening to speech...'
              : `Ask ${currentModel.name}... (Enter to send)`
          }
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            resize: 'none',
            fontSize: 12,
            backgroundColor: 'var(--bg-main)',
            border: isListening ? '1px solid var(--color-danger)' : '1px solid var(--border-color)',
            borderRadius: 6,
            padding: '8px 10px',
            color: 'var(--text-primary)',
            outline: 'none',
            fontFamily: 'var(--font-ui)',
            lineHeight: 1.4,
          }}
        />

        {/* Action Controls Toolbar below textarea */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          {/* Left: Attach Files button (+) & Mic button (STT) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Plus button to add files (icon only) */}
            <div ref={attachMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                style={{
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                  backgroundColor: attachedFiles.length > 0 ? 'var(--bg-active)' : 'transparent',
                  border: '1px solid var(--border-color)',
                  color: attachedFiles.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                }}
                title="Attach context files"
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = attachedFiles.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)')}
              >
                <Plus size={14} />
                {attachedFiles.length > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      fontSize: 9,
                      fontWeight: 700,
                      backgroundColor: 'var(--text-primary)',
                      color: 'var(--bg-main)',
                      borderRadius: '50%',
                      width: 14,
                      height: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {attachedFiles.length}
                  </span>
                )}
              </button>

              {/* Attach Context Menu */}
              {isAttachMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    marginBottom: 6,
                    width: 200,
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 6,
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                    padding: '4px 0',
                    zIndex: 100,
                  }}
                >
                  <div
                    style={{
                      padding: '4px 10px 6px',
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    Attach Context Files
                  </div>

                  {activeTab && (
                    <button
                      onClick={handleAttachActiveFile}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 10px',
                        fontSize: 11,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <FileCode size={12} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Active: {activeTab.fileName}
                      </span>
                    </button>
                  )}

                  {openTabs.length > 1 && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '3px 0' }}>
                      <div style={{ padding: '3px 10px', fontSize: 9, color: 'var(--text-muted)' }}>OPEN TABS</div>
                      {openTabs.slice(0, 4).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleAttachTab(t.filePath, t.fileName)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '4px 10px',
                            fontSize: 11,
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <FileCode size={11} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.fileName}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 3, paddingTop: 3 }}>
                    <button
                      onClick={handleBrowseFiles}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 10px',
                        fontSize: 11,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Paperclip size={12} style={{ color: 'var(--text-muted)' }} />
                      <span>Browse Files...</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Voice button for STT (icon only) */}
            <button
              onClick={toggleSpeechToText}
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
                backgroundColor: isListening ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                border: isListening ? '1px solid var(--color-danger)' : '1px solid var(--border-color)',
                color: isListening ? 'var(--color-danger)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={isListening ? 'Stop speech recognition' : 'Voice input (STT)'}
              onMouseEnter={(e) => {
                if (!isListening) e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                if (!isListening) e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          </div>

          {/* Right: Send Button (icon only) */}
          <button
            onClick={handleSend}
            disabled={(!inputPrompt.trim() && attachedFiles.length === 0) || isGenerating}
            style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              backgroundColor:
                (inputPrompt.trim() || attachedFiles.length > 0) && !isGenerating
                  ? 'var(--text-primary)'
                  : 'transparent',
              color:
                (inputPrompt.trim() || attachedFiles.length > 0) && !isGenerating
                  ? 'var(--bg-main)'
                  : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-color)',
              cursor: (inputPrompt.trim() || attachedFiles.length > 0) && !isGenerating ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
            }}
            title="Send prompt (Enter)"
          >
            <Send size={13} />
          </button>
        </div>
      </div>

      {/* Action Confirmation Modal */}
      <AIConfirmationModal />

      {/* Recent Chats Dialog */}
      <AIRecentChatsModal
        isOpen={isRecentChatsOpen}
        onClose={() => setIsRecentChatsOpen(false)}
      />
    </div>
  );
};

export default AIAgentPanel;
