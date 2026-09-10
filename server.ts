import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

interface TeamSession {
  deviceId: string;
  teamId: number;
  teamName: string;
  loggedInAt: number;
  lastHeartbeat: number;
  userAgent?: string;
}

// In-memory active team device sessions
const activeSessions = new Map<number, TeamSession>();

// Heartbeat expiry: 25 seconds of silence considered disconnected
const SESSION_TIMEOUT_MS = 25000;

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Get active sessions list (which teams are currently logged in on a device)
  app.get('/api/teams/sessions', (req, res) => {
    const now = Date.now();
    const activeList: Array<{ teamId: number; teamName: string; loggedInAt: number }> = [];

    activeSessions.forEach((session, teamId) => {
      if (now - session.lastHeartbeat <= SESSION_TIMEOUT_MS) {
        activeList.push({
          teamId: session.teamId,
          teamName: session.teamName,
          loggedInAt: session.loggedInAt,
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

  // Team login with 1-device restriction
  app.post('/api/teams/login', (req, res) => {
    const { password, deviceId, userAgent } = req.body;
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

    // Check if team is currently active on a DIFFERENT device
    if (existingSession && now - existingSession.lastHeartbeat <= SESSION_TIMEOUT_MS) {
      if (existingSession.deviceId !== deviceId) {
        return res.status(409).json({
          success: false,
          locked: true,
          teamId,
          teamName: TEAM_NAMES[teamId],
          error: `Đội ${TEAM_NAMES[teamId]} đã được đăng nhập trên một thiết bị khác!`,
          details: 'Mỗi đội chỉ được phép đăng nhập trên 1 thiết bị duy nhất. Vui lòng đăng xuất ở thiết bị cũ trước hoặc liên hệ BTC mở khóa.',
        });
      }
    }

    // Grant login / refresh session for this device
    activeSessions.set(teamId, {
      deviceId,
      teamId,
      teamName: TEAM_NAMES[teamId],
      loggedInAt: existingSession?.deviceId === deviceId ? existingSession.loggedInAt : now,
      lastHeartbeat: now,
      userAgent,
    });

    res.json({
      success: true,
      teamAccount: {
        id: teamId,
        name: TEAM_NAMES[teamId],
        code: cleanPwd,
      },
      message: `Đăng nhập thành công thiết bị cho ${TEAM_NAMES[teamId]}!`,
    });
  });

  // Heartbeat to keep session alive
  app.post('/api/teams/heartbeat', (req, res) => {
    const { teamId, deviceId } = req.body;
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

    if (session.deviceId !== deviceId) {
      return res.json({
        valid: false,
        reason: 'Đã có thiết bị khác đăng nhập tài khoản đội này.',
      });
    }

    session.lastHeartbeat = Date.now();
    res.json({ valid: true });
  });

  // Team logout
  app.post('/api/teams/logout', (req, res) => {
    const { teamId, deviceId } = req.body;
    if (teamId) {
      const session = activeSessions.get(Number(teamId));
      if (session && (!deviceId || session.deviceId === deviceId)) {
        activeSessions.delete(Number(teamId));
      }
    }
    res.json({ success: true });
  });

  // Admin force unlock team session
  app.post('/api/teams/force-unlock', (req, res) => {
    const { teamId, adminPassword } = req.body;
    if (adminPassword !== 'admin123') {
      return res.status(403).json({ success: false, error: 'Sai mật khẩu quản trị viên' });
    }

    if (teamId === 'all') {
      activeSessions.clear();
      return res.json({ success: true, message: 'Đã mở khóa toàn bộ thiết bị 10 đội.' });
    }

    const id = Number(teamId);
    activeSessions.delete(id);
    res.json({
      success: true,
      message: `Đã mở khóa thiết bị cho ${TEAM_NAMES[id] || 'Đội ' + id}!`,
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
