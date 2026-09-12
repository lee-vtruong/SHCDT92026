import { StageTimerState, BuzzerRecord } from '../types';

export const SYNC_KEYS = {
  STAGE_TIMER: 'chuyende_stage_timer_state_v2',
  BUZZER_QUEUE: 'chuyende_buzzer_queue_v2',
  ACTIVE_SESSIONS: 'chuyende_active_team_sessions_v1',
  BROADCAST_CHANNEL: 'chuyende_debate_bus_v1',
};

export interface CloudTeamSession {
  teamId: number;
  teamName: string;
  deviceId: string;
  sessionToken?: string;
  loggedInAt: number;
  lastHeartbeat: number;
  userAgent?: string;
}

type TimerListener = (timer: StageTimerState) => void;
type BuzzerListener = (queue: BuzzerRecord[]) => void;
type SessionListener = (sessions: CloudTeamSession[]) => void;

/**
 * Unified room topic for all devices, phones, laptops and testing environments
 */
export const CONTEST_ROOM_TOPIC = 'chuyende9_debate_hpu_bus_master_v3';

export function getSyncRoomTopic(): string {
  if (typeof window === 'undefined') return CONTEST_ROOM_TOPIC;
  try {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) return `cd9_bus_${room.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  } catch {}
  return CONTEST_ROOM_TOPIC;
}

class SyncService {
  private channel: BroadcastChannel | null = null;
  private timerListeners: Set<TimerListener> = new Set();
  private buzzerListeners: Set<BuzzerListener> = new Set();
  private sessionListeners: Set<SessionListener> = new Set();
  private activeSessionsMap = new Map<number, CloudTeamSession>();
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private eventSource: EventSource | null = null;
  private latestTimerState: StageTimerState | null = null;
  private lastTimerSignature = '';
  private lastBuzzerJson = '';
  private buzzerBlockedTeamIds: number[] = [];
  private lastBuzzerResetAt = 0;
  private lastSessionsJson = '';
  private topic = '';

  constructor() {
    this.topic = getSyncRoomTopic();
    this.loadSessionsFromLocal();
    try {
      const savedBuzzer = localStorage.getItem(SYNC_KEYS.BUZZER_QUEUE);
      if (savedBuzzer) this.lastBuzzerJson = savedBuzzer;
    } catch {}

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
          } else if (data.type === 'SESSIONS_UPDATE' && Array.isArray(data.sessions)) {
            this.handleSessionsArray(data.sessions);
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
        } else if (e.key === SYNC_KEYS.ACTIVE_SESSIONS && e.newValue) {
          try {
            const list = JSON.parse(e.newValue);
            if (Array.isArray(list)) this.handleSessionsArray(list);
          } catch {}
        }
      });
    }

    // 3. Connect to Realtime Cloud SSE Stream (ntfy.sh)
    this.initCloudSSE();

    // 4. Fetch initial states from Cloud & local server immediately
    this.fetchInitialState();

    // 5. Query online sessions from peers
    this.queryActiveSessions();

    // 6. Background fallback polling
    this.startPolling(800);
  }

  private loadSessionsFromLocal() {
    try {
      const raw = localStorage.getItem(SYNC_KEYS.ACTIVE_SESSIONS);
      if (raw) {
        const list = JSON.parse(raw);
        const now = Date.now();
        if (Array.isArray(list)) {
          list.forEach((sess: CloudTeamSession) => {
            if (sess && sess.teamId && (now - sess.lastHeartbeat <= 90000)) {
              this.activeSessionsMap.set(sess.teamId, sess);
            }
          });
        }
      }
    } catch {}
  }

  private saveSessionsToLocal() {
    try {
      const now = Date.now();
      const list: CloudTeamSession[] = [];
      this.activeSessionsMap.forEach((sess) => {
        if (now - sess.lastHeartbeat <= 90000) {
          list.push(sess);
        }
      });
      const json = JSON.stringify(list);
      if (json !== this.lastSessionsJson) {
        this.lastSessionsJson = json;
        localStorage.setItem(SYNC_KEYS.ACTIVE_SESSIONS, json);
        if (this.channel) {
          try {
            this.channel.postMessage({ type: 'SESSIONS_UPDATE', sessions: list });
          } catch {}
        }
      }
    } catch {}
  }

  private handleSessionsArray(list: CloudTeamSession[]) {
    const now = Date.now();
    let changed = false;
    list.forEach((sess) => {
      if (sess && sess.teamId && (now - sess.lastHeartbeat <= 90000)) {
        const existing = this.activeSessionsMap.get(sess.teamId);
        if (!existing || existing.lastHeartbeat < sess.lastHeartbeat) {
          this.activeSessionsMap.set(sess.teamId, sess);
          changed = true;
        }
      }
    });
    if (changed) {
      this.saveSessionsToLocal();
      this.notifySessionListeners();
    }
  }

  /**
   * Initialize Cloud Realtime Server-Sent Events (SSE)
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
        // Auto reconnect
      };
    } catch (err) {
      console.warn('Could not initialize Cloud SSE:', err);
    }
  }

  private handleIncomingPayload(payload: any) {
    if (!payload || typeof payload !== 'object') return;

    // Timer Sync
    if (payload.type === 'TIMER_UPDATE' && payload.timer) {
      let timer = payload.timer as StageTimerState;
      if (
        this.latestTimerState &&
        timer.updatedAt &&
        this.latestTimerState.updatedAt &&
        timer.updatedAt < this.latestTimerState.updatedAt
      ) {
        return; // Ignore older payload
      }

      if (timer.isRunning && timer.timeLeft > 0 && timer.updatedAt) {
        const elapsedSec = Math.floor((Date.now() - timer.updatedAt) / 1000);
        if (elapsedSec > 0 && elapsedSec < 180) {
          const nextTimeLeft = Math.max(0, timer.timeLeft - elapsedSec);
          timer = {
            ...timer,
            timeLeft: nextTimeLeft,
            isRunning: nextTimeLeft > 0,
          };
        }
      }

      this.latestTimerState = timer;
      const sig = `${timer.phase}_${timer.isRunning}_${timer.currentTeamId}_${timer.totalDuration}_${timer.updatedAt}_${timer.timeLeft}_${timer.buzzerManualUnlocked}`;
      if (sig !== this.lastTimerSignature) {
        this.lastTimerSignature = sig;
        this.notifyTimerListeners(timer);
        try {
          localStorage.setItem(SYNC_KEYS.STAGE_TIMER, JSON.stringify(timer));
        } catch {}
      }
    } else if (payload.type === 'TIMER_QUERY') {
      if (this.latestTimerState) {
        this.publishToCloud({
          type: 'TIMER_UPDATE',
          timer: this.latestTimerState,
        });
      }
    } 
    // Buzzer Sync
    else if (payload.type === 'BUZZER_UPDATE' && Array.isArray(payload.queue)) {
      let queue = payload.queue as BuzzerRecord[];
      const incomingWinner = queue[0];
      if (incomingWinner && incomingWinner.timestamp <= this.lastBuzzerResetAt) return;

      // Nhiều serverless instance có thể cùng nhận một lần bấm. Luôn giữ mốc
      // thời gian nhỏ nhất để mọi màn hình hội tụ về đúng một người thắng.
      let currentQueue: BuzzerRecord[] = [];
      try { currentQueue = JSON.parse(this.lastBuzzerJson || '[]'); } catch {}
      const currentWinner = currentQueue[0];
      if (incomingWinner && currentWinner && currentWinner.timestamp <= incomingWinner.timestamp) {
        queue = [currentWinner];
      } else if (incomingWinner) {
        queue = [incomingWinner];
      }
      const json = JSON.stringify(queue);
      if (json !== this.lastBuzzerJson) {
        this.lastBuzzerJson = json;
        this.notifyBuzzerListeners(queue);
        try {
          localStorage.setItem(SYNC_KEYS.BUZZER_QUEUE, json);
        } catch {}
      }
    } else if (payload.type === 'BUZZER_RESET') {
      this.lastBuzzerResetAt = Math.max(this.lastBuzzerResetAt, Number(payload.resetAt) || Date.now());
      if (Number(payload.consumedTeamId) && !this.buzzerBlockedTeamIds.includes(Number(payload.consumedTeamId))) {
        this.buzzerBlockedTeamIds.push(Number(payload.consumedTeamId));
      }
      this.lastBuzzerJson = '[]';
      this.notifyBuzzerListeners([]);
      try {
        localStorage.setItem(SYNC_KEYS.BUZZER_QUEUE, '[]');
      } catch {}
    }
    // Team Session Claims & Heartbeats (1 device per team enforcement across Cloud)
    else if (payload.type === 'TEAM_SESSION_CLAIM' && payload.session) {
      const sess = payload.session as CloudTeamSession;
      if (sess && sess.teamId) {
        const existing = this.activeSessionsMap.get(sess.teamId);
        const now = Date.now();
        const incomingLastSeen = Number(sess.lastHeartbeat) || Number(sess.loggedInAt) || 0;
        // Không hồi sinh claim cũ được ntfy phát lại từ lịch sử.
        if (now - incomingLastSeen > 90000) return;
        const existingKey = existing ? `${existing.loggedInAt}_${existing.sessionToken || existing.deviceId}` : '';
        const incomingKey = `${sess.loggedInAt}_${sess.sessionToken || sess.deviceId}`;
        // Cùng lúc có hai máy nhận được đăng nhập: mọi client cùng chọn claim
        // có khóa nhỏ hơn, thay vì máy nhận message sau ghi đè máy trước.
        const existingExpired = !existing || now - existing.lastHeartbeat > 90000;
        if (existingExpired || incomingKey < existingKey || existing?.deviceId === sess.deviceId) {
          this.activeSessionsMap.set(sess.teamId, {
            ...sess,
            lastHeartbeat: incomingLastSeen,
          });
        }
        this.saveSessionsToLocal();
        this.notifySessionListeners();
      }
    } else if (payload.type === 'TEAM_SESSION_HEARTBEAT') {
      const teamId = Number(payload.teamId);
      if (teamId) {
        const existing = this.activeSessionsMap.get(teamId);
        const now = Date.now();
        const heartbeatAt = Number(payload.lastHeartbeat) || 0;
        if (!heartbeatAt || now - heartbeatAt > 90000) return;
        if (existing) {
          const isOwner = existing.deviceId === payload.deviceId ||
            Boolean(existing.sessionToken && existing.sessionToken === payload.sessionToken);
          if (isOwner) existing.lastHeartbeat = Math.max(existing.lastHeartbeat, heartbeatAt);
        } else if (payload.session) {
          this.activeSessionsMap.set(teamId, {
            ...(payload.session as CloudTeamSession),
            lastHeartbeat: heartbeatAt,
          });
        } else {
          this.activeSessionsMap.set(teamId, {
            teamId,
            teamName: payload.teamName || `Đội ${teamId}`,
            deviceId: payload.deviceId || 'unknown',
            sessionToken: payload.sessionToken,
            loggedInAt: heartbeatAt,
            lastHeartbeat: heartbeatAt,
          });
        }
        this.saveSessionsToLocal();
        this.notifySessionListeners();
      }
    } else if (payload.type === 'TEAM_SESSION_RELEASE' && payload.teamId) {
      const teamId = Number(payload.teamId);
      const existing = this.activeSessionsMap.get(teamId);
      if (!existing || !payload.deviceId || existing.deviceId === payload.deviceId) {
        this.activeSessionsMap.delete(teamId);
      }
      this.saveSessionsToLocal();
      this.notifySessionListeners();
    } else if (payload.type === 'TEAM_SESSION_FORCE_UNLOCK') {
      if (payload.teamId === 'all') {
        this.activeSessionsMap.clear();
      } else if (payload.teamId) {
        this.activeSessionsMap.delete(Number(payload.teamId));
      }
      this.saveSessionsToLocal();
      this.notifySessionListeners();
    } else if (payload.type === 'TEAM_SESSION_QUERY') {
      // If this device currently has an active logged-in team, reply with heartbeat immediately
      if (typeof window !== 'undefined') {
        try {
          const authRaw = localStorage.getItem('hpu_debate_team_auth');
          if (authRaw) {
            const auth = JSON.parse(authRaw);
            if (auth && auth.id) {
              const deviceId = localStorage.getItem('hpu_debate_device_id') || 'dev_client';
              const sessionToken = sessionStorage.getItem('hpu_debate_session_token') || undefined;
              this.publishSessionHeartbeat(auth.id, deviceId, sessionToken, auth.name);
            }
          }
        } catch {}
      }
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

  public queryActiveSessions() {
    this.publishToCloud({ type: 'TEAM_SESSION_QUERY' });
  }

  public queryTimerState() {
    this.publishToCloud({ type: 'TIMER_QUERY' });
  }

  public publishSessionClaim(session: CloudTeamSession) {
    this.activeSessionsMap.set(session.teamId, session);
    this.saveSessionsToLocal();
    this.notifySessionListeners();
    this.publishToCloud({
      type: 'TEAM_SESSION_CLAIM',
      session,
    });
  }

  public publishSessionHeartbeat(teamId: number, deviceId: string, sessionToken?: string, teamName?: string) {
    const existing = this.activeSessionsMap.get(teamId);
    const now = Date.now();
    if (existing) {
      const isOwner = existing.deviceId === deviceId ||
        Boolean(existing.sessionToken && existing.sessionToken === sessionToken);
      if (isOwner) existing.lastHeartbeat = now;
    } else {
      this.activeSessionsMap.set(teamId, {
        teamId,
        teamName: teamName || `Đội ${teamId}`,
        deviceId,
        sessionToken,
        loggedInAt: now,
        lastHeartbeat: now,
      });
    }
    this.saveSessionsToLocal();
    this.notifySessionListeners();
    this.publishToCloud({
      type: 'TEAM_SESSION_HEARTBEAT',
      teamId,
      deviceId,
      sessionToken,
      teamName,
      lastHeartbeat: now,
    });
  }

  public publishSessionRelease(teamId: number, deviceId: string) {
    this.activeSessionsMap.delete(teamId);
    this.saveSessionsToLocal();
    this.notifySessionListeners();
    this.publishToCloud({
      type: 'TEAM_SESSION_RELEASE',
      teamId,
      deviceId,
    });
  }

  public publishSessionForceUnlock(teamId: number | 'all') {
    if (teamId === 'all') {
      this.activeSessionsMap.clear();
    } else {
      this.activeSessionsMap.delete(Number(teamId));
    }
    this.saveSessionsToLocal();
    this.notifySessionListeners();
    this.publishToCloud({
      type: 'TEAM_SESSION_FORCE_UNLOCK',
      teamId,
    });
  }

  public getActiveSessionsList(): CloudTeamSession[] {
    const now = Date.now();
    const active: CloudTeamSession[] = [];
    this.activeSessionsMap.forEach((sess, teamId) => {
      if (now - sess.lastHeartbeat <= 90000) {
        active.push(sess);
      } else {
        this.activeSessionsMap.delete(teamId);
      }
    });
    return active;
  }

  public subscribeSessions(listener: SessionListener): () => void {
    this.sessionListeners.add(listener);
    // Notify immediately with current active sessions
    listener(this.getActiveSessionsList());
    return () => {
      this.sessionListeners.delete(listener);
    };
  }

  private notifySessionListeners() {
    const active = this.getActiveSessionsList();
    this.sessionListeners.forEach((fn) => {
      try {
        fn(active);
      } catch {}
    });
  }

  /**
   * Fetch initial state from cloud history or server on startup
   */
  public async fetchInitialState(): Promise<void> {
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
   * Push timer state from MC / Stage screen
   */
  public async pushTimerState(state: StageTimerState): Promise<void> {
    this.latestTimerState = state;
    const json = JSON.stringify(state);
    const sig = `${state.phase}_${state.isRunning}_${state.currentTeamId}_${state.totalDuration}_${state.updatedAt}_${state.timeLeft}_${state.buzzerManualUnlocked}`;
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
          if (
            serverTimer.updatedAt &&
            this.latestTimerState?.updatedAt &&
            serverTimer.updatedAt < this.latestTimerState.updatedAt
          ) {
            return this.latestTimerState;
          }
          this.latestTimerState = serverTimer;
          this.notifyTimerListeners(serverTimer);
          return serverTimer;
        }
      }
    } catch {}
    return this.latestTimerState;
  }

  /**
   * Push buzzer queue updates to all devices
   */
  public async pushBuzzerQueue(queue: BuzzerRecord[]): Promise<void> {
    if (queue.length > 0) {
      let currentQueue: BuzzerRecord[] = [];
      try { currentQueue = JSON.parse(this.lastBuzzerJson || '[]'); } catch {}
      const currentWinner = currentQueue[0];
      const incomingWinner = queue[0];
      if (currentWinner && (
        currentWinner.timestamp < incomingWinner.timestamp ||
        (currentWinner.timestamp === incomingWinner.timestamp && currentWinner.teamId < incomingWinner.teamId)
      )) {
        queue = [currentWinner];
      } else {
        queue = [incomingWinner];
      }
    }
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
          this.buzzerBlockedTeamIds = Array.isArray(data.blockedTeamIds) ? data.blockedTeamIds : [];
          // Trên Vercel, /tmp không dùng chung giữa các instance. Một GET rỗng
          // không được phép xóa người thắng đã nhận qua realtime.
          if (queue.length === 0 && this.lastBuzzerJson && this.lastBuzzerJson !== '[]') {
            try { return JSON.parse(this.lastBuzzerJson) as BuzzerRecord[]; } catch {}
          }
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
          let finalQueue = queue;
          try { finalQueue = JSON.parse(this.lastBuzzerJson || '[]'); } catch {}
          this.notifyBuzzerListeners(finalQueue);
          return {
            success: true,
            queue: finalQueue,
            rank: finalQueue[0]?.teamId === teamId ? 1 : 0,
          };
        }
      } else {
        const data = await res.json().catch(() => null);
        const queue = Array.isArray(data?.queue) ? data.queue as BuzzerRecord[] : [];
        if (queue.length) {
          await this.pushBuzzerQueue(queue);
          this.notifyBuzzerListeners(queue);
        }
        return { success: false, queue, rank: 0, message: data?.error };
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
      const nextQueue = currentQueue.length > 0 ? currentQueue : [newRec];
      await this.pushBuzzerQueue(nextQueue);
      this.notifyBuzzerListeners(nextQueue);
      return { success: currentQueue.length === 0, queue: nextQueue, rank: currentQueue.length === 0 ? 1 : 0 };
    } catch {}

    return { success: false, queue: [], rank: 0 };
  }

  /**
   * Reset buzzer queue across all devices
   */
  public async resetBuzzerQueue(consumedTeamId?: number): Promise<void> {
    const resetAt = Date.now();
    this.lastBuzzerResetAt = resetAt;
    try {
      const res = await fetch('/api/buzzer/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumedTeamId }),
      });
      const data = await res.json().catch(() => null);
      if (Array.isArray(data?.blockedTeamIds)) this.buzzerBlockedTeamIds = data.blockedTeamIds;
    } catch {}

    // Publish reset event to Cloud SSE
    this.publishToCloud({
      type: 'BUZZER_RESET',
      queue: [],
      consumedTeamId,
      resetAt,
    });

    this.lastBuzzerJson = '[]';
    try { localStorage.setItem(SYNC_KEYS.BUZZER_QUEUE, '[]'); } catch {}
    if (this.channel) {
      try { this.channel.postMessage({ type: 'BUZZER_UPDATE', queue: [] }); } catch {}
    }
    this.notifyBuzzerListeners([]);
  }

  public isSessionOwner(teamId: number, deviceId: string, sessionToken?: string): boolean {
    const session = this.activeSessionsMap.get(teamId);
    if (!session) return true;
    return session.deviceId === deviceId || Boolean(sessionToken && session.sessionToken === sessionToken);
  }

  public getBuzzerBlockedTeamIds(): number[] {
    return [...this.buzzerBlockedTeamIds];
  }

  /**
   * Admin Reset All: reset timer to Team 1 (60s prepare), clear buzzer, and notify server & clients
   */
  public async pushAdminResetAll(adminPassword = 'admin123', resetSessions = false): Promise<boolean> {
    const defaultTimer: StageTimerState = {
      phase: 'prepare',
      timeLeft: 60,
      totalDuration: 60,
      isRunning: false,
      currentTeamId: 1,
      updatedAt: Date.now(),
      buzzerManualUnlocked: true,
    };
    this.latestTimerState = defaultTimer;
    this.notifyTimerListeners(defaultTimer);
    this.notifyBuzzerListeners([]);

    try {
      localStorage.setItem(SYNC_KEYS.STAGE_TIMER, JSON.stringify(defaultTimer));
      localStorage.setItem(SYNC_KEYS.BUZZER_QUEUE, '[]');
    } catch {}

    // Call server API
    try {
      await fetch('/api/admin/reset-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword, resetSessions }),
      });
    } catch {}

    // Broadcast on channel & Cloud SSE
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'TIMER_UPDATE', timer: defaultTimer });
        this.channel.postMessage({ type: 'BUZZER_RESET', queue: [] });
        this.channel.postMessage({ type: 'ADMIN_RESET_ALL' });
      } catch {}
    }

    this.publishToCloud({
      type: 'TIMER_UPDATE',
      timer: defaultTimer,
    });
    this.publishToCloud({
      type: 'BUZZER_RESET',
      queue: [],
    });

    return true;
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
            if (
              !serverTimer.updatedAt ||
              !this.latestTimerState?.updatedAt ||
              serverTimer.updatedAt >= this.latestTimerState.updatedAt
            ) {
              this.latestTimerState = serverTimer;
              const sig = `${serverTimer.phase}_${serverTimer.isRunning}_${serverTimer.currentTeamId}_${serverTimer.totalDuration}_${serverTimer.updatedAt}_${serverTimer.timeLeft}_${serverTimer.buzzerManualUnlocked}`;
              if (sig !== this.lastTimerSignature) {
                this.lastTimerSignature = sig;
                this.notifyTimerListeners(serverTimer);
                try {
                  localStorage.setItem(SYNC_KEYS.STAGE_TIMER, JSON.stringify(serverTimer));
                } catch {}
              }
            }
          }
        }
      } catch {}

      // Buzzer and sessions are event-driven. Polling them from Vercel /tmp
      // makes different serverless instances overwrite each other and flicker.
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


