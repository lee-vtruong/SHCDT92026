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
  RotateCcw
} from 'lucide-react';
import { Team, TeamAccount, BuzzerRecord } from '../types';
import { TEAM_ACCOUNTS, authenticateTeam, canTeamRebut, getTeamRebuttals } from '../utils/scoring';
import { soundManager } from '../utils/audio';

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
  const [justBuzzed, setJustBuzzed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPasswordInput('');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setErrorMsg('Vui lòng nhập mật khẩu của đội bạn!');
      return;
    }
    const acc = authenticateTeam(passwordInput);
    if (acc) {
      onLoginTeam(acc);
      setErrorMsg('');
      soundManager.playDing();
    } else {
      setErrorMsg('Mật khẩu không đúng! (Mẹo: doi1 đến doi10)');
    }
  };

  const handleQuickSelectTeam = (acc: TeamAccount) => {
    onLoginTeam(acc);
    setErrorMsg('');
    soundManager.playDing();
  };

  const teamData = currentTeamAuth
    ? teams.find((t) => t.id === currentTeamAuth.id)
    : null;

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
              <p className="text-xs text-rose-100 font-medium">
                {currentTeamAuth ? 'Bấm chuông để giành quyền phản biện trực tiếp' : 'Đăng nhập để nhận chuông của đội'}
              </p>
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
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-800">
                  Nhập Mật Khẩu Đội Của Bạn
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Mỗi đội có một mật khẩu riêng từ <span className="font-mono font-bold text-slate-700">doi1</span> đến <span className="font-mono font-bold text-slate-700">doi10</span>.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <input
                    type="password"
                    autoFocus
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Nhập mật khẩu (ví dụ: doi1)"
                    className="w-full px-4 py-3 text-center text-lg font-mono font-bold tracking-widest rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all uppercase placeholder:normal-case placeholder:font-sans placeholder:text-sm placeholder:tracking-normal"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-extrabold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  <span>Xác Nhận & Mở Chuông</span>
                </button>
              </form>

              {/* Quick helper / Account list for convenience */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
                  Hoặc chọn nhanh đội (Thử nghiệm nhanh)
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {TEAM_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => handleQuickSelectTeam(acc)}
                      className="p-2 rounded-lg bg-slate-50 hover:bg-rose-50 hover:border-rose-200 border border-slate-200/80 text-slate-700 hover:text-rose-700 text-xs font-bold transition-all text-center"
                    >
                      {acc.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Active Team Buzzer Screen */
            <div className="space-y-6 text-center">
              {/* Team Info Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600">
                    Đang Đăng Nhập
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {currentTeamAuth.name}
                  </h3>
                  <span className="text-xs text-slate-500">
                    Mật khẩu: <strong className="font-mono text-slate-700">{currentTeamAuth.code}</strong>
                  </span>
                </div>

                <button
                  onClick={onLogoutTeam}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đổi Đội</span>
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
