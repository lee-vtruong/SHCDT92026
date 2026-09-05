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
  RotateCcw,
  Sparkles,
  Download,
  Upload,
  ShieldCheck,
  KeyRound,
  Lock
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { JudgeInfo } from '../types';

export type ActiveTab = 'stage' | 'scoring' | 'leaderboard' | 'topics' | 'rules';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  onOpenAdminReset: () => void;
  onExportData: () => void;
  onImportData: (event: React.ChangeEvent<HTMLInputElement>) => void;
  currentJudge: JudgeInfo | null;
  onOpenJudgeAuth: () => void;
  isAdmin?: boolean;
  onLogoutAdmin?: () => void;
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
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/90 text-slate-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/25 shrink-0 text-white">
              <Sparkles className="w-5 h-5 font-black" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 truncate">
                  Trình Bày & Phản Biện
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-50 text-cyan-700 border border-cyan-200/80">
                  // 10 ĐỘI THI
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block truncate">
                Sinh hoạt chuyên đề • Sân khấu đếm ngược & Chấm điểm trực tiếp
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 scrollbar-none">
            <button
              id="tab-stage-btn"
              onClick={() => setActiveTab('stage')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'stage'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Timer className="w-4 h-4 shrink-0" />
              <span>Bấm Giờ Sân Khấu</span>
            </button>

            <button
              id="tab-scoring-btn"
              onClick={() => setActiveTab('scoring')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'scoring'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Award className="w-4 h-4 shrink-0" />
              <span>BGK Chấm Điểm</span>
              {isAdmin ? (
                <span className="text-[10px] bg-purple-100 text-purple-800 border border-purple-200 font-bold px-1.5 py-0.2 rounded font-mono">
                  Admin
                </span>
              ) : !currentJudge ? (
                <Lock className="w-3 h-3 text-slate-400 shrink-0" />
              ) : null}
            </button>

            <button
              id="tab-leaderboard-btn"
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'leaderboard'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-4 h-4 shrink-0" />
              <span>Bảng Xếp Hạng</span>
            </button>

            <button
              id="tab-topics-btn"
              onClick={() => setActiveTab('topics')}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'topics'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">16 Đề Bài</span>
            </button>

            <button
              id="tab-rules-btn"
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'rules'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Thể Lệ</span>
            </button>
          </nav>

          {/* Quick Utility Tools */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            
            {/* Judge / Admin Auth Status Button */}
            {isAdmin ? (
              <button
                id="admin-badge-btn"
                onClick={onOpenJudgeAuth}
                title="Đang đăng nhập: Quản Trị Viên (Toàn quyền sửa điểm 5 BGK). Nhấn để quản lý hoặc đăng xuất."
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-100 border border-purple-300 text-purple-900 hover:bg-purple-200 transition-all shadow-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                <span className="truncate max-w-[90px] sm:max-w-none">Admin (5 BGK)</span>
              </button>
            ) : currentJudge ? (
              <button
                id="judge-badge-btn"
                onClick={onOpenJudgeAuth}
                title={`Đang đăng nhập: ${currentJudge.name}. Nhấn để đổi hoặc đăng xuất.`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-50 border border-cyan-300 text-cyan-800 hover:bg-cyan-100 transition-all shadow-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <span className="truncate max-w-[85px] sm:max-w-none">{currentJudge.name}</span>
                {currentJudge.isBackup && (
                  <span className="text-[10px] text-amber-600 bg-amber-100 px-1 py-0.2 rounded font-mono hidden sm:inline">
                    DP
                  </span>
                )}
              </button>
            ) : (
              <button
                id="judge-login-btn"
                onClick={onOpenJudgeAuth}
                title="Nhập mật khẩu để mở quyền Ban Giám Khảo hoặc Admin"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 border border-slate-200 hover:border-cyan-300 transition-all shadow-xs"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="hidden sm:inline">Xác Thực BGK / Admin</span>
                <span className="sm:hidden">BGK</span>
              </button>
            )}

            {/* Audio Toggle */}
            <button
              id="sound-toggle-btn"
              onClick={toggleSound}
              title={soundEnabled ? 'Tắt âm thanh chuông báo' : 'Bật âm thanh chuông báo'}
              className={`p-2 rounded-xl transition-all border ${
                soundEnabled
                  ? 'text-cyan-700 bg-cyan-50 border-cyan-200 hover:bg-cyan-100 shadow-xs'
                  : 'text-slate-400 bg-slate-100 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Fullscreen */}
            <button
              id="fullscreen-toggle-btn"
              onClick={toggleFullscreen}
              title="Toàn màn hình (Chế độ máy chiếu)"
              className="p-2 rounded-xl text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 hover:text-slate-900 transition-all hidden sm:flex"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Export / Backup dropdown or direct buttons */}
            <button
              id="export-data-btn"
              onClick={onExportData}
              title="Sao lưu dữ liệu giải đấu (JSON)"
              className="p-2 rounded-xl text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 hover:text-slate-900 transition-all hidden lg:flex"
            >
              <Download className="w-4 h-4" />
            </button>

            <label
              id="import-data-label"
              title="Nạp dữ liệu đã lưu (JSON)"
              className="p-2 rounded-xl text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 hover:text-slate-900 transition-all cursor-pointer hidden lg:flex"
            >
              <Upload className="w-4 h-4" />
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={onImportData}
                className="hidden"
              />
            </label>

            {/* Reset All Scores (Admin Protected) */}
            <button
              id="reset-all-btn"
              onClick={onOpenAdminReset}
              title="Khôi phục toàn bộ điểm số về 0 (Yêu cầu mật khẩu Admin: admin123)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition-all shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Reset Điểm</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
