import { TeamAccount } from '../types';
import { syncService, CloudTeamSession } from './syncService';

const DEVICE_ID_KEY = 'hpu_debate_device_id';
const SESSION_TOKEN_KEY = 'hpu_debate_session_token';
const LOCAL_ACTIVE_TEAMS_KEY = 'hpu_debate_local_active_teams';
const SESSION_CHANNEL_KEY = 'hpu_debate_sessions_channel';

// Cross-tab broadcast channel for local session synchronization
let sessionChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    sessionChannel = new BroadcastChannel(SESSION_CHANNEL_KEY);
    sessionChannel.onmessage = (e) => {
      if (e.data?.type === 'SYNC_SESSIONS' && e.data?.map) {
        try {
          localStorage.setItem(LOCAL_ACTIVE_TEAMS_KEY, JSON.stringify(e.data.map));
        } catch {}
      }
    };
  } catch {}
}

// Generates or retrieves a unique persistent identifier for this device/browser
export function getOrCreateDeviceId(): string {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return 'dev_fallback_' + Date.now();
  }
}

// Generates or retrieves a unique token per browser window/tab/session
export function getOrCreateSessionToken(): string {
  try {
    let token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (!token) {
      token = 'tok_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return 'tok_fallback_' + Date.now();
  }
}

export interface LoginResult {
  success: boolean;
  account?: TeamAccount;
  locked?: boolean;
  error?: string;
  details?: string;
  sessionInfo?: {
    teamId: number;
    teamName: string;
    loggedInAt: number;
    lastHeartbeat: number;
  };
}

export interface ActiveSessionInfo {
  teamId: number;
  teamName: string;
  loggedInAt: number;
  lastHeartbeat?: number;
  deviceId?: string;
  userAgent?: string;
}

export const teamAuthService = {
  getDeviceId(): string {
    return getOrCreateDeviceId();
  },

  getSessionToken(): string {
    return getOrCreateSessionToken();
  },

  async getActiveSessions(): Promise<{ activeTeamIds: number[]; sessions: ActiveSessionInfo[] }> {
    const cloudSessions = syncService.getActiveSessionsList();
    const activeMap = new Map<number, ActiveSessionInfo>();

    // 1. Gather sessions from Cloud Realtime SSE
    cloudSessions.forEach((cs) => {
      activeMap.set(cs.teamId, {
        teamId: cs.teamId,
        teamName: cs.teamName,
        loggedInAt: cs.loggedInAt,
        lastHeartbeat: cs.lastHeartbeat,
        deviceId: cs.deviceId,
        userAgent: cs.userAgent,
      });
    });

    // 2. Gather from local storage fallback
    try {
      const raw = localStorage.getItem(LOCAL_ACTIVE_TEAMS_KEY);
      if (raw) {
        const map = JSON.parse(raw);
        const now = Date.now();
        for (const [idStr, sess] of Object.entries(map as Record<string, { deviceId: string; sessionToken?: string; time: number }>)) {
          const tId = Number(idStr);
          if (now - sess.time < 90000 && !activeMap.has(tId)) {
            activeMap.set(tId, {
              teamId: tId,
              teamName: `Đội ${tId}`,
              loggedInAt: sess.time,
              lastHeartbeat: sess.time,
              deviceId: sess.deviceId,
            });
          }
        }
      }
    } catch {}

    // 3. Query server API
    try {
      const res = await fetch('/api/teams/sessions');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sessions)) {
          data.sessions.forEach((s: ActiveSessionInfo) => {
            if (!activeMap.has(s.teamId)) {
              activeMap.set(s.teamId, s);
            }
          });
        }
      }
    } catch {}

    const sessions = Array.from(activeMap.values());
    const activeTeamIds = sessions.map((s) => s.teamId);

    return { activeTeamIds, sessions };
  },

  async login(password: string): Promise<LoginResult> {
    const deviceId = this.getDeviceId();
    const sessionToken = this.getSessionToken();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'browser';

    const clean = password.trim().toLowerCase();
    const match = clean.match(/^doi(\d+)$/);
    if (!match) {
      return { success: false, error: 'Mật khẩu không đúng định dạng (doi1 đến doi10)!' };
    }
    const teamId = parseInt(match[1], 10);
    if (teamId < 1 || teamId > 10) {
      return { success: false, error: 'Chỉ hỗ trợ Đội 1 đến Đội 10 (doi1 đến doi10)!' };
    }

    const teamName = `Đội ${teamId}`;

    // Ask live devices to announce themselves before deciding ownership.
    syncService.queryActiveSessions();
    await new Promise((resolve) => setTimeout(resolve, 650));

    // --- STEP 1: Strict Check against Realtime Cloud & Local Sessions ---
    // If another device already claimed this team in the last 90s, BLOCK IMMEDIATELY
    const cloudSessions = syncService.getActiveSessionsList();
    const existingCloud = cloudSessions.find((s) => s.teamId === teamId);
    const now = Date.now();

    if (existingCloud && now - existingCloud.lastHeartbeat <= 90000) {
      const isSameDevice =
        (sessionToken && existingCloud.sessionToken === sessionToken) ||
        existingCloud.deviceId === deviceId;

      if (!isSameDevice) {
        const timeAgo = Math.max(1, Math.round((now - existingCloud.lastHeartbeat) / 1000));
        return {
          success: false,
          locked: true,
          error: `Tài khoản ${teamName} ĐÃ CÓ NGƯỜI ĐĂNG NHẬP!`,
          details: `Tài khoản ${teamName} hiện đang được sử dụng trên một thiết bị khác (hoạt động cách đây ${timeAgo} giây). Quy định: Mỗi đội chỉ được phép đăng nhập trên 1 thiết bị duy nhất. Vui lòng đăng xuất ở thiết bị kia trước, hoặc nhờ Ban Tổ Chức mở khóa.`,
          sessionInfo: {
            teamId,
            teamName,
            loggedInAt: existingCloud.loggedInAt,
            lastHeartbeat: existingCloud.lastHeartbeat,
          },
        };
      }
    }

    // Check Local Storage
    try {
      const raw = localStorage.getItem(LOCAL_ACTIVE_TEAMS_KEY);
      if (raw) {
        const map = JSON.parse(raw);
        const existingLocal = map[teamId];
        if (existingLocal && now - existingLocal.time < 90000) {
          const isSame =
            (sessionToken && existingLocal.sessionToken === sessionToken) ||
            existingLocal.deviceId === deviceId;

          if (!isSame) {
            return {
              success: false,
              locked: true,
              error: `Tài khoản ${teamName} ĐÃ CÓ NGƯỜI ĐĂNG NHẬP!`,
              details: `Tài khoản ${teamName} hiện đang hoạt động trên một thiết bị khác. Mỗi đội chỉ được phép đăng nhập trên 1 thiết bị duy nhất.`,
            };
          }
        }
      }
    } catch {}

    // --- STEP 2: Attempt Server API Login ---
    try {
      const res = await fetch('/api/teams/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, deviceId, sessionToken, userAgent }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {}

      if (data && typeof data === 'object') {
        if (res.ok && data.success) {
          if (data.sessionToken) {
            try {
              sessionStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
            } catch {}
          }

          // Track locally & broadcast to Cloud Realtime SSE
          this.markLocalSession(teamId, deviceId, sessionToken);
          syncService.publishSessionClaim({
            teamId,
            teamName,
            deviceId,
            sessionToken,
            loggedInAt: now,
            lastHeartbeat: now,
            userAgent,
          });

          return {
            success: true,
            account: data.teamAccount || { id: teamId, name: teamName, code: `doi${teamId}` },
          };
        }

        // Server actively reported failure (e.g. 409 Conflict)
        return {
          success: false,
          locked: Boolean(data.locked),
          error: data.error || 'Đăng nhập không thành công.',
          details: data.details,
          sessionInfo: data.sessionInfo,
        };
      }
    } catch {
      return {
        success: false,
        error: 'Không thể kết nối máy chủ để xác nhận thiết bị. Vui lòng kiểm tra mạng và thử lại.',
      };
    }

    return {
      success: false,
      error: 'Máy chủ không trả về kết quả đăng nhập hợp lệ. Vui lòng thử lại.',
    };
  },

  async logout(teamId: number): Promise<void> {
    const deviceId = this.getDeviceId();
    const sessionToken = this.getSessionToken();
    const ownsSession = syncService.isSessionOwner(teamId, deviceId, sessionToken);
    this.clearLocalSession(teamId);
    // Broadcast release over Cloud Realtime SSE
    if (!ownsSession) return;
    try {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    } catch {}
    syncService.publishSessionRelease(teamId, deviceId);

    try {
      await fetch('/api/teams/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, deviceId, sessionToken }),
      });
    } catch {}
  },

  async sendHeartbeat(teamId: number): Promise<boolean> {
    const deviceId = this.getDeviceId();
    const sessionToken = this.getSessionToken();

    // Broadcast heartbeat over Cloud Realtime SSE
    syncService.publishSessionHeartbeat(teamId, deviceId, sessionToken, `Đội ${teamId}`);
    this.markLocalSession(teamId, deviceId, sessionToken);

    try {
      const res = await fetch('/api/teams/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, deviceId, sessionToken }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        return true;
      }
      return false;
    } catch {
      return true;
    }
  },

  async forceUnlock(teamId: number | 'all', adminPassword = 'admin123'): Promise<{ success: boolean; message: string }> {
    // 1. Broadcast unlock over Cloud Realtime SSE
    syncService.publishSessionForceUnlock(teamId);

    // 2. Clear local storage
    if (teamId === 'all') {
      localStorage.removeItem(LOCAL_ACTIVE_TEAMS_KEY);
    } else {
      this.clearLocalSession(teamId);
    }

    // 3. Notify server
    try {
      const res = await fetch('/api/teams/force-unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, adminPassword }),
      });
      const data = await res.json();
      return {
        success: Boolean(data.success),
        message: data.message || (data.success ? 'Đã mở khóa thành công!' : data.error || 'Lỗi mở khóa'),
      };
    } catch {
      return { success: true, message: 'Đã mở khóa thiết bị thành công qua Cloud Realtime!' };
    }
  },

  // Helper local storage trackers
  markLocalSession(teamId: number, deviceId: string, sessionToken?: string) {
    try {
      const raw = localStorage.getItem(LOCAL_ACTIVE_TEAMS_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[teamId] = { deviceId, sessionToken, time: Date.now() };
      localStorage.setItem(LOCAL_ACTIVE_TEAMS_KEY, JSON.stringify(map));
      if (sessionChannel) {
        try {
          sessionChannel.postMessage({ type: 'SYNC_SESSIONS', map });
        } catch {}
      }
    } catch {}
  },

  clearLocalSession(teamId: number) {
    try {
      const raw = localStorage.getItem(LOCAL_ACTIVE_TEAMS_KEY);
      if (raw) {
        const map = JSON.parse(raw);
        delete map[teamId];
        localStorage.setItem(LOCAL_ACTIVE_TEAMS_KEY, JSON.stringify(map));
        if (sessionChannel) {
          try {
            sessionChannel.postMessage({ type: 'SYNC_SESSIONS', map });
          } catch {}
        }
      }
    } catch {}
  },
};
