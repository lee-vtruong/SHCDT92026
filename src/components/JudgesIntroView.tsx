import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, 
  Trophy, 
  Sparkles, 
  GraduationCap, 
  Maximize2, 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  RotateCcw, 
  Quote, 
  CheckCircle2, 
  ShieldCheck,
  User,
  Camera
} from 'lucide-react';
import { JudgeProfile } from '../types';
import { INITIAL_JUDGE_PROFILES } from '../data/judgeProfiles';
import { soundManager } from '../utils/audio';

const STORAGE_KEY_PHOTOS = 'chuyende_judge_custom_photos_v1';

export const JudgesIntroView: React.FC = () => {
  const [profiles, setProfiles] = useState<JudgeProfile[]>(INITIAL_JUDGE_PROFILES);
  const [customPhotos, setCustomPhotos] = useState<Record<number, string>>({});
  const [spotlightIndex, setSpotlightIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadId, setActiveUploadId] = useState<number | null>(null);

  // Load custom photos from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PHOTOS);
      if (saved) {
        setCustomPhotos(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const handlePhotoUpload = (judgeId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        const next = { ...customPhotos, [judgeId]: result };
        setCustomPhotos(next);
        try {
          localStorage.setItem(STORAGE_KEY_PHOTOS, JSON.stringify(next));
        } catch {}
        soundManager.playScoreAward();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResetPhoto = (judgeId: number) => {
    const next = { ...customPhotos };
    delete next[judgeId];
    setCustomPhotos(next);
    try {
      localStorage.setItem(STORAGE_KEY_PHOTOS, JSON.stringify(next));
    } catch {}
  };

  const openSpotlight = (index: number) => {
    setSpotlightIndex(index);
    soundManager.playDing();
  };

  const nextSpotlight = () => {
    if (spotlightIndex === null) return;
    const next = (spotlightIndex + 1) % profiles.length;
    setSpotlightIndex(next);
    soundManager.playDing();
  };

  const prevSpotlight = () => {
    if (spotlightIndex === null) return;
    const prev = (spotlightIndex - 1 + profiles.length) % profiles.length;
    setSpotlightIndex(prev);
    soundManager.playDing();
  };

  const closeSpotlight = () => {
    setSpotlightIndex(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hidden File Input for uploading judge avatar */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => activeUploadId && handlePhotoUpload(activeUploadId, e)}
      />

      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-indigo-900/50 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold tracking-wide">
              <Award className="w-3.5 h-3.5" />
              <span>HỘI ĐỒNG GIÁM KHẢO CHÍNH THỨC</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Giới Thiệu Ban Giám Khảo Chuyên Đề
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Hội đồng Giám khảo đồng hành cùng 10 đội thi trong buổi sinh hoạt chuyên đề: Trình bày & Phản biện ý tưởng. Công tâm, minh bạch, đánh giá sắc bén và truyền cảm hứng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => openSpotlight(0)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Trình Chiếu Giới Thiệu (MC)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Judges Showcase Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {profiles.map((judge, index) => {
          const photoUrl = customPhotos[judge.id] || judge.avatarUrl;
          const hasCustomPhoto = !!customPhotos[judge.id];

          return (
            <div
              key={judge.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group"
            >
              {/* Card Header Color Accent */}
              <div className={`h-2.5 w-full bg-gradient-to-r ${judge.fallbackColor}`} />

              <div className="p-6 flex-1 flex flex-col space-y-5">
                {/* Judge Photo & Avatar Container */}
                <div className="relative mx-auto w-36 h-36 sm:w-40 sm:h-40 rounded-2xl overflow-hidden shadow-md border-4 border-white ring-2 ring-slate-100 bg-slate-100 flex items-center justify-center group-hover:scale-[1.02] transition-transform">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={judge.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        // Fallback to avatar placeholder if image path fails
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}

                  {/* Fallback Icon when image not available */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 -z-10">
                    <User className="w-14 h-14" />
                    <span className="text-[11px] font-medium mt-1">Ảnh Giám khảo {judge.id}</span>
                  </div>

                  {/* Upload photo overlay button */}
                  <button
                    onClick={() => {
                      setActiveUploadId(judge.id);
                      fileInputRef.current?.click();
                    }}
                    title="Tải ảnh mới từ thiết bị"
                    className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold gap-1 backdrop-blur-xs"
                  >
                    <Camera className="w-6 h-6 text-amber-300" />
                    <span>Tải ảnh lên</span>
                  </button>

                  {/* Role Badge on Image */}
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-[10px] font-mono font-bold text-amber-300 border border-amber-400/30">
                    BGK #{judge.id}
                  </span>
                </div>

                {/* Judge Basic Info */}
                <div className="text-center space-y-1.5">
                  <span className="text-[11px] font-mono font-bold tracking-wider text-cyan-700 uppercase">
                    {judge.role}
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {judge.name}
                  </h3>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{judge.subTitle}</span>
                  </div>
                </div>

                {/* Achievements List */}
                <div className="space-y-2.5 pt-2 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    <span>Thành Tích & Vai Trò</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
                    {judge.achievements.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Quote / Bio */}
                {judge.bioQuote && (
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-amber-900 text-xs italic flex items-start gap-2">
                    <Quote className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>&ldquo;{judge.bioQuote}&rdquo;</span>
                  </div>
                )}

                {/* Actions: Spotlight view or replace photo */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                  <button
                    onClick={() => openSpotlight(index)}
                    className="text-cyan-700 hover:text-cyan-900 font-bold inline-flex items-center gap-1 transition-colors"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Chi tiết / MC chiếu</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveUploadId(judge.id);
                        fileInputRef.current?.click();
                      }}
                      className="text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 transition-colors"
                      title="Tải ảnh lên"
                    >
                      <Upload className="w-3 h-3" />
                      <span>{hasCustomPhoto ? 'Đổi ảnh' : 'Tải ảnh'}</span>
                    </button>
                    {hasCustomPhoto && (
                      <button
                        onClick={() => handleResetPhoto(judge.id)}
                        className="text-rose-500 hover:text-rose-700 font-medium"
                        title="Về ảnh mặc định"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hall of Fame / Spotlight Fullscreen Mode for MC */}
      {spotlightIndex !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col my-auto">
            {/* Modal Controls */}
            <div className="p-4 sm:p-6 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-mono text-xs text-amber-300 font-bold uppercase tracking-wider">
                  TIÊU ĐIỂM GIÁM KHẢO ({spotlightIndex + 1}/{profiles.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={prevSpotlight}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Giám khảo trước"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextSpotlight}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Giám khảo kế tiếp"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={closeSpotlight}
                  className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-semibold text-xs transition-colors ml-2"
                >
                  Đóng (ESC)
                </button>
              </div>
            </div>

            {/* Spotlight Body */}
            {(() => {
              const currentJudge = profiles[spotlightIndex];
              const photo = customPhotos[currentJudge.id] || currentJudge.avatarUrl;

              return (
                <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  {/* Photo Large Column */}
                  <div className="md:col-span-5 flex flex-col items-center">
                    <div className="relative w-52 h-52 sm:w-64 sm:h-64 rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-400/40 ring-4 ring-amber-400/10 bg-slate-800">
                      {photo ? (
                        <img
                          src={photo}
                          alt={currentJudge.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-top"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : null}
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800 text-slate-400 -z-10">
                        <User className="w-20 h-20" />
                        <span className="text-xs mt-2">Ảnh BGK {currentJudge.id}</span>
                      </div>
                    </div>
                    <span className="mt-4 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-mono font-bold">
                      HỘI ĐỒNG GIÁM KHẢO #{currentJudge.id}
                    </span>
                  </div>

                  {/* Details Column */}
                  <div className="md:col-span-7 space-y-4 text-left">
                    <div>
                      <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                        {currentJudge.role}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                        {currentJudge.name}
                      </h2>
                      <div className="inline-flex items-center gap-2 mt-2 px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-sm font-semibold">
                        <ShieldCheck className="w-4 h-4 text-rose-400" />
                        <span>{currentJudge.subTitle}</span>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span>Dấu Ấn & Thành Tích Nổi Bật</span>
                      </h4>
                      <div className="space-y-2">
                        {currentJudge.achievements.map((ach, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-200 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{ach}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {currentJudge.bioQuote && (
                      <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-200 text-sm italic flex items-start gap-2.5">
                        <Quote className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <span>&ldquo;{currentJudge.bioQuote}&rdquo;</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Bottom Footer Navigation */}
            <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Nhấn phím mũi tên hoặc nút bấm để chuyển nhanh Giám khảo</span>
              <div className="flex items-center gap-2">
                {profiles.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setSpotlightIndex(i)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      i === spotlightIndex ? 'bg-amber-400 scale-125' : 'bg-slate-700 hover:bg-slate-500'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
