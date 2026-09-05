import React, { useState } from 'react';
import { 
  BookOpen, 
  Shuffle, 
  Edit3, 
  Users, 
  Shield, 
  Sparkles, 
  X, 
  CheckCircle2, 
  ArrowRightLeft,
  Filter
} from 'lucide-react';
import { Topic, Team } from '../types';
import { soundManager } from '../utils/audio';

interface TopicsViewProps {
  topics: Topic[];
  teams: Team[];
  onUpdateTopic: (topic: Topic) => void;
  onShuffleTopics: () => void;
  onAssignTopic: (teamId: number, topicId: number) => void;
}

type FilterType = 'all' | 'assigned' | 'backup';

export const TopicsView: React.FC<TopicsViewProps> = ({
  topics,
  teams,
  onUpdateTopic,
  onShuffleTopics,
  onAssignTopic,
}) => {
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [isShuffling, setIsShuffling] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const handleShuffle = () => {
    setIsShuffling(true);
    soundManager.playDing();
    setTimeout(() => {
      onShuffleTopics();
      setIsShuffling(false);
      soundManager.playScoreAward();
    }, 600);
  };

  const handleSaveEdit = () => {
    if (!editingTopic) return;
    onUpdateTopic(editingTopic);
    setEditingTopic(null);
  };

  // Calculate assigned topics vs backup topics
  const assignedTopicIds = new Set(teams.map((t) => t.topicId).filter((id): id is number => id !== null));
  const assignedTopicsCount = assignedTopicIds.size;
  const backupTopicsCount = topics.length - assignedTopicsCount;

  // Filter topics based on active tab
  const filteredTopics = topics.filter((topic) => {
    const isAssigned = assignedTopicIds.has(topic.id);
    if (activeFilter === 'assigned') return isAssigned;
    if (activeFilter === 'backup') return !isAssigned;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-cyan-600" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded border border-cyan-200">
              // BỘ 16 ĐỀ CHÍNH THỨC
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            16 Đề Chuyên Đề (10 Đề Thi Đấu & 6 Đề Dự Phòng)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Đã bốc thăm ngẫu nhiên 10 đề cho 10 đội thi. 6 đề còn lại được bảo lưu làm đề dự phòng (backup), có thể hoán đổi bất kỳ lúc nào nếu cần.
          </p>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2.5 mt-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              Tổng cộng: <strong>{topics.length} Đề</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
              Đang thi đấu: <strong>{assignedTopicsCount} Đề (10 Đội)</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Dự phòng (Backup): <strong>{backupTopicsCount} Đề</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <button
            id="shuffle-topics-btn"
            disabled={isShuffling}
            onClick={handleShuffle}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-cyan-500/25 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
          >
            <Shuffle className={`w-4 h-4 ${isShuffling ? 'animate-spin' : ''}`} />
            <span>{isShuffling ? 'Đang bốc thăm lại...' : 'Bốc Thăm Lại 10 Đề'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-white/70 backdrop-blur-sm p-2 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất Cả (16 Đề)
          </button>
          <button
            onClick={() => setActiveFilter('assigned')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilter === 'assigned'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>10 Đề Thi Đấu ({assignedTopicsCount})</span>
          </button>
          <button
            onClick={() => setActiveFilter('backup')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFilter === 'backup'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>6 Đề Dự Phòng ({backupTopicsCount})</span>
          </button>
        </div>

        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
          Hiển thị {filteredTopics.length} / {topics.length} đề
        </span>
      </div>

      {/* Topic Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTopics.map((topic) => {
          const assignedTeam = teams.find((t) => t.topicId === topic.id);
          const isBackup = !assignedTeam;

          return (
            <div
              key={topic.id}
              className={`bg-white/95 backdrop-blur rounded-3xl border p-5 shadow-sm flex flex-col justify-between transition-all relative overflow-hidden ${
                isBackup
                  ? 'border-amber-200/80 hover:border-amber-400 hover:shadow-md'
                  : 'border-slate-200 hover:border-cyan-400 hover:shadow-md'
              }`}
            >
              {/* Subtle top indicator bar */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${
                  isBackup ? 'bg-amber-400' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                }`}
              />

              <div>
                {/* Header of Card: Topic #, Category, Status & Assigned Team */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono shadow-xs ${
                        isBackup ? 'bg-amber-600 text-white' : 'bg-cyan-600 text-white'
                      }`}
                    >
                      ĐỀ #{topic.id}
                    </span>

                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {topic.category}
                    </span>

                    {isBackup ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-amber-50 text-amber-700 border border-amber-200">
                        <Shield className="w-3 h-3 text-amber-600" />
                        DỰ PHÒNG (BACKUP)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-cyan-50 text-cyan-700 border border-cyan-200">
                        <CheckCircle2 className="w-3 h-3 text-cyan-600" />
                        ĐANG THI ĐẤU
                      </span>
                    )}
                  </div>

                  {/* Assigned Team badge & selector / Gán cho đội */}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-colors ${
                      assignedTeam
                        ? 'bg-cyan-50/80 border-cyan-200 text-cyan-900'
                        : 'bg-amber-50/80 border-amber-200 text-amber-900'
                    }`}
                  >
                    <Users className={`w-3.5 h-3.5 ${assignedTeam ? 'text-cyan-600' : 'text-amber-600'}`} />
                    <select
                      value={assignedTeam ? assignedTeam.id : ''}
                      onChange={(e) => {
                        const newTeamId = parseInt(e.target.value);
                        if (!isNaN(newTeamId)) {
                          onAssignTopic(newTeamId, topic.id);
                          soundManager.playDing();
                        }
                      }}
                      className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
                      title={assignedTeam ? `Đang gán cho ${assignedTeam.name}` : 'Bấm để gán đề dự phòng này cho 1 đội'}
                    >
                      <option value="" disabled>
                        {isBackup ? '+ Gán cho Đội...' : 'Chưa gán'}
                      </option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id} className="bg-white text-slate-800">
                          {t.name} {t.topicId === topic.id ? '(Hiện tại)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mb-2 leading-snug">
                  {topic.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  {topic.description}
                </p>

                {/* Guiding questions */}
                {topic.guidingQuestions.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      // GỢI Ý PHÂN TÍCH & BẢO VỆ QUAN ĐIỂM:
                    </span>
                    <ul className="space-y-1 text-xs text-slate-600">
                      {topic.guidingQuestions.map((q, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                          <span className={`${isBackup ? 'text-amber-600' : 'text-cyan-600'} font-bold`}>•</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[11px] text-slate-400 font-mono">
                  {assignedTeam ? (
                    <span className="text-cyan-700 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                      Phân công cho: <strong>{assignedTeam.name}</strong>
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold flex items-center gap-1">
                      <Shield className="w-3 h-3 text-amber-500" />
                      Đề dự phòng sẵn sàng
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setEditingTopic(topic)}
                  className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Sửa Đề</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Edit Topic Modal */}
      {editingTopic && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-slate-800">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                  // CHỈNH SỬA ĐỀ #{editingTopic.id}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Tùy Chỉnh Nội Dung Đề Thi
                </h3>
              </div>
              <button
                onClick={() => setEditingTopic(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Chủ đề / Phân loại:
                </label>
                <input
                  type="text"
                  value={editingTopic.category}
                  onChange={(e) => setEditingTopic({ ...editingTopic, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Tiêu đề đề bài:
                </label>
                <textarea
                  rows={2}
                  value={editingTopic.title}
                  onChange={(e) => setEditingTopic({ ...editingTopic, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Mô tả / Chi tiết ý tưởng:
                </label>
                <textarea
                  rows={4}
                  value={editingTopic.description}
                  onChange={(e) => setEditingTopic({ ...editingTopic, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Gợi ý phân tích & phản biện (mỗi dòng một câu):
                </label>
                <textarea
                  rows={3}
                  value={editingTopic.guidingQuestions.join('\n')}
                  onChange={(e) =>
                    setEditingTopic({
                      ...editingTopic,
                      guidingQuestions: e.target.value.split('\n').filter((l) => l.trim().length > 0),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingTopic(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-xs"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
