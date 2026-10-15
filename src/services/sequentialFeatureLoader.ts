import { useState, useEffect } from 'react';
import { settingsStore } from '../state/settingsStore';
import { workspaceStore } from '../state/workspaceStore';
import { warmupMonaco } from '../editor/monacoWarmup';

export type StartupPhase = 'shell' | 'workspace' | 'editor' | 'background';

class SequentialFeatureLoader {
  private completedPhases = new Set<StartupPhase>();
  private listeners = new Set<() => void>();
  private isStarted = false;

  isPhaseComplete(phase: StartupPhase): boolean {
    return this.completedPhases.has(phase);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private completePhase(phase: StartupPhase) {
    this.completedPhases.add(phase);
    this.notify();
  }

  /**
   * Staged, sequential bootstrapping to eliminate startup lag and resource contention.
   */
  async startBootstrap(onStatusUpdate?: (status: string) => void): Promise<void> {
    if (this.isStarted) return;
    this.isStarted = true;

    const t0 = performance.now();

    try {
      // ── Phase 1: Shell & Core Configuration (0ms) ──────────────────────────
      onStatusUpdate?.('Applying theme & configuration...');
      await settingsStore.init();
      this.completePhase('shell');
      console.log(`[Bootstrap] Phase 1 (Shell & Settings) ready in ${(performance.now() - t0).toFixed(1)}ms`);

      // ── Phase 2: Workspace & File Tree (~40ms) ─────────────────────────────
      onStatusUpdate?.('Loading workspace file tree...');
      await workspaceStore.init();
      this.completePhase('workspace');
      console.log(`[Bootstrap] Phase 2 (Workspace & Tree) ready in ${(performance.now() - t0).toFixed(1)}ms`);

      // ── Phase 3: Editor Engine (~100ms) ────────────────────────────────────
      onStatusUpdate?.('Warming up Monaco editor engine...');
      // Start warming Monaco in idle callback or small timeout so UI render isn't blocked
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          warmupMonaco().catch(() => {});
          this.completePhase('editor');
        }, { timeout: 400 });
      } else {
        setTimeout(() => {
          warmupMonaco().catch(() => {});
          this.completePhase('editor');
        }, 80);
      }

      // ── Phase 4: Staggered Background Services (300ms - 1000ms) ─────────────
      // Defer non-critical background jobs so CPU remains 100% responsive for user clicks
      setTimeout(() => {
        this.completePhase('background');
        console.log(`[Bootstrap] Phase 4 (Background services) ready in ${(performance.now() - t0).toFixed(1)}ms`);
      }, 350);

    } catch (err) {
      console.error('[Bootstrap] Sequential loading error:', err);
      // Fallback: unlock all phases so app remains usable
      this.completePhase('shell');
      this.completePhase('workspace');
      this.completePhase('editor');
      this.completePhase('background');
    }
  }
}

export const sequentialFeatureLoader = new SequentialFeatureLoader();

export function useStartupPhase(phase: StartupPhase): boolean {
  const [isReady, setIsReady] = useState<boolean>(sequentialFeatureLoader.isPhaseComplete(phase));

  useEffect(() => {
    if (sequentialFeatureLoader.isPhaseComplete(phase)) {
      setIsReady(true);
      return;
    }

    const unsub = sequentialFeatureLoader.subscribe(() => {
      if (sequentialFeatureLoader.isPhaseComplete(phase)) {
        setIsReady(true);
      }
    });

    return unsub;
  }, [phase]);

  return isReady;
}
