# Product Backlog — Nền tảng học tiếng Anh "Your English Voice"

> Tài liệu này chuyển Bảng phân công công việc (PCCV) thành Product Backlog gồm các
> User Story (US) đánh số liên tục. **Thứ tự thực hiện: từ US có số nhỏ đến số lớn** —
> làm xong US này mới sang US kế tiếp trong cùng sprint.
>
> Trạng thái: `Todo` → `In progress` → `Code review` → `Hoàn thành`

## Quy ước vai trò (Actor)

| Ký hiệu | Vai trò |
|---|---|
| HV | Học viên |
| GV | Giảng viên |
| QT | Quản trị viên |
| KH | Khách (chưa đăng nhập) |

---

## SPRINT 1: KHỞI TẠO NỀN TẢNG & XÁC THỰC NGƯỜI DÙNG
**19/10/2026 – 30/10/2026** — Mục tiêu: nền tảng chạy được, có đăng nhập/đăng ký, trang chủ, quản trị người dùng.

| US | Hạng mục | Tên công việc | Ưu tiên | Người thực hiện | Trạng thái |
|---|---|---|---|---|---|
| US-01 | Nền tảng | Tạo repo GitHub, Drive lưu tài liệu | Cao | Nhàn | ✅ Hoàn thành |
| US-02 | Nền tảng | Khởi tạo kiến trúc hệ thống, Database Schema & CI/CD | Cao | Hoa | ✅ Hoàn thành |
| US-03 | HV & GV | Trang chủ & Giới thiệu giảng viên | Cao | Nhàn | ✅ Hoàn thành |
| US-04 | Homepage | Module Xác thực: Đăng ký, Đăng nhập, Phân quyền | Trung bình | Hoa | ✅ Hoàn thành |
| US-05 | QT | Quản lý người dùng: Danh sách & Khóa/Mở tài khoản | Cao | Thư | ✅ Hoàn thành |
| US-06 | Review | Kiểm thử tích hợp Sprint 1 & Hoàn thiện giao diện nền tảng | Trung bình | Thư | ✅ Hoàn thành |

### Chi tiết US Sprint 1

**US-01 — Thiết lập hạ tầng dự án** ✅
- *Là thành viên nhóm, tôi muốn có repo/codebase chuẩn để bắt đầu phát triển.*
- AC: repo GitHub tồn tại, phân nhánh `main`/`dev`, tài liệu lưu Drive chung.

**US-02 — Kiến trúc & Database & CI/CD** ✅
- *Là dev, tôi muốn hệ thống có schema DB và pipeline CI/CD để deploy tự động.*
- AC: schema Supabase rõ ràng (bảng users, courses...); CI chạy lint/test; deploy lên Vercel/Render.

**US-03 — Trang chủ & Giới thiệu giảng viên** ✅
- *Là khách truy cập, tôi muốn xem trang chủ và đội ngũ giảng viên để tìm hiểu nền tảng.*
- AC: trang chủ hiển thị hero, khóa học nổi bật; section giảng viên có ảnh + mô tả.

**US-04 — Xác thực người dùng** ✅
- *Là người dùng, tôi muốn đăng ký/đăng nhập (email + Google) để hệ thống phân quyền HV/GV/QT.*
- AC: đăng ký email, đăng nhập Google OAuth, refresh token, điều hướng theo role.

**US-05 — Quản trị người dùng** ✅
- *Là quản trị viên, tôi muốn xem danh sách người dùng và khóa/mở tài khoản.*
- AC: trang `/admin/users`, tìm kiếm/lọc, khóa-mở tài khoản, chặn HV truy cập admin.

**US-06 — Kiểm thử tích hợp Sprint 1** ✅
- AC: các luồng đăng ký → đăng nhập → phân quyền chạy trơn tru trên cả desktop/mobile.

---

## SPRINT 2: BÀI GIẢNG VIDEO, DAILY WORD & EBOOK
**02/11/2026 – 13/11/2026** — Mục tiêu: GV đăng video bài giảng, HV học video có lưu tiến độ, Daily Word flashcard, trang Ebook giới thiệu.

| US | Hạng mục | Tên công việc (theo TK PCCV) | Ưu tiên | Người thực hiện | Trạng thái |
|---|---|---|---|---|---|
| US-07 | GV | TK06 — Quản lý Video bài giảng (Upload, Sửa/Xóa, Gán khóa học) | Cao | Nhàn | 🔲 Todo |
| US-08 | HV | TK07 — Giao diện học Video & Tự động lưu tiến độ xem (%) | Cao | Hoa | 🔲 Todo |
| US-09 | HV | TK08 — Daily Word: Flashcard phát âm, Đánh dấu thuộc | Trung bình | Thư | 🔲 Todo |
| US-10 | QT | TK09 — Quản lý Daily Word & Lên lịch đăng tự động theo Calendar | Trung bình | Thư | 🔲 Todo |
| US-11 | Homepage | TK10 — Giao diện & Danh mục Ebook giới thiệu | Thấp | Nhàn | 🔲 Todo |

### Chi tiết US Sprint 2

**US-07 — Quản lý Video bài giảng (GV)**
- *Là giảng viên, tôi muốn upload/sửa/xóa video bài giảng và gán vào khóa học.*
- AC:
  - [ ] Upload video (Cloudinary hoặc link), lưu metadata vào DB
  - [ ] Sửa tiêu đề/mô tả/thứ tự bài học; xóa video
  - [ ] Gán video vào topic/lesson của khóa học
  - [ ] Chỉ GV sở hữu khóa học mới được sửa
- Gợi ý vị trí code: `backend/src/modules/courses/`, `frontend/src/pages/courses/CourseManagementPage.tsx`

**US-08 — Học video bài giảng & lưu tiến độ (HV)**
- *Là học viên, tôi muốn xem video bài giảng và hệ thống tự lưu % đã xem để lần sau học tiếp.*
- AC:
  - [ ] Trình phát video trong trang chi tiết khóa học (chỉ HV đã đăng ký/mua xem được)
  - [ ] Mỗi 5–10s lưu tiến độ (%) lên DB (debounce)
  - [ ] Vào lại video tự nhảy tới vị trí đã xem
  - [ ] Hiển thị % hoàn thành mỗi bài học trong khóa

**US-09 — Daily Word cho học viên**
- *Là học viên, tôi muốn học từ vựng mới mỗi ngày qua flashcard có phát âm và đánh dấu "đã thuộc".*
- AC:
  - [ ] Mỗi ngày hiển thị bộ từ của ngày (flashcard lật mặt nghĩa/phiên âm)
  - [ ] Phát âm từ (audio/text-to-speech)
  - [ ] Đánh dấu thuộc/chưa thuộc, lưu trạng thái theo user
  - [ ] Xem lại danh sách từ đã học

**US-10 — Quản lý Daily Word & lịch đăng tự động (QT)**
- *Là quản trị viên, tôi muốn quản lý từ vựng và lên lịch tự động đăng theo lịch (calendar).*
- AC:
  - [ ] CRUD bộ từ vựng (từ, phiên âm, nghĩa, audio)
  - [ ] Chọn ngày đăng trên calendar; hệ thống tự kích hoạt đúng ngày (cron/scheduled job)
  - [ ] HV chỉ thấy từ của ngày hiện tại và các ngày đã qua

**US-11 — Danh mục Ebook giới thiệu**
- *Là người dùng, tôi muốn xem danh mục ebook giới thiệu để biết tài liệu của nền tảng.*
- AC: trang `/ebooks` hiển thị bìa + mô tả + giá; click xem chi tiết (trang chờ phát triển phần mua nếu chưa tới Sprint 5).

---

## SPRINT 3: NGÂN HÀNG BÀI TẬP TRẮC NGHIỆM & TỰ ĐỘNG
**16/11/2026 – 27/11/2026** — Mục tiêu: 4 dạng bài tập tương tác có chấm tự động + quản lý ngân hàng câu hỏi.

| US | Hạng mục | Tên công việc (theo TK PCCV) | Ưu tiên | Người thực hiện | Trạng thái |
|---|---|---|---|---|---|
| US-12 | Bài tập | TK11 — Trắc nghiệm (chọn 1/nhiều đáp án, chấm tự động) | Cao | — | 🔲 Todo |
| US-13 | Bài tập | TK12 — Điền từ vào chỗ trống & kiểm tra chính tả có gợi ý | Cao | — | 🔲 Todo |
| US-14 | GV | TK15 — Quản lý ngân hàng câu hỏi & CRUD bài tập theo chủ đề | Cao | — | 🔲 Todo |
| US-15 | Tích hợp | TK16 — Đăng ký Sandbox Momo/VNPAY/Zoom & lấy API Key | Cao | — | 🔲 Todo |
| US-16 | Bài tập | TK13 — Nối từ/câu (kéo thả ghép ý nghĩa) | Trung bình | — | 🔲 Todo |
| US-17 | Bài tập | TK14 — Sắp xếp từ cho sẵn thành câu hoàn chỉnh | Trung bình | — | 🔲 Todo |
| US-18 | Review | TK17 — Kiểm thử tự động tính điểm & lưu kết quả các dạng bài | Trung bình | — | 🔲 Todo |

> Thứ tự trong sprint: làm **US-14 (quản lý câu hỏi) trước** là cũng được nếu muốn có dữ liệu
> để làm UI bài tập — hai US này song song được, nhưng **UI bài tập phụ thuộc schema câu hỏi**,
> nên chốt schema ở US-12/US-14 trước khi code UI.

### Chi tiết US Sprint 3

**US-14 — Ngân hàng câu hỏi & quản lý bài tập (GV)** *(nên làm đầu tiên trong sprint)*
- *Là giảng viên, tôi muốn tạo/sửa/xóa câu hỏi và bài tập theo chủ đề để giao bài cho học viên.*
- AC:
  - [ ] Schema bài tập: exercise (loại, chủ đề, khóa học) + câu hỏi + đáp án đúng
  - [ ] CRUD bài tập theo chủ đề, gán vào khóa học/bài học
  - [ ] Định dạng chung để mở rộng 4 loại bài: trắc nghiệm, điền từ, nối, sắp xếp
  - [ ] Chỉ GV sở hữu được phép sửa

**US-12 — Bài tập trắc nghiệm**
- *Là học viên, tôi muốn làm trắc nghiệm (chọn 1 hoặc nhiều đáp án) và được chấm điểm tự động.*
- AC: chọn 1 đáp án (radio) / nhiều đáp án (checkbox đúng-sai theo rule); nộp bài chấm điểm tức thì; lưu kết quả + số lần làm vào DB; hiển thị đáp án đúng/sai sau khi nộp.

**US-13 — Điền từ vào chỗ trống**
- *Là học viên, tôi muốn điền từ vào chỗ trống và được kiểm tra chính tả kèm gợi ý.*
- AC: input tại các blank; so khớp không phân biệt hoa/thường (tùy cấu hình); gợi ý ký tự đầu khi sai; chấm tự động + lưu kết quả.

**US-16 — Bài tập nối từ/câu**
- *Là học viên, tôi muốn kéo thả nối từ/câu với ý nghĩa tương ứng.*
- AC: cột trái/phải, kéo thả hoặc click ghép nối; chấm đúng từng cặp; lưu kết quả.

**US-17 — Sắp xếp từ thành câu**
- *Là học viên, tôi muốn kéo thả sắp xếp các từ cho sẵn thành câu đúng.*
- AC: khối từ kéo thả vào khung câu; so khớp thứ tự đúng; chấm tự động + lưu kết quả.

**US-15 — Đăng ký Sandbox cổng thanh toán & Zoom**
- *Là dev, tôi cần tài khoản sandbox Momo/VNPAY/Zoom + API key để chuẩn bị cho Sprint 4–5.*
- AC: có tài khoản sandbox, API key lưu an toàn vào biến môi trường backend, tài liệu hóa trong `docs/`.

**US-18 — Kiểm thử Sprint 3**
- AC: test tự động chấm điểm đúng cho cả 4 dạng bài; kết quả lưu đúng theo user; nộp lại bài không làm mất dữ liệu cũ.

---

## SPRINT 4: KỸ NĂNG NGHE, NÓI, VIẾT & CHẤM ĐIỂM GIẢNG VIÊN
**30/11/2026 – 11/12/2026** — Mục tiêu: 3 kỹ năng Listening/Writing/Speaking + GV chấm bài và thống kê.

| US | Hạng mục | Tên công việc (theo TK PCCV) | Ưu tiên | Người thực hiện | Trạng thái |
|---|---|---|---|---|---|
| US-19 | Bài tập | TK17b — Listening: trình phát Audio, tua thời gian & câu hỏi kèm | Cao | — | 🔲 Todo |
| US-20 | Bài tập | TK18 — Writing: đếm từ tự động, đếm ngược thời gian, lưu nháp | Cao | — | 🔲 Todo |
| US-21 | Bài tập | TK19 — Speaking: thu âm trực tiếp bằng Micro & chấm phát âm | Rất cao | — | 🔲 Todo |
| US-22 | GV | TK20 — Giao diện chấm bài luận & nghe audio phê Speaking | Cao | — | 🔲 Todo |
| US-23 | GV | TK21 — Thống kê nộp bài, danh sách HV đã nộp/chưa nộp | Trung bình | — | 🔲 Todo |

### Chi tiết US Sprint 4

**US-19 — Bài tập Listening**
- AC: phát audio (tua, tốc độ, replay segment); câu hỏi kèm theo audio; chấm tự động; lưu kết quả.

**US-20 — Bài tập Writing**
- *Là học viên, tôi muốn viết bài luận với đếm từ tự động, đồng hồ đếm ngược và lưu nháp.*
- AC: đếm từ/từ số tối thiểu; countdown timer tự nộp hết giờ; autosave nháp mỗi 10–15s; nộp bài vào hàng chờ chấm; GV chấm điểm + nhận xét.

**US-21 — Bài tập Speaking** *(ưu tiên cao nhất sprint)*
- *Là học viên, tôi muốn thu âm trực tiếp qua micro và được chấm phát âm.*
- AC: xin quyền micro, ghi âm bằng MediaRecorder, upload audio (Cloudinary); chấm phát âm (API bên thứ 3 hoặc so khớp); nộp audio cho GV nghe.

**US-22 — GV chấm bài luận & nghe audio Speaking**
- AC: danh sách bài chờ chấm; trình nghe audio với điều khiển tua; form điểm + lời phê; HV xem được điểm/phê sau khi chấm.

**US-23 — Thống kê nộp bài (GV)**
- AC: theo bài tập/khóa học: số HV đã nộp/chưa nộp, xuất danh sách; tổng quan tiến độ.

---

## SPRINT 5: WORKSHOP ZOOM, CỔNG THANH TOÁN & BÀN GIAO GO-LIVE
**14/12/2026 – 25/12/2026** — Mục tiêu: workshop Zoom trả phí, thanh toán online, báo cáo doanh thu, go-live.

| US | Hạng mục | Tên công việc (theo TK PCCV) | Ưu tiên | Người thực hiện | Trạng thái |
|---|---|---|---|---|---|
| US-24 | QT | TK22 — Quản lý Buổi Meeting/Workshop Zoom (Tạo, Sửa lịch, Giá, Slot) | Cao | — | 🔲 Todo |
| US-25 | Thanh toán | TK23 — Tích hợp cổng thanh toán trực tuyến (VNPAY/Momo/QR) | Rất cao | — | 🔲 Todo |
| US-26 | HV & Ebook | TK24 — Đăng ký Zoom, Mua Ebook, Nhận link Zoom qua Email/Web | Cao | — | 🔲 Todo |
| US-27 | QT | TK25 — Quản lý doanh thu Zoom, Lịch sử GD & Xuất báo cáo Excel | Cao | — | 🔲 Todo |
| US-28 | UAT | TK26 — UAT kiểm thử toàn diện, tải trọng & bảo mật | Cao | — | 🔲 Todo |
| US-29 | Go-live | TK27 — Triển khai Production, cấu hình tên miền & bàn giao | Cao | — | 🔲 Todo |

### Chi tiết US Sprint 5

**US-24 — Quản lý Workshop Zoom (QT)**
- AC: CRUD buổi workshop (tiêu đề, thời gian, giá, số slot); tạo link Zoom qua API Zoom; chỉ hiện buổi sắp diễn ra cho HV.

**US-25 — Cổng thanh toán trực tuyến** *(ưu tiên cao nhất sprint)*
- AC: thanh toán qua VNPAY/Momo/QR cho khóa học + workshop + ebook; xử lý webhook/IPN xác nhận giao dịch; ghi nhận trạng thái đơn (pending/success/failed); email xác nhận thanh toán.
- Ghi chú: phần lớn backend SePay/VietQR + bảng `course_orders` + email outbox đã có sẵn từ merge Sprint 2 (nhánh dev, commit 4b67773) — rà soát và tái sử dụng trước khi viết mới.

**US-26 — Đăng ký Zoom & Mua Ebook**
- AC: HV đặt chỗ workshop (trừ slot khi đủ); thanh toán xong nhận link Zoom qua email + xem trên web; mua ebook nhận link tải; chặn đặt chỗ khi hết slot.

**US-27 — Doanh thu & báo cáo (QT)**
- AC: trang tổng quan doanh thu (lọc theo ngày/khóa/workshop); lịch sử giao dịch chi tiết; xuất Excel/CSV.

**US-28 — UAT**
- AC: kịch bản kiểm thử toàn bộ luồng (đăng ký → học → làm bài → thanh toán → nhận tài liệu); kiểm thử tải; rà soát bảo mật (key, phân quyền, webhook signature).

**US-29 — Go-live**
- AC: môi trường production ổn định; tên miền + HTTPS; tài liệu bàn giao (hướng dẫn vận hành, tài khoản admin, quy trình backup).

---

## Tiến độ tổng quan

| Sprint | Khoảng US | Thời gian | Trạng thái |
|---|---|---|---|
| Sprint 1 | US-01 → US-06 | 19/10 – 30/10/2026 | ✅ Hoàn thành |
| Sprint 2 | US-07 → US-11 | 02/11 – 13/11/2026 | 🔄 Đang thực hiện |
| Sprint 3 | US-12 → US-18 | 16/11 – 27/11/2026 | 🔲 Chưa bắt đầu |
| Sprint 4 | US-19 → US-23 | 30/11 – 11/12/2026 | 🔲 Chưa bắt đầu |
| Sprint 5 | US-24 → US-29 | 14/12 – 25/12/2026 | 🔲 Chưa bắt đầu |
