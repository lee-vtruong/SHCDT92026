import React, { useState } from 'react';
import { RotateCcw, Lock, X, AlertTriangle, CheckCircle2, Eye, EyeOff, ShieldAlert, Sparkles, RefreshCw, ArrowLeftCircle } from 'lucide-react';
import { verifyAdminPassword } from '../utils/scoring';
import { soundManager } from '../utils/audio';

export interface AdminResetOptions {
  resetAll: boolean;
  resetTopics: boolean;
  resetSessions: boolean;
  setTeam1: boolean;
}

interface AdminResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmResetScores: (options?: AdminResetOptions | boolean) => void;
  currentTeamId?: number;
  onSwitchToTeam1?: () => void;
}

export const AdminResetModal: React.FC<AdminResetModalProps> = ({
  isOpen,
  onClose,
  onConfirmResetScores,
  currentTeamId = 1,
  onSwitchToTeam1,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState<'full_all' | 'scores_only'>('full_all');
  const [resetSessions, setResetSessions] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickJumpTeam1 = () => {
    soundManager.playDing();
    if (onSwitchToTeam1) {
      onSwitchToTeam1();
    }
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (verifyAdminPassword(password)) {
      soundManager.playScoreAward();
      const isFull = resetMode === 'full_all';
      setSuccessMsg(
        isFull
          ? 'Đã xác thực Admin! Đang khôi phục toàn bộ cuộc thi về mặc định ban đầu (Đội 1)...'
          : 'Đã xác thực Admin! Đang đưa toàn bộ điểm số về 0 (giữ nguyên đề tài)...'
      );

      setTimeout(() => {
        onConfirmResetScores({
          resetAll: isFull,
          resetTopics: isFull,
          resetSessions: isFull && resetSessions,
          setTeam1: true,
        });
        setPassword('');
        setSuccessMsg(null);
        setErrorMsg(null);
        onClose();
      }, 700);
    } else {
      soundManager.playDing();
      setErrorMsg('Mật khẩu Admin không chính xác. Thao tác bị từ chối!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white border border-rose-200 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 text-slate-800 my-8">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                // QUẢN TRỊ VIÊN (ADMIN)
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                Bảng Điều Khiển & Reset Cuộc Thi
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              setPassword('');
              setErrorMsg(null);
              setSuccessMsg(null);
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Shortcut: Just go back to Team 1 without deleting data */}
        <div className="p-3.5 rounded-2xl bg-cyan-50/90 border border-cyan-200 text-xs text-cyan-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="font-bold flex items-center gap-1.5 text-cyan-900">
              <ArrowLeftCircle className="w-4 h-4 text-cyan-600 shrink-0" />
              <span>Chỉ muốn quay lại Đội 1? (Không xóa dữ liệu)</span>
            </div>
            <p className="text-[11px] text-cyan-800 leading-tight">
              Đang ở <strong>Đội {currentTeamId}</strong>. Bạn có thể chuyển ngay về Đội 1 mà không mất điểm hoặc đề tài đã bốc.
            </p>
          </div>
          <button
            type="button"
            onClick={handleQuickJumpTeam1}
            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shrink-0 shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Về Đội 1 Ngay</span>
          </button>
        </div>

        {/* Mode Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block font-mono">
            Chọn chế độ Reset:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Mode 1: Full Factory Reset */}
            <button
              type="button"
              onClick={() => setResetMode('full_all')}
              className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                resetMode === 'full_all'
                  ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-300 text-rose-950 shadow-xs'
                  : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-black text-rose-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Reset Toàn Bộ (Default)
                </span>
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                  resetMode === 'full_all' ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-300'
                }`}>
                  {resetMode === 'full_all' ? '●' : ''}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Về Đội 1 ban đầu, xóa toàn bộ đề tài 10 đội, xóa phiếu chấm 5 GK & phản biện về 0, reset đồng hồ & chuông.
              </p>
            </button>

            {/* Mode 2: Scores only */}
            <button
              type="button"
              onClick={() => setResetMode('scores_only')}
              className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                resetMode === 'scores_only'
                  ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-300 text-amber-950 shadow-xs'
                  : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-black text-amber-800 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Chỉ Reset Điểm Số
                </span>
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                  resetMode === 'scores_only' ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-300'
                }`}>
                  {resetMode === 'scores_only' ? '●' : ''}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Giữ nguyên đề thi đã bốc của các đội, chỉ xóa điểm 5 Giám khảo và điểm phản biện về 0 để chấm lại.
              </p>
            </button>
          </div>
        </div>

        {/* Warning Banner */}
        <div className={`p-3 rounded-2xl border text-xs space-y-1 ${
          resetMode === 'full_all'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              {resetMode === 'full_all'
                ? 'Hành động này sẽ khôi phục cuộc thi về trạng thái nguyên bản xuất phát từ Đội 1.'
                : 'Chỉ reset phiếu chấm điểm và phản biện, đề tài các đội đã bốc vẫn được bảo lưu.'}
            </span>
          </div>
        </div>

        {/* Additional Option for full reset */}
        {resetMode === 'full_all' && (
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 select-none bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={resetSessions}
              onChange={(e) => setResetSessions(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
            <span>Đồng thời mở khóa thiết bị để các đội đăng nhập lại từ đầu</span>
          </label>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5 font-mono flex items-center justify-between">
              <span>Mật khẩu Admin xác nhận:</span>
              <span className="text-[10px] text-slate-400 font-sans font-normal lowercase">(mặc định: admin123)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Nhập mật khẩu Admin (admin123)..."
                autoFocus
                className="w-full pl-10 pr-11 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono tracking-wider focus:outline-none focus:border-rose-500 focus:bg-white transition-all"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-2 text-slate-400 hover:text-slate-700 absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setPassword('');
                setErrorMsg(null);
                setSuccessMsg(null);
                onClose();
              }}
              className="w-1/2 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className={`w-1/2 py-2.5 rounded-2xl text-white font-black text-xs transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-1.5 ${
                resetMode === 'full_all'
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-500/25'
                  : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/25'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{resetMode === 'full_all' ? 'Reset Toàn Bộ Về Đội 1' : 'Reset Điểm Về 0'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
