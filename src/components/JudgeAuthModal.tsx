import React, { useState } from 'react';
import { ShieldCheck, KeyRound, X, AlertCircle, CheckCircle2, UserCheck, Eye, EyeOff, Lock, ShieldAlert } from 'lucide-react';
import { JudgeInfo } from '../types';
import { authenticateJudge, verifyAdminPassword } from '../utils/scoring';
import { soundManager } from '../utils/audio';

interface JudgeAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentJudge: JudgeInfo | null;
  onSelectJudge: (judge: JudgeInfo) => void;
  onLogoutJudge: () => void;
  isAdmin?: boolean;
  onLoginAdmin?: () => void;
  onLogoutAdmin?: () => void;
}

export const JudgeAuthModal: React.FC<JudgeAuthModalProps> = ({
  isOpen,
  onClose,
  currentJudge,
  onSelectJudge,
  onLogoutJudge,
  isAdmin = false,
  onLoginAdmin,
  onLogoutAdmin,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Check Admin password
    if (verifyAdminPassword(password)) {
      soundManager.playScoreAward();
      setSuccessMsg('Xác thực thành công: Đăng nhập quyền Quản trị viên (Toàn quyền sửa điểm 5 BGK)!');
      setTimeout(() => {
        onLoginAdmin?.();
        setPassword('');
        setSuccessMsg(null);
        onClose();
      }, 600);
      return;
    }

    // 2. Check Judge password
    const judge = authenticateJudge(password);
    if (judge) {
      soundManager.playScoreAward();
      setSuccessMsg(`Xác thực thành công: Chào mừng ${judge.name}!`);
      setTimeout(() => {
        onSelectJudge(judge);
        setPassword('');
        setSuccessMsg(null);
        onClose();
      }, 600);
      return;
    }

    soundManager.playDing();
    setErrorMsg('Mật khẩu không chính xác. Vui lòng nhập mật khẩu BGK hoặc Admin!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 text-slate-800">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isAdmin ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
            }`}>
              {isAdmin ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <span className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                isAdmin ? 'text-purple-700 bg-purple-50 border-purple-200' : 'text-cyan-700 bg-cyan-50 border border-cyan-200'
              }`}>
                {isAdmin ? '// QUẢN TRỊ VIÊN (ADMIN)' : '// XÁC THỰC BGK / ADMIN'}
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                Phân Quyền Chấm Điểm
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Admin status if logged in */}
        {isAdmin && (
          <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-700 shrink-0" />
              <div className="text-xs">
                <span className="text-purple-600 font-mono text-[10px] block">Đang đăng nhập:</span>
                <span className="font-extrabold text-purple-950">Quản Trị Viên (Admin)</span>
                <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded ml-1 font-sans">
                  Sửa điểm cả 5 BGK
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                onLogoutAdmin?.();
                setPassword('');
                setErrorMsg(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-bold border border-slate-200 transition-colors"
            >
              Đăng xuất Admin
            </button>
          </div>
        )}

        {/* Current Judge status if already logged in */}
        {currentJudge && (
          <div className="p-3.5 rounded-2xl bg-cyan-50/70 border border-cyan-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-700 shrink-0" />
              <div className="text-xs">
                <span className="text-slate-500 block">Đang đăng nhập:</span>
                <span className="font-extrabold text-slate-900">{currentJudge.name}</span>
                {currentJudge.isBackup && (
                  <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded ml-1 font-mono">
                    Dự phòng
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                onLogoutJudge();
                setPassword('');
                setErrorMsg(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-bold border border-slate-200 transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5 font-mono">
              Nhập Mật Khẩu BGK Hoặc Mật Khẩu Admin:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Nhập mật khẩu BGK hoặc mật khẩu Admin..."
                autoFocus
                className="w-full pl-10 pr-11 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-mono tracking-wider focus:outline-none focus:border-cyan-500 focus:bg-white transition-all"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              
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
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-sm transition-all shadow-md shadow-cyan-500/25 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Xác Nhận Đăng Nhập (BGK / Admin)</span>
          </button>
        </form>

        {/* Security Notice */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Lock className="w-3.5 h-3.5 text-cyan-600" />
            <span>Quyền hạn hệ thống:</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            • <strong>Ban Giám khảo:</strong> Nhập mật khẩu cá nhân (GK 1..5) để chấm điểm theo phiếu riêng.<br/>
            • <strong>Quản trị viên (Admin):</strong> Nhập mật khẩu Admin để có toàn quyền xem, chỉnh sửa hoặc xóa phiếu điểm của bất kỳ Giám khảo nào.
          </p>
        </div>

      </div>
    </div>
  );
};
