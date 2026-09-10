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
  ShieldAlert
} from 'lucide-react';
import { Team, TeamAccount, BuzzerRecord } from '../types';
import { TEAM_ACCOUNTS, canTeamRebut, getTeamRebuttals } from '../utils/scoring';
import { soundManager } from '../utils/audio';
import { teamAuthService, ActiveSessionInfo } from '../utils/teamAuthService';

interface TeamBuzzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  currentTeamAuth: TeamAccount | null;
  onLoginTeam: (account: TeamAccount) => void;
  onLogoutTeam: () => void;
  buzzerQueue: BuzzerRecord[];
  onBuzz: (teamId: number, teamName: string) => void;
  onResetBuzzer: () => void;
  presentingTeamId: number | null;
}

export const TeamBuzzerModal: React.FC<TeamBuzzerModalProps> = ({
  isOpen,
  onClose,
  teams,
  currentTeamAuth,
  onLoginTeam,
  onLogoutTeam,
  buzzerQueue,
  onBuzz,
  onResetBuzzer,
  presentingTeamId,
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

  if (!isOpen) return null;

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

  const isPresentingNow = presentingTeamId !== null && currentTeamAuth?.id === presentingTeamId;
  const myBuzzRecord = currentTeamAuth
    ? buzzerQueue.find((b) => b.teamId === currentTeamAuth.id)
    : null;
  const myBuzzRank = currentTeamAuth
    ? buzzerQueue.findIndex((b) => b.teamId === currentTeamAuth.id) + 1
    : 0;

  const handleTriggerBuzzer = () => {
    if (!currentTeamAuth) return;
    if (isPresentingNow) return;

    soundManager.playBuzzer();
    onBuzz(currentTeamAuth.id, currentTeamAuth.name);
    setJustBuzzed(true);
    setTimeout(() => setJustBuzzed(false), 1200);
  };

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
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 text-white flex items-center justify-center font-bold text-sm transition-colors"
          >
            ✕
          </button>
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
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between">
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700">
                      Thiết Bị Đang Kết Nối Duy Nhất
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {currentTeamAuth.name}
                  </h3>
                  <span className="text-xs text-slate-500">
                    Tài khoản: <strong className="font-mono text-slate-700">{currentTeamAuth.code}</strong>
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Đăng xuất thiết bị này để nhường cho thiết bị khác"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng Xuất</span>
                </button>
              </div>

              {/* Presenting Restriction Warning */}
              {isPresentingNow ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-3 text-left">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">Đội bạn đang ở trên sân khấu thuyết trình!</span>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Chuông phản biện chỉ dành cho 9 đội đối thủ bên dưới khán phòng.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Huge Tactile Buzzer Button */}
              <div className="py-2 flex flex-col items-center justify-center">
                <button
                  disabled={isPresentingNow}
                  onClick={handleTriggerBuzzer}
                  className={`relative w-44 h-44 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-200 active:scale-90 select-none ${
                    isPresentingNow
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                      : myBuzzRecord
                      ? 'bg-gradient-to-b from-emerald-500 to-teal-600 text-white ring-8 ring-emerald-300/50 scale-105'
                      : 'bg-gradient-to-b from-rose-500 via-red-600 to-red-700 text-white ring-8 ring-rose-400/30 hover:ring-rose-400/50 hover:scale-105 active:ring-rose-500'
                  }`}
                >
                  {/* Glowing Pulse Rings */}
                  {!isPresentingNow && !myBuzzRecord && (
                    <div className="absolute inset-0 rounded-full border-4 border-rose-400 animate-ping pointer-events-none opacity-40" />
                  )}

                  <Bell
                    className={`w-12 h-12 mb-1 ${
                      justBuzzed ? 'animate-bounce text-amber-300' : 'text-white'
                    }`}
                  />
                  <span className="text-xl font-black tracking-wide uppercase">
                    {myBuzzRecord ? 'ĐÃ BẤM!' : 'BẤM CHUÔNG'}
                  </span>
                  <span className="text-[11px] font-semibold text-white/80 mt-0.5">
                    {myBuzzRecord ? `Thứ tự #${myBuzzRank}` : 'Giành Quyền'}
                  </span>
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
              ) : (
                <p className="text-xs text-slate-500 font-medium">
                  Chạm hoặc nhấp vào nút trên ngay khi MC mở hiệu lệnh phản biện!
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
