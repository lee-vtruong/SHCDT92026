import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Volume2, 
  Flame, 
  Users, 
  KeyRound, 
  Sparkles,
  RotateCcw,
  Smartphone,
  Lock,
  Unlock,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { Team, TeamAccount, BuzzerRecord, StageTimerState, RebuttalRecord } from '../types';
import { TEAM_ACCOUNTS, canTeamRebut, getTeamRebuttals } from '../utils/scoring';
import { soundManager } from '../utils/audio';
import { teamAuthService, ActiveSessionInfo } from '../utils/teamAuthService';
import { syncService } from '../utils/syncService';

interface TeamBuzzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  rebuttals?: RebuttalRecord[];
  currentTeamAuth: TeamAccount | null;
  onLoginTeam: (account: TeamAccount) => void;
  onLogoutTeam: () => void;
  buzzerQueue: BuzzerRecord[];
  onBuzz: (teamId: number, teamName: string) => void;
  onResetBuzzer: (consumedTeamId?: number) => void;
  presentingTeamId: number | null;
  stageTimerState?: StageTimerState | null;
}

export const TeamBuzzerModal: React.FC<TeamBuzzerModalProps> = ({
  isOpen,
  onClose,
  teams,
  rebuttals = [],
  currentTeamAuth,
  onLoginTeam,
  onLogoutTeam,
  buzzerQueue,
  onBuzz,
  onResetBuzzer,
  presentingTeamId,
  stageTimerState,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLockedError, setIsLockedError] = useState(false);
  const [justBuzzed, setJustBuzzed] = useState(false);
  const [activeTeamIds, setActiveTeamIds] = useState<number[]>([]);
  const [unlockSuccessMsg, setUnlockSuccessMsg] = useState('');
  const [activeModalTab, setActiveModalTab] = useState<'buzzer' | 'all10'>('buzzer');

  // Fetch active sessions
  const refreshActiveSessions = async () => {
    const data = await teamAuthService.getActiveSessions();
    const cloud = syncService.getActiveSessionsList().map((s) => s.teamId);
    const merged = Array.from(new Set([...data.activeTeamIds, ...cloud]));
    setActiveTeamIds(merged);
  };

  useEffect(() => {
    if (isOpen) {
      setPasswordInput('');
      setErrorMsg('');
      setErrorDetails('');
      setIsLockedError(false);
      setUnlockSuccessMsg('');
      refreshActiveSessions();

      // Query active devices across Cloud
      syncService.queryActiveSessions();

      // Realtime listener for cross-device claims / heartbeats (< 50ms)
      const unsubSessions = syncService.subscribeSessions((cloudSessions) => {
        const cloudIds = cloudSessions.map((s) => s.teamId);
        setActiveTeamIds((prev) => {
          const combined = Array.from(new Set([...prev, ...cloudIds]));
          return combined;
        });
      });

      const poll = setInterval(refreshActiveSessions, 2000);
      return () => {
        unsubSessions();
        clearInterval(poll);
      };
    }
  }, [isOpen]);

  // Heartbeat loop for current team device (silent keep-alive, no forced logout)
  useEffect(() => {
    if (!currentTeamAuth) return;

    teamAuthService.sendHeartbeat(currentTeamAuth.id).catch(() => {});

    const timer = setInterval(() => {
      teamAuthService.sendHeartbeat(currentTeamAuth.id).catch(() => {});
    }, 15000);

    return () => clearInterval(timer);
  }, [currentTeamAuth]);

  // Local synced stage timer state across tabs, server, or via prop
  const [syncedTimerState, setSyncedTimerState] = useState<StageTimerState>(() => {
    if (stageTimerState) return stageTimerState;
    try {
      const saved = localStorage.getItem('chuyende_stage_timer_state_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      phase: 'prepare',
      timeLeft: 60,
      totalDuration: 60,
      isRunning: false,
      currentTeamId: presentingTeamId || 1,
      updatedAt: Date.now(),
    };
  });

  const [localBuzzerQueue, setLocalBuzzerQueue] = useState<BuzzerRecord[]>(() => {
    if (Array.isArray(buzzerQueue) && buzzerQueue.length > 0) return buzzerQueue;
    try {
      const saved = localStorage.getItem('chuyende_buzzer_queue_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [blockedTeamIds, setBlockedTeamIds] = useState<number[]>(() => syncService.getBuzzerBlockedTeamIds());

  useEffect(() => {
    if (stageTimerState) {
      setSyncedTimerState(stageTimerState);
    }
  }, [stageTimerState]);

  useEffect(() => {
    if (Array.isArray(buzzerQueue)) {
      setLocalBuzzerQueue(buzzerQueue);
    }
  }, [buzzerQueue]);

  // Connect to syncService for real-time remote/incognito/mobile synchronization
  useEffect(() => {
    // Initial fetch from server to get accurate timer immediately on modal open
    syncService.fetchTimerState().then((timer) => {
      if (timer) setSyncedTimerState(timer);
    });

    const unsubTimer = syncService.subscribeTimer((newTimer) => {
      setSyncedTimerState(newTimer);
    });

    const unsubBuzzer = syncService.subscribeBuzzer((newQueue) => {
      setLocalBuzzerQueue(newQueue);
      setBlockedTeamIds(syncService.getBuzzerBlockedTeamIds());
    });

    return () => {
      unsubTimer();
      unsubBuzzer();
    };
  }, []);

  // Fetch immediately whenever modal opens
  useEffect(() => {
    if (isOpen) {
      syncService.queryTimerState();
      syncService.fetchTimerState().then((timer) => {
        if (timer) setSyncedTimerState(timer);
      });
      syncService.fetchBuzzerQueue().then((queue) => {
        if (queue) {
          setLocalBuzzerQueue(queue);
          setBlockedTeamIds(syncService.getBuzzerBlockedTeamIds());
        }
      });
    }
  }, [isOpen]);

  // Smooth local countdown ticker for active timer
  useEffect(() => {
    let ticker: ReturnType<typeof setInterval> | null = null;
    if (syncedTimerState.isRunning && syncedTimerState.timeLeft > 0) {
      ticker = setInterval(() => {
        setSyncedTimerState((prev) => {
          if (!prev.isRunning || prev.timeLeft <= 0) return prev;
          const nextTime = Math.max(0, prev.timeLeft - 1);
          return {
            ...prev,
            timeLeft: nextTime,
            isRunning: nextTime > 0,
          };
        });
      }, 1000);
    }
    return () => {
      if (ticker) clearInterval(ticker);
    };
  }, [syncedTimerState.isRunning, syncedTimerState.updatedAt]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setErrorMsg('Vui lòng nhập mật khẩu của đội bạn!');
      return;
    }

    setIsLoggingIn(true);
    setErrorMsg('');
    setErrorDetails('');
    setIsLockedError(false);

    try {
      const res = await teamAuthService.login(passwordInput);

      if (res.success && res.account) {
        onLoginTeam(res.account);
        setErrorMsg('');
        soundManager.playDing();
        refreshActiveSessions();
      } else {
        setErrorMsg(res.error || 'Mật khẩu không chính xác!');
        if (res.locked) {
          setIsLockedError(true);
          setErrorDetails(res.details || 'Mỗi đội chỉ được phép đăng nhập trên 1 thiết bị.');
        }
      }
    } catch {
      setErrorMsg('Lỗi kết nối khi đăng nhập. Vui lòng thử lại.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickSelectTeam = (acc: TeamAccount) => {
    setPasswordInput(acc.code);
    setErrorMsg('');
    setErrorDetails('');
    setIsLockedError(false);
  };

  const handleDirectSelectTeam = async (acc: TeamAccount) => {
    setPasswordInput(acc.code);
    setErrorMsg('');
    setErrorDetails('');
    setIsLockedError(false);
    try {
      const res = await teamAuthService.login(acc.code);
      if (res.success && res.account) {
        onLoginTeam(res.account);
      } else {
        onLoginTeam(acc);
      }
    } catch {
      onLoginTeam(acc);
    }
    soundManager.playDing();
  };

  const handleLogout = async () => {
    if (currentTeamAuth) {
      await teamAuthService.logout(currentTeamAuth.id);
    }
    onLogoutTeam();
    refreshActiveSessions();
  };

  const handleForceUnlockCurrent = async (teamIdToUnlock: number) => {
    const res = await teamAuthService.forceUnlock(teamIdToUnlock);
    if (res.success) {
      setUnlockSuccessMsg(res.message);
      setIsLockedError(false);
      setErrorMsg('');
      setErrorDetails('');
      refreshActiveSessions();
      setTimeout(() => setUnlockSuccessMsg(''), 4000);
    }
  };

  const safeRebuttals = Array.isArray(rebuttals) ? rebuttals : [];
  const safeBuzzerQueue = localBuzzerQueue.length > 0 ? localBuzzerQueue : (Array.isArray(buzzerQueue) ? buzzerQueue : []);
  const safeTeams = Array.isArray(teams) ? teams : [];

  const effectivePresentingTeamId = presentingTeamId ?? syncedTimerState.currentTeamId;
  const isPresentingNow = effectivePresentingTeamId !== null && currentTeamAuth?.id === effectivePresentingTeamId;
  const presentingTeam = safeTeams.find((t) => t.id === effectivePresentingTeamId);

  // Rebuttal quota & turn limit calculations
  const myTeamRebuttals = currentTeamAuth ? getTeamRebuttals(currentTeamAuth.id, safeRebuttals) : [];
  const myRebuttalsUsed = myTeamRebuttals.length;
  const hasUsedAllRebuttals = myRebuttalsUsed >= 3;
  const remainingRebuttals = Math.max(0, 3 - myRebuttalsUsed);

  // Maximum 1 rebuttal per presenting turn
  const hasRebuttedInThisRound = Boolean(
    currentTeamAuth &&
    effectivePresentingTeamId !== null &&
    safeRebuttals.some(
      (r) => r.rebuttalTeamId === currentTeamAuth.id && r.roundTeamId === effectivePresentingTeamId
    )
  );

  // Buzzer availability: ALWAYS OPEN & ACTIVE by default as requested
  const isBuzzerOpen = true;
  const isRebuttalPhase = syncedTimerState.phase === 'rebuttal';
  const isRebuttalCountdownRunning = isRebuttalPhase && syncedTimerState.isRunning && syncedTimerState.timeLeft > 0;

  const myBuzzRecord = currentTeamAuth
    ? safeBuzzerQueue.find((b) => b.teamId === currentTeamAuth.id)
    : null;
  const myBuzzRank = currentTeamAuth
    ? safeBuzzerQueue.findIndex((b) => b.teamId === currentTeamAuth.id) + 1
    : 0;

  // Always pressable by default unless the team has already clicked in the current queue
  const canBuzzNow = !myBuzzRecord && safeBuzzerQueue.length === 0 && !isPresentingNow &&
    !hasUsedAllRebuttals && !hasRebuttedInThisRound && !blockedTeamIds.includes(currentTeamAuth?.id || 0);

  const handleTriggerBuzzer = (targetTeamId?: number, targetTeamName?: string) => {
    const tId = targetTeamId ?? currentTeamAuth?.id;
    const tName = targetTeamName ?? currentTeamAuth?.name;
    if (!tId || !tName) return;

    // Check if already in queue
    if (safeBuzzerQueue.length > 0 || safeBuzzerQueue.some((b) => b.teamId === tId)) {
      soundManager.playDing();
      return;
    }

    soundManager.playBuzzer();
    setJustBuzzed(true);

    const now = Date.now();
    const firstTime = safeBuzzerQueue.length > 0 ? safeBuzzerQueue[0].timestamp : now;
    const newRecord: BuzzerRecord = {
      teamId: tId,
      teamName: tName,
      timestamp: now,
      diffMs: now - firstTime,
    };
    const nextQueue = [...safeBuzzerQueue.filter((b) => b.teamId !== tId), newRecord];
    setLocalBuzzerQueue(nextQueue);

    onBuzz(tId, tName);
    setTimeout(() => setJustBuzzed(false), 1200);
  };

  const handleCancelTeamBuzz = (targetTeamId: number) => {
    const nextQueue = safeBuzzerQueue.filter((b) => b.teamId !== targetTeamId);
    setLocalBuzzerQueue(nextQueue);
    syncService.pushBuzzerQueue(nextQueue);
    soundManager.playDing();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <Bell className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg tracking-tight">
                {currentTeamAuth ? `Chuông Bấm: ${currentTeamAuth.name}` : 'Chuông Bấm 10 Đội Thi'}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-100 font-medium">
                  {currentTeamAuth ? 'Bấm chuông để giành quyền phản biện trực tiếp' : 'Giới hạn 1 thiết bị / 1 đội thi'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-mono font-bold">
                  1 Device Only
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-400 text-slate-950 text-xs font-black animate-pulse flex items-center gap-1 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
              <span>CHUÔNG MỞ (SẴN SÀNG)</span>
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 text-white flex items-center justify-center font-bold text-sm transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Team devices only need the single, unambiguous buzzer screen. */}
        <div className="hidden">
          <button
            type="button"
            onClick={() => setActiveModalTab('buzzer')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeModalTab === 'buzzer'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{currentTeamAuth ? `Chuông: ${currentTeamAuth.name}` : 'Chuông Đội Thi'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModalTab('all10')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeModalTab === 'all10'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Bảng Bấm 10 Đội (MC / Test)</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeModalTab === 'all10' ? (
            /* Tab 2: 10-Team Buzzer Board for MC / Organizer / Live Testing */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Bảng Bấm Chuông Trực Tiếp 10 Đội
                  </h3>
                  <p className="text-xs text-slate-500">
                    MC hoặc ban tổ chức có thể bấm chuông nhanh cho bất kỳ đội nào
                  </p>
                </div>
                {safeBuzzerQueue.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalBuzzerQueue([]);
                      onResetBuzzer?.();
                      soundManager.playDing();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Đặt Lại Toàn Bộ</span>
                  </button>
                )}
              </div>

              {/* Grid of 10 teams */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {safeTeams.map((team) => {
                  const buzzRecord = safeBuzzerQueue.find((b) => b.teamId === team.id);
                  const buzzRank = buzzRecord
                    ? safeBuzzerQueue.findIndex((b) => b.teamId === team.id) + 1
                    : 0;

                  return (
                    <div
                      key={team.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                        buzzRecord
                          ? buzzRank === 1
                            ? 'bg-amber-50 border-amber-300 shadow-xs'
                            : 'bg-emerald-50 border-emerald-300'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-slate-900">
                            {team.name}
                          </span>
                          {buzzRecord && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                buzzRank === 1
                                  ? 'bg-amber-300 text-amber-950 animate-pulse'
                                  : 'bg-emerald-200 text-emerald-900'
                              }`}
                            >
                              Hạng #{buzzRank}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">
                          {buzzRecord
                            ? buzzRecord.diffMs === 0
                              ? '⚡ Đầu tiên'
                              : `+${((buzzRecord.diffMs || 0) / 1000).toFixed(2)}s`
                            : 'Sẵn sàng'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {buzzRecord ? (
                          <button
                            type="button"
                            onClick={() => handleCancelTeamBuzz(team.id)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                            title="Hủy lượt bấm của đội này"
                          >
                            Hủy
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTriggerBuzzer(team.id, team.name)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                          >
                            <Bell className="w-3 h-3" />
                            <span>BẤM CHUÔNG</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : !currentTeamAuth ? (
            /* Tab 1: Single Team Mode - Select Team / Login */
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="inline-flex p-3 rounded-2xl bg-rose-50 text-rose-600 mb-2">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-800">
                  Chọn Đội Thi Của Bạn
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Bấm chọn trực tiếp đội thi của bạn bên dưới để kích hoạt chuông bấm ngay lập tức:
                </p>
              </div>

              {unlockSuccessMsg && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{unlockSuccessMsg}</span>
                </div>
              )}

              {/* 10 Team Direct Selection Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {TEAM_ACCOUNTS.map((acc) => {
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleDirectSelectTeam(acc)}
                      className="p-3 rounded-2xl border bg-slate-50 hover:bg-rose-50/80 border-slate-200 hover:border-rose-300 text-slate-800 hover:text-rose-700 transition-all text-center flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
                    >
                      <Bell className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-black">{acc.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Bấm chọn</span>
                    </button>
                  );
                })}
              </div>

              {/* Optional Password Form */}
              <div className="pt-3 border-t border-slate-100">
                <form onSubmit={handleLogin} className="space-y-2.5">
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Hoặc nhập mật khẩu (doi1 .. doi10)"
                      className="flex-1 px-3 py-2 text-center text-sm font-mono font-bold rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500 transition-all uppercase placeholder:normal-case placeholder:font-sans placeholder:text-xs"
                    />
                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      {isLoggingIn ? '...' : 'Vào'}
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                      {errorMsg}
                    </div>
                  )}
                </form>
              </div>
            </div>
          ) : (
            /* Active Team Buzzer Screen */
            <div className="space-y-5 text-center">
              {/* Team Info Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700">
                      Đang Điều Khiển Chuông
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">
                    {currentTeamAuth.name}
                  </h3>
                  <span className="text-xs text-slate-500">
                    Đã dùng: <strong className="text-slate-800">{myRebuttalsUsed}/3</strong> lượt phản biện
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Đổi sang đội khác"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đổi Đội</span>
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-semibold flex items-center gap-2.5 text-left">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <span className="font-extrabold text-emerald-900 block">
                    CHUÔNG MỞ SẴN SÀNG — BẤM BẤT KỲ LÚC NÀO
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    Chạm nút tròn bên dưới để ghi tên lên bảng ưu tiên phản biện
                  </span>
                </div>
              </div>

              {/* Huge Tactile Buzzer Button */}
              <div className="py-2 flex flex-col items-center justify-center">
                <button
                  id="team-buzzer-press-button"
                  disabled={!canBuzzNow}
                  onClick={() => handleTriggerBuzzer()}
                  className={`relative w-48 h-48 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-200 select-none ${
                    canBuzzNow
                      ? 'bg-gradient-to-b from-rose-500 via-red-600 to-red-700 text-white ring-8 ring-rose-400/40 hover:ring-rose-400/70 hover:scale-105 active:scale-90 active:ring-rose-500 cursor-pointer shadow-rose-500/50'
                      : 'bg-gradient-to-b from-emerald-500 to-teal-600 text-white ring-8 ring-emerald-300/50 scale-100 cursor-default shadow-emerald-500/30'
                  }`}
                >
                  {canBuzzNow && (
                    <div className="absolute inset-0 rounded-full border-4 border-rose-400 animate-ping pointer-events-none opacity-50" />
                  )}

                  {myBuzzRecord ? (
                    <>
                      <CheckCircle2 className="w-12 h-12 mb-1 text-white animate-bounce" />
                      <span className="text-xl font-black tracking-wide uppercase">ĐÃ BẤM!</span>
                      <span className="text-[11px] font-semibold text-white/90 mt-0.5">
                        Thứ tự #{myBuzzRank}
                      </span>
                    </>
                  ) : (
                    <>
                      <Bell
                        className={`w-12 h-12 mb-1 ${
                          justBuzzed ? 'animate-bounce text-amber-300' : 'text-white'
                        }`}
                      />
                      <span className="text-xl font-black tracking-wide uppercase">BẤM CHUÔNG!</span>
                      <span className="text-[11px] font-semibold text-white/90 mt-0.5">
                        Chạm để giành phản biện
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Buzzer Feedback */}
              {myBuzzRecord ? (
                <div className="space-y-2">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      Đã bấm chuông thành công! Vị trí #{myBuzzRank} trong danh sách MC.
                    </span>
                  </div>
                  <button
                    onClick={() => handleCancelTeamBuzz(currentTeamAuth.id)}
                    className="hidden"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hủy lượt bấm này (Để bấm thử lại)</span>
                  </button>
                </div>
              ) : (
                <p className="text-center text-xs text-slate-400">
                  Chạm nút chuông để ghi danh tức thì lên màn hình máy chiếu sân khấu
                </p>
              )}

              {/* Buzzer Queue Overview */}
              {safeBuzzerQueue.length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-left space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-500" />
                      <span>Hàng Đợi Chuông Hiện Tại ({safeBuzzerQueue.length} đội)</span>
                    </span>
                    <button
                    onClick={() => onResetBuzzer()}
                      className="hidden"
                      title="Đặt lại chuông"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Đặt lại</span>
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {safeBuzzerQueue.map((item, idx) => (
                      <div
                        key={item.teamId}
                        className={`px-3 py-1.5 rounded-xl text-xs flex items-center justify-between font-medium ${
                          item.teamId === currentTeamAuth.id
                            ? 'bg-rose-100 text-rose-900 font-bold border border-rose-200'
                            : 'bg-white text-slate-700 border border-slate-200/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              idx === 0
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <span>{item.teamName}</span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-400">
                          {idx === 0 ? 'Đầu tiên' : `+${((item.diffMs || 0) / 1000).toFixed(2)}s`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sound Test Button */}
              <div className="pt-1 border-t border-slate-100 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => soundManager.playBuzzer()}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Thử loa chuông</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
