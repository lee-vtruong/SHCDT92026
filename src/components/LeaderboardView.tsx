import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  Medal, 
  Sparkles, 
  Download, 
  Eye, 
  Flame, 
  Printer, 
  CheckCircle2, 
  X,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { Team, Topic, RebuttalRecord, JudgeScoreRecord } from '../types';
import { rankTeams, RankedTeam, calculatePresentationTotal, getTeamRebuttals } from '../utils/scoring';
import { soundManager } from '../utils/audio';

interface LeaderboardViewProps {
  teams: Team[];
  topics: Topic[];
  rebuttals: RebuttalRecord[];
  onSelectTeamForScoring: (teamId: number) => void;
  onOpenAdminReset?: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  teams,
  topics,
  rebuttals,
  onSelectTeamForScoring,
  onOpenAdminReset,
}) => {
  const [inspectTeam, setInspectTeam] = useState<RankedTeam | null>(null);
  const ranked = rankTeams(teams, rebuttals);

  const handleCelebrate = () => {
    soundManager.playScoreAward();
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  const handleExportCSV = () => {
    const headers = [
      'Hạng',
      'Đội Thi',
      'Đề Tài',
      'Hiểu Đề (/24)',
      'Lập Luận (/30)',
      'Khả Thi (/24)',
      'Sáng Tạo (/18)',
      'Kỹ Năng Trình Bày (/24)',
      'Tổng Trình Bày (/120)',
      'Số Lần Phản Biện (/3)',
      'Điểm Thưởng Phản Biện (/30)',
      'Tổng Điểm Chung Cuộc (/150)',
      'Trạng Thái',
    ];

    const rows = ranked.map((r) => {
      const topic = topics.find((t) => t.id === r.team.topicId);
      const s = r.effectiveScores;
      return [
        r.rank,
        `"${r.team.name}"`,
        `"${topic?.title || ''}"`,
        s.topicUnderstanding,
        s.argumentation,
        s.feasibility,
        s.creativity,
        s.presentationSkills,
        r.presentationTotal,
        r.rebuttalsUsed,
        r.rebuttalBonus,
        r.overallTotal,
        r.team.hasPresented ? 'Đã hoàn thành' : 'Chưa hoàn thành',
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bang_Xep_Hang_Sinh_Hoat_Chuyen_De_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Top 3 Podium
  const top1 = ranked[0];
  const top2 = ranked[1];
  const top3 = ranked[2];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header Banner & Celebration */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-6 h-6 text-cyan-600" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded border border-cyan-200">
              // KẾT QUẢ CHUNG CUỘC
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Bảng Xếp Hạng Trực Tiếp 10 Đội Thi
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Tự động xếp hạng theo thể lệ: <strong>Tổng điểm</strong> ➔ <strong>Điểm trình bày</strong> ➔ <strong>Lập luận & tư duy phản biện</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="celebrate-btn"
            onClick={handleCelebrate}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-cyan-500/25 transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>Pháo Hoa Vinh Danh</span>
          </button>

          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 border border-slate-200"
            title="Tải bảng xếp hạng dạng file CSV"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Xuất CSV</span>
          </button>

          <button
            id="print-btn"
            onClick={handlePrint}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200"
            title="In bảng điểm"
          >
            <Printer className="w-4 h-4 text-slate-600" />
          </button>

          {onOpenAdminReset && (
            <button
              id="reset-scores-leaderboard-btn"
              onClick={onOpenAdminReset}
              className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs sm:text-sm transition-colors border border-rose-200 flex items-center gap-1.5 shadow-2xs"
              title="Khôi phục toàn bộ điểm số về 0 (Mật khẩu Admin: admin123)"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>Reset Điểm (Admin)</span>
            </button>
          )}
        </div>
      </div>

      {/* Top 3 Podium Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Silver - Rank 2 */}
        {top2 && (
          <div className="bg-white/95 backdrop-blur rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden order-2 md:order-1">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 font-mono">
                  <Medal className="w-3.5 h-3.5 text-slate-500" />
                  HẠNG 2 (GIẢI NHÌ)
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  {top2.team.name}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  Đề #{top2.team.topicId}: {topics.find((t) => t.id === top2.team.topicId)?.title}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Tổng điểm:</span>
              <div className="text-2xl font-black text-slate-800 font-mono">
                {top2.overallTotal} <span className="text-xs text-slate-400">đ</span>
              </div>
            </div>
          </div>
        )}

        {/* Gold - Rank 1 (Center & Elevated) */}
        {top1 && (
          <div className="bg-gradient-to-b from-amber-50/70 via-white to-white rounded-3xl border-2 border-amber-400 p-6 shadow-md flex flex-col justify-between relative overflow-hidden order-1 md:order-2 md:-translate-y-2">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-28 h-28 bg-amber-200/40 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-white shadow-sm shadow-amber-500/20 font-mono">
                  <Trophy className="w-3.5 h-3.5" />
                  HẠNG 1 (QUÁN QUÂN)
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-3">
                  {top1.team.name}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                  Đề #{top1.team.topicId}: {topics.find((t) => t.id === top1.team.topicId)?.title}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-amber-200/70 flex items-baseline justify-between">
              <div>
                <span className="text-xs text-slate-500 block font-mono">Trình bày: {top1.presentationTotal}đ</span>
                <span className="text-xs text-cyan-700 font-bold block font-mono">Phản biện: +{top1.rebuttalBonus}đ</span>
              </div>
              <div className="text-4xl font-black text-amber-600 font-mono">
                {top1.overallTotal} <span className="text-sm text-slate-400 font-bold">đ</span>
              </div>
            </div>
          </div>
        )}

        {/* Bronze - Rank 3 */}
        {top3 && (
          <div className="bg-white/95 backdrop-blur rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden order-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                  <Medal className="w-3.5 h-3.5 text-amber-600" />
                  HẠNG 3 (GIẢI BA)
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  {top3.team.name}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                  Đề #{top3.team.topicId}: {topics.find((t) => t.id === top3.team.topicId)?.title}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Tổng điểm:</span>
              <div className="text-2xl font-black text-slate-800 font-mono">
                {top3.overallTotal} <span className="text-xs text-slate-400">đ</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Complete Rankings Table */}
      <div className="bg-white/95 backdrop-blur rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 font-mono">
            // CHI TIẾT ĐIỂM SỐ & XẾP HẠNG 10 ĐỘI
          </h3>
          <span className="text-xs text-slate-400">
            Click vào dòng để xem chi tiết phiếu chấm
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-mono font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 w-16 text-center">Hạng</th>
                <th className="py-3.5 px-4">Đội Thi</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Đề Tài Phân Công</th>
                <th className="py-3.5 px-3 text-right">Điểm Trình Bày</th>
                <th className="py-3.5 px-3 text-right text-cyan-700">Lập Luận (Ưu tiên)</th>
                <th className="py-3.5 px-3 text-right">Thưởng Phản Biện</th>
                <th className="py-3.5 px-4 text-right font-bold text-slate-900">TỔNG ĐIỂM</th>
                <th className="py-3.5 px-3 text-center">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {ranked.map((r) => {
                const topic = topics.find((t) => t.id === r.team.topicId);
                const isTop1 = r.rank === 1 && r.overallTotal > 0;
                const isTop2 = r.rank === 2 && r.overallTotal > 0;
                const isTop3 = r.rank === 3 && r.overallTotal > 0;

                return (
                  <tr
                    key={r.team.id}
                    onClick={() => setInspectTeam(r)}
                    className="hover:bg-sky-50/60 cursor-pointer transition-colors"
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center font-black">
                      {isTop1 ? (
                        <span className="inline-flex w-7 h-7 rounded-full bg-amber-500 text-white items-center justify-center font-black shadow-xs">
                          1
                        </span>
                      ) : isTop2 ? (
                        <span className="inline-flex w-7 h-7 rounded-full bg-slate-300 text-slate-800 items-center justify-center font-bold">
                          2
                        </span>
                      ) : isTop3 ? (
                        <span className="inline-flex w-7 h-7 rounded-full bg-amber-700 text-white items-center justify-center font-bold">
                          3
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">#{r.rank}</span>
                      )}
                    </td>

                    {/* Team Name */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{r.team.name}</span>
                        {r.team.hasPresented && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Đã hoàn thành thi" />
                        )}
                      </div>
                    </td>

                    {/* Topic */}
                    <td className="py-3.5 px-4 hidden md:table-cell max-w-xs truncate text-xs text-slate-500" title={topic?.title}>
                      <span className="font-semibold text-slate-800">Đề #{topic?.id}:</span> {topic?.title}
                    </td>

            {/* Presentation Total */}
            <td className="py-3.5 px-3 text-right font-mono font-semibold">
              <span className="text-slate-900">{r.presentationTotal}</span>
              <span className="text-slate-400 text-xs"> / 20</span>
              {r.team.judgeScores && Object.keys(r.team.judgeScores).length > 0 && (
                <span className="block text-[10px] text-cyan-700 font-sans font-medium">
                  ({Object.keys(r.team.judgeScores).length} GK chấm)
                </span>
              )}
            </td>

                    {/* Argumentation (Tie-breaker) */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-cyan-700 bg-cyan-50/50">
                      {r.argumentationScore} <span className="text-cyan-600/60 text-xs">/ 5</span>
                    </td>

                    {/* Rebuttal Bonus */}
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 font-mono">
                        <span className="text-cyan-700 font-bold">
                          +{r.rebuttalBonus}đ
                        </span>
                        <span className="text-[11px] text-slate-400 font-sans">
                          ({r.rebuttalsUsed}/3 lượt)
                        </span>
                      </div>
                    </td>

                    {/* Overall Total */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-base sm:text-lg font-black font-mono text-slate-900">
                        {r.overallTotal}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">đ</span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectTeam(r);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-700 hover:bg-cyan-50 transition-colors"
                        title="Xem chi tiết điểm"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect / Score Breakdown Modal */}
      {inspectTeam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 text-slate-800">
            
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                  // CHI TIẾT ĐIỂM THI
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {inspectTeam.team.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Đề số #{inspectTeam.team.topicId}: {topics.find((t) => t.id === inspectTeam.team.topicId)?.title}
                </p>
              </div>

              <button
                onClick={() => setInspectTeam(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rubric Breakdown */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-2">
                5 TIÊU CHÍ TRÌNH BÀY (TỐI ĐA 120 ĐIỂM):
              </span>

              {[
                { label: '1. Hiểu đề & bám sát vấn đề', val: inspectTeam.effectiveScores.topicUnderstanding, max: 24 },
                { label: '2. Lập luận & tư duy phản biện (Ưu tiên)', val: inspectTeam.effectiveScores.argumentation, max: 30, highlight: true },
                { label: '3. Tính khả thi / giá trị giải pháp', val: inspectTeam.effectiveScores.feasibility, max: 24 },
                { label: '4. Tính sáng tạo', val: inspectTeam.effectiveScores.creativity, max: 18 },
                { label: '5. Kỹ năng trình bày & thời gian', val: inspectTeam.effectiveScores.presentationSkills, max: 24 },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between text-xs py-1 px-2 rounded-lg ${
                    item.highlight ? 'bg-cyan-50 text-cyan-900 font-bold border border-cyan-200' : 'text-slate-600'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="font-mono font-bold">
                    {item.val} / {item.max}đ
                  </span>
                </div>
              ))}

              <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
                <span>Tổng Điểm Trình Bày (Trung bình cộng):</span>
                <span className="font-mono text-cyan-700 text-sm">
                  {inspectTeam.presentationTotal} / 120đ
                </span>
              </div>
            </div>

            {/* Multi-Judge Evaluation Breakdown */}
            {inspectTeam.team.judgeScores && Object.keys(inspectTeam.team.judgeScores).length > 0 && (
              <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                  PHIẾU CHẤM TỪNG GIÁM KHẢO ({Object.keys(inspectTeam.team.judgeScores).length} GK ĐÃ CHẤM):
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.values(inspectTeam.team.judgeScores) as JudgeScoreRecord[]).map((record) => {
                    const judgeTotal = calculatePresentationTotal(record.scores);
                    return (
                      <div key={record.judgeId} className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-cyan-600" />
                            {record.judgeName}
                          </span>
                          <span className="font-mono text-cyan-700 text-sm font-black">
                            {judgeTotal.toFixed(1)}đ
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono pt-1 border-t border-slate-100">
                          <span>1. Hiểu: {record.scores.topicUnderstanding}đ</span>
                          <span className="text-cyan-800 font-semibold">2. Luận: {record.scores.argumentation}đ</span>
                          <span>3. Khả thi: {record.scores.feasibility}đ</span>
                          <span>4. Sáng tạo: {record.scores.creativity}đ</span>
                          <span className="col-span-2">5. Trình bày: {record.scores.presentationSkills}đ</span>
                        </div>

                        {record.notes && (
                          <p className="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100 mt-1">
                            "{record.notes}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rebuttal History */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="font-mono uppercase tracking-wider text-slate-500">
                  LỊCH SỬ PHẢN BIỆN ({inspectTeam.rebuttalsUsed}/3 LƯỢT):
                </span>
                <span className="font-mono text-cyan-700 text-sm font-bold">
                  +{inspectTeam.rebuttalBonus} / 30đ
                </span>
              </div>

              {getTeamRebuttals(inspectTeam.team.id, rebuttals).length > 0 ? (
                <div className="space-y-1.5 mt-2">
                  {getTeamRebuttals(inspectTeam.team.id, rebuttals).map((r, i) => {
                    const target = teams.find((t) => t.id === r.roundTeamId);
                    return (
                      <div key={r.id} className="p-2 rounded-lg bg-white border border-slate-200 text-xs flex items-center justify-between">
                        <div>
                          <span className="text-slate-800 font-medium">Lượt {i + 1}: Phản biện {target?.name}</span>
                          {r.note && <p className="text-[11px] text-slate-500 italic mt-0.5">"{r.note}"</p>}
                        </div>
                        <span className="font-mono font-bold text-cyan-700">+{r.score}đ</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-1">Chưa tham gia phản biện lượt nào.</p>
              )}
            </div>

            {/* Judge Notes */}
            {inspectTeam.team.presentationNotes && (
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                <span className="font-mono font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  NHẬN XÉT CỦA BGK:
                </span>
                <p className="text-slate-700 italic leading-relaxed">
                  "{inspectTeam.team.presentationNotes}"
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  onSelectTeamForScoring(inspectTeam.team.id);
                  setInspectTeam(null);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
              >
                <span>Mở Phiếu Chấm BGK</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setInspectTeam(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors border border-slate-200"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
