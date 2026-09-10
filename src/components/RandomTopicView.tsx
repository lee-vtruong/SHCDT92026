import React, { useState, useEffect, useRef } from 'react';
import {
  Shuffle,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Award,
  Users,
  Layers,
  HelpCircle,
  Volume2,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Team, Topic } from '../types';
import { soundManager } from '../utils/audio';

interface RandomTopicViewProps {
  teams: Team[];
  topics: Topic[];
  currentTeamId: number;
  onSelectTeam: (teamId: number) => void;
  onAssignTopic: (teamId: number, topicId: number) => void;
  onGoToStage: (teamId: number) => void;
}

export const RandomTopicView: React.FC<RandomTopicViewProps> = ({
  teams,
  topics,
  currentTeamId,
  onSelectTeam,
  onAssignTopic,
  onGoToStage,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<number>(currentTeamId || 1);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningTopicTitle, setSpinningTopicTitle] = useState<string>('');
  const [spinningNumber, setSpinningNumber] = useState<number>(1);
  const [justRevealedTopic, setJustRevealedTopic] = useState<Topic | null>(null);
  const [drawMode, setDrawMode] = useState<'roulette' | 'envelopes'>('roulette');
  const [avoidAssignedTopics, setAvoidAssignedTopics] = useState(true);

  const spinIntervalRef = useRef<number | null>(null);

  // Sync with currentTeamId from prop if changed externally
  useEffect(() => {
    if (currentTeamId && currentTeamId !== selectedTeamId) {
      setSelectedTeamId(currentTeamId);
    }
  }, [currentTeamId]);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];
  const currentAssignedTopic = topics.find((t) => t.id === selectedTeam?.topicId);

  // Topics currently assigned to other teams
  const assignedTopicIds = teams
    .filter((t) => t.id !== selectedTeamId && t.topicId)
    .map((t) => t.topicId as number);

  // Available topics pool
  const availableTopics = avoidAssignedTopics
    ? topics.filter((t) => !assignedTopicIds.includes(t.id))
    : topics;

  // Cleanup spinning on unmount
  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    };
  }, []);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#3b82f6', '#f59e0b', '#ec4899', '#10b981'],
      });
    } catch {}
  };

  // Handle start random draw
  const handleStartRandomDraw = () => {
    if (isSpinning) return;

    const pool = availableTopics.length > 0 ? availableTopics : topics;
    if (pool.length === 0) return;

    setIsSpinning(true);
    setJustRevealedTopic(null);
    soundManager.playDing();

    // Pick final topic
    const randomIndex = Math.floor(Math.random() * pool.length);
    const chosenTopic = pool[randomIndex];

    let counter = 0;
    const totalSteps = 28;
    const baseSpeed = 50;

    const spin = () => {
      counter++;
      const tempTopic = pool[Math.floor(Math.random() * pool.length)];
      setSpinningTopicTitle(tempTopic.title);
      setSpinningNumber(tempTopic.id);

      if (counter < totalSteps) {
        // Progressively slow down
        const delay = baseSpeed + Math.pow(counter / 5, 2.3);
        spinIntervalRef.current = window.setTimeout(spin, delay);
      } else {
        // Final reveal!
        setIsSpinning(false);
        setJustRevealedTopic(chosenTopic);
        onAssignTopic(selectedTeamId, chosenTopic.id);
        soundManager.playScoreAward();
        triggerConfetti();
      }
    };

    spin();
  };

  // Direct envelope click
  const handleEnvelopeClick = (topic: Topic) => {
    if (isSpinning) return;
    setJustRevealedTopic(topic);
    onAssignTopic(selectedTeamId, topic.id);
    soundManager.playScoreAward();
    triggerConfetti();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-900 via-blue-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-cyan-700/40">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-mono font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Sân Khấu Bốc Thăm Đề Tự Động</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Bốc Thăm Ngẫu Nhiên Đề Thi Cho Các Đội
            </h1>
            <p className="text-xs sm:text-sm text-cyan-100/90 max-w-2xl leading-relaxed">
              Tới lượt đội nào lên sân khấu, chọn đội và bấm <strong className="text-amber-300">Bốc Thăm Ngẫu Nhiên</strong>. Đề tài sẽ được mở công khai ngay trên màn hình lớn cùng gợi ý luận điểm để bước vào 1 phút chuẩn bị!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            {/* Mode Selector */}
            <div className="bg-black/30 p-1 rounded-2xl border border-white/10 flex items-center gap-1 text-xs font-bold">
              <button
                onClick={() => setDrawMode('roulette')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  drawMode === 'roulette'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-cyan-200 hover:text-white'
                }`}
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Vòng Quay / Tự Động</span>
              </button>
              <button
                onClick={() => setDrawMode('envelopes')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  drawMode === 'envelopes'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-cyan-200 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>16 Bao Thư Bí Mật</span>
              </button>
            </div>

            {/* Avoid Duplicate Toggle */}
            <button
              onClick={() => setAvoidAssignedTopics(!avoidAssignedTopics)}
              className={`px-3 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                avoidAssignedTopics
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                  : 'bg-white/10 border-white/20 text-slate-300'
              }`}
              title="Không bốc trùng đề mà các đội khác đã nhận"
            >
              {avoidAssignedTopics ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{avoidAssignedTopics ? 'Tránh Trùng Đề (Bật)' : 'Tránh Trùng (Tắt)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Team Selection Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Users className="w-4 h-4 text-cyan-600" />
            <span>Chọn Đội Lên Sân Khấu Bốc Đề:</span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {teams.filter((t) => t.topicId).length}/10 đội đã có đề
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {teams.map((team) => {
            const hasTopic = Boolean(team.topicId);
            const isSelected = team.id === selectedTeamId;
            const assignedT = topics.find((t) => t.id === team.topicId);

            return (
              <button
                key={team.id}
                onClick={() => {
                  setSelectedTeamId(team.id);
                  onSelectTeam(team.id);
                  setJustRevealedTopic(null);
                  soundManager.playClick();
                }}
                className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[76px] ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-50/80 ring-2 ring-cyan-200 shadow-sm'
                    : hasTopic
                    ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 text-slate-700'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-black font-mono ${isSelected ? 'text-cyan-800' : 'text-slate-800'}`}>
                    {team.name}
                  </span>
                  {hasTopic && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                </div>

                <div className="text-[10px] truncate mt-1">
                  {hasTopic ? (
                    <span className="font-mono text-emerald-700 font-bold">
                      Đề {String(team.topicId).padStart(2, '0')}
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium italic">Chưa có đề</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Randomizer Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: The Interactive Drawing Machine */}
        <div className="lg:col-span-8 space-y-6">
          {drawMode === 'roulette' ? (
            /* Roulette / Slot Mode */
            <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-3xl border border-slate-800 p-6 sm:p-8 text-white text-center shadow-2xl relative overflow-hidden">
              {/* Animated Light Ticker */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-mono font-bold tracking-widest text-cyan-300 uppercase">
                  {isSpinning ? 'ĐANG QUAY NGẪU NHIÊN...' : `TỚI LƯỢT: ${selectedTeam.name.toUpperCase()}`}
                </span>
              </div>

              {/* Central Display Box */}
              <div className="my-6 min-h-[190px] flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-800/80 border-2 border-cyan-500/40 relative shadow-inner">
                {isSpinning ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-500 text-slate-950 font-black text-2xl flex items-center justify-center mx-auto shadow-lg">
                      #{spinningNumber}
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-cyan-300 line-clamp-2 px-4 max-w-xl">
                      {spinningTopicTitle}
                    </div>
                    <p className="text-xs text-slate-400 font-mono">Hệ thống đang lựa chọn ngẫu nhiên...</p>
                  </div>
                ) : justRevealedTopic || currentAssignedTopic ? (
                  /* Display Chosen Topic */
                  (() => {
                    const t = justRevealedTopic || currentAssignedTopic!;
                    return (
                      <div className="space-y-3 text-left w-full">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="px-3 py-1 rounded-xl bg-cyan-500 text-slate-950 font-mono font-black text-xs">
                            ĐỀ SỐ {String(t.id).padStart(2, '0')}
                          </span>
                          <span className="text-xs text-cyan-300 font-bold bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800">
                            {t.category}
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
                          {t.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/50 p-3.5 rounded-xl border border-slate-700/60">
                          {t.description}
                        </p>
                      </div>
                    );
                  })()
                ) : (
                  /* Waiting for team to press */
                  <div className="space-y-3 py-4">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center mx-auto border border-cyan-500/30">
                      <Shuffle className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-black text-white">
                      {selectedTeam.name} Chưa Bốc Thăm Đề
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Còn <strong className="text-cyan-300">{availableTopics.length}</strong> đề tài chưa được nhận. Đại diện đội hãy bấm nút bên dưới để quay đề!
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSpinning}
                  onClick={handleStartRandomDraw}
                  className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base transition-all shadow-xl flex items-center justify-center gap-2.5 active:scale-95 ${
                    isSpinning
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 shadow-cyan-500/25'
                  }`}
                >
                  <Shuffle className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
                  <span>
                    {isSpinning
                      ? 'Đang Quay Đề...'
                      : justRevealedTopic || currentAssignedTopic
                      ? 'Bốc Thăm Lại'
                      : `Bấm Bốc Thăm Đề Cho ${selectedTeam.name}`}
                  </span>
                </button>

                {(justRevealedTopic || currentAssignedTopic) && (
                  <button
                    type="button"
                    onClick={() => {
                      onGoToStage(selectedTeamId);
                    }}
                    className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Lên Sân Khấu & Đếm Giờ (1 Phút Chuẩn Bị)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Envelopes Mode */
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Chọn 1 Trong 16 Bao Thư Bí Mật ({selectedTeam.name})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bấm trực tiếp vào phong bì để mở đề cho {selectedTeam.name}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartRandomDraw}
                  className="px-3 py-1.5 rounded-xl bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 text-xs font-bold flex items-center gap-1.5"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Bốc Tự Động</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {topics.map((t) => {
                  const isAssignedToOther = assignedTopicIds.includes(t.id);
                  const isCurrentTeamTopic = selectedTeam.topicId === t.id;

                  return (
                    <button
                      key={t.id}
                      disabled={isAssignedToOther && avoidAssignedTopics}
                      onClick={() => handleEnvelopeClick(t)}
                      className={`p-4 rounded-2xl border text-center transition-all relative flex flex-col items-center justify-center gap-2 group ${
                        isCurrentTeamTopic
                          ? 'border-cyan-500 bg-cyan-50/90 ring-2 ring-cyan-300 text-cyan-950 shadow-sm'
                          : isAssignedToOther
                          ? 'border-slate-200 bg-slate-100/60 text-slate-400 opacity-60 cursor-not-allowed'
                          : 'border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/40 bg-white text-slate-800 hover:shadow-md'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm transition-transform group-hover:scale-105 ${
                          isCurrentTeamTopic
                            ? 'bg-cyan-600 text-white'
                            : isAssignedToOther
                            ? 'bg-slate-300 text-slate-600'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        #{String(t.id).padStart(2, '0')}
                      </div>

                      <div className="w-full text-center">
                        <span className="text-xs font-bold block truncate">
                          {isCurrentTeamTopic
                            ? t.title
                            : isAssignedToOther
                            ? 'Đã bốc'
                            : 'Bao Thư ' + t.id}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {t.category}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Suggested Questions / Debate Angles for the Revealed Topic */}
          {(justRevealedTopic || currentAssignedTopic) && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-cyan-700">
                <HelpCircle className="w-4 h-4" />
                <h4 className="font-extrabold text-sm text-slate-900">
                  Gợi Ý Định Hướng Trình Bày & Lập Luận:
                </h4>
              </div>

              <div className="space-y-2">
                {(justRevealedTopic || currentAssignedTopic)!.suggestedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 font-bold font-mono flex items-center justify-center shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Competition Topics Overview */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-cyan-600" />
                <span>Kho Đề Thi (16 Đề)</span>
              </h3>
              <span className="text-xs font-mono font-bold text-slate-500">
                {availableTopics.length} Chưa Dùng
              </span>
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {topics.map((topic) => {
                const assignedTeam = teams.find((t) => t.topicId === topic.id);
                const isSelectedTeamTopic = selectedTeam.topicId === topic.id;

                return (
                  <div
                    key={topic.id}
                    className={`p-3 rounded-2xl border text-xs transition-all ${
                      isSelectedTeamTopic
                        ? 'border-cyan-400 bg-cyan-50/80 text-cyan-900'
                        : assignedTeam
                        ? 'border-slate-200 bg-slate-50 text-slate-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-[11px] text-cyan-700">
                        Đề #{String(topic.id).padStart(2, '0')}
                      </span>
                      {assignedTeam ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {assignedTeam.name}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px]">
                          Sẵn sàng
                        </span>
                      )}
                    </div>
                    <h5 className="font-bold text-slate-900 text-xs line-clamp-1 mb-0.5">
                      {topic.title}
                    </h5>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {topic.category}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
