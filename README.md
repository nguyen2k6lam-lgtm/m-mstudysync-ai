# StudyMind AI - Nền Tảng Học Tập Thông Minh Cho Sinh Viên Việt Nam

StudyMind AI là ứng dụng web toàn diện tích hợp Trí tuệ Nhân tạo (Google Gemini 3.8 Flash & Gemini 3.5 Transcribe), giúp sinh viên đại học tối ưu hoá việc học tập: từ ghi âm bài giảng, tóm tắt tự động, trích xuất sơ đồ tư duy, tạo bộ flashcard, câu hỏi trắc nghiệm, đến quản lý hạn chót bài tập (deadlines) cá nhân và nhóm.

---

## 🌟 Tính Năng Nổi Bật

1. **Ghi Âm & Phiên Âm Bài Giảng Trực Tiếp:**
   - Sử dụng Web MediaRecorder API ghi âm trực tiếp microphone trên lớp với thời gian thực và sound wave visualizer.
   - Tải file âm thanh có sẵn (.mp3, .wav, .webm, .m4a) lên tới 25MB.
   - Gọi mô hình AI phiên âm âm thanh thành văn bản tiếng Việt cực chuẩn.

2. **Tự Động Tóm Tắt & Sơ Đồ Tư Duy (Mind Map):**
   - Bản tóm tắt súc tích 5–10 câu bằng tiếng Việt tự nhiên.
   - Trích xuất các ý chính kèm mức độ ưu tiên (High / Medium / Low).
   - Định nghĩa các khái niệm chuyên ngành cốt lõi kèm ví dụ minh họa.
   - Cây sơ đồ tư duy phân nhánh tương tác với tính năng thu gọn / mở rộng và zoom.

3. **Tạo Flashcard 3D & Trắc Nghiệm Tự Động:**
   - Bộ thẻ ghi nhớ lật 3D hỗ trợ thuật toán lặp lại ngắt quãng (Spaced Repetition).
   - Đánh dấu "Biết rồi", "Chưa nhớ" để hệ thống tính toán tỷ lệ ghi nhớ.
   - Bộ câu hỏi trắc nghiệm 4 lựa chọn kèm lời giải thích chi tiết cho từng đáp án.

4. **Trợ Giảng AI 24/7:**
   - Hỏi đáp theo từng bài học cụ thể, toàn bộ môn học hoặc kiến thức tổng quát.
   - Tuân thủ nghiêm ngặt nguyên tắc trung thực: chỉ ưu tiên nội dung bài giảng, không bịa thông tin.

5. **Quản Lý Deadline Thông Minh:**
   - Tự động nhận diện deadline được nhắc tới trong bài giảng ("Hạn nộp bài là thứ 4 tuần sau...").
   - 3 chế độ xem: Danh sách (List), Bảng Kanban (Chưa làm, Đang làm, Hoàn thành), và cảnh báo quá hạn.
   - Danh sách công việc con (Checklist) và cài đặt nhắc nhở trước 1 ngày / 3 ngày.

6. **Phân Quyền Gói Miễn Phí (Free) & Premium:**
   - **Gói Free:** Quản lý tối đa **4 môn học**, 300 phút ghi âm / tháng, 20 lượt AI / ngày.
   - **Gói Premium:** Không giới hạn số môn học (vượt trên 4 môn), 3.000 phút ghi âm, trợ giảng AI không giới hạn.
   - Khi người dùng Free tạo môn thứ 5, modal nâng cấp Premium sẽ hiển thị giải thích quyền lợi và cho phép nâng cấp 1-click ở chế độ Demo.

---

## 👤 Tài Khoản Demo Để Kiểm Thử

Hệ thống đã chuẩn bị sẵn tài khoản demo với đầy đủ môn học, bài giảng và bài tập mẫu:

- **Email:** `minh.nguyen@studymind.edu.vn`
- **Mật khẩu:** `password123` (hoặc bấm nút "1-Click Đăng nhập bằng tài khoản Sinh viên Demo" trên giao diện)
- **Họ tên:** Nguyễn Văn Minh
- **Trường:** Đại học Bách Khoa ĐHQG-HCM (K65 Khoa học Máy tính)
- **3 Môn học mẫu:**
  1. *Lập trình Web nâng cao (CS301)*
  2. *Cơ sở dữ liệu nâng cao (IT202)*
  3. *Marketing căn bản (MK101)*

> **Mẹo kiểm thử:** Nhấn nút **"Dữ liệu mẫu"** trên thanh Navbar bất cứ lúc nào để khôi phục toàn bộ trạng thái dữ liệu nguyên bản.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Local)

### 1. Yêu cầu hệ thống
- Node.js >= 18.0.0
- npm hoặc pnpm

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình biến môi trường
Tạo file `.env` dựa trên file `.env.example`:
```bash
cp .env.example .env
```

Điền khóa API của bạn vào `.env`:
```env
GEMINI_API_KEY="AIzaSy..."
PORT=3000
```
*(Nếu chưa điền `GEMINI_API_KEY`, ứng dụng sẽ tự động kích hoạt bộ giả lập AI Demo thông minh để mọi tính năng vẫn hoạt động mượt mà).*

### 4. Khởi chạy máy chủ phát triển
```bash
npm run dev
```
Ứng dụng sẽ chạy tại địa chỉ: **http://localhost:3000**

---

## ☁️ Cấu Hình Firebase / Supabase & Storage (Production)

### 1. Kiến trúc lưu trữ
- Mặc định, ứng dụng lưu trữ và đồng bộ hóa cục bộ tức thì thông qua LocalStorage & Express backend proxy, giúp chạy ngay lập tức mà không cần cài đặt phức tạp.
- Khi triển khai Firebase cho database quy mô lớn, cấu hình các biến trong `.env`:
```env
VITE_FIREBASE_API_KEY="AIza..."
VITE_FIREBASE_PROJECT_ID="studymind-ai-prod"
VITE_FIREBASE_STORAGE_BUCKET="studymind-ai-prod.appspot.com"
```

### 2. Firestore Security Rules mẫu:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Chỉ người dùng sở hữu dữ liệu mới được đọc/ghi
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /subjects/{subjectId} {
      allow read, write: if request.auth != null && resource.data.ownerId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
    }
    match /lessons/{lessonId} {
      allow read, write: if request.auth != null && resource.data.ownerId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
    }
    match /deadlines/{deadlineId} {
      allow read, write: if request.auth != null && resource.data.ownerId == request.auth.uid;
    }
    match /studyGroups/{groupId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && resource.data.ownerId == request.auth.uid;
    }
  }
}
```

---

## 💳 Tích Hợp Cổng Thanh Toán Stripe Cho Gói Premium

Khi triển khai thanh toán thẻ thực tế:
1. Đăng ký tài khoản tại [Stripe Dashboard](https://dashboard.stripe.com).
2. Tạo 2 sản phẩm: `StudyMind Monthly` (79.000 VNĐ) và `StudyMind Yearly` (699.000 VNĐ).
3. Thêm khóa bảo mật vào file `.env`:
   ```env
   STRIPE_SECRET_KEY="sk_live_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```
4. Trong `server.ts`, mở comment tại hàm `/api/subscribe` để tạo Checkout Session và lắng nghe Webhook xác nhận kích hoạt `plan: 'premium'`.

---

## 📦 Build & Triển Khai Production

```bash
# Build frontend
npm run build

# Khởi chạy server production
npm run start
```
