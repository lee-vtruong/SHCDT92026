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
  onResetBuzzer: () => void;
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

  // Fetch active sessions
  const refreshActiveSessions = async () => {
    const data = await teamAuthService.getActiveSessions();
    setActiveTeamIds(data.activeTeamIds);
  };

  useEffect(() => {
    if (isOpen) {
      setPasswordInput('');
      setErrorMsg('');
      setErrorDetails('');
      setIsLockedError(false);
      setUnlockSuccessMsg('');
      refreshActiveSessions();

      const poll = setInterval(refreshActiveSessions, 4000);
      return () => clearInterval(poll);
    }
  }, [isOpen]);

  // Heartbeat loop for current team device
  useEffect(() => {
    if (!currentTeamAuth) return;

    // Send immediate heartbeat
    teamAuthService.sendHeartbeat(currentTeamAuth.id);

    const timer = setInterval(async () => {
      const ok = await teamAuthService.sendHeartbeat(currentTeamAuth.id);
      if (!ok) {
        onLogoutTeam();
        setErrorMsg('Phiên của thiết bị này đã kết thúc do đăng nhập mới hoặc hết hạn.');
      }
    }, 8000);

    return () => clearInterval(timer);
  }, [currentTeamAuth]);

  // Local synced stage timer state across tabs or via prop
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

  useEffect(() => {
    if (stageTimerState) {
      setSyncedTimerState(stageTimerState);
    }
  }, [stageTimerState]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'chuyende_stage_timer_state_v2' && e.newValue) {
        try {
          setSyncedTimerState(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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
  const safeBuzzerQueue = Array.isArray(buzzerQueue) ? buzzerQueue : [];
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

  // Strict constraint: Buzzer only unlocks during the 1-minute countdown of the Rebuttal phase
  const isRebuttalPhase = syncedTimerState.phase === 'rebuttal';
  const isRebuttalCountdownRunning = isRebuttalPhase && syncedTimerState.isRunning && syncedTimerState.timeLeft > 0;

  const myBuzzRecord = currentTeamAuth
    ? safeBuzzerQueue.find((b) => b.teamId === currentTeamAuth.id)
    : null;
  const myBuzzRank = currentTeamAuth
    ? safeBuzzerQueue.findIndex((b) => b.teamId === currentTeamAuth.id) + 1
    : 0;

  const canBuzzNow =
    isRebuttalCountdownRunning &&
    !isPresentingNow &&
    !myBuzzRecord &&
    !hasUsedAllRebuttals &&
    !hasRebuttedInThisRound;

  const handleTriggerBuzzer = () => {
    if (!currentTeamAuth) return;

    if (hasUsedAllRebuttals) {
      soundManager.playError();
      setErrorMsg('Đội bạn đã sử dụng hết 3/3 lượt phản biện trong hội thi!');
      setTimeout(() => setErrorMsg(''), 3500);
      return;
    }

    if (hasRebuttedInThisRound) {
      soundManager.playError();
      setErrorMsg('Đội bạn đã phản biện trong lượt thi này rồi (tối đa 1 lần/lượt)!');
      setTimeout(() => setErrorMsg(''), 3500);
      return;
    }

    if (isPresentingNow) {
      soundManager.playError();
      setErrorMsg('Đội bạn đang thuyết trình, không thể bấm chuông phản biện!');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    if (!isRebuttalCountdownRunning) {
      soundManager.playError();
      if (isRebuttalPhase && !syncedTimerState.isRunning && syncedTimerState.timeLeft > 0) {
        setErrorMsg('Chờ MC/Trọng tài bấm "BẮT ĐẦU" đếm ngược 1 phút để mở chuông!');
      } else if (isRebuttalPhase && syncedTimerState.timeLeft <= 0) {
        setErrorMsg('Đã hết 1 phút phản biện, chuông đã tự động khóa lại!');
      } else {
        setErrorMsg('Chuông chỉ mở trong 1 phút đếm ngược Phản Biện!');
      }
      setTimeout(() => setErrorMsg(''), 3500);
      return;
    }
    if (myBuzzRecord) return;

    soundManager.playBuzzer();
    onBuzz(currentTeamAuth.id, currentTeamAuth.name);
    setJustBuzzed(true);
    setTimeout(() => setJustBuzzed(false), 1200);
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
            {isRebuttalCountdownRunning ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-400 text-slate-950 text-xs font-black animate-pulse flex items-center gap-1 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                <span>MỞ ({syncedTimerState.timeLeft}s)</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-black/20 text-white/90 text-xs font-semibold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Khóa</span>
              </span>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 text-white flex items-center justify-center font-bold text-sm transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {!currentTeamAuth ? (
            /* Login Screen */
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="inline-flex p-3 rounded-2xl bg-rose-50 text-rose-600 mb-2">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-800">
                  Đăng Nhập Thiết Bị Đội Thi
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Mỗi đội chỉ được phép đăng nhập trên <strong>1 thiết bị duy nhất</strong>. Nếu đội đã có người đăng nhập, thiết bị khác sẽ bị chặn.
                </p>
              </div>

              {unlockSuccessMsg && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{unlockSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <input
                    type="password"
                    autoFocus
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Nhập mật khẩu (doi1 đến doi10)"
                    className="w-full px-4 py-3 text-center text-lg font-mono font-bold tracking-widest rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all uppercase placeholder:normal-case placeholder:font-sans placeholder:text-sm placeholder:tracking-normal"
                  />
                </div>

                {errorMsg && (
                  <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-start gap-2.5 ${
                    isLockedError
                      ? 'bg-rose-50 border-rose-300 text-rose-800'
                      : 'bg-amber-50 border-amber-300 text-amber-800'
                  }`}>
                    <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                    <div className="space-y-1 text-left flex-1">
                      <div className="font-bold">{errorMsg}</div>
                      {errorDetails && (
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {errorDetails}
                        </p>
                      )}
                      {isLockedError && (
                        <div className="pt-2 border-t border-rose-200 mt-2 flex items-center justify-between">
                          <span className="text-[10px] text-rose-700">Thiết bị cũ mất nguồn hoặc gặp sự cố?</span>
                          <button
                            type="button"
                            onClick={() => {
                              const match = passwordInput.trim().toLowerCase().match(/^doi(\d+)$/);
                              if (match) {
                                handleForceUnlockCurrent(Number(match[1]));
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Mở Khóa Thiết Bị Này</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-extrabold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Bell className="w-4 h-4" />
                  <span>{isLoggingIn ? 'Đang Kiểm Tra Thiết Bị...' : 'Xác Nhận & Đăng Nhập Thiết Bị'}</span>
                </button>
              </form>

              {/* Status of 10 Team Devices */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Trạng Thái Đăng Nhập 10 Đội:
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {activeTeamIds.length}/10 đang online
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {TEAM_ACCOUNTS.map((acc) => {
                    const isOnline = activeTeamIds.includes(acc.id);

                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleQuickSelectTeam(acc)}
                        className={`p-2 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between ${
                          isOnline
                            ? 'bg-rose-50/70 border-rose-200 text-rose-900 hover:bg-rose-100'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{acc.name}</span>
                          {isOnline ? (
                            <Lock className="w-3 h-3 text-rose-600" />
                          ) : (
                            <Unlock className="w-3 h-3 text-emerald-500" />
                          )}
                        </div>
                        <span className={`text-[9px] mt-1 font-mono font-medium ${
                          isOnline ? 'text-rose-600' : 'text-slate-400'
                        }`}>
                          {isOnline ? 'Đang dùng' : 'Trống'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Active Team Buzzer Screen */
            <div className="space-y-6 text-center">
              {/* Team Info Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700">
                      Thiết Bị Đang Kết Nối Duy Nhất
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                    <h3 className="text-lg font-extrabold text-slate-900">
                      {currentTeamAuth.name}
                    </h3>
                    {hasUsedAllRebuttals ? (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-300 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-rose-600" />
                        Hết 3/3 lượt
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-200 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-500" />
                        Còn {remainingRebuttals}/3 lượt phản biện
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Mã tài khoản: <strong className="font-mono text-slate-700">{currentTeamAuth.code}</strong> • Đã dùng: <strong className="text-slate-800">{myRebuttalsUsed}/3</strong> lượt
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-center"
                  title="Đăng xuất thiết bị này để nhường cho thiết bị khác"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng Xuất</span>
                </button>
              </div>

              {/* Phase & Permission Status Banner */}
              {hasUsedAllRebuttals ? (
                <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-950 text-xs font-semibold flex items-center gap-3 text-left shadow-xs">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-rose-900 block">
                      ĐỘI BẠN ĐÃ HẾT 3 LƯỢT PHẢN BIỆN (3/3)
                    </span>
                    <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                      Theo thể lệ hội thi, mỗi đội chỉ được phản biện tối đa 3 lần. Chuông bấm của đội bạn đã được hệ thống khóa vĩnh viễn.
                    </p>
                  </div>
                </div>
              ) : hasRebuttedInThisRound ? (
                <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-950 text-xs font-semibold flex items-center gap-3 text-left shadow-xs">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-amber-900 block">
                      ĐÃ PHẢN BIỆN TRONG LƯỢT THI NÀY
                    </span>
                    <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                      Quy định: 1 lượt thuyết trình chỉ cho phép tối đa 1 lần bấm chuông/phản biện cho mỗi đội. Đội bạn hãy chờ lượt thi của đội tiếp theo!
                    </p>
                  </div>
                </div>
              ) : isPresentingNow ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-3 text-left">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold text-sm">Đội bạn đang ở trên sân khấu thuyết trình!</span>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Chuông phản biện chỉ dành cho 9 đội đối thủ bên dưới khán phòng.
                    </p>
                  </div>
                </div>
              ) : isRebuttalCountdownRunning ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 text-xs font-semibold flex items-center gap-3 text-left shadow-md animate-pulse">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Bell className="w-5 h-5 animate-bounce" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-sm text-emerald-900 uppercase tracking-wide">
                        1 PHÚT PHẢN BIỆN ĐANG ĐẾM NGƯỢC!
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-mono font-black text-xs">
                        00:{syncedTimerState.timeLeft < 10 ? `0${syncedTimerState.timeLeft}` : syncedTimerState.timeLeft}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 mt-1">
                      Chuông đang mở! Bấm nút đỏ bên dưới NGAY để giành quyền phản biện {presentingTeam ? presentingTeam.name : 'đội thi'} (Đội bạn còn {remainingRebuttals}/3 lượt).
                    </p>
                  </div>
                </div>
              ) : isRebuttalPhase && !syncedTimerState.isRunning && syncedTimerState.timeLeft > 0 ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-semibold flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-amber-900">
                      ĐÃ VÀO LƯỢT PHẢN BIỆN — CHỜ ĐỒNG HỒ ĐẾM NGƯỢC
                    </span>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Chờ MC/Trọng tài bấm "BẮT ĐẦU" đếm ngược 1 phút trên sân khấu. Chuông sẽ tự động mở ngay khi đồng hồ chạy!
                    </p>
                  </div>
                </div>
              ) : isRebuttalPhase && syncedTimerState.timeLeft <= 0 ? (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 text-xs font-semibold flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-2xl bg-rose-200 text-rose-800 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-rose-900">
                      HẾT 1 PHÚT PHẢN BIỆN (00:00)
                    </span>
                    <p className="text-xs text-rose-700 mt-0.5">
                      Thời gian phản biện lượt này đã hết. Chuông bấm đã được hệ thống tự động khóa lại.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      CHUÔNG ĐANG KHÓA (Lượt {syncedTimerState.phase === 'prepare' ? 'Chuẩn Bị 1:00' : 'Trình Bày 2:00'})
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {presentingTeam ? `${presentingTeam.name} đang ${syncedTimerState.phase === 'prepare' ? 'chuẩn bị' : 'thuyết trình'}.` : 'Đội thi đang thực hiện phần thi.'} Chuông chỉ cho phép các đội khác bấm khi bước vào 1 phút đếm ngược Phản Biện.
                    </p>
                  </div>
                </div>
              )}

              {/* Huge Tactile Buzzer Button */}
              <div className="py-2 flex flex-col items-center justify-center">
                <button
                  id="team-buzzer-press-button"
                  disabled={!canBuzzNow}
                  onClick={handleTriggerBuzzer}
                  className={`relative w-44 h-44 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-200 select-none ${
                    canBuzzNow
                      ? 'bg-gradient-to-b from-rose-500 via-red-600 to-red-700 text-white ring-8 ring-rose-400/40 hover:ring-rose-400/70 hover:scale-105 active:scale-90 active:ring-rose-500 cursor-pointer'
                      : myBuzzRecord
                      ? 'bg-gradient-to-b from-emerald-500 to-teal-600 text-white ring-8 ring-emerald-300/50 scale-100 cursor-default'
                      : hasUsedAllRebuttals
                      ? 'bg-slate-200 border-4 border-slate-300 text-slate-400 cursor-not-allowed opacity-80'
                      : hasRebuttedInThisRound
                      ? 'bg-amber-100 border-4 border-amber-300 text-amber-700 cursor-not-allowed opacity-85'
                      : isPresentingNow
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                      : isRebuttalPhase && !syncedTimerState.isRunning && syncedTimerState.timeLeft > 0
                      ? 'bg-amber-100 border-4 border-amber-300 text-amber-700 cursor-not-allowed opacity-80'
                      : 'bg-slate-200 border-4 border-slate-300 text-slate-400 cursor-not-allowed opacity-75'
                  }`}
                >
                  {/* Glowing Pulse Rings when Buzzer is Open */}
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
                  ) : hasUsedAllRebuttals ? (
                    <>
                      <Lock className="w-10 h-10 mb-1 text-slate-400" />
                      <span className="text-base font-black tracking-wide uppercase text-slate-500 text-center px-2">
                        HẾT 3 LƯỢT
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                        Đã dùng 3/3 lượt
                      </span>
                    </>
                  ) : hasRebuttedInThisRound ? (
                    <>
                      <CheckCircle2 className="w-10 h-10 mb-1 text-amber-500" />
                      <span className="text-sm font-black tracking-wide uppercase text-amber-800 text-center px-2">
                        ĐÃ PHẢN BIỆN
                      </span>
                      <span className="text-[10px] font-semibold text-amber-700 mt-0.5">
                        Tối đa 1 lần/lượt
                      </span>
                    </>
                  ) : isPresentingNow ? (
                    <>
                      <AlertCircle className="w-10 h-10 mb-1 text-slate-500" />
                      <span className="text-base font-black tracking-wide uppercase text-center px-2">
                        ĐANG TRÌNH BÀY
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 mt-0.5">
                        Dành cho 9 đội khác
                      </span>
                    </>
                  ) : canBuzzNow ? (
                    <>
                      <Bell
                        className={`w-12 h-12 mb-1 ${
                          justBuzzed ? 'animate-bounce text-amber-300' : 'text-white'
                        }`}
                      />
                      <span className="text-xl font-black tracking-wide uppercase">BẤM CHUÔNG!</span>
                      <span className="text-[11px] font-semibold text-white/90 mt-0.5">
                        Còn {syncedTimerState.timeLeft}s • Lượt {myRebuttalsUsed + 1}/3
                      </span>
                    </>
                  ) : isRebuttalPhase && !syncedTimerState.isRunning && syncedTimerState.timeLeft > 0 ? (
                    <>
                      <Clock className="w-10 h-10 mb-1 text-amber-600" />
                      <span className="text-base font-black tracking-wide uppercase text-center px-2 text-amber-900">
                        CHỜ HIỆU LỆNH
                      </span>
                      <span className="text-[10px] font-semibold text-amber-700 mt-0.5">
                        Tự động mở khi chạy giờ
                      </span>
                    </>
                  ) : isRebuttalPhase && syncedTimerState.timeLeft <= 0 ? (
                    <>
                      <Lock className="w-10 h-10 mb-1 text-slate-400" />
                      <span className="text-base font-black tracking-wide uppercase text-slate-500">
                        HẾT GIỜ
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                        Đã khóa chuông
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-10 h-10 mb-1 text-slate-400" />
                      <span className="text-base font-black tracking-wide uppercase text-slate-500 text-center px-2">
                        CHUÔNG KHÓA
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                        Chỉ mở ở 1p Phản Biện
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Buzzer Status Feedback */}
              {myBuzzRecord ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Bạn đã bấm chuông thành công! Đang xếp vị trí #{myBuzzRank} trong danh sách MC.
                  </span>
                </div>
              ) : hasUsedAllRebuttals ? (
                <p className="text-xs text-rose-600 font-bold">
                  🚫 Đội bạn đã dùng hết 3 lượt phản biện trong hội thi (3/3 lượt).
                </p>
              ) : hasRebuttedInThisRound ? (
                <p className="text-xs text-amber-700 font-bold">
                  ⚠️ Đội bạn đã thực hiện phản biện trong lượt này rồi (tối đa 1 lần/lượt).
                </p>
              ) : canBuzzNow ? (
                <p className="text-xs text-emerald-700 font-bold animate-pulse">
                  🔥 Đang trong 1 phút đếm ngược Phản Biện! Chạm nút đỏ phía trên để ghi danh hàng đợi!
                </p>
              ) : (
                <p className="text-xs text-slate-500 font-medium">
                  {isRebuttalPhase && !syncedTimerState.isRunning
                    ? 'Chờ MC bắt đầu chạy đếm ngược 1 phút để chuông tự động mở.'
                    : isRebuttalPhase && syncedTimerState.timeLeft <= 0
                    ? 'Đã hết 1 phút phản biện của lượt này.'
                    : 'Bình thường chuông sẽ khóa, chỉ tự động mở trong 1 phút đếm ngược Phản Biện.'}
                </p>
              )}

              {/* Buzzer Queue Overview */}
              {buzzerQueue.length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-left space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-500" />
                      <span>Hàng Đợi Chuông Hiện Tại ({buzzerQueue.length} đội)</span>
                    </span>
                    <button
                      onClick={onResetBuzzer}
                      className="text-[11px] text-slate-400 hover:text-rose-600 font-bold flex items-center gap-1 transition-colors"
                      title="Đặt lại chuông"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Đặt lại</span>
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {buzzerQueue.map((item, idx) => (
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
              <div className="pt-2 border-t border-slate-100 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => soundManager.playBuzzer()}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
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
