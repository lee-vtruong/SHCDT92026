import { TeamAccount } from '../types';

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
}

export const teamAuthService = {
  getDeviceId(): string {
    return getOrCreateDeviceId();
  },

  getSessionToken(): string {
    return getOrCreateSessionToken();
  },

  async getActiveSessions(): Promise<{ activeTeamIds: number[]; sessions: ActiveSessionInfo[] }> {
    try {
      const res = await fetch('/api/teams/sessions');
      if (res.ok) {
        const data = await res.json();
        return {
          activeTeamIds: data.activeTeamIds || [],
          sessions: data.sessions || [],
        };
      }
    } catch {
      // Offline fallback using localStorage
      try {
        const raw = localStorage.getItem(LOCAL_ACTIVE_TEAMS_KEY);
        if (raw) {
          const map = JSON.parse(raw);
          const activeIds: number[] = [];
          const now = Date.now();
          for (const [idStr, sess] of Object.entries(map as Record<string, { deviceId: string; sessionToken?: string; time: number }>)) {
            if (now - sess.time < 90000) {
              activeIds.push(Number(idStr));
            }
          }
          return { activeTeamIds: activeIds, sessions: [] };
        }
      } catch {}
    }
    return { activeTeamIds: [], sessions: [] };
  },

  async login(password: string): Promise<LoginResult> {
    const deviceId = this.getDeviceId();
    const sessionToken = this.getSessionToken();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'browser';

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
          // Track locally
          this.markLocalSession(data.teamAccount.id, deviceId, sessionToken);
          return {
            success: true,
            account: data.teamAccount,
          };
        }

        // Server actively reported failure (e.g. 409 Conflict: another device logged in)
        return {
          success: false,
          locked: Boolean(data.locked),
          error: data.error || 'Đăng nhập không thành công.',
          details: data.details,
          sessionInfo: data.sessionInfo,
        };
      }
    } catch {
      // Network failure, only then fallback to local
    }

    // Local fallback for offline mode
    return this.localLoginFallback(password, deviceId, sessionToken);
  },

  async logout(teamId: number): Promise<void> {
    const deviceId = this.getDeviceId();
    const sessionToken = this.getSessionToken();
    this.clearLocalSession(teamId);
    try {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    } catch {}

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

    try {
      const res = await fetch('/api/teams/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, deviceId, sessionToken }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        this.markLocalSession(teamId, deviceId, sessionToken);
        return true;
      }
      return false;
    } catch {
      this.markLocalSession(teamId, deviceId, sessionToken);
      return true;
    }
  },

  async forceUnlock(teamId: number | 'all', adminPassword = 'admin123'): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/teams/force-unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, adminPassword }),
      });
      const data = await res.json();
      if (teamId === 'all') {
        localStorage.removeItem(LOCAL_ACTIVE_TEAMS_KEY);
      } else {
        this.clearLocalSession(teamId);
      }
      return {
        success: Boolean(data.success),
        message: data.message || (data.success ? 'Đã mở khóa thành công!' : data.error || 'Lỗi mở khóa'),
      };
    } catch {
      if (teamId === 'all') {
        localStorage.removeItem(LOCAL_ACTIVE_TEAMS_KEY);
      } else {
        this.clearLocalSession(teamId);
      }
      return { success: true, message: 'Đã mở khóa thiết bị thành công (Offline mode)!' };
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

  localLoginFallback(password: string, deviceId: string, sessionToken: string): LoginResult {
    const clean = password.trim().toLowerCase();
    const match = clean.match(/^doi(\d+)$/);
    if (!match) {
      return { success: false, error: 'Mật khẩu không đúng (doi1 đến doi10)!' };
    }
    const teamId = parseInt(match[1], 10);
    if (teamId < 1 || teamId > 10) {
      return { success: false, error: 'Mật khẩu không đúng (doi1 đến doi10)!' };
    }

    // Check local storage active session
    try {
      const raw = localStorage.getItem(LOCAL_ACTIVE_TEAMS_KEY);
      if (raw) {
        const map = JSON.parse(raw);
        const existing = map[teamId];
        const now = Date.now();
        if (existing && now - existing.time < 90000) {
          const isSame =
            (sessionToken && existing.sessionToken === sessionToken) ||
            (!sessionToken && existing.deviceId === deviceId);

          if (!isSame) {
            return {
              success: false,
              locked: true,
              error: `Tài khoản Đội ${teamId} ĐÃ CÓ NGƯỜI ĐĂNG NHẬP!`,
              details: `Đội ${teamId} hiện đang hoạt động trên một thiết bị khác. Mỗi đội chỉ được phép đăng nhập trên 1 thiết bị duy nhất.`,
            };
          }
        }
      }
    } catch {}

    this.markLocalSession(teamId, deviceId, sessionToken);
    return {
      success: true,
      account: {
        id: teamId,
        name: `Đội ${teamId}`,
        code: `doi${teamId}`,
      },
    };
  },
};
