import React from 'react';
import { 
  HelpCircle, 
  Clock, 
  Award, 
  Flame, 
  AlertTriangle, 
  CheckCircle2,
  Users
} from 'lucide-react';

export const RulesView: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-widest bg-cyan-50 text-cyan-700 border border-cyan-200">
          <HelpCircle className="w-3.5 h-3.5" />
          // QUY ĐỊNH CHÍNH THỨC
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          THỂ LỆ TRÒ CHƠI: TRÌNH BÀY & PHẢN BIỆN Ý TƯỞNG
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto">
          Hoạt động sinh hoạt chuyên đề dành cho 10 đội thi với cơ chế tính giờ nghiêm ngặt và chấm điểm đối kháng nhiều chiều.
        </p>
      </div>

      {/* Section 1: General Format */}
      <div className="bg-white/95 backdrop-blur rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-cyan-600">
          <Users className="w-5 h-5" />
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            1. Hình Thức Chung
          </h3>
        </div>
        <ul className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed list-disc list-inside">
          <li><strong>Có 10 đội thi</strong>, tương ứng với 10 đề tài thảo luận khác nhau.</li>
          <li>Mỗi đề là một vấn đề xã hội, một ý tưởng hoặc một giải pháp cần phân tích và bảo vệ quan điểm.</li>
          <li>Mỗi đội được phân công hoặc bốc thăm <strong>01 đề</strong> và lần lượt lên trình bày trước Ban Giám khảo (BGK).</li>
          <li>
            <strong className="text-cyan-700">Kết quả chung cuộc (Thang 150)</strong> = <strong>Điểm phần trình bày (tối đa 120đ)</strong> + <strong>Điểm thưởng phản biện (tối đa 30đ)</strong>.
          </li>
        </ul>
      </div>

      {/* Section 2: Turn Structure */}
      <div className="bg-white/95 backdrop-blur rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-cyan-600">
          <Clock className="w-5 h-5" />
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            2. Cách Thức Một Lượt Thi (Tổng 04 Phút)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200/80 space-y-1.5">
            <span className="text-xs font-mono font-bold text-sky-700">01 PHÚT</span>
            <h4 className="text-sm font-extrabold text-slate-900">Chuẩn Bị</h4>
            <p className="text-xs text-slate-600">
              Đội nhận đề, thống nhất luận điểm và phân công thành viên đại diện trình bày.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-1.5">
            <span className="text-xs font-mono font-bold text-amber-700">02 PHÚT</span>
            <h4 className="text-sm font-extrabold text-slate-900">Trình Bày</h4>
            <p className="text-xs text-slate-600">
              Đội nêu quan điểm/giải pháp, lập luận và bảo vệ ý tưởng. Khi hết giờ, MC dừng phần trình bày.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 space-y-1.5">
            <span className="text-xs font-mono font-bold text-rose-700">01 PHÚT</span>
            <h4 className="text-sm font-extrabold text-slate-900">Phản Biện Mở</h4>
            <p className="text-xs text-slate-600">
              09 đội còn lại có quyền giơ tay xin phản biện. MC ưu tiên đội sớm nhất; tổng thời gian tất cả phản biện không quá 60 giây.
            </p>
          </div>
        </div>

        {/* Debate regulation note */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
          <strong className="text-cyan-700 block font-mono font-bold uppercase tracking-wider">
            // QUY ĐỊNH PHẢN BIỆN ĐẶC BIỆT:
          </strong>
          <p className="leading-relaxed">
            - Mỗi đội được phản biện <strong>tối đa 03 lần</strong> trong toàn bộ trò chơi, <strong>tối đa 01 lần</strong> trong mỗi lượt của đội khác.<br/>
            - Mỗi lần giơ tay được MC chọn và phát biểu được tính là <strong>01 lượt sử dụng</strong>, kể cả khi BGK không cộng điểm.<br/>
            - Vì chỉ có 03 lượt cho 09 cơ hội phản biện, các đội cần cân nhắc thời điểm sử dụng một cách chiến lược.
          </p>
        </div>
      </div>

      {/* Section 3: Rubric Table */}
      <div className="bg-white/95 backdrop-blur rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-cyan-600">
          <Award className="w-5 h-5" />
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            3. Thang Điểm Phần Trình Bày (Tối Đa 20 Điểm)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-mono font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Tiêu Chí</th>
                <th className="py-3 px-4">Mô Tả Yêu Cầu</th>
                <th className="py-3 px-3 text-right w-24">Điểm Gốc</th>
                <th className="py-3 px-4 text-right w-36 text-cyan-800 font-extrabold">Quy Đổi (Thang 150)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900">1. Hiểu đề & bám sát vấn đề</td>
                <td className="py-3 px-4 text-slate-600 text-xs">Xác định đúng trọng tâm, trả lời đúng yêu cầu của đề.</td>
                <td className="py-3 px-3 text-right font-mono text-slate-500">4.0đ</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">24.0đ</td>
              </tr>
              <tr className="bg-cyan-50/50">
                <td className="py-3 px-4 font-bold text-cyan-800">
                  2. Lập luận & tư duy phản biện
                  <span className="block text-[10px] text-cyan-600 font-medium font-mono">★ Tiêu chí phụ ưu tiên khi hòa điểm</span>
                </td>
                <td className="py-3 px-4 text-slate-600 text-xs">Luận điểm rõ, logic, có lý lẽ thuyết phục; nhìn nhận được nhiều chiều.</td>
                <td className="py-3 px-3 text-right font-mono text-slate-500">5.0đ</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-cyan-700 text-sm">30.0đ</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900">3. Tính khả thi / giá trị của giải pháp</td>
                <td className="py-3 px-4 text-slate-600 text-xs">Giải pháp hợp lý, có khả năng áp dụng hoặc tạo tác động thực tế.</td>
                <td className="py-3 px-3 text-right font-mono text-slate-500">4.0đ</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">24.0đ</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900">4. Tính sáng tạo</td>
                <td className="py-3 px-4 text-slate-600 text-xs">Có góc nhìn mới, cách tiếp cận khác biệt hoặc ý tưởng đáng chú ý.</td>
                <td className="py-3 px-3 text-right font-mono text-slate-500">3.0đ</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">18.0đ</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900">5. Kỹ năng trình bày & quản lý thời gian</td>
                <td className="py-3 px-4 text-slate-600 text-xs">Diễn đạt rõ ràng, mạch lạc, thuyết phục và hoàn thành trong thời gian quy định.</td>
                <td className="py-3 px-3 text-right font-mono text-slate-500">4.0đ</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">24.0đ</td>
              </tr>
              <tr className="bg-slate-50 font-bold">
                <td className="py-3 px-4 text-cyan-800 font-mono uppercase tracking-wider">I. TỔNG ĐIỂM TRÌNH BÀY TỐI ĐA</td>
                <td className="py-3 px-4 text-slate-500 text-xs font-normal">Cộng tổng cả 5 tiêu chí</td>
                <td className="py-3 px-3 text-right font-mono text-slate-500 font-bold">20.0đ</td>
                <td className="py-3 px-4 text-right font-mono text-base text-cyan-700 font-black">120.0đ</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Rebuttal Bonuses */}
      <div className="bg-white/95 backdrop-blur rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-cyan-600">
          <Flame className="w-5 h-5" />
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            II. Điểm Thưởng Phản Biện (Tối Đa 30 Điểm)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-sky-700">+3.0 ĐIỂM</span>
              <span className="text-[10px] font-mono text-slate-500">Gốc: 0.5đ (3.3 làm tròn 3)</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 mt-1">Mức 1 – Hợp Lệ</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Phản biện đúng chủ đề, chỉ ra được điểm cần làm rõ nhưng còn tương đối cơ bản.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-700">+7.0 ĐIỂM</span>
              <span className="text-[10px] font-mono text-slate-500">Gốc: 1.0đ (6.7 làm tròn 7)</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 mt-1">Mức 2 – Sắc Sảo</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Chạm vào điểm yếu/giả định quan trọng trong lập luận, có lý do rõ ràng và buộc người nghe phải xem xét lại.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-700">+10.0 ĐIỂM</span>
              <span className="text-[10px] font-mono text-slate-500">Gốc: 1.5đ</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 mt-1">Mức 3 – Xuất Sắc</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Phản biện ngắn gọn nhưng sâu, phát hiện mâu thuẫn/lỗ hổng cốt lõi hoặc đưa ra góc nhìn đối trọng rất thuyết phục.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
          <p>
            • <strong>0 Điểm:</strong> Phản biện lạc đề, lặp lại ý đã có, mang tính công kích cá nhân hoặc không hình thành được luận điểm rõ ràng (vẫn tính là 01 lượt giơ tay đã dùng).
          </p>
          <p>
            • <strong>Điểm thưởng tối đa của một đội:</strong> 30 điểm (03 lượt × 10 điểm).
          </p>
          <p>
            • <strong>Tổng điểm chung cuộc:</strong> 120 điểm trình bày + 30 điểm thưởng phản biện = <strong>Tối đa 150 điểm</strong>.
          </p>
        </div>
      </div>

      {/* Section 5: Ranking & Operations */}
      <div className="bg-white/95 backdrop-blur rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-cyan-600">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            5. Xếp Hạng & Lưu Ý Vận Hành
          </h3>
        </div>

        <ul className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed list-disc list-inside">
          <li>
            <strong>Nguyên tắc phân xử khi bằng điểm:</strong> Đội có tổng điểm cao hơn xếp trên. Nếu bằng điểm, ưu tiên đội có điểm phần trình bày cao hơn; nếu vẫn bằng, ưu tiên điểm <em>“Lập luận & tư duy phản biện”</em>, sau đó BGK thảo luận quyết định.
          </li>
          <li>
            <strong>Quyền của BGK:</strong> BGK có quyền từ chối điểm thưởng nếu phản biện không hợp lệ hoặc không đúng tinh thần tranh luận văn minh. Mọi quyết định chuyên môn của BGK là quyết định cuối cùng.
          </li>
          <li>
            <strong>Văn hóa tranh luận:</strong> Tuyệt đối không ngắt lời, không công kích cá nhân, không sử dụng nội dung thiếu tôn trọng.
          </li>
          <li>
            <strong>Lưu ý về thời lượng:</strong> Theo cấu trúc 01 phút chuẩn bị + 02 phút trình bày + 01 phút phản biện, 10 đội cần tối thiểu <strong>40 phút thi thuần</strong> (chưa tính thời gian chuyển lượt). Nếu chương trình gói trong 30 phút, BTC cần rút thời lượng hoặc chia cụm thi song song.
          </li>
        </ul>
      </div>

    </div>
  );
};

