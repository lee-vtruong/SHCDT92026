# 🎙️ Trình Bày & Phản Biện Ý Tưởng (Debate & Pitch Coordinator)

> **Ứng dụng điều phối sân khấu, bấm giờ thi đấu và chấm điểm trực tiếp chuyên nghiệp dành cho sinh hoạt chuyên đề tranh biện 10 đội thi.**

---

## 🌟 Tính Năng Nổi Bật

### 1. ⏱️ Điều Phối Sân Khấu & Bấm Giờ 3 Giai Đoạn (1 - 2 - 1 Phút)
- **Chuẩn bị (1 phút)**: Đội thi hội ý nhanh, định hình cấu trúc bài nói.
- **Trình bày (2 phút)**: Đội thi thuyết trình giải pháp trước Hội đồng Giám khảo.
- **Phản biện (1 phút)**: Các đội đối thủ giơ tay đặt câu hỏi / phản biện để nhận điểm thưởng.
- **Hệ thống âm thanh sân khấu (Web Audio API)**:
  - Bíp cảnh báo nhịp 10 giây cuối.
  - Chuông kết thúc giai đoạn rõ ràng, dứt khoát.
  - Âm thanh vỗ tay chúc mừng và trao giải sống động.

---

### 2. 🛡️ Phân Quyền Bảo Mật: Ban Giám Khảo & Quản Trị Viên (Admin)
- **Màn hình khóa bảo vệ (Gatekeeper)**: Tránh tình trạng người xem hoặc MC vô tình bấm chỉnh sửa điểm thi.
- **5 Tài khoản Giám khảo độc lập**:
  - Gồm **3 Giám khảo chính thức** và **2 Giám khảo dự phòng**.
  - Mỗi Giám khảo có mã truy cập riêng để đăng nhập và chấm điểm độc lập.
- **Quyền Quản trị viên (Super Admin)**:
  - Xác thực bằng mật khẩu Admin (`admin123`).
  - Toàn quyền can thiệp, xem lại và chỉnh sửa hoặc xóa phiếu chấm của từng Giám khảo.
  - Tự động đồng bộ và tính lại điểm trung bình của đội sau khi Admin hiệu chỉnh.
- **Chế độ chỉ đọc (Spectator / MC Mode)**: Khán giả và MC có thể theo dõi tiến độ và bảng điểm theo thời gian thực mà không làm ảnh hưởng đến dữ liệu.

---

### 3. 📊 Thang Điểm & Tiêu Chí Rubric Chuẩn Hóa
- **Thang điểm chuyên môn (20 điểm)**:
  1. **Hiểu đề & Trọng tâm** (Tối đa: 4.0đ)
  2. **Lập luận & Tư duy phản biện** (Tối đa: 5.0đ - *Tiêu chí ưu tiên khi hòa điểm*)
  3. **Tính khả thi & Giải pháp thực tế** (Tối đa: 4.0đ)
  4. **Tính sáng tạo & Đột phá** (Tối đa: 3.0đ)
  5. **Kỹ năng trình bày & Thuyết phục** (Tối đa: 4.0đ)
- **Công cụ hỗ trợ chấm điểm nhanh**: Phổ điểm tự động (Xuất sắc 95%, Giỏi 85%, Khá 75%, Trung bình 60%, Tối đa 100%) và nút tăng/giảm nhanh `+0.5đ`, `-0.5đ`, `Max`.
- **Điểm thưởng phản biện (+4.5 điểm tối đa)**:
  - Mỗi đội có tối đa **3 lượt phản biện** trong suốt cuộc thi.
  - Điểm thưởng mỗi lượt: **+1.5đ** (Tốt), **+1.0đ** (Đạt), **+0.5đ** (Khá).

---

### 4. 🏆 Bảng Xếp Hạng & Trao Giải Trực Tiếp (Live Leaderboard)
- **Phân loại thứ hạng tự động**: Xác định chính xác đội **Vô Địch (Nhất)**, **Giải Nhì**, **Giải Ba** và **Khuyến Khích**.
- **Quy tắc giải quyết hòa điểm (Tie-breaking Rule)**:
  1. Tổng điểm cao hơn xếp trên.
  2. Nếu bằng nhau, ưu tiên điểm Trình bày chuyên môn (/20).
  3. Nếu vẫn bằng, ưu tiên tiêu chí *Lập luận & Tư duy phản biện* (/5).
- **Hiệu ứng pháo hoa Confetti**: Kích hoạt khi công bố kết quả chung cuộc.

---

### 5. 🎲 Bốc Thăm & Quản Lý Đề Tài
- 10 chủ đề tranh luận thực tiễn kèm gợi ý định hướng nội dung.
- Tính năng **Tráo đề ngẫu nhiên** bảo đảm tính công bằng tuyệt đối cho 10 đội.

---

### 6. 💾 Sao Lưu & Khôi Phục Dữ Liệu An Toàn
- Tự động lưu trữ thời gian thực vào `localStorage`.
- Hỗ trợ **Export (Xuất file JSON)** và **Import (Nhập lại dữ liệu)** để dự phòng sự cố kỹ thuật.
- Tính năng **Reset điểm an toàn** có mã xác nhận bảo vệ.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Thành phần | Công nghệ |
| :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Bundler & Build Tool** | [Vite 6](https://vitejs.dev/) |
| **Styling & CSS** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Animations** | [Motion](https://motion.dev/) & [Canvas-Confetti](https://www.npmjs.com/package/canvas-confetti) |
| **Audio Engine** | Web Audio API (Synthesizer tích hợp sẵn, không phụ thuộc file âm thanh ngoài) |

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 1. Yêu cầu hệ thống
- [Node.js](https://nodejs.org/) phiên bản 18.0 trở lên.
- Quản lý gói: `npm` hoặc `yarn` / `pnpm`.

### 2. Cài đặt các thư viện
```bash
git clone <URL_REPOSITORY_CUA_BAN>
cd <THU_MUC_DU_AN>
npm install
```

### 3. Khởi chạy môi trường phát triển (Development)
```bash
npm run dev
```
Truy cập trình duyệt tại địa chỉ: `http://localhost:3000`

### 4. Đóng gói cho môi trường Production (Build)
```bash
npm run build
```
Thư mục xuất ra: `/dist`

---

## 🔑 Mật Khẩu Mặc Định Trong Hệ Thống

| Vai trò | Tên tài khoản | Mật khẩu truy cập |
| :--- | :--- | :--- |
| **Quản trị viên (Admin)** | Toàn quyền 5 BGK | `admin123` |
| **Giám khảo 1 (Chính thức)** | Giám khảo 1 | `bgk1` |
| **Giám khảo 2 (Chính thức)** | Giám khảo 2 | `bgk2` |
| **Giám khảo 3 (Chính thức)** | Giám khảo 3 | `bgk3` |
| **Giám khảo 4 (Dự phòng)** | Giám khảo 4 | `bgk4` |
| **Giám khảo 5 (Dự phòng)** | Giám khảo 5 | `bgk5` |

---

## 👨‍💻 Tác Giả & Liên Hệ (Author & Contact)

- **Người phát triển**: **leev.truong**
- **Facebook**: [https://www.facebook.com/leev.truong/](https://www.facebook.com/leev.truong/)
- **Email**: `letruong2005ooo@gmail.com`

---

*Chúc các đội thi hoàn thành xuất sắc phần thi và có một buổi sinh hoạt chuyên đề bùng nổ!* 🎉
