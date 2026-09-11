import { StageTimerState, BuzzerRecord } from '../types';

export const SYNC_KEYS = {
  STAGE_TIMER: 'chuyende_stage_timer_state_v2',
  BUZZER_QUEUE: 'chuyende_buzzer_queue_v2',
  BROADCAST_CHANNEL: 'chuyende_debate_bus_v1',
};

type TimerListener = (timer: StageTimerState) => void;
type BuzzerListener = (queue: BuzzerRecord[]) => void;

/**
 * Generate unique, safe room topic based on current domain/host
 * E.g., for shcdt9tro1.vercel.app -> cd9_shcdt9tro1_vercel_app
 */
export function getSyncRoomTopic(): string {
  if (typeof window === 'undefined') return 'cd9_rebuttal_global_bus';
  const cleanHost = window.location.host.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `cd9_bus_${cleanHost || 'default'}`;
}

class SyncService {
  private channel: BroadcastChannel | null = null;
  private timerListeners: Set<TimerListener> = new Set();
  private buzzerListeners: Set<BuzzerListener> = new Set();
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private eventSource: EventSource | null = null;
  private lastTimerSignature = '';
  private lastBuzzerJson = '';
  private topic = '';

  constructor() {
    this.topic = getSyncRoomTopic();

    // 1. Channel for instant 0ms sync across tabs on same browser profile
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

    // 2. Storage event listener for standard tabs
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

    // 3. Connect to Realtime Cloud SSE Stream (ntfy.sh)
    // Works 100% across Incognito windows, iPhones, Androids, and remote laptops on Vercel!
    this.initCloudSSE();

    // 4. Fetch initial states from Cloud & local server immediately
    this.fetchInitialState();

    // 5. Background fallback polling
    this.startPolling(800);
  }

  /**
   * Initialize Cloud Realtime Server-Sent Events (SSE)
   * This bridges Chrome regular windows and Incognito windows directly with < 50ms latency!
   */
  private initCloudSSE() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;

    try {
      if (this.eventSource) {
        try { this.eventSource.close(); } catch {}
      }

      const sseUrl = `https://ntfy.sh/${this.topic}/sse`;
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'message' && data.message) {
            const payload = JSON.parse(data.message);
            this.handleIncomingPayload(payload);
          }
        } catch {}
      };

      this.eventSource.onerror = () => {
        // EventSource will auto-reconnect natively
      };
    } catch (err) {
      console.warn('Could not initialize Cloud SSE:', err);
    }
  }

  private handleIncomingPayload(payload: any) {
    if (!payload || typeof payload !== 'object') return;

    if (payload.type === 'TIMER_UPDATE' && payload.timer) {
      const timer = payload.timer as StageTimerState;
      const sig = `${timer.phase}_${timer.isRunning}_${timer.currentTeamId}_${timer.totalDuration}_${timer.updatedAt}_${timer.timeLeft}`;
      if (sig !== this.lastTimerSignature) {
        this.lastTimerSignature = sig;
        this.notifyTimerListeners(timer);
        try {
          localStorage.setItem(SYNC_KEYS.STAGE_TIMER, JSON.stringify(timer));
        } catch {}
      }
    } else if (payload.type === 'BUZZER_UPDATE' && Array.isArray(payload.queue)) {
      const queue = payload.queue as BuzzerRecord[];
      const json = JSON.stringify(queue);
      if (json !== this.lastBuzzerJson) {
        this.lastBuzzerJson = json;
        this.notifyBuzzerListeners(queue);
        try {
          localStorage.setItem(SYNC_KEYS.BUZZER_QUEUE, json);
        } catch {}
      }
    } else if (payload.type === 'BUZZER_RESET') {
      this.lastBuzzerJson = '[]';
      this.notifyBuzzerListeners([]);
      try {
        localStorage.setItem(SYNC_KEYS.BUZZER_QUEUE, '[]');
      } catch {}
    }
  }

  /**
   * Publish payload to Cloud Realtime SSE broker
   */
  private async publishToCloud(payload: any): Promise<void> {
    try {
      await fetch(`https://ntfy.sh/${this.topic}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {}
  }

  /**
   * Fetch initial state from cloud history or server on startup
   */
  public async fetchInitialState(): Promise<void> {
    // A. Check cloud history for latest message
    try {
      const res = await fetch(`https://ntfy.sh/${this.topic}/json?poll=1`);
      if (res.ok) {
        const text = await res.text();
        const lines = text.trim().split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const item = JSON.parse(lines[i]);
            if (item.event === 'message' && item.message) {
              const payload = JSON.parse(item.message);
              this.handleIncomingPayload(payload);
              break;
            }
          } catch {}
        }
      }
    } catch {}

    // B. Also check local server API
    this.fetchTimerState();
    this.fetchBuzzerQueue();
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
   * 1. BroadcastChannel (immediate 0ms for tabs on same browser profile)
   * 2. LocalStorage (immediate for standard tabs)
   * 3. Cloud SSE via ntfy.sh (immediate for incognito, mobile, remote laptops)
   * 4. HTTP Server (/api/timer)
   */
  public async pushTimerState(state: StageTimerState): Promise<void> {
    const json = JSON.stringify(state);
    const sig = `${state.phase}_${state.isRunning}_${state.currentTeamId}_${state.totalDuration}_${state.updatedAt}_${state.timeLeft}`;
    this.lastTimerSignature = sig;

    // 1. Save locally
    try {
      localStorage.setItem(SYNC_KEYS.STAGE_TIMER, json);
    } catch {}

    // 2. Broadcast across local tabs immediately (0ms)
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'TIMER_UPDATE', timer: state });
      } catch {}
    }

    // 3. Publish to Cloud SSE for Incognito & Remote Devices (< 50ms)
    this.publishToCloud({
      type: 'TIMER_UPDATE',
      timer: state,
    });

    // 4. Server API fallback
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
          const serverTimer = data.timer as StageTimerState;
          this.notifyTimerListeners(serverTimer);
          return serverTimer;
        }
      }
    } catch {}
    return null;
  }

  /**
   * Push buzzer queue updates to all devices
   */
  public async pushBuzzerQueue(queue: BuzzerRecord[]): Promise<void> {
    const json = JSON.stringify(queue);
    this.lastBuzzerJson = json;

    try {
      localStorage.setItem(SYNC_KEYS.BUZZER_QUEUE, json);
    } catch {}

    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'BUZZER_UPDATE', queue });
      } catch {}
    }

    // Publish to Cloud SSE
    this.publishToCloud({
      type: 'BUZZER_UPDATE',
      queue,
    });
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
          const queue = data.queue as BuzzerRecord[];
          this.notifyBuzzerListeners(queue);
          return queue;
        }
      }
    } catch {}
    return null;
  }

  /**
   * Team buzzer action: sends to /api/buzzer/buzz and broadcasts to Cloud SSE
   */
  public async buzz(
    teamId: number,
    teamName: string
  ): Promise<{ success: boolean; queue: BuzzerRecord[]; rank: number; message?: string }> {
    // 1. Try server API
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
          await this.pushBuzzerQueue(queue);
          this.notifyBuzzerListeners(queue);
          return {
            success: true,
            queue,
            rank: data.rank || queue.length,
          };
        }
      }
    } catch {}

    // 2. Local + Cloud direct buzzer broadcast
    try {
      let currentQueue: BuzzerRecord[] = [];
      try {
        const raw = localStorage.getItem(SYNC_KEYS.BUZZER_QUEUE);
        if (raw) currentQueue = JSON.parse(raw);
      } catch {}

      if (currentQueue.some((b) => b.teamId === teamId)) {
        const rank = currentQueue.findIndex((b) => b.teamId === teamId) + 1;
        return { success: true, queue: currentQueue, rank };
      }

      const now = Date.now();
      const firstTimestamp = currentQueue.length > 0 ? currentQueue[0].timestamp : now;
      const newRec: BuzzerRecord = {
        teamId,
        teamName,
        timestamp: now,
        diffMs: now - firstTimestamp,
      };
      const nextQueue = [...currentQueue, newRec];
      await this.pushBuzzerQueue(nextQueue);
      this.notifyBuzzerListeners(nextQueue);
      return { success: true, queue: nextQueue, rank: nextQueue.length };
    } catch {}

    return { success: false, queue: [], rank: 0 };
  }

  /**
   * Reset buzzer queue across all devices
   */
  public async resetBuzzerQueue(): Promise<void> {
    try {
      await fetch('/api/buzzer/reset', { method: 'POST' });
    } catch {}

    // Publish reset event to Cloud SSE
    this.publishToCloud({
      type: 'BUZZER_RESET',
      queue: [],
    });

    await this.pushBuzzerQueue([]);
    this.notifyBuzzerListeners([]);
  }

  /**
   * Start polling server timer & buzzer state as secondary fallback
   */
  public startPolling(intervalMs = 800) {
    if (this.pollingInterval) clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(async () => {
      // 1. Poll Timer
      try {
        const res = await fetch('/api/timer');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.timer) {
            const serverTimer = data.timer as StageTimerState;
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

