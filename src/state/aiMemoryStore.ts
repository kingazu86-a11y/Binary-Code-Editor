import { useState, useEffect } from 'react';
import { AIMemoryItem } from '../types/electron';

const MEMORIES_STORAGE_KEY = 'binary_ai_memories';
const MEMORY_ENABLED_STORAGE_KEY = 'binary_ai_memory_enabled';

const INITIAL_DEFAULT_MEMORIES: AIMemoryItem[] = [
  {
    id: 'mem_default_1',
    text: 'Workspace stack: React 18, TypeScript, Electron, and Vite.',
    enabled: true,
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'mem_default_2',
    text: 'Prefer clean modular architecture, functional components, and concise explanations.',
    enabled: true,
    createdAt: Date.now() - 1800000,
  },
];

interface AIMemoryState {
  memories: AIMemoryItem[];
  isEnabled: boolean;
}

function loadInitialState(): AIMemoryState {
  if (typeof window === 'undefined') {
    return { memories: INITIAL_DEFAULT_MEMORIES, isEnabled: true };
  }

  let memories = INITIAL_DEFAULT_MEMORIES;
  let isEnabled = true;

  try {
    const raw = localStorage.getItem(MEMORIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memories = parsed;
      }
    } else {
      localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(INITIAL_DEFAULT_MEMORIES));
    }

    const enabledRaw = localStorage.getItem(MEMORY_ENABLED_STORAGE_KEY);
    if (enabledRaw !== null) {
      isEnabled = enabledRaw === 'true';
    }
  } catch (e) {
    console.warn('Failed to load AI memories from localStorage:', e);
  }

  return { memories, isEnabled };
}

let globalState: AIMemoryState = loadInitialState();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(globalState.memories));
      localStorage.setItem(MEMORY_ENABLED_STORAGE_KEY, String(globalState.isEnabled));
    } catch {}
  }
}

export const aiMemoryStore = {
  getState: () => globalState,

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  addMemory: (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const newMemory: AIMemoryItem = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: trimmed,
      enabled: true,
      createdAt: Date.now(),
    };

    globalState = {
      ...globalState,
      memories: [newMemory, ...globalState.memories],
    };
    notify();
  },

  toggleMemory: (id: string) => {
    globalState = {
      ...globalState,
      memories: globalState.memories.map((m) =>
        m.id === id ? { ...m, enabled: !m.enabled } : m
      ),
    };
    notify();
  },

  removeMemory: (id: string) => {
    globalState = {
      ...globalState,
      memories: globalState.memories.filter((m) => m.id !== id),
    };
    notify();
  },

  clearMemories: () => {
    globalState = {
      ...globalState,
      memories: [],
    };
    notify();
  },

  setIsEnabled: (enabled: boolean) => {
    globalState = {
      ...globalState,
      isEnabled: enabled,
    };
    notify();
  },

  getActiveMemories: (): AIMemoryItem[] => {
    if (!globalState.isEnabled) return [];
    return globalState.memories.filter((m) => m.enabled);
  },
};

export function useAIMemories() {
  const [state, setState] = useState<AIMemoryState>(aiMemoryStore.getState());

  useEffect(() => {
    const unsub = aiMemoryStore.subscribe(() => {
      setState({ ...aiMemoryStore.getState() });
    });
    return unsub;
  }, []);

  const activeCount = state.isEnabled ? state.memories.filter((m) => m.enabled).length : 0;

  return {
    memories: state.memories,
    isEnabled: state.isEnabled,
    activeCount,
    addMemory: aiMemoryStore.addMemory,
    toggleMemory: aiMemoryStore.toggleMemory,
    removeMemory: aiMemoryStore.removeMemory,
    clearMemories: aiMemoryStore.clearMemories,
    setIsEnabled: aiMemoryStore.setIsEnabled,
  };
}
