import { useState, useEffect } from 'react';
import { AIMessage, AIToolCall } from '../types/electron';
import { api } from '../services/api';
import { settingsStore } from './settingsStore';
import { editorStore } from './editorStore';
import { workspaceStore } from './workspaceStore';
import { aiMemoryStore } from './aiMemoryStore';

export interface PendingToolApproval {
  callId: string;
  toolName: string;
  params: any;
  messageId: string;
}

export interface AIChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AIMessage[];
  model?: string;
  modelType?: string;
}

export interface AIState {
  messages: AIMessage[];
  isGenerating: boolean;
  pendingApproval: PendingToolApproval | null;
  currentSessionId: string;
  sessions: AIChatSession[];
}

const INITIAL_MESSAGES: AIMessage[] = [
  {
    id: 'welcome_msg',
    role: 'assistant',
    content: `Hello! I am **Binary AI**, your integrated coding assistant.\n\nI can help you build, debug, refactor, and navigate this workspace. I have direct access to safe developer tools to inspect files, execute terminal tasks, and draft interactive code changes.\n\nHow can I help you today?`,
    timestamp: Date.now(),
  },
];

const SESSIONS_STORAGE_KEY = 'binary_ai_chat_sessions';
const CURRENT_SESSION_STORAGE_KEY = 'binary_ai_current_session_id';

function loadStoredSessions(): { sessions: AIChatSession[]; currentSessionId: string } {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    const storedId = localStorage.getItem(CURRENT_SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const found = parsed.find((s: AIChatSession) => s.id === storedId);
        const currentId = found ? found.id : parsed[0].id;
        return {
          sessions: parsed,
          currentSessionId: currentId,
        };
      }
    }
  } catch (err) {
    console.error('Failed to load stored AI chat sessions:', err);
  }

  const initialSessionId = `session_${Date.now()}`;
  const initialSession: AIChatSession = {
    id: initialSessionId,
    title: 'New Conversation',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: INITIAL_MESSAGES,
  };

  return {
    sessions: [initialSession],
    currentSessionId: initialSessionId,
  };
}

function saveSessionsToStorage(sessions: AIChatSession[], currentId: string) {
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    localStorage.setItem(CURRENT_SESSION_STORAGE_KEY, currentId);
  } catch (err) {
    console.error('Failed to save AI chat sessions:', err);
  }
}

const { sessions: initialSessions, currentSessionId: initialCurrentId } = loadStoredSessions();
const currentActiveSession =
  initialSessions.find((s) => s.id === initialCurrentId) || initialSessions[0];

let globalState: AIState = {
  messages: currentActiveSession ? currentActiveSession.messages : INITIAL_MESSAGES,
  isGenerating: false,
  pendingApproval: null,
  currentSessionId: initialCurrentId,
  sessions: initialSessions,
};

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((listener) => listener());
}

function syncCurrentSession(
  messages: AIMessage[],
  customTitle?: string,
  extraState?: Partial<AIState>
) {
  const currentId = globalState.currentSessionId;
  const now = Date.now();

  let autoTitle = customTitle;
  if (!autoTitle) {
    const currentSession = globalState.sessions.find((s) => s.id === currentId);
    if (!currentSession || currentSession.title === 'New Conversation') {
      const firstUserMsg = messages.find((m) => m.role === 'user');
      if (firstUserMsg && firstUserMsg.content) {
        autoTitle =
          firstUserMsg.content.length > 40
            ? firstUserMsg.content.slice(0, 40).trim() + '...'
            : firstUserMsg.content;
      }
    }
  }

  const updatedSessions = globalState.sessions.map((s) => {
    if (s.id === currentId) {
      return {
        ...s,
        title: autoTitle || s.title,
        messages,
        updatedAt: now,
        model: settingsStore.getState().ai?.model,
        modelType: settingsStore.getState().ai?.modelType,
      };
    }
    return s;
  });

  globalState = {
    ...globalState,
    ...extraState,
    messages,
    sessions: updatedSessions,
  };
  saveSessionsToStorage(updatedSessions, currentId);
  notify();
}

export const aiStore = {
  getState: () => globalState,

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  createSession: (initialPrompt?: string): string => {
    const newId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const title = initialPrompt
      ? initialPrompt.length > 40
        ? initialPrompt.slice(0, 40).trim() + '...'
        : initialPrompt
      : 'New Conversation';

    const newSession: AIChatSession = {
      id: newId,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: INITIAL_MESSAGES,
      model: settingsStore.getState().ai?.model,
      modelType: settingsStore.getState().ai?.modelType,
    };

    const newSessions = [newSession, ...globalState.sessions];
    globalState = {
      ...globalState,
      currentSessionId: newId,
      messages: INITIAL_MESSAGES,
      pendingApproval: null,
      isGenerating: false,
      sessions: newSessions,
    };
    saveSessionsToStorage(newSessions, newId);
    notify();
    return newId;
  },

  switchSession: (sessionId: string) => {
    const targetSession = globalState.sessions.find((s) => s.id === sessionId);
    if (!targetSession) return;

    globalState = {
      ...globalState,
      currentSessionId: sessionId,
      messages: targetSession.messages || INITIAL_MESSAGES,
      pendingApproval: null,
      isGenerating: false,
    };
    saveSessionsToStorage(globalState.sessions, sessionId);
    notify();
  },

  deleteSession: (sessionId: string) => {
    let newSessions = globalState.sessions.filter((s) => s.id !== sessionId);
    let newCurrentId = globalState.currentSessionId;
    let newMessages = globalState.messages;

    if (newSessions.length === 0) {
      const fallbackId = `session_${Date.now()}`;
      const fallbackSession: AIChatSession = {
        id: fallbackId,
        title: 'New Conversation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: INITIAL_MESSAGES,
      };
      newSessions = [fallbackSession];
      newCurrentId = fallbackId;
      newMessages = INITIAL_MESSAGES;
    } else if (globalState.currentSessionId === sessionId) {
      newCurrentId = newSessions[0].id;
      newMessages = newSessions[0].messages || INITIAL_MESSAGES;
    }

    globalState = {
      ...globalState,
      sessions: newSessions,
      currentSessionId: newCurrentId,
      messages: newMessages,
      pendingApproval: null,
      isGenerating: false,
    };
    saveSessionsToStorage(newSessions, newCurrentId);
    notify();
  },

  clearAllSessions: () => {
    const newId = `session_${Date.now()}`;
    const newSession: AIChatSession = {
      id: newId,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: INITIAL_MESSAGES,
    };

    globalState = {
      ...globalState,
      sessions: [newSession],
      currentSessionId: newId,
      messages: INITIAL_MESSAGES,
      pendingApproval: null,
      isGenerating: false,
    };
    saveSessionsToStorage(globalState.sessions, newId);
    notify();
  },

  renameSession: (sessionId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const newSessions = globalState.sessions.map((s) =>
      s.id === sessionId ? { ...s, title: trimmed } : s
    );
    globalState = {
      ...globalState,
      sessions: newSessions,
    };
    saveSessionsToStorage(newSessions, globalState.currentSessionId);
    notify();
  },

  clearHistory: () => {
    const updatedSessions = globalState.sessions.map((s) =>
      s.id === globalState.currentSessionId
        ? {
            ...s,
            title: 'New Conversation',
            messages: INITIAL_MESSAGES,
            updatedAt: Date.now(),
          }
        : s
    );

    globalState = {
      ...globalState,
      messages: INITIAL_MESSAGES,
      pendingApproval: null,
      isGenerating: false,
      sessions: updatedSessions,
    };
    saveSessionsToStorage(updatedSessions, globalState.currentSessionId);
    notify();
  },

  sendMessage: async (userPrompt: string, attachedFiles?: Array<{ path: string; name: string }>) => {
    if (!userPrompt.trim() && (!attachedFiles || attachedFiles.length === 0)) return;

    const currentModel = settingsStore.getState().ai?.model || 'gpt-4o';
    const currentModelType = settingsStore.getState().ai?.modelType || 'high';

    let content = userPrompt.trim();
    if (attachedFiles && attachedFiles.length > 0 && !content) {
      content = `Analyze attached file(s): ${attachedFiles.map((f) => f.name).join(', ')}`;
    }

    const userMessage: AIMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content,
      timestamp: Date.now(),
      model: currentModel,
      modelType: currentModelType,
      attachedFiles: attachedFiles && attachedFiles.length > 0 ? attachedFiles : undefined,
    };

    const assistantMsgId = `msg_${Date.now()}_ai`;
    const devNoticeMsg: AIMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: 'Agent is currently under development, it will be available soon',
      timestamp: Date.now(),
      model: currentModel,
      modelType: currentModelType,
      toolCalls: [],
    };

    const newMessages = [...globalState.messages, userMessage, devNoticeMsg];
    syncCurrentSession(newMessages, undefined, { isGenerating: false });
  },

  approvePendingTool: async () => {
    if (!globalState.pendingApproval) return;
    const { callId, toolName, params, messageId } = globalState.pendingApproval;
    const workspacePath = workspaceStore.getState().workspacePath || '';

    try {
      const toolResult = await api.aiExecuteTool(toolName, params, workspacePath);

      const updatedMessages: AIMessage[] = globalState.messages.map((m) => {
        if (m.id !== messageId) return m;
        return {
          ...m,
          toolCalls: m.toolCalls?.map((tc): AIToolCall =>
            tc.id === callId ? { ...tc, status: 'completed' as const, result: toolResult } : tc
          ),
        };
      });

      syncCurrentSession(updatedMessages, undefined, { pendingApproval: null });
    } catch (err: any) {
      const updatedMessages: AIMessage[] = globalState.messages.map((m) => {
        if (m.id !== messageId) return m;
        return {
          ...m,
          toolCalls: m.toolCalls?.map((tc): AIToolCall =>
            tc.id === callId ? { ...tc, status: 'failed' as const, error: err.message } : tc
          ),
        };
      });

      syncCurrentSession(updatedMessages, undefined, { pendingApproval: null });
    }
  },

  denyPendingTool: () => {
    if (!globalState.pendingApproval) return;
    const { callId, messageId } = globalState.pendingApproval;

    const updatedMessages: AIMessage[] = globalState.messages.map((m) => {
      if (m.id !== messageId) return m;
      return {
        ...m,
        toolCalls: m.toolCalls?.map((tc): AIToolCall =>
          tc.id === callId ? { ...tc, status: 'denied' as const, error: 'User denied this action' } : tc
        ),
      };
    });

    syncCurrentSession(updatedMessages, undefined, { pendingApproval: null });
  },

  acceptDiff: async (messageId: string) => {
    const msg = globalState.messages.find((m) => m.id === messageId);
    if (!msg || !msg.diffProposal) return;

    const { filePath, proposedContent } = msg.diffProposal;
    await api.writeFile(filePath, proposedContent);

    // Update active tab if open
    const activeTab = editorStore.getActiveTab();
    if (activeTab && activeTab.filePath === filePath) {
      editorStore.updateContent(activeTab.id, proposedContent);
      await editorStore.saveFile(activeTab.id);
    }

    const updatedMessages: AIMessage[] = globalState.messages.map((m) =>
      m.id === messageId
        ? {
            ...m,
            diffProposal: m.diffProposal ? { ...m.diffProposal, status: 'accepted' as const } : undefined,
          }
        : m
    );

    syncCurrentSession(updatedMessages);
  },

  rejectDiff: (messageId: string) => {
    const updatedMessages: AIMessage[] = globalState.messages.map((m) =>
      m.id === messageId
        ? {
            ...m,
            diffProposal: m.diffProposal ? { ...m.diffProposal, status: 'rejected' as const } : undefined,
          }
        : m
    );

    syncCurrentSession(updatedMessages);
  },
};

export function useAI() {
  const [state, setState] = useState<AIState>(aiStore.getState());

  useEffect(() => {
    const unsub = aiStore.subscribe(() => {
      setState({ ...aiStore.getState() });
    });
    return () => {
      unsub();
    };
  }, []);

  return state;
}
