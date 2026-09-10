import { JudgeProfile } from '../types';

export const INITIAL_JUDGE_PROFILES: JudgeProfile[] = [
  {
    id: 1,
    name: 'Đồng chí Lê Hình Nhựt Thanh',
    role: 'Giám khảo 1 • Hội đồng Giám khảo',
    subTitle: 'Chi ủy viên Chi bộ Sinh viên 5',
    avatarUrl: '/assets/judges/gk1.jpg',
    fallbackColor: 'from-amber-500 to-yellow-600',
    achievements: [
      'Chi ủy viên Chi bộ Sinh viên 5',
      'Cán bộ Đoàn - Hội tiêu biểu, giàu kinh nghiệm tổ chức các phong trào học thuật',
      'Nghiên cứu viên Phòng Thí nghiệm Công nghệ phần mềm (SELab)',
      'Sở hữu nhiều bài báo khoa học quốc tế'
    ],
    bioQuote: 'Tự tin bộc lộ cá tính, lập luận bằng lý lẽ và hành động bằng giải pháp thực tiễn.'
  },
  {
    id: 2,
    name: 'Đồng chí Lê Thị Thu Hiền',
    role: 'Giám khảo 2 • Hội đồng Giám khảo',
    subTitle: 'Phó Bí thư Chi bộ Sinh viên 4',
    avatarUrl: '/assets/judges/gk2.jpg',
    fallbackColor: 'from-blue-500 to-cyan-600',
    achievements: [
      'Phó Bí thư Chi bộ Sinh viên 4',
      'Ủy viên Ban Thường vụ, Chánh Văn phòng Đoàn trường',
      'Nguyên Chủ tịch Hội Sinh viên trường',
      'Chỉ huy trưởng Chiến dịch tình nguyện Mùa hè xanh cấp trường 3 năm liền'
    ],
    bioQuote: 'Mỗi ý tưởng được sẻ chia là một hạt mầm cho sự đổi mới và gắn kết cộng đồng.'
  },
  {
    id: 3,
    name: 'Đồng chí Lê Văn Trường',
    role: 'Giám khảo 3 • Hội đồng Giám khảo',
    subTitle: 'Đảng viên Chi bộ Sinh viên 5',
    avatarUrl: '/assets/judges/gk3.jpg',
    fallbackColor: 'from-rose-500 to-pink-600',
    achievements: [
      'Đảng viên Chi bộ Sinh viên 5',
      'Thí sinh Chương trình tranh biện dành cho học sinh THPT Trường Teen (2023)',
      'Quán quân Hội thi Đi tìm thủ lĩnh, Trường Đại học Khoa học tự nhiên, ĐHQG-HCM',
      'Quán quân Cuộc thi Bản lĩnh IT, Khoa CNTT, Trường Đại học Khoa học tự nhiên, ĐHQG-HCM'
    ],
    bioQuote: 'Tranh biện không chỉ là để bảo vệ quan điểm, mà là hành trình cùng nhau tiệm cận chân lý.'
  }
];
