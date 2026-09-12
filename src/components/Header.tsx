import React, { useState } from 'react';
import { 
  Timer, 
  Award, 
  Trophy, 
  BookOpen, 
  HelpCircle, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Sparkles,
  ShieldCheck,
  KeyRound,
  Lock,
  GraduationCap,
  Bell,
  Shuffle,
  RotateCcw
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { JudgeInfo, TeamAccount } from '../types';

export type ActiveTab = 'stage' | 'scoring' | 'leaderboard' | 'random-topic' | 'judges' | 'topics' | 'rules';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  onOpenAdminReset?: () => void;
  onExportData?: () => void;
  onImportData?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  currentJudge: JudgeInfo | null;
  onOpenJudgeAuth: () => void;
  isAdmin?: boolean;
  onLogoutAdmin?: () => void;
  onOpenTeamBuzzer?: () => void;
  currentTeamAuth?: TeamAccount | null;
  buzzerQueueCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  soundEnabled,
  setSoundEnabled,
  onOpenAdminReset,
  onExportData,
  onImportData,
  currentJudge,
  onOpenJudgeAuth,
  isAdmin = false,
  onLogoutAdmin,
  onOpenTeamBuzzer,
  currentTeamAuth,
  buzzerQueueCount = 0,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.setEnabled(next);
    if (next) {
      soundManager.playDing();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 text-slate-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          
          {/* 1. Logo & Compact Title */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 flex items-center justify-center shadow-xs text-white shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
              Trình Bày & Phản Biện
            </span>
          </div>

          {/* 2. Navigation Tabs (Clean & Prominent) */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-1.5">
            <button
              id="tab-stage-btn"
              onClick={() => setActiveTab('stage')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'stage'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Timer className="w-4 h-4 shrink-0" />
              <span>Sân Khấu</span>
            </button>

            <button
              id="tab-scoring-btn"
              onClick={() => setActiveTab('scoring')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'scoring'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4 shrink-0" />
              <span>Chấm Điểm</span>
              {isAdmin ? (
                <span className="text-[10px] bg-purple-100 text-purple-800 border border-purple-200 font-bold px-1 py-0.2 rounded font-mono">
                  Admin
                </span>
              ) : !currentJudge ? (
                <Lock className="w-3 h-3 text-slate-400 shrink-0" />
              ) : null}
            </button>

            <button
              id="tab-leaderboard-btn"
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'leaderboard'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-4 h-4 shrink-0" />
              <span>Bảng Điểm</span>
            </button>

            {/* 🎲 Tab Bốc Thăm Đề Ngẫu Nhiên */}
            <button
              id="tab-random-topic-btn"
              onClick={() => setActiveTab('random-topic')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'random-topic'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs ring-2 ring-cyan-300'
                  : 'text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200'
              }`}
              title="Giao diện bốc thăm ngẫu nhiên đề thi cho từng đội"
            >
              <Shuffle className="w-4 h-4 shrink-0 text-cyan-600" />
              <span>🎲 Bốc Thăm Đề</span>
            </button>

            {/* ⭐ Tab Giới Thiệu BGK - Always Highlighted & Easy to Find */}
            <button
              id="tab-judges-btn"
              onClick={() => setActiveTab('judges')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === 'judges'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm ring-2 ring-amber-300'
                  : 'bg-amber-50/80 text-amber-900 border border-amber-200/90 hover:bg-amber-100 hover:border-amber-300'
              }`}
              title="Xem thông tin và giới thiệu Hội đồng Ban Giám Khảo"
            >
              <GraduationCap className={`w-4 h-4 shrink-0 ${activeTab === 'judges' ? 'text-slate-950' : 'text-amber-600'}`} />
              <span>⭐ Giới Thiệu BGK</span>
            </button>

            <button
              id="tab-topics-btn"
              onClick={() => setActiveTab('topics')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'topics'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>16 Đề</span>
            </button>

            <button
              id="tab-rules-btn"
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'rules'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>Thể Lệ</span>
            </button>
          </nav>

          {/* 3. Essential Tools (Cleaned & Minimalist) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            {/* Team Buzzer Button */}
            {onOpenTeamBuzzer && (
              <button
                id="team-buzzer-header-btn"
                onClick={onOpenTeamBuzzer}
                title={
                  currentTeamAuth
                    ? `Đang đăng nhập: ${currentTeamAuth.name}. Bấm để mở chuông.`
                    : 'Mở chuông bấm dành cho 10 Đội Thi'
                }
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-xs ${
                  currentTeamAuth
                    ? 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-200'
                }`}
              >
                <div className="relative">
                  <Bell className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  {buzzerQueueCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                  )}
                </div>
                <span className="truncate max-w-[80px] sm:max-w-none">
                  {currentTeamAuth ? currentTeamAuth.name : 'Chuông Đội'}
                </span>
                {buzzerQueueCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold">
                    {buzzerQueueCount}
                  </span>
                )}
              </button>
            )}
            
            {/* Judge / Admin Auth Status */}
            {isAdmin ? (
              <button
                id="admin-badge-btn"
                onClick={onOpenJudgeAuth}
                title="Đang đăng nhập Admin. Bấm để đăng xuất."
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-100 border border-purple-300 text-purple-900 hover:bg-purple-200 transition-all shadow-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                <span className="truncate max-w-[80px] sm:max-w-none">Admin</span>
              </button>
            ) : currentJudge ? (
              <button
                id="judge-badge-btn"
                onClick={onOpenJudgeAuth}
                title={`Đang đăng nhập: ${currentJudge.name}. Bấm để đổi hoặc đăng xuất.`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-50 border border-cyan-300 text-cyan-800 hover:bg-cyan-100 transition-all shadow-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span className="truncate max-w-[80px] sm:max-w-none">{currentJudge.name}</span>
              </button>
            ) : (
              <button
                id="judge-login-btn"
                onClick={onOpenJudgeAuth}
                title="Nhập mã để mở quyền Ban Giám Khảo hoặc Admin"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 border border-slate-200 hover:border-cyan-300 transition-all shadow-xs"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="hidden sm:inline">Đăng Nhập BGK</span>
                <span className="sm:hidden">BGK</span>
              </button>
            )}

            {/* Admin Reset All / Change Team */}
            {onOpenAdminReset && (
              <button
                id="header-admin-reset-btn"
                onClick={onOpenAdminReset}
                title="Bảng điều khiển Admin: Đổi đội / Reset toàn bộ về mặc định (Mật khẩu: admin123)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-all shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="hidden sm:inline">Reset / Đổi Đội</span>
                <span className="sm:hidden">Reset</span>
              </button>
            )}

            {/* Audio Toggle */}
            <button
              id="sound-toggle-btn"
              onClick={toggleSound}
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
              className={`p-1.5 sm:p-2 rounded-xl transition-all border ${
                soundEnabled
                  ? 'text-cyan-700 bg-cyan-50 border-cyan-200 hover:bg-cyan-100'
                  : 'text-slate-400 bg-slate-100 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Fullscreen Mode */}
            <button
              id="fullscreen-toggle-btn"
              onClick={toggleFullscreen}
              title="Toàn màn hình máy chiếu"
              className="p-1.5 sm:p-2 rounded-xl text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 hover:text-slate-900 transition-all hidden sm:flex"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* 4. Mobile / Tablet Navigation Sub-bar */}
        <div className="md:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none">
          <button
            onClick={() => setActiveTab('stage')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
              activeTab === 'stage' ? 'bg-cyan-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Sân Khấu
          </button>
          <button
            onClick={() => setActiveTab('scoring')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
              activeTab === 'scoring' ? 'bg-cyan-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Chấm Điểm
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
              activeTab === 'leaderboard' ? 'bg-cyan-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Bảng Điểm
          </button>
          <button
            onClick={() => setActiveTab('judges')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 ${
              activeTab === 'judges'
                ? 'bg-amber-500 text-slate-950 font-extrabold'
                : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}
          >
            ⭐ Giới Thiệu BGK
          </button>
          <button
            onClick={() => setActiveTab('topics')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
              activeTab === 'topics' ? 'bg-cyan-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            16 Đề
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
              activeTab === 'rules' ? 'bg-cyan-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Thể Lệ
          </button>
        </div>

      </div>
    </header>
  );
};
