import React, { useEffect, useState, useCallback, useId } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Plus, 
  Minus, 
  Clock, 
  Users, 
  MessageSquare, 
  AlertCircle, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Flame,
  CheckCircle2,
  Trash2,
  Lock,
  ShieldCheck,
  Bell
} from 'lucide-react';
import { Team, Topic, RoundPhase, RebuttalRecord, RebuttalLevel, JudgeInfo, BuzzerRecord, TeamAccount } from '../types';
import { 
  calculatePresentationTotal, 
  calculateRebuttalBonus, 
  calculateOverallTotal, 
  canTeamRebut,
  getTeamRebuttals 
} from '../utils/scoring';
import { soundManager } from '../utils/audio';

interface StageTimerViewProps {
  teams: Team[];
  topics: Topic[];
  currentTeamId: number;
  setCurrentTeamId: (id: number) => void;
  rebuttals: RebuttalRecord[];
  onAddRebuttal: (record: Omit<RebuttalRecord, 'id' | 'timestamp'>) => void;
  onRemoveRebuttal: (id: string) => void;
  onGoToScoring: (teamId: number) => void;
  currentJudge?: JudgeInfo | null;
  isAdmin?: boolean;
  buzzerQueue?: BuzzerRecord[];
  onResetBuzzer?: () => void;
  onOpenTeamBuzzer?: () => void;
  currentTeamAuth?: TeamAccount | null;
}

const PHASE_DURATIONS: Record<RoundPhase, number> = {
  prepare: 60,   // 1 minute
  present: 120,  // 2 minutes
  rebuttal: 60,  // 1 minute
  idle: 0,
};

const PHASE_TITLES: Record<RoundPhase, { title: string; subtitle: string; color: string }> = {
  prepare: {
    title: 'Giai Đoạn 1: Chuẩn Bị',
    subtitle: '01 phút: Đội nhận đề, thống nhất luận điểm và phân công người trình bày.',
    color: 'from-blue-500 to-cyan-500',
  },
  present: {
    title: 'Giai Đoạn 2: Trình Bày Ý Tưởng',
    subtitle: '02 phút: Nêu quan điểm/giải pháp, lập luận và bảo vệ ý tưởng. Khi hết giờ, MC dừng phần thi.',
    color: 'from-amber-500 to-orange-500',
  },
  rebuttal: {
    title: 'Giai Đoạn 3: Phản Biện Mở',
    subtitle: '01 phút: 09 đội còn lại giơ tay. Tối đa 60s tổng cộng. Mỗi đội tối đa 3 lần/trò chơi.',
    color: 'from-rose-500 to-pink-500',
  },
  idle: {
    title: 'Chưa Bắt Đầu',
    subtitle: 'Chọn giai đoạn bên dưới để kích hoạt đồng hồ đếm ngược.',
    color: 'from-slate-600 to-slate-700',
  },
};

export const StageTimerView: React.FC<StageTimerViewProps> = ({
  teams,
  topics,
  currentTeamId,
  setCurrentTeamId,
  rebuttals,
  onAddRebuttal,
  onRemoveRebuttal,
  onGoToScoring,
  currentJudge,
  isAdmin = false,
  buzzerQueue = [],
  onResetBuzzer,
  onOpenTeamBuzzer,
  currentTeamAuth,
}) => {
  const [phase, setPhase] = useState<RoundPhase>('prepare');
  const [timeLeft, setTimeLeft] = useState<number>(PHASE_DURATIONS.prepare);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [totalPhaseDuration, setTotalPhaseDuration] = useState<number>(PHASE_DURATIONS.prepare);

  // Modal / Form state for awarding rebuttal
  const [selectedDebaterTeamId, setSelectedDebaterTeamId] = useState<number | null>(null);
  const [rebuttalLevel, setRebuttalLevel] = useState<RebuttalLevel>('valid');
  const [rebuttalNote, setRebuttalNote] = useState<string>('');

  const currentTeam = teams.find((t) => t.id === currentTeamId) || teams[0];
  const currentTopic = topics.find((tp) => tp.id === currentTeam.topicId);

  // Rebuttals in current round
  const currentRoundRebuttals = rebuttals.filter((r) => r.roundTeamId === currentTeam.id);

  // Change phase
  const handleSwitchPhase = useCallback((newPhase: RoundPhase) => {
    setPhase(newPhase);
    const duration = PHASE_DURATIONS[newPhase];
    setTimeLeft(duration);
    setTotalPhaseDuration(duration);
    setIsRunning(false);
    soundManager.playDing();
  }, []);

  // Timer tick effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            soundManager.playTimeUp();
            return 0;
          }
          // Warning ticks for last 10 seconds
          if (prev <= 11 && prev > 1) {
            soundManager.playTick(prev <= 6 ? 950 : 800);
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  // Keyboard shortcut: Spacebar toggles timer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsRunning((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigation handlers
  const handleNextTeam = () => {
    if (currentTeamId < teams.length) {
      setCurrentTeamId(currentTeamId + 1);
      handleSwitchPhase('prepare');
    }
  };

  const handlePrevTeam = () => {
    if (currentTeamId > 1) {
      setCurrentTeamId(currentTeamId - 1);
      handleSwitchPhase('prepare');
    }
  };

  const handleTimeAdjust = (seconds: number) => {
    setTimeLeft((prev) => Math.max(0, prev + seconds));
  };

  const handleResetTimer = () => {
    setTimeLeft(totalPhaseDuration);
    setIsRunning(false);
  };

  const handleConfirmRebuttal = () => {
    if (!selectedDebaterTeamId) return;

    let score = 0;
    if (rebuttalLevel === 'valid') score = 0.5;
    if (rebuttalLevel === 'sharp') score = 1.0;
    if (rebuttalLevel === 'excellent') score = 1.5;

    onAddRebuttal({
      roundTeamId: currentTeam.id,
      rebuttalTeamId: selectedDebaterTeamId,
      level: rebuttalLevel,
      score,
      note: rebuttalNote.trim(),
    });

    soundManager.playScoreAward();
    setSelectedDebaterTeamId(null);
    setRebuttalNote('');
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = totalPhaseDuration > 0 
    ? Math.max(0, Math.min(100, (timeLeft / totalPhaseDuration) * 100))
    : 0;

  const isLowTime = timeLeft <= 10 && timeLeft > 0;
  const isTimeUp = timeLeft === 0;

  const gradientId = useId();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      
      {/* 1. Team Selector Ribbon */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-600" />
            <span className="text-xs sm:text-sm font-extrabold text-slate-800 tracking-wider">
              Lượt Thi Của Đội
            </span>
          </div>

            <div className="flex items-center gap-1">
              <button
                id="prev-team-btn"
                onClick={handlePrevTeam}
                disabled={currentTeamId <= 1}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 text-slate-700 transition-colors border border-slate-200/80"
                title="Lượt đội trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-600 px-2 bg-slate-100/80 py-0.5 rounded border border-slate-200/60">
                ĐỘI {currentTeamId.toString().padStart(2, '0')} / {teams.length.toString().padStart(2, '0')}
              </span>
              <button
                id="next-team-btn"
                onClick={handleNextTeam}
                disabled={currentTeamId >= teams.length}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 text-slate-700 transition-colors border border-slate-200/80"
                title="Lượt đội tiếp theo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        {/* 10 Team Pills */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2">
          {teams.map((t) => {
            const isSelected = t.id === currentTeamId;
            const presTotal = calculatePresentationTotal(t.presentationScores);
            const overall = calculateOverallTotal(t, rebuttals);
            const isGraded = t.hasPresented || presTotal > 0;

            return (
              <button
                key={t.id}
                id={`select-team-btn-${t.id}`}
                onClick={() => {
                  setCurrentTeamId(t.id);
                  handleSwitchPhase('prepare');
                }}
                className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all border text-center ${
                  isSelected
                    ? 'bg-gradient-to-b from-cyan-50 to-blue-50 border-cyan-500 text-cyan-950 shadow-xs ring-2 ring-cyan-400/30'
                    : 'bg-slate-50/80 border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {isGraded && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                    ✓
                  </span>
                )}
                <span className="text-xs font-bold truncate max-w-full">
                  {t.name}
                </span>
                <span className={`text-[11px] font-mono mt-0.5 font-semibold ${isSelected ? 'text-cyan-700 font-bold' : 'text-slate-400'}`}>
                  {overall > 0 ? `${overall}đ` : '0đ'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1.5 Live Buzzer Alert Banner on Stage */}
      {buzzerQueue && buzzerQueue.length > 0 && (
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 rounded-2xl p-4 sm:p-5 text-white shadow-xl border border-rose-400/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <Bell className="w-6 h-6 text-amber-200 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                  #1 NHANH NHẤT
                </span>
                <span className="text-xs text-rose-100 font-mono">
                  {buzzerQueue.length} đội đã bấm chuông
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-white mt-1">
                🔔 {buzzerQueue[0].teamName} ĐÃ BẤM CHUÔNG XIN PHẢN BIỆN!
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-end md:self-center">
            <button
              onClick={() => {
                setSelectedDebaterTeamId(buzzerQueue[0].teamId);
              }}
              className="px-4 py-2 rounded-xl bg-white text-rose-700 hover:bg-rose-50 font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Mời {buzzerQueue[0].teamName} Phản Biện</span>
            </button>
            {onResetBuzzer && (
              <button
                onClick={onResetBuzzer}
                className="px-3 py-2 rounded-xl bg-black/25 hover:bg-black/40 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                title="Xóa danh sách chuông để mở lượt bấm mới"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại chuông</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Main Stage Stage Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Timer & Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Active Phase Bar */}
          <div className="grid grid-cols-3 gap-2">
            {(['prepare', 'present', 'rebuttal'] as RoundPhase[]).map((p) => {
              const active = phase === p;
              const names = {
                prepare: '1. Chuẩn Bị (01:00)',
                present: '2. Trình Bày (02:00)',
                rebuttal: '3. Phản Biện (01:00)',
              };

              return (
                <button
                  key={p}
                  id={`phase-btn-${p}`}
                  onClick={() => handleSwitchPhase(p)}
                  className={`py-3 px-2 rounded-xl font-bold text-xs sm:text-sm transition-all border text-center flex flex-col items-center justify-center gap-1 ${
                    active
                      ? 'bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 text-white border-cyan-500 shadow-md shadow-cyan-500/25 font-extrabold scale-[1.02]'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{names[p]}</span>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Huge Timer Stage Container */}
          <div className={`relative bg-white/95 rounded-3xl border p-6 sm:p-8 flex flex-col items-center justify-center transition-all duration-300 overflow-hidden shadow-md ${
            isTimeUp
              ? 'border-rose-400 ring-4 ring-rose-400/20 bg-rose-50/30'
              : isLowTime
              ? 'border-amber-400 ring-4 ring-amber-400/20 bg-amber-50/30'
              : 'border-slate-200/90'
          }`}>
            
            {/* Tech HUD Corner Accents */}
            <div className="absolute top-3 left-3 font-mono text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              <span>HUD // STAGE-{currentTeam.id.toString().padStart(2, '0')}</span>
            </div>
            <div className="absolute top-3 right-3 font-mono text-[10px] text-slate-400 tracking-widest">
              {isRunning ? 'STATUS: ACTIVE' : 'STATUS: STANDBY'}
            </div>

            {/* Background ambient glow */}
            <div className={`absolute -top-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none transition-colors duration-500 ${
              isTimeUp ? 'bg-rose-400' : isLowTime ? 'bg-amber-300' : 'bg-cyan-200'
            }`} />

            {/* Header of Stage */}
            <div className="text-center mb-4 z-10 mt-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-50 text-cyan-800 border border-cyan-200 mb-2 font-mono">
                <Clock className="w-3.5 h-3.5 text-cyan-600" />
                {PHASE_TITLES[phase].title}
              </span>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto line-clamp-2">
                {PHASE_TITLES[phase].subtitle}
              </p>
            </div>

            {/* Circular Timer Visual */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-2 flex items-center justify-center z-10">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="42%"
                  className="stroke-slate-100"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="42%"
                  className={`transition-all duration-300 stroke-current ${
                    isTimeUp
                      ? 'text-rose-500'
                      : isLowTime
                      ? 'text-amber-500'
                      : 'text-cyan-500'
                  }`}
                  strokeWidth="12"
                  strokeDasharray="264%"
                  strokeDashoffset={`${264 - (264 * progressPercent) / 100}%`}
                  strokeLinecap="round"
                  fill="transparent"
                  style={{ stroke: `url(#${gradientId})` }}
                />
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={isTimeUp ? '#f43f5e' : isLowTime ? '#f59e0b' : '#06b6d4'} />
                    <stop offset="100%" stopColor={isTimeUp ? '#e11d48' : isLowTime ? '#ea580c' : '#2563eb'} />
                  </linearGradient>
                </defs>
              </svg>

              {/* Time Numbers & Pulse */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className={`text-6xl sm:text-7xl font-black tracking-tight font-mono transition-colors ${
                  isTimeUp
                    ? 'text-rose-600 animate-pulse'
                    : isLowTime
                    ? 'text-amber-600 scale-105'
                    : 'text-slate-900'
                }`}>
                  {formatTime(timeLeft)}
                </span>
                
                <span className="mt-2 text-xs font-semibold uppercase tracking-widest">
                  {isTimeUp ? (
                    <span className="text-rose-600 font-bold bg-rose-100/80 px-2.5 py-0.5 rounded-full border border-rose-200">
                      HẾT GIỜ! DỪNG LƯỢT THI
                    </span>
                  ) : isRunning ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 font-mono text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      COUNTDOWN ACTIVE
                    </span>
                  ) : (
                    <span className="text-slate-400 font-mono text-[11px] bg-slate-100 px-2.5 py-0.5 rounded-full">
                      TẠM DỪNG (PHÍM CÁCH)
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Quick Time Adjusters & Stage Controls */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-4 z-10">
              
              {/* -10s */}
              <button
                id="timer-minus-10s-btn"
                onClick={() => handleTimeAdjust(-10)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1 border border-slate-200"
                title="Bớt 10 giây"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>10s</span>
              </button>

              {/* Reset */}
              <button
                id="timer-reset-btn"
                onClick={handleResetTimer}
                className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
                title="Đặt lại thời gian giai đoạn này"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Main Play / Pause Button */}
              <button
                id="timer-play-pause-btn"
                onClick={() => setIsRunning(!isRunning)}
                className={`px-8 py-3.5 rounded-2xl font-black text-sm sm:text-base transition-all transform active:scale-95 flex items-center gap-2 shadow-md ${
                  isRunning
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-amber-500/25'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-5 h-5 fill-current" />
                    <span>TẠM DỪNG</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                    <span>{timeLeft === 0 ? 'BẮT ĐẦU LẠI' : 'BẮT ĐẦU'}</span>
                  </>
                )}
              </button>

              {/* +30s */}
              <button
                id="timer-plus-30s-btn"
                onClick={() => handleTimeAdjust(30)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1 border border-slate-200"
                title="Cộng thêm 30 giây"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>30s</span>
              </button>

              {/* Next Phase Step */}
              <button
                id="timer-next-phase-btn"
                onClick={() => {
                  if (phase === 'prepare') handleSwitchPhase('present');
                  else if (phase === 'present') handleSwitchPhase('rebuttal');
                  else if (phase === 'rebuttal') handleSwitchPhase('prepare');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-cyan-700 font-semibold text-xs transition-colors flex items-center gap-1.5 border border-cyan-200"
                title="Chuyển sang giai đoạn tiếp theo"
              >
                <span>Giai đoạn sau</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>

            </div>

          </div>

          {/* Quick link to BGK score sheet for current team */}
          <div className="bg-white/95 rounded-2xl border border-slate-200/90 p-4 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-xs text-slate-500">
                Chấm điểm bài thi của <strong className="text-slate-900 font-bold">{currentTeam.name}</strong>
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-cyan-700 font-mono">
                  Điểm trình bày: {calculatePresentationTotal(currentTeam.presentationScores)} / 20đ
                </span>
                <span className="text-xs text-slate-300">•</span>
                <span className="text-xs font-semibold text-emerald-700 font-mono">
                  Tổng điểm đội hiện tại: {calculateOverallTotal(currentTeam, rebuttals)}đ
                </span>
              </div>
            </div>

            <button
              id="goto-scoring-from-stage-btn"
              onClick={() => onGoToScoring(currentTeam.id)}
              className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all text-white ${
                isAdmin
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/20'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20'
              }`}
            >
              {isAdmin ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-purple-200" />
                  <span>Chấm Điểm (Admin - 5 BGK)</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : currentJudge ? (
                <>
                  <span>Chấm Điểm ({currentJudge.name})</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Vào Chấm Điểm (Khóa BGK)</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Right Column: Topic Details & Rebuttal Registry (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Current Topic Card */}
          <div className="bg-white/95 backdrop-blur rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 mb-1.5">
                  // {currentTopic?.category || 'CHUYÊN ĐỀ TRANH LUẬN'}
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                  {currentTeam.name}: Đề #{currentTopic?.id || currentTeam.id}
                </h2>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Lượt {currentTeam.id}/10
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-800 leading-relaxed mb-4 bg-sky-50/70 p-3.5 rounded-2xl border border-sky-100">
              "{currentTopic?.title}"
            </p>

            {currentTopic?.description && (
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                {currentTopic.description}
              </p>
            )}

            {/* Guiding Questions */}
            {currentTopic?.guidingQuestions && currentTopic.guidingQuestions.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  Câu hỏi định hướng:
                </span>
                <ul className="space-y-1 text-xs text-slate-600">
                  {currentTopic.guidingQuestions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-cyan-600 font-bold">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Rebuttal Quick Manager Box */}
          <div className="bg-white/95 backdrop-blur rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-mono">
                  Phản Biện Trong Lượt Này
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {onOpenTeamBuzzer && (
                  <button
                    onClick={onOpenTeamBuzzer}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs transition-colors"
                    title="Mở giao diện chuông bấm cho các đội thi"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Chuông 10 Đội</span>
                  </button>
                )}
                <span className="text-xs font-mono text-slate-500">
                  {currentRoundRebuttals.length} lượt đã ghi
                </span>
              </div>
            </div>

            {/* List of recorded rebuttals in this round */}
            {currentRoundRebuttals.length > 0 ? (
              <div className="space-y-2">
                {currentRoundRebuttals.map((r) => {
                  const rebTeam = teams.find((t) => t.id === r.rebuttalTeamId);
                  const levelBadge = {
                    valid: { label: 'Mức 1: Hợp lệ', score: '+0.5đ', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
                    sharp: { label: 'Mức 2: Sắc sảo', score: '+1.0đ', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
                    excellent: { label: 'Mức 3: Xuất sắc', score: '+1.5đ', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    none: { label: '0 điểm', score: '0đ', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
                  }[r.level];

                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="font-bold text-slate-900 truncate">
                          {rebTeam?.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${levelBadge.bg}`}>
                          {levelBadge.score}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {r.note && (
                          <span className="text-slate-500 text-[11px] truncate max-w-[120px]" title={r.note}>
                            "{r.note}"
                          </span>
                        )}
                        <button
                          onClick={() => onRemoveRebuttal(r.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Xóa lượt phản biện này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-2 bg-slate-50 rounded-xl border border-slate-100">
                Chưa có đội nào phản biện trong lượt của {currentTeam.name}.
              </p>
            )}

            {/* Quick Action: Pick an eligible team to debate */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-600 block mb-2">
                Danh sách 9 đội xin phản biện (Mỗi đội tối đa 3 lần cả game):
              </span>

              <div className="grid grid-cols-3 gap-2">
                {teams
                  .filter((t) => t.id !== currentTeam.id)
                  .map((t) => {
                    const status = canTeamRebut(t.id, currentTeam.id, rebuttals);
                    const teamRebs = getTeamRebuttals(t.id, rebuttals);
                    const used = teamRebs.length;

                    return (
                      <button
                        key={t.id}
                        id={`rebut-pick-btn-${t.id}`}
                        disabled={!status.canRebut}
                        onClick={() => setSelectedDebaterTeamId(t.id)}
                        className={`p-2 rounded-xl text-left border text-xs transition-all flex flex-col justify-between ${
                          status.canRebut
                            ? 'bg-slate-50 hover:bg-sky-50 border-slate-200 text-slate-800 hover:border-cyan-400 hover:shadow-xs'
                            : 'bg-slate-100/60 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                        }`}
                        title={status.canRebut ? `Chọn ${t.name} phản biện` : status.reason}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold truncate">{t.name}</span>
                          {/* Token dots */}
                          <div className="flex gap-0.5" title={`${used}/3 lượt đã dùng`}>
                            {[0, 1, 2].map((dotIdx) => (
                              <span
                                key={dotIdx}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  dotIdx < used ? 'bg-rose-500' : 'bg-emerald-500'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <span className="text-[10px] mt-1 font-mono text-slate-500">
                          {status.canRebut ? `Còn ${3 - used} lượt` : status.reason}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Modal / Overlay to Award Rebuttal Score */}
      {selectedDebaterTeamId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 text-slate-800">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  // GHI NHẬN PHẢN BIỆN
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Đội phản biện: {teams.find((t) => t.id === selectedDebaterTeamId)?.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Đang phản biện lượt thi của: <strong className="text-cyan-700">{currentTeam.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedDebaterTeamId(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            {/* Score selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Chọn Mức Điểm Thưởng (Theo Thể Lệ):
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    level: 'valid' as RebuttalLevel,
                    title: 'Mức 1 – Hợp lệ (+0.5đ)',
                    desc: 'Phản biện đúng chủ đề, chỉ ra điểm cần làm rõ cơ bản.',
                    border: 'hover:border-blue-400',
                    active: 'border-blue-500 bg-blue-50/80 text-blue-900 ring-2 ring-blue-200',
                  },
                  {
                    level: 'sharp' as RebuttalLevel,
                    title: 'Mức 2 – Sắc sảo (+1.0đ)',
                    desc: 'Chạm điểm yếu/giả định quan trọng, có lý do rõ ràng.',
                    border: 'hover:border-amber-400',
                    active: 'border-amber-500 bg-amber-50/80 text-amber-900 ring-2 ring-amber-200',
                  },
                  {
                    level: 'excellent' as RebuttalLevel,
                    title: 'Mức 3 – Xuất sắc (+1.5đ)',
                    desc: 'Ngắn gọn nhưng sâu, phát hiện mâu thuẫn cốt lõi.',
                    border: 'hover:border-emerald-400',
                    active: 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-200',
                  },
                  {
                    level: 'none' as RebuttalLevel,
                    title: '0 Điểm (Vẫn tính 1 lượt)',
                    desc: 'Lạc đề, lặp lại ý, không rõ luận điểm hoặc công kích.',
                    border: 'hover:border-slate-300',
                    active: 'border-slate-400 bg-slate-100 text-slate-800 ring-2 ring-slate-200',
                  },
                ].map((opt) => (
                  <button
                    key={opt.level}
                    type="button"
                    onClick={() => setRebuttalLevel(opt.level)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      rebuttalLevel === opt.level
                        ? opt.active
                        : 'border-slate-200 bg-slate-50 text-slate-700 ' + opt.border
                    }`}
                  >
                    <div className="font-bold text-xs sm:text-sm">{opt.title}</div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional note */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Ghi chú nhận xét ngắn (tùy chọn):
              </label>
              <input
                type="text"
                value={rebuttalNote}
                onChange={(e) => setRebuttalNote(e.target.value)}
                placeholder="Ví dụ: Chỉ ra đúng giả định chi phí giải pháp..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-cyan-500 focus:bg-white"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedDebaterTeamId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmRebuttal}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
              >
                Xác Nhận & Cộng Điểm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
