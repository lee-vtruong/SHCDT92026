import React, { useState } from 'react';
import { RotateCcw, Lock, X, AlertTriangle, CheckCircle2, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { verifyAdminPassword } from '../utils/scoring';
import { soundManager } from '../utils/audio';

interface AdminResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmResetScores: (resetTopicsAlso?: boolean) => void;
}

export const AdminResetModal: React.FC<AdminResetModalProps> = ({
  isOpen,
  onClose,
  onConfirmResetScores,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetTopics, setResetTopics] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (verifyAdminPassword(password)) {
      soundManager.playDing();
      setSuccessMsg('Xác thực quyền Admin thành công! Đang khôi phục toàn bộ điểm về 0...');
      setTimeout(() => {
        onConfirmResetScores(resetTopics);
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white border border-rose-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 text-slate-800">
        
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
                Khôi Phục Toàn Bộ Điểm Về 0
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

        {/* Warning Banner */}
        <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs text-rose-900 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-rose-800">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Cảnh báo hành động quản trị:</span>
          </div>
          <p className="text-rose-700 leading-relaxed text-[11px]">
            Hành động này sẽ <strong>xóa toàn bộ phiếu chấm của 5 Giám khảo</strong>, đưa <strong>điểm trình bày của cả 10 đội về 0</strong> và <strong>xóa tất cả lượt cộng điểm phản biện</strong>.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5 font-mono flex items-center justify-between">
              <span>Mật khẩu Admin xác nhận:</span>
              <span className="text-[10px] text-slate-400 font-sans font-normal lowercase">(chỉ ban quản trị)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Nhập mật khẩu Admin để xác nhận..."
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

          <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-slate-600 select-none">
            <input
              type="checkbox"
              checked={resetTopics}
              onChange={(e) => setResetTopics(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
            <span>Đồng thời đặt lại phân công đề tài về mặc định</span>
          </label>

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
              className="w-1/2 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs transition-all shadow-md shadow-rose-500/25 active:scale-[0.99] flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Điểm Về 0</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
