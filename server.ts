import express from 'express';
import path from 'path';
import fs from 'fs';

interface TeamSession {
  sessionToken: string;
  deviceId: string;
  teamId: number;
  teamName: string;
  loggedInAt: number;
  lastHeartbeat: number;
  userAgent?: string;
}

// In-memory & file-backed active team device sessions
const activeSessions = new Map<number, TeamSession>();
const SESSIONS_FILE = process.env.VERCEL
  ? path.join('/tmp', 'data_team_sessions.json')
  : path.join(process.cwd(), 'data_team_sessions.json');

const TIMER_FILE = process.env.VERCEL
  ? path.join('/tmp', 'data_stage_timer.json')
  : path.join(process.cwd(), 'data_stage_timer.json');

const BUZZER_FILE = process.env.VERCEL
  ? path.join('/tmp', 'data_buzzer_queue.json')
  : path.join(process.cwd(), 'data_buzzer_queue.json');

// Session expiry: 90 seconds without heartbeat is considered disconnected
const SESSION_TIMEOUT_MS = 90000;

function loadSessionsFromDisk() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const list = JSON.parse(raw);
      const now = Date.now();
      if (Array.isArray(list)) {
        list.forEach((sess: TeamSession) => {
          if (sess.teamId && (now - sess.lastHeartbeat <= SESSION_TIMEOUT_MS)) {
            activeSessions.set(sess.teamId, sess);
          }
        });
      }
    }
  } catch (err) {
    console.error('Could not read session file:', err);
  }
}

function saveSessionsToDisk() {
  try {
    const list: TeamSession[] = [];
    const now = Date.now();
    activeSessions.forEach((sess) => {
      if (now - sess.lastHeartbeat <= SESSION_TIMEOUT_MS) {
        list.push(sess);
      }
    });
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Could not save session file:', err);
  }
}

// Initial load
loadSessionsFromDisk();

// Passwords for the 10 teams
const TEAM_PASSWORDS: Record<string, number> = {
  doi1: 1,
  doi2: 2,
  doi3: 3,
  doi4: 4,
  doi5: 5,
  doi6: 6,
  doi7: 7,
  doi8: 8,
  doi9: 9,
  doi10: 10,
};

const TEAM_NAMES: Record<number, string> = {
  1: 'Đội 1',
  2: 'Đội 2',
  3: 'Đội 3',
  4: 'Đội 4',
  5: 'Đội 5',
  6: 'Đội 6',
  7: 'Đội 7',
  8: 'Đội 8',
  9: 'Đội 9',
  10: 'Đội 10',
};

// Stage Timer & Buzzer interfaces
interface StageTimerState {
  phase: 'prepare' | 'present' | 'rebuttal';
  timeLeft: number;
  totalDuration: number;
  isRunning: boolean;
  currentTeamId: number;
  updatedAt: number;
  buzzerManualUnlocked?: boolean;
}

interface BuzzerRecord {
  teamId: number;
  teamName: string;
  timestamp: number;
  diffMs: number;
}

let currentStageTimer: StageTimerState = {
  phase: 'prepare',
  timeLeft: 60,
  totalDuration: 60,
  isRunning: false,
  currentTeamId: 1,
  updatedAt: Date.now(),
  buzzerManualUnlocked: true,
};

let buzzerQueue: BuzzerRecord[] = [];
let buzzerBlockedTeamIds: number[] = [];

function loadTimerFromDisk() {
  try {
    if (fs.existsSync(TIMER_FILE)) {
      const raw = fs.readFileSync(TIMER_FILE, 'utf-8');
      const saved = JSON.parse(raw);
      if (saved && saved.phase) {
        currentStageTimer = saved;
      }
    }
  } catch (err) {
    console.error('Could not load timer file:', err);
  }
}

function saveTimerToDisk() {
  try {
    fs.writeFileSync(TIMER_FILE, JSON.stringify(currentStageTimer, null, 2), 'utf-8');
  } catch (err) {
    console.error('Could not save timer file:', err);
  }
}

function loadBuzzerFromDisk() {
  try {
    if (fs.existsSync(BUZZER_FILE)) {
      const raw = fs.readFileSync(BUZZER_FILE, 'utf-8');
      const saved = JSON.parse(raw);
      if (Array.isArray(saved)) {
        buzzerQueue = saved;
        buzzerBlockedTeamIds = [];
      } else if (saved && Array.isArray(saved.queue)) {
        buzzerQueue = saved.queue;
        buzzerBlockedTeamIds = Array.isArray(saved.blockedTeamIds) ? saved.blockedTeamIds : [];
      }
    }
  } catch (err) {
    console.error('Could not load buzzer file:', err);
  }
}

function saveBuzzerToDisk() {
  try {
    fs.writeFileSync(BUZZER_FILE, JSON.stringify({ queue: buzzerQueue, blockedTeamIds: buzzerBlockedTeamIds }, null, 2), 'utf-8');
  } catch (err) {
    console.error('Could not save buzzer file:', err);
  }
}

// Initial load for timer and buzzer
loadTimerFromDisk();
loadBuzzerFromDisk();

export const app = express();

app.use(express.json());

// CORS headers for multi-device cross-origin & local network access
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const apiRouter = express.Router();

// Health check
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Stage Timer Sync Endpoints (Real-time synchronization across all devices & tabs)
apiRouter.get('/timer', (req, res) => {
  loadTimerFromDisk();
  let effectiveTimeLeft = currentStageTimer.timeLeft;
  if (currentStageTimer.isRunning && currentStageTimer.timeLeft > 0) {
    const elapsedSec = Math.floor((Date.now() - currentStageTimer.updatedAt) / 1000);
    effectiveTimeLeft = Math.max(0, currentStageTimer.timeLeft - elapsedSec);
  }
  res.json({
    success: true,
    timer: {
      ...currentStageTimer,
      timeLeft: effectiveTimeLeft,
      isRunning: currentStageTimer.isRunning && effectiveTimeLeft > 0,
    },
    serverTime: Date.now(),
  });
});

apiRouter.post('/timer', (req, res) => {
  loadTimerFromDisk();
  const { phase, timeLeft, totalDuration, isRunning, currentTeamId, buzzerManualUnlocked } = req.body;
  const now = Date.now();
  const isNewPresentingTurn = typeof currentTeamId === 'number' && currentTeamId !== currentStageTimer.currentTeamId;
  currentStageTimer = {
    phase: phase || currentStageTimer.phase,
    timeLeft: typeof timeLeft === 'number' ? timeLeft : currentStageTimer.timeLeft,
    totalDuration: typeof totalDuration === 'number' ? totalDuration : currentStageTimer.totalDuration,
    isRunning: typeof isRunning === 'boolean' ? isRunning : currentStageTimer.isRunning,
    currentTeamId: typeof currentTeamId === 'number' ? currentTeamId : currentStageTimer.currentTeamId,
    buzzerManualUnlocked: typeof buzzerManualUnlocked === 'boolean' ? buzzerManualUnlocked : currentStageTimer.buzzerManualUnlocked,
    updatedAt: now,
  };
  saveTimerToDisk();
  if (isNewPresentingTurn) {
    buzzerQueue = [];
    buzzerBlockedTeamIds = [];
    saveBuzzerToDisk();
  }
  res.json({
    success: true,
    timer: currentStageTimer,
    serverTime: now,
  });
});

// Buzzer Endpoints (Multi-device queue & ranking)
apiRouter.get('/buzzer', (req, res) => {
  loadBuzzerFromDisk();
  res.json({
    success: true,
    queue: buzzerQueue,
    blockedTeamIds: buzzerBlockedTeamIds,
    serverTime: Date.now(),
  });
});

apiRouter.post('/buzzer/buzz', (req, res) => {
  loadBuzzerFromDisk();
  const { teamId, teamName } = req.body;
  if (!teamId) {
    return res.status(400).json({ success: false, error: 'Thiếu thông tin đội' });
  }
  const id = Number(teamId);
  const now = Date.now();

  if (buzzerBlockedTeamIds.includes(id)) {
    return res.status(409).json({
      success: false,
      blocked: true,
      error: 'Đội đã phản biện trong lượt này',
      queue: buzzerQueue,
      blockedTeamIds: buzzerBlockedTeamIds,
    });
  }

  // Chỉ chốt người bấm nhanh nhất. Mọi lần bấm sau đó đều nhận cùng kết quả.
  if (buzzerQueue.length > 0) {
    return res.status(409).json({
      success: false,
      locked: true,
      winner: buzzerQueue[0],
      queue: buzzerQueue,
      blockedTeamIds: buzzerBlockedTeamIds,
    });
  }

  const newRecord: BuzzerRecord = {
    teamId: id,
    teamName: teamName || TEAM_NAMES[id] || `Đội ${id}`,
    timestamp: now,
    diffMs: 0,
  };

  buzzerQueue.push(newRecord);
  saveBuzzerToDisk();

  res.json({
    success: true,
    rank: buzzerQueue.length,
    record: newRecord,
    queue: buzzerQueue,
    blockedTeamIds: buzzerBlockedTeamIds,
  });
});

apiRouter.post('/buzzer/reset', (req, res) => {
  loadBuzzerFromDisk();
  const consumedTeamId = Number(req.body?.consumedTeamId);
  // Chỉ khóa đội thực sự thắng chuông, không tin một teamId tùy ý từ client.
  if (consumedTeamId && buzzerQueue[0]?.teamId === consumedTeamId && !buzzerBlockedTeamIds.includes(consumedTeamId)) {
    buzzerBlockedTeamIds.push(consumedTeamId);
  }
  buzzerQueue = [];
  saveBuzzerToDisk();
  res.json({ success: true, queue: [], blockedTeamIds: buzzerBlockedTeamIds });
});

// Get active sessions list (which teams are currently logged in on a device)
apiRouter.get('/teams/sessions', (req, res) => {
  const now = Date.now();
  const activeList: Array<{ teamId: number; teamName: string; loggedInAt: number; lastHeartbeat: number }> = [];

  activeSessions.forEach((session, teamId) => {
    if (now - session.lastHeartbeat <= SESSION_TIMEOUT_MS) {
      activeList.push({
        teamId: session.teamId,
        teamName: session.teamName,
        loggedInAt: session.loggedInAt,
        lastHeartbeat: session.lastHeartbeat,
      });
    } else {
      // Expired session cleanup
      activeSessions.delete(teamId);
    }
  });

  res.json({
    success: true,
    sessions: activeList,
    activeTeamIds: activeList.map((s) => s.teamId),
  });
});

// Team login with strict 1-device restriction
apiRouter.post('/teams/login', (req, res) => {
  const { password, deviceId, sessionToken, userAgent } = req.body;
  if (!password || !deviceId) {
    return res.status(400).json({
      success: false,
      error: 'Vui lòng cung cấp mật khẩu và thông tin thiết bị.',
    });
  }

  const cleanPwd = String(password).trim().toLowerCase();
  const teamId = TEAM_PASSWORDS[cleanPwd];

  if (!teamId) {
    return res.status(401).json({
      success: false,
      error: 'Mật khẩu không chính xác! (Mật khẩu đúng: doi1 đến doi10)',
    });
  }

  const now = Date.now();
  const existingSession = activeSessions.get(teamId);

  // Check if team is currently active on a DIFFERENT session or DIFFERENT device
  if (existingSession && now - existingSession.lastHeartbeat <= SESSION_TIMEOUT_MS) {
    const isSameSession =
      (sessionToken && existingSession.sessionToken === sessionToken) ||
      (!sessionToken && existingSession.deviceId === deviceId);

    if (!isSameSession) {
      const lastActiveSec = Math.max(1, Math.round((now - existingSession.lastHeartbeat) / 1000));
      const loginTimeStr = new Date(existingSession.loggedInAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      return res.status(409).json({
        success: false,
        locked: true,
        teamId,
        teamName: TEAM_NAMES[teamId],
        error: `Tài khoản ${TEAM_NAMES[teamId]} ĐÃ CÓ NGƯỜI ĐĂNG NHẬP!`,
        details: `Tài khoản này hiện đang được sử dụng trên một thiết bị/trình duyệt khác (đăng nhập lúc ${loginTimeStr}, hoạt động cách đây ${lastActiveSec}s). Quy định: Mỗi đội chỉ được phép đăng nhập trên 1 thiết bị duy nhất. Vui lòng đăng xuất ở thiết bị kia trước, hoặc nhờ Ban Tổ Chức mở khóa.`,
        sessionInfo: {
          teamId,
          teamName: TEAM_NAMES[teamId],
          loggedInAt: existingSession.loggedInAt,
          lastHeartbeat: existingSession.lastHeartbeat,
        },
      });
    }
  }

  // Generate or retain sessionToken
  const finalSessionToken = sessionToken || `tok_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36)}`;

  // Grant login / refresh session for this device
  activeSessions.set(teamId, {
    sessionToken: finalSessionToken,
    deviceId,
    teamId,
    teamName: TEAM_NAMES[teamId],
    loggedInAt: existingSession?.sessionToken === finalSessionToken ? existingSession.loggedInAt : now,
    lastHeartbeat: now,
    userAgent,
  });
  saveSessionsToDisk();

  res.json({
    success: true,
    teamAccount: {
      id: teamId,
      name: TEAM_NAMES[teamId],
      code: cleanPwd,
    },
    sessionToken: finalSessionToken,
    message: `Đăng nhập thành công thiết bị cho ${TEAM_NAMES[teamId]}!`,
  });
});

// Heartbeat / validation to keep session alive and verify single device
apiRouter.post('/teams/heartbeat', (req, res) => {
  const { teamId, deviceId, sessionToken } = req.body;
  if (!teamId || !deviceId) {
    return res.status(400).json({ valid: false, error: 'Thiếu thông tin' });
  }

  const session = activeSessions.get(Number(teamId));
  if (!session) {
    return res.json({
      valid: false,
      reason: 'Phiên đăng nhập không tồn tại hoặc đã hết hạn.',
    });
  }

  const isOwner =
    (sessionToken && session.sessionToken === sessionToken) ||
    (!sessionToken && session.deviceId === deviceId);

  if (!isOwner) {
    return res.json({
      valid: false,
      reason: 'Tài khoản của đội đã được đăng nhập từ một thiết bị khác.',
    });
  }

  session.lastHeartbeat = Date.now();
  saveSessionsToDisk();
  res.json({ valid: true, teamId: Number(teamId) });
});

// Team logout - immediately frees the session for other devices
apiRouter.post('/teams/logout', (req, res) => {
  const { teamId, deviceId, sessionToken } = req.body;
  if (teamId) {
    const session = activeSessions.get(Number(teamId));
    if (session) {
      if (!sessionToken || session.sessionToken === sessionToken || session.deviceId === deviceId) {
        activeSessions.delete(Number(teamId));
        saveSessionsToDisk();
      }
    }
  }
  res.json({ success: true });
});

// Admin force unlock team session
apiRouter.post('/teams/force-unlock', (req, res) => {
  const { teamId, adminPassword } = req.body;
  if (adminPassword !== 'admin123') {
    return res.status(403).json({ success: false, error: 'Sai mật khẩu quản trị viên' });
  }

  if (teamId === 'all') {
    activeSessions.clear();
    saveSessionsToDisk();
    return res.json({ success: true, message: 'Đã mở khóa toàn bộ thiết bị 10 đội.' });
  }

  const id = Number(teamId);
  activeSessions.delete(id);
  saveSessionsToDisk();
  res.json({
    success: true,
    message: `Đã mở khóa thiết bị cho ${TEAM_NAMES[id] || 'Đội ' + id}!`,
  });
});

// Admin reset all to factory default
apiRouter.post('/admin/reset-all', (req, res) => {
  const { adminPassword, resetSessions } = req.body;
  if (adminPassword !== 'admin123') {
    return res.status(403).json({ success: false, error: 'Sai mật khẩu quản trị viên' });
  }

  // 1. Reset timer to Team 1, prepare phase, 60s, paused, keep buzzer always unlocked
  currentStageTimer = {
    phase: 'prepare',
    timeLeft: 60,
    totalDuration: 60,
    isRunning: false,
    currentTeamId: 1,
    updatedAt: Date.now(),
    buzzerManualUnlocked: true,
  };
  saveTimerToDisk();

  // 2. Clear buzzer queue
  buzzerQueue = [];
  buzzerBlockedTeamIds = [];
  saveBuzzerToDisk();

  // 3. Clear sessions if requested
  if (resetSessions) {
    activeSessions.clear();
    saveSessionsToDisk();
  }

  res.json({
    success: true,
    message: 'Đã thiết lập lại toàn bộ về trạng thái ban đầu (Đội 1)!',
    timer: currentStageTimer,
    queue: buzzerQueue,
  });
});

// Mount router under BOTH /api and root (to handle all Vercel rewrite styles seamlessly)
app.use('/api', apiRouter);
app.use('/', apiRouter);
