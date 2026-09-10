import { StageTimerState, BuzzerRecord } from '../types';

export const SYNC_KEYS = {
  STAGE_TIMER: 'chuyende_stage_timer_state_v2',
  BUZZER_QUEUE: 'chuyende_buzzer_queue_v2',
  BROADCAST_CHANNEL: 'chuyende_debate_bus_v1',
};

type TimerListener = (timer: StageTimerState) => void;
type BuzzerListener = (queue: BuzzerRecord[]) => void;

class SyncService {
  private channel: BroadcastChannel | null = null;
  private timerListeners: Set<TimerListener> = new Set();
  private buzzerListeners: Set<BuzzerListener> = new Set();
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private lastPushedTimerJson = '';
  private lastServerTimerUpdatedAt = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(SYNC_KEYS.BROADCAST_CHANNEL);
        this.channel.onmessage = (event) => {
          const data = event.data;
          if (!data || typeof data !== 'object') return;

          if (data.type === 'TIMER_UPDATE' && data.timer) {
            this.notifyTimerListeners(data.timer);
          } else if (data.type === 'BUZZER_UPDATE' && Array.isArray(data.queue)) {
            this.notifyBuzzerListeners(data.queue);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization failed:', err);
      }
    }

    // Listen for cross-tab StorageEvent
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === SYNC_KEYS.STAGE_TIMER && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            this.notifyTimerListeners(parsed);
          } catch {}
        } else if (e.key === SYNC_KEYS.BUZZER_QUEUE && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            this.notifyBuzzerListeners(parsed);
          } catch {}
        }
      });
    }

    // Start background sync polling to support separate devices, incognito, and mobile
    this.startPolling(600);
  }

  public subscribeTimer(listener: TimerListener): () => void {
    this.timerListeners.add(listener);
    return () => {
      this.timerListeners.delete(listener);
    };
  }

  public subscribeBuzzer(listener: BuzzerListener): () => void {
    this.buzzerListeners.add(listener);
    return () => {
      this.buzzerListeners.delete(listener);
    };
  }

  private notifyTimerListeners(timer: StageTimerState) {
    this.timerListeners.forEach((fn) => {
      try {
        fn(timer);
      } catch {}
    });
  }

  private notifyBuzzerListeners(queue: BuzzerRecord[]) {
    this.buzzerListeners.forEach((fn) => {
      try {
        fn(queue);
      } catch {}
    });
  }

  /**
   * Push timer state from MC / Stage screen to:
   * 1. BroadcastChannel (immediate 0ms for tabs on same browser)
   * 2. LocalStorage (immediate for standard tabs)
   * 3. HTTP Server (/api/timer) for smartphones, incognito tabs, and other machines
   */
  public async pushTimerState(state: StageTimerState): Promise<void> {
    const json = JSON.stringify(state);

    // Save locally
    try {
      localStorage.setItem(SYNC_KEYS.STAGE_TIMER, json);
    } catch {}

    // Broadcast across local tabs immediately (0ms)
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'TIMER_UPDATE', timer: state });
      } catch {}
    }

    try {
      await fetch('/api/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
      });
    } catch {}
  }

  /**
   * Fetch current timer state from server
   */
  public async fetchTimerState(): Promise<StageTimerState | null> {
    try {
      const res = await fetch('/api/timer');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.timer) {
          return data.timer as StageTimerState;
        }
      }
    } catch {}
    return null;
  }

  /**
   * Push buzzer queue updates
   */
  public async pushBuzzerQueue(queue: BuzzerRecord[]): Promise<void> {
    try {
      localStorage.setItem(SYNC_KEYS.BUZZER_QUEUE, JSON.stringify(queue));
    } catch {}

    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'BUZZER_UPDATE', queue });
      } catch {}
    }
  }

  /**
   * Fetch current buzzer queue from server
   */
  public async fetchBuzzerQueue(): Promise<BuzzerRecord[] | null> {
    try {
      const res = await fetch('/api/buzzer');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.queue)) {
          return data.queue as BuzzerRecord[];
        }
      }
    } catch {}
    return null;
  }

  /**
   * Team buzzer action: sends to /api/buzzer/buzz
   */
  public async buzz(
    teamId: number,
    teamName: string
  ): Promise<{ success: boolean; queue: BuzzerRecord[]; rank: number; message?: string }> {
    try {
      const res = await fetch('/api/buzzer/buzz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, teamName }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          const queue = (data.queue || []) as BuzzerRecord[];
          this.pushBuzzerQueue(queue);
          this.notifyBuzzerListeners(queue);
          return {
            success: true,
            queue,
            rank: data.rank || queue.length,
          };
        }
      }
    } catch {}

    // Fallback: local buzz
    try {
      const raw = localStorage.getItem(SYNC_KEYS.BUZZER_QUEUE);
      const prev: BuzzerRecord[] = raw ? JSON.parse(raw) : [];
      if (prev.some((b) => b.teamId === teamId)) {
        const rank = prev.findIndex((b) => b.teamId === teamId) + 1;
        return { success: true, queue: prev, rank };
      }
      const now = Date.now();
      const firstTimestamp = prev.length > 0 ? prev[0].timestamp : now;
      const newRec: BuzzerRecord = {
        teamId,
        teamName,
        timestamp: now,
        diffMs: now - firstTimestamp,
      };
      const next = [...prev, newRec];
      this.pushBuzzerQueue(next);
      this.notifyBuzzerListeners(next);
      return { success: true, queue: next, rank: next.length };
    } catch {}

    return { success: false, queue: [], rank: 0 };
  }

  /**
   * Reset buzzer queue
   */
  public async resetBuzzerQueue(): Promise<void> {
    try {
      await fetch('/api/buzzer/reset', { method: 'POST' });
    } catch {}

    this.pushBuzzerQueue([]);
    this.notifyBuzzerListeners([]);
  }

  private lastTimerSignature = '';
  private lastBuzzerJson = '';

  /**
   * Start polling server timer & buzzer state to sync remote devices & incognito
   */
  public startPolling(intervalMs = 600) {
    if (this.pollingInterval) clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(async () => {
      // 1. Poll Timer
      try {
        const res = await fetch('/api/timer');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.timer) {
            const serverTimer = data.timer as StageTimerState;
            // Detect any change in running state, phase, team, or significant time tick
            const sig = `${serverTimer.phase}_${serverTimer.isRunning}_${serverTimer.currentTeamId}_${serverTimer.totalDuration}_${serverTimer.updatedAt}_${serverTimer.timeLeft}`;
            if (sig !== this.lastTimerSignature) {
              this.lastTimerSignature = sig;
              this.notifyTimerListeners(serverTimer);
              try {
                localStorage.setItem(SYNC_KEYS.STAGE_TIMER, JSON.stringify(serverTimer));
              } catch {}
            }
          }
        }
      } catch {}

      // 2. Poll Buzzer
      try {
        const res = await fetch('/api/buzzer');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.queue)) {
            const queue = data.queue as BuzzerRecord[];
            const json = JSON.stringify(queue);
            if (json !== this.lastBuzzerJson) {
              this.lastBuzzerJson = json;
              this.notifyBuzzerListeners(queue);
              try {
                localStorage.setItem(SYNC_KEYS.BUZZER_QUEUE, json);
              } catch {}
            }
          }
        }
      } catch {}
    }, intervalMs);
  }

  public stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

export const syncService = new SyncService();
