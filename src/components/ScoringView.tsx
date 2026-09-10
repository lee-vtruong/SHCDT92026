import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Save, 
  CheckCircle2, 
  Sparkles, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Clock, 
  Check, 
  Flame, 
  AlertCircle,
  ShieldCheck,
  RotateCcw,
  LogOut,
  SlidersHorizontal,
  Trash2,
  UserCog,
  CheckCircle
} from 'lucide-react';
import { Team, Topic, RubricScores, JudgeInfo, RebuttalRecord } from '../types';
import { 
  RUBRIC_CRITERIA_META, 
  JUDGE_ACCOUNTS,
  calculatePresentationTotal, 
  calculateEffectivePresentationScores,
  calculateRebuttalBonus,
  getTeamRebuttals,
  verifyAdminPassword
} from '../utils/scoring';
import { soundManager } from '../utils/audio';

interface ScoringViewProps {
  teams: Team[];
  topics: Topic[];
  rebuttals: RebuttalRecord[];
  selectedTeamId: number;
  setSelectedTeamId: (id: number) => void;
  currentJudge: JudgeInfo | null;
  onOpenJudgeAuth: () => void;
  onLogoutJudge: () => void;
  onLoginWithCode: (code: string) => boolean;
  onUpdatePresentationScores: (
    teamId: number,
    scores: RubricScores,
    notes: string,
    markCompleted?: boolean
  ) => void;
  onUpdateJudgeScores: (
    teamId: number,
    judge: JudgeInfo,
    scores: RubricScores,
    notes: string,
    markCompleted?: boolean
  ) => void;
  onDeleteJudgeScore?: (teamId: number, judgeId: number) => void;
  onOpenAdminReset?: () => void;
  isAdmin?: boolean;
  onLoginAdmin?: () => void;
  onLogoutAdmin?: () => void;
}

export const ScoringView: React.FC<ScoringViewProps> = ({
  teams,
  topics,
  rebuttals,
  selectedTeamId,
  setSelectedTeamId,
  currentJudge,
  onOpenJudgeAuth,
  onLogoutJudge,
  onLoginWithCode,
  onUpdatePresentationScores: _onUpdatePresentationScores,
  onUpdateJudgeScores,
  onDeleteJudgeScore,
  onOpenAdminReset,
  isAdmin = false,
  onLoginAdmin,
  onLogoutAdmin,
}) => {
  const currentTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];
  const currentTopic = topics.find((tp) => tp.id === currentTeam.topicId);

  // Spectator/Read-only mode (when user is not a judge but wants to view scores)
  const [isSpectatorMode, setIsSpectatorMode] = useState<boolean>(false);
  const [inlinePassword, setInlinePassword] = useState<string>('');
  const [showInlinePassword, setShowInlinePassword] = useState<boolean>(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Admin selected judge to view/edit (defaults to Judge 1)
  const [adminSelectedJudgeId, setAdminSelectedJudgeId] = useState<number>(1);

  // Active judge being scored / edited:
  // If in Admin mode, active judge is the one chosen from JUDGE_ACCOUNTS.
  // Otherwise, it's the currently authenticated Judge.
  const activeJudge: JudgeInfo | null = isAdmin
    ? (JUDGE_ACCOUNTS.find((j) => j.id === adminSelectedJudgeId) || JUDGE_ACCOUNTS[0])
    : currentJudge;

  const canEdit = Boolean(isAdmin || currentJudge);

  // Local state for editing before saving
  const [scores, setScores] = useState<RubricScores>(() => {
    if (activeJudge && currentTeam.judgeScores?.[activeJudge.id]) {
      return { ...currentTeam.judgeScores[activeJudge.id].scores };
    }
    return { ...currentTeam.presentationScores };
  });

  const [notes, setNotes] = useState<string>(() => {
    if (activeJudge && currentTeam.judgeScores?.[activeJudge.id]) {
      return currentTeam.judgeScores[activeJudge.id].notes || '';
    }
    return currentTeam.presentationNotes || '';
  });

  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Sync state whenever selected team, active judge, or current judge changes
  useEffect(() => {
    if (activeJudge) {
      const judgeRecord = currentTeam.judgeScores?.[activeJudge.id];
      if (judgeRecord) {
        setScores({ ...judgeRecord.scores });
        setNotes(judgeRecord.notes || '');
      } else {
        setScores({
          topicUnderstanding: 0,
          argumentation: 0,
          feasibility: 0,
          creativity: 0,
          presentationSkills: 0,
        });
        setNotes('');
      }
    } else {
      setScores({ ...currentTeam.presentationScores });
      setNotes(currentTeam.presentationNotes || '');
    }
    setSaveSuccessMessage(null);
  }, [selectedTeamId, activeJudge?.id, currentTeam]);

  const handleSelectTeam = (id: number) => {
    setSelectedTeamId(id);
    setSaveSuccessMessage(null);
  };

  const handleScoreChange = (criterionKey: keyof RubricScores, value: number, max: number) => {
    if (!canEdit) return; // Strict lock: only authenticated judge or admin can change
    const clamped = Math.max(0, Math.min(max, Number(value.toFixed(2))));
    setScores((prev) => ({
      ...prev,
      [criterionKey]: clamped,
    }));
  };

  const handleApplyPreset = (percentage: number) => {
    if (!canEdit) return; // Strict lock
    const newScores: RubricScores = {
      topicUnderstanding: Number((24 * percentage).toFixed(1)),
      argumentation: Number((30 * percentage).toFixed(1)),
      feasibility: Number((24 * percentage).toFixed(1)),
      creativity: Number((18 * percentage).toFixed(1)),
      presentationSkills: Number((24 * percentage).toFixed(1)),
    };
    setScores(newScores);
  };

  const handleSave = (markCompleted: boolean = true) => {
    if (!activeJudge) {
      soundManager.playDing();
      return;
    }

    onUpdateJudgeScores(currentTeam.id, activeJudge, scores, notes, markCompleted);
    soundManager.playScoreAward();
    const prefix = isAdmin ? '[Admin] ' : '';
    setSaveSuccessMessage(`${prefix}Đã lưu phiếu chấm của ${activeJudge.name} cho ${currentTeam.name}!`);

    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 3500);
  };

  const handleDeleteActiveJudgeScore = () => {
    if (!isAdmin || !activeJudge) return;
    if (
      window.confirm(
        `Bạn có chắc chắn muốn XÓA phiếu chấm của ${activeJudge.name} cho ${currentTeam.name}?\nĐiểm trung bình của đội sẽ tự động tính lại.`
      )
    ) {
      onDeleteJudgeScore?.(currentTeam.id, activeJudge.id);
      soundManager.playDing();
      setScores({
        topicUnderstanding: 0,
        argumentation: 0,
        feasibility: 0,
        creativity: 0,
        presentationSkills: 0,
      });
      setNotes('');
      setSaveSuccessMessage(`[Admin] Đã xóa phiếu chấm của ${activeJudge.name} cho ${currentTeam.name}!`);
      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 3500);
    }
  };

  const handleInlineAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);

    // 1. Check Admin password first
    if (verifyAdminPassword(inlinePassword)) {
      onLoginAdmin?.();
      setInlinePassword('');
      soundManager.playScoreAward();
      return;
    }

    // 2. Check Judge password
    const success = onLoginWithCode(inlinePassword);
    if (success) {
      setInlinePassword('');
      soundManager.playScoreAward();
    } else {
      soundManager.playDing();
      setInlineError('Mật khẩu không đúng. Vui lòng nhập mã Ban Giám khảo hoặc mật khẩu Admin!');
    }
  };

  // Calculations
  const activeJudgeScore = calculatePresentationTotal(scores);
  const { scores: effectiveScores, total: effectivePresentationTotal, judgeCount } =
    calculateEffectivePresentationScores(currentTeam);
  const teamRebuttalBonus = calculateRebuttalBonus(currentTeam.id, rebuttals);
  const teamRebuttals = getTeamRebuttals(currentTeam.id, rebuttals);

  // =========================================================================
  // VIEW 1: GATEKEEPER LOCKSCREEN (When not logged in and not in spectator mode)
  // =========================================================================
  if (!currentJudge && !isAdmin && !isSpectatorMode) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        
        {/* BGK / Admin Auth Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-lg text-center space-y-6 animate-in fade-in">
          
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-cyan-500/25">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 border border-cyan-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              // KHU VỰC CHẤM ĐIỂM BẢO MẬT
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Xác Thực Quyền Chấm Điểm
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Để bảo đảm tính công bằng và bảo mật cuộc thi, <strong>chỉ Ban Giám khảo hoặc Quản trị viên (Admin)</strong> mới có quyền chấm điểm và sửa kết quả. Khán giả và MC có thể theo dõi bảng điểm ở chế độ chỉ đọc.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleInlineAuth} className="max-w-md mx-auto space-y-4 pt-2">
            <div className="relative">
              <input
                id="inline-judge-password-input"
                type={showInlinePassword ? 'text' : 'password'}
                value={inlinePassword}
                onChange={(e) => {
                  setInlinePassword(e.target.value);
                  setInlineError(null);
                }}
                placeholder="Nhập mật khẩu BGK hoặc Admin..."
                autoFocus
                className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono tracking-wider focus:outline-none focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-400/20 transition-all shadow-inner"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                id="toggle-inline-pwd-btn"
                onClick={() => setShowInlinePassword(!showInlinePassword)}
                className="p-2 text-slate-400 hover:text-slate-700 absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                title={showInlinePassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showInlinePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {inlineError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{inlineError}</span>
              </div>
            )}

            <button
              type="submit"
              id="submit-inline-judge-auth-btn"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-sm transition-all shadow-md shadow-cyan-500/25 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>XÁC THỰC & MỞ KHÓA CHẤM ĐIỂM</span>
            </button>
          </form>

          {/* Helper note for Admin */}
          <p className="text-[11px] text-slate-400">
            Quản trị viên có thể nhập mật khẩu Admin (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">admin123</code>) để xem và sửa điểm của từng BGK.
          </p>

          {/* Switch to Read-Only Mode */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-slate-500">
            <span>Bạn không phải là Giám khảo?</span>
            <button
              type="button"
              id="spectator-mode-btn"
              onClick={() => setIsSpectatorMode(true)}
              className="font-bold text-cyan-700 hover:text-cyan-800 underline flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Xem Bảng Điểm Ở Chế Độ Chỉ Đọc (Không Chấm Điểm)</span>
            </button>
          </div>

        </div>

      </div>
    );
  }

  // =========================================================================
  // VIEW 2 & 3: GRADING INTERFACE (Spectator Read-Only, Authenticated BGK, or Admin)
  // =========================================================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Read-Only Notice Banner (When in Spectator Mode) */}
      {!currentJudge && !isAdmin && isSpectatorMode && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900 uppercase font-mono">
                  CHẾ ĐỘ CHỈ ĐỌC (READ-ONLY)
                </span>
                <span className="text-[10px] font-semibold bg-amber-200 text-amber-800 px-2 py-0.2 rounded-full">
                  Khán giả / MC
                </span>
              </div>
              <p className="text-xs text-amber-700 mt-0.5">
                Các thanh kéo và nút lưu điểm đã được khóa. Chỉ Ban Giám khảo hoặc Admin mới có quyền nhập hoặc thay đổi điểm.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsSpectatorMode(false);
              onOpenJudgeAuth();
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs shadow-sm hover:from-cyan-500 hover:to-blue-500 transition-all flex items-center gap-1.5 shrink-0 self-end sm:self-auto"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Đăng Nhập BGK / Admin Để Chấm Điểm</span>
          </button>
        </div>
      )}

      {/* Admin Notice Banner */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-900 uppercase font-mono">
                  CHẾ ĐỘ QUẢN TRỊ VIÊN (ADMIN - TOÀN QUYỀN SỬA ĐIỂM)
                </span>
                <span className="text-[10px] font-bold bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-mono">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-purple-700 mt-0.5">
                Bạn có toàn quyền xem, nhập điểm và chỉnh sửa phiếu chấm của từng Giám khảo bên dưới.
              </p>
            </div>
          </div>

          {onLogoutAdmin && (
            <button
              onClick={onLogoutAdmin}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200 transition-all flex items-center gap-1.5 shrink-0 shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Thoát Quyền Admin</span>
            </button>
          )}
        </div>
      )}

      {/* 1. Header & Team Selector bar */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-600" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 font-mono">
              // BẢNG CHẤM ĐIỂM BAN GIÁM KHẢO
            </h2>
            <span className="text-xs text-slate-400 hidden md:inline font-sans">
              • 3 Giám khảo chính thức & 2 Giám khảo dự phòng
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin ? (
              <div className="flex items-center gap-2 bg-purple-50 border border-purple-300 px-3 py-1 rounded-xl text-xs">
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                <span className="text-purple-700 font-semibold">Quyền:</span>
                <strong className="text-purple-900 font-bold">Admin (Toàn quyền 5 BGK)</strong>
                {onLogoutAdmin && (
                  <button
                    onClick={onLogoutAdmin}
                    className="ml-1 text-purple-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                    title="Thoát chế độ Admin"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : currentJudge ? (
              <div className="flex items-center gap-2 bg-cyan-50 border border-cyan-300 px-3 py-1 rounded-xl text-xs">
                <span className="w-2 h-2 rounded-full bg-cyan-600 animate-pulse" />
                <span className="text-slate-600">Đang chấm:</span>
                <strong className="text-cyan-900 font-bold">{currentJudge.name}</strong>
                <button
                  onClick={onLogoutJudge}
                  className="ml-1 text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                  title="Đăng xuất khỏi Giám khảo này"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsSpectatorMode(false);
                  onOpenJudgeAuth();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition-all shadow-2xs"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Nhập Mật Khẩu BGK / Admin</span>
              </button>
            )}

            <div className="text-xs font-mono text-slate-500 hidden sm:block">
              TIẾN ĐỘ: <strong className="text-cyan-700 font-bold">{teams.filter((t) => t.hasPresented).length}</strong> / 10 ĐỘI
            </div>

            {onOpenAdminReset && (
              <button
                id="scoring-reset-btn"
                onClick={onOpenAdminReset}
                title="Khôi phục toàn bộ điểm về 0 (Mật khẩu Admin: admin123)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Reset Điểm</span>
              </button>
            )}
          </div>
        </div>

        {/* 10 Team Pills */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {teams.map((t) => {
            const isSelected = t.id === selectedTeamId;
            const { total: presScore, judgeCount: teamJudgeCount } = calculateEffectivePresentationScores(t);

            return (
              <button
                key={t.id}
                id={`bgk-select-team-${t.id}`}
                onClick={() => handleSelectTeam(t.id)}
                className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all border text-center ${
                  isSelected
                    ? 'bg-gradient-to-b from-cyan-50 to-blue-50 border-cyan-500 text-cyan-950 shadow-xs ring-2 ring-cyan-400/30'
                    : t.hasPresented
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-800 hover:bg-emerald-100/70'
                    : 'bg-slate-50/80 border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="text-xs font-black">{t.name}</span>
                <span className="text-[10px] font-mono mt-0.5 font-bold">
                  {presScore > 0 ? `${presScore.toFixed(1)}đ` : '0đ'}
                </span>

                {teamJudgeCount > 0 && (
                  <span className="text-[9px] text-cyan-700 font-mono">
                    ({teamJudgeCount} GK)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ADMIN JUDGE PICKER: Allows Admin to choose which judge's scores to edit */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-purple-700 shrink-0" />
              <span className="text-xs font-bold text-purple-950 font-mono uppercase tracking-wider">
                // ADMIN: CHỌN GIÁM KHẢO ĐỂ CHỈNH SỬA PHIẾU CHẤM CHO {currentTeam.name.toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-purple-800">
              Đang chỉnh sửa: <strong className="font-bold underline text-purple-950">{activeJudge?.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {JUDGE_ACCOUNTS.map((judge) => {
              const isSelected = activeJudge?.id === judge.id;
              const record = currentTeam.judgeScores?.[judge.id];
              const hasScored = !!record;
              const total = record ? calculatePresentationTotal(record.scores) : null;

              return (
                <button
                  key={judge.id}
                  type="button"
                  id={`admin-select-judge-${judge.id}-btn`}
                  onClick={() => {
                    setAdminSelectedJudgeId(judge.id);
                    soundManager.playDing();
                  }}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-300 scale-[1.02]'
                      : hasScored
                      ? 'bg-white hover:bg-purple-50/70 text-slate-800 border-slate-300'
                      : 'bg-white/70 hover:bg-purple-50/50 text-slate-500 border-dashed border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{judge.name}</span>
                    <span className={`text-[10px] font-mono font-semibold ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                      {judge.isBackup ? 'Dự phòng' : 'Chính'}
                    </span>
                  </div>

                  <div className="mt-1 flex items-baseline justify-between">
                    {hasScored ? (
                      <>
                        <span className={`text-base font-black font-mono ${isSelected ? 'text-white' : 'text-emerald-700'}`}>
                          {total?.toFixed(1)}đ
                        </span>
                        <span className={`text-[10px] ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                          {isSelected ? 'Đang chọn' : 'Click để sửa'}
                        </span>
                      </>
                    ) : (
                      <span className={`text-[11px] font-mono ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                        {isSelected ? 'Đang chọn (Chưa chấm)' : 'Chưa có điểm'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Overview of 5 Judges Scores for this selected team */}
      <div className="bg-white/95 backdrop-blur rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
              // TÌNH TRẠNG CHẤM CỦA 5 GIÁM KHẢO CHO {currentTeam.name.toUpperCase()}:
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({judgeCount}/3-5 GK đã gửi phiếu)
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-500 font-medium">ĐIỂM TRUNG BÌNH BGK:</span>
            <strong className="text-emerald-700 font-black text-sm">
              {effectivePresentationTotal > 0 ? `${effectivePresentationTotal.toFixed(2)}đ` : 'Chưa có'}
            </strong>
          </div>
        </div>

        {/* 5 Judge mini-status cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {JUDGE_ACCOUNTS.map((judge) => {
            const record = currentTeam.judgeScores?.[judge.id];
            const hasScored = !!record;
            const scoreTotal = record ? calculatePresentationTotal(record.scores) : null;
            const isMe = currentJudge?.id === judge.id;
            const isCurrentlyInspected = isAdmin && activeJudge?.id === judge.id;

            return (
              <div
                key={judge.id}
                onClick={() => {
                  if (isAdmin) {
                    setAdminSelectedJudgeId(judge.id);
                  }
                }}
                className={`p-3 rounded-2xl border transition-all text-xs flex flex-col justify-between ${
                  isAdmin ? 'cursor-pointer hover:border-purple-400' : ''
                } ${
                  isCurrentlyInspected
                    ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-300'
                    : isMe
                    ? 'bg-cyan-50/70 border-cyan-400 ring-2 ring-cyan-400/20'
                    : hasScored
                    ? 'bg-emerald-50/60 border-emerald-300 text-slate-800'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    {judge.name}
                    {isMe && (
                      <span className="text-[10px] bg-cyan-600 text-white px-1 rounded font-normal font-sans">
                        Bạn
                      </span>
                    )}
                    {isCurrentlyInspected && (
                      <span className="text-[10px] bg-purple-600 text-white px-1 rounded font-normal font-sans">
                        Sửa
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 font-semibold">
                    {judge.isBackup ? 'Dự phòng' : 'Chính thức'}
                  </span>
                </div>

                <div className="mt-1">
                  {hasScored ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-emerald-800 font-mono">
                        {scoreTotal?.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-slate-400">/ 20đ</span>
                      <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto" />
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{judge.isBackup ? 'Dự phòng' : 'Chưa chấm'}</span>
                    </div>
                  )}
                </div>

                {record?.notes && (
                  <p className="text-[10px] text-slate-500 italic mt-1.5 truncate border-t border-slate-200/60 pt-1">
                    "{record.notes}"
                  </p>
                )}

                {isAdmin && (
                  <div className="mt-2 pt-1 border-t border-slate-200/70 text-[10px] text-purple-700 font-semibold flex items-center justify-between">
                    <span>{hasScored ? 'Click để sửa' : 'Click để chấm'}</span>
                    <SlidersHorizontal className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Main Scoring / Inspection Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Rubric Grading Sheet (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          
          <div className="bg-white/95 backdrop-blur rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-sm space-y-6">
            
            {/* Target Team Title & Total Live Counter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                    // PHIẾU ĐÁNH GIÁ CHUYÊN MÔN
                  </span>
                  {isAdmin && activeJudge ? (
                    <span className="text-[11px] font-mono font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      ADMIN ĐANG SỬA PHIẾU CỦA: {activeJudge.name.toUpperCase()}
                    </span>
                  ) : currentJudge ? (
                    <span className="text-[11px] font-mono font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-300">
                      GIÁM KHẢO: {currentJudge.name}
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      CHẾ ĐỘ XEM (CHƯA ĐĂNG NHẬP BGK)
                    </span>
                  )}
                </div>

                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {currentTeam.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Đề số #{currentTopic?.id}: <span className="text-slate-800 font-semibold">{currentTopic?.title}</span>
                </p>
              </div>

              {/* Total Score Badge */}
              <div className={`rounded-2xl border p-4 text-center min-w-[170px] shrink-0 shadow-xs ${
                isAdmin
                  ? 'bg-purple-50/50 border-purple-300'
                  : 'bg-slate-50 border-cyan-200'
              }`}>
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                  {canEdit && activeJudge
                    ? `ĐIỂM CỦA ${activeJudge.name.toUpperCase()}${isAdmin ? ' (ADMIN)' : ''}`
                    : 'ĐIỂM TRÌNH BÀY (TB)'}
                </span>
                <div className="flex items-baseline justify-center gap-1 mt-0.5">
                  <span className="text-4xl font-black text-slate-900 font-mono">
                    {canEdit ? activeJudgeScore.toFixed(1) : effectivePresentationTotal.toFixed(1)}
                  </span>
                  <span className="text-sm font-bold text-slate-400">/ 120đ</span>
                </div>
                <div className="text-[11px] text-cyan-700 font-medium font-mono mt-1">
                  + {teamRebuttalBonus}đ phản biện (/30đ) = <strong className="text-slate-900">
                    {((canEdit ? activeJudgeScore : effectivePresentationTotal) + teamRebuttalBonus).toFixed(1)} / 150đ
                  </strong>
                </div>
              </div>
            </div>

            {/* Quick Scoring Presets (Available for authenticated BGK or Admin) */}
            {canEdit ? (
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <span className="text-xs font-semibold text-slate-600 mr-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                  Chấm nhanh theo phổ:
                </span>
                {[
                  { label: 'Xuất sắc (95%)', percent: 0.95 },
                  { label: 'Giỏi (85%)', percent: 0.85 },
                  { label: 'Khá (75%)', percent: 0.75 },
                  { label: 'Trung bình (60%)', percent: 0.6 },
                  { label: 'Tối đa (100%)', percent: 1.0 },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleApplyPreset(p.percent)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-cyan-50 hover:text-cyan-800 text-slate-700 text-xs font-medium transition-colors border border-slate-200 hover:border-cyan-300 shadow-xs active:scale-95"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/70 text-xs text-amber-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Các thanh kéo chấm điểm đang được khóa. Chỉ Ban Giám khảo hoặc Admin mới có quyền cho điểm.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSpectatorMode(false);
                    onOpenJudgeAuth();
                  }}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 transition-colors shadow-2xs"
                >
                  Đăng Nhập BGK / Admin
                </button>
              </div>
            )}

            {/* 5 Criteria Inputs / Displays */}
            <div className="space-y-4">
              {RUBRIC_CRITERIA_META.map((criterion, idx) => {
                const currentVal = canEdit
                  ? scores[criterion.key] || 0
                  : effectiveScores[criterion.key] || 0;

                const percent = (currentVal / criterion.max) * 100;

                return (
                  <div
                    key={criterion.key}
                    className={`p-4 rounded-2xl border transition-all ${
                      criterion.isTieBreaker
                        ? 'bg-cyan-50/40 border-cyan-300 ring-1 ring-cyan-200'
                        : 'bg-slate-50/70 border-slate-200/80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900">
                            {criterion.title}
                          </h4>
                          {criterion.isTieBreaker && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-300">
                              ★ Tiêu chí ưu tiên khi hòa điểm
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 pl-7">
                          {criterion.desc}
                        </p>
                      </div>

                      {/* Numerical value indicator */}
                      <div className="flex items-center gap-2 pl-7 sm:pl-0 shrink-0">
                        <span className="text-xl font-black text-slate-900 font-mono">
                          {currentVal.toFixed(1)}
                        </span>
                        <span className="text-xs text-slate-400 font-bold font-mono">
                          / {criterion.max}đ
                        </span>
                      </div>
                    </div>

                    {/* INTERACTIVE CONTROLS (BGK / Admin) vs STATIC DISPLAY (Spectator) */}
                    {canEdit ? (
                      <div className="pl-7 mt-3 flex flex-col sm:flex-row items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max={criterion.max}
                          step={criterion.step}
                          value={currentVal}
                          onChange={(e) =>
                            handleScoreChange(criterion.key, parseFloat(e.target.value), criterion.max)
                          }
                          className={`w-full h-2 bg-slate-200 rounded-lg cursor-pointer ${
                            isAdmin ? 'accent-purple-600' : 'accent-cyan-600'
                          }`}
                        />

                        {/* Quick increments */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              handleScoreChange(criterion.key, currentVal - 1, criterion.max)
                            }
                            className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shadow-xs"
                            title="Trừ 1đ"
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleScoreChange(criterion.key, currentVal - 0.5, criterion.max)
                            }
                            className="px-1.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shadow-xs"
                            title="Trừ 0.5đ"
                          >
                            -0.5
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleScoreChange(criterion.key, currentVal + 0.5, criterion.max)
                            }
                            className="px-1.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shadow-xs"
                            title="Cộng 0.5đ"
                          >
                            +0.5
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleScoreChange(criterion.key, currentVal + 1, criterion.max)
                            }
                            className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shadow-xs"
                            title="Cộng 1đ"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleScoreChange(criterion.key, criterion.max, criterion.max)
                            }
                            className={`px-2 py-1 rounded text-xs font-bold shadow-xs ${
                              isAdmin
                                ? 'bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300'
                                : 'bg-cyan-100 hover:bg-cyan-200 text-cyan-800 border border-cyan-300'
                            }`}
                            title="Cho điểm tối đa"
                          >
                            Max
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Spectator Read-Only Progress Bar */
                      <div className="pl-7 mt-2 space-y-1">
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>0đ</span>
                          <span>Điểm trung bình hiện tại: {currentVal.toFixed(1)} / {criterion.max}đ</span>
                          <span>{criterion.max}đ</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Notes & Feedback text */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2 font-mono">
                // NHẬN XÉT / LỜI KHUYÊN CHO {currentTeam.name.toUpperCase()}{' '}
                {activeJudge ? `(PHIẾU CỦA ${activeJudge.name.toUpperCase()})` : ''}:
              </label>
              {canEdit ? (
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi nhận điểm mạnh, góc nhìn sáng tạo hoặc điểm cần khắc phục của đội thi..."
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-cyan-500 focus:bg-white leading-relaxed shadow-inner"
                />
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 italic">
                  {currentTeam.presentationNotes
                    ? `"${currentTeam.presentationNotes}"`
                    : 'Chưa có ghi chú hoặc lời nhận xét nào từ Ban Giám khảo cho phần thi này.'}
                </div>
              )}
            </div>

            {/* Save Buttons & Feedback (Rendered for authenticated Judge or Admin) */}
            {canEdit ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                {saveSuccessMessage ? (
                  <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold animate-in fade-in bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{saveSuccessMessage}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">
                    * Điểm của {activeJudge?.name} sẽ tự động kết hợp với các giám khảo khác để tính điểm TB cho {currentTeam.name}.
                  </span>
                )}

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Admin can delete this judge's score if it already exists */}
                  {isAdmin && activeJudge && currentTeam.judgeScores?.[activeJudge.id] && (
                    <button
                      type="button"
                      id="admin-delete-judge-score-btn"
                      onClick={handleDeleteActiveJudgeScore}
                      title={`Xóa phiếu chấm của ${activeJudge.name}`}
                      className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors border border-rose-200 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa Phiếu</span>
                    </button>
                  )}

                  <button
                    type="button"
                    id="save-draft-btn"
                    onClick={() => handleSave(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200"
                  >
                    Lưu Tạm Thời
                  </button>

                  <button
                    type="button"
                    id="save-complete-btn"
                    onClick={() => handleSave(true)}
                    className={`px-6 py-2.5 rounded-xl text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 ${
                      isAdmin
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/20'
                        : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isAdmin ? `LƯU ĐIỂM (${activeJudge?.name?.toUpperCase()})` : 'XÁC NHẬN HOÀN THÀNH'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Bạn đang ở chế độ xem. Không thể thực hiện lưu hoặc thay đổi điểm.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSpectatorMode(false);
                    onOpenJudgeAuth();
                  }}
                  className="font-bold text-cyan-700 hover:underline"
                >
                  Đăng nhập BGK / Admin →
                </button>
              </div>
            )}

          </div>

        </div>

        {/* Right Column: Topic Reference & Team Rebuttal History (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Reference Topic Card */}
          <div className="bg-white/95 backdrop-blur rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
              // THAM KHẢO ĐỀ THI
            </span>
            <h4 className="text-sm font-bold text-slate-900 leading-snug">
              {currentTopic?.title}
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              {currentTopic?.description}
            </p>

            {currentTopic?.guidingQuestions && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Gợi ý đánh giá:
                </span>
                <ul className="text-xs text-slate-600 space-y-1">
                  {currentTopic.guidingQuestions.map((q, i) => (
                    <li key={i} className="flex items-start gap-1 text-[11px]">
                      <span className="text-cyan-600 font-bold">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Rebuttal History of this team across all turns */}
          <div className="bg-white/95 backdrop-blur rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" />
                <h4 className="text-xs font-mono font-extrabold text-slate-900 uppercase tracking-wider">
                  Điểm Thưởng Phản Biện
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-700">
                +{teamRebuttalBonus} / 30đ (Tối đa)
              </span>
            </div>

            <p className="text-xs text-slate-500">
              {currentTeam.name} đã sử dụng <strong>{teamRebuttals.length}/3</strong> lượt phản biện trong cả trò chơi.
            </p>

            {/* Token visual */}
            <div className="flex items-center gap-2 py-1">
              {[0, 1, 2].map((tokenIdx) => {
                const isUsed = tokenIdx < teamRebuttals.length;
                const record = teamRebuttals[tokenIdx];

                return (
                  <div
                    key={tokenIdx}
                    className={`flex-1 p-2 rounded-xl border text-center text-xs ${
                      isUsed
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">Lượt {tokenIdx + 1}</div>
                    <div className="text-[10px] mt-0.5 font-mono font-semibold">
                      {isUsed ? `+${record.score}đ` : 'Chưa dùng'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detailed records */}
            {teamRebuttals.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                {teamRebuttals.map((r) => {
                  const targetTeam = teams.find((t) => t.id === r.roundTeamId);
                  return (
                    <div
                      key={r.id}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] flex items-center justify-between"
                    >
                      <span className="text-slate-700">
                        Phản biện {targetTeam?.name}
                      </span>
                      <span className="font-bold font-mono text-cyan-700">
                        +{r.score}đ
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick guidance on tie-breaker rules */}
          <div className="bg-sky-50/70 rounded-2xl border border-sky-200 p-4 text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <AlertCircle className="w-3.5 h-3.5 text-cyan-600" />
              <span>Quy tắc xếp hạng & phân xử:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              1. Tổng điểm cao hơn xếp trên.<br/>
              2. Nếu bằng điểm, ưu tiên điểm <strong>Phần trình bày (/20)</strong>.<br/>
              3. Nếu vẫn bằng, ưu tiên tiêu chí <strong>"Lập luận & tư duy phản biện" (/5)</strong>.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
