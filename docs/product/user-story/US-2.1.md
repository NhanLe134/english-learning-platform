# US-2.1 — Xem Trang chủ nền tảng (Khách truy cập)

As a Khách truy cập nền tảng (chưa đăng nhập hoặc đã đăng nhập),

I want mở trang chủ và lướt thấy ngay toàn bộ bức tranh của nền tảng — phương pháp giảng dạy, các khóa học hiện tại, tủ sách ebook, lý do tin tưởng, cảm nhận học viên, ưu đãi quà tặng và workshop sắp diễn ra — với các nút điều hướng dẫn tôi đến đúng trang chi tiết,

so that tôi tự tìm hiểu và tự quyết định có học tiếp (đăng ký khóa học, workshop) hay không mà không phải liên hệ nhân viên.

## Context

- REQ-2.1-01 (FR): Trang chủ (`/`) hiển thị đầy đủ 7 section theo đúng thứ tự: Hero giới thiệu ➔ Các khóa học hiện tại ➔ Tủ Sách Tự Học (Ebook) ➔ Vì sao chọn chúng tôi ➔ Cảm nhận học viên ➔ Quà tặng (form nhận ebook) ➔ Workshop, kèm Header điều hướng trên cùng và Footer ở cuối trang.
- REQ-2.1-02 (FR): Header hiển thị menu điều hướng đến 6 trang: Trang chủ (`/`), Về chúng tôi (`/about`), Các khóa học (`/courses`), Ebook (`/ebooks`), Workshop (`/workshops`), Liên hệ (`/contact`) và nút Đăng ký (`/register`); trên mobile menu hiển thị dạng thanh ngang cuộn ngang dưới logo.
- REQ-2.1-03 (FR): Section Hero hiển thị slogan, mô tả phương pháp, checklist giá trị, ảnh lớp học kèm nhãn "Học trực tuyến cùng giáo viên" và 2 nút CTA: "Nhận chương trình học ngay" (→ `/courses`) và "Tham gia đào tạo trực tuyến" (→ neo `#workshop` cuộn tới section Workshop).
- REQ-2.1-04 (FR): Section Khóa học hiển thị các khóa học nổi bật dưới dạng thẻ (tag danh mục, tiêu đề, mô tả, thời lượng, lợi ích, nhãn "Phổ biến nhất" nếu có) và link "Xem tất cả khóa học" (→ `/courses`).
- REQ-2.1-05 (FR): Section Workshop lấy dữ liệu **động từ API** (`GET /workshops?limit=2` — single source of truth), hiển thị tối đa 2 workshop kèm tiêu đề, lịch diễn ra theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`), giá (định dạng VNĐ; giá 0 hiển thị "Miễn phí") và tên giảng viên.
- REQ-2.1-06 (FR): Section Quà tặng có form nhập Họ tên + Email để đăng ký nhận Ebook miễn phí, kèm cam kết bảo mật thông tin.
- REQ-2.1-07 (FR): Các section Ebook, Vì sao chọn, Cảm nhận học viên hiển thị nội dung giới thiệu tĩnh từ dữ liệu hệ thống (không cho khách tự sửa).
- BR-2.1-01 (Single Source of Truth): Danh sách workshop trên trang chủ chỉ được đọc từ API hệ thống — không hard-code workshop vào giao diện; mọi thay đổi workshop (tạo/sửa/hủy) phản ánh đúng khi tải lại trang chủ.
- BR-2.1-02 (Giới hạn hiển thị): Section Workshop chỉ hiển thị tối đa 2 workshop; khách muốn xem đầy đủ phải bấm "Xem tất cả" đến trang Workshop chuyên dụng.
- BR-2.1-03 (Nội dung chỉ đọc): Khách truy cập không có bất kỳ thao tác tạo/sửa/xóa nào trên nội dung trang chủ; trang chủ là trang đọc- thuần (read-only) với mọi vai trò.
- NFR-2.1-01: Thời gian tải trang chủ < 2 giây (ảnh hero và nội dung tĩnh hiển thị tức thì; section Workshop được phép tải sau không chặn toàn trang).
- NFR-2.1-02: Vận hành mượt trên trình duyệt mobile (Safari iOS & Chrome Android); layout tự co giãn (grid 1 cột trên mobile, 2 cột trên desktop).
- Ràng buộc kỹ thuật: Giá và lịch workshop định dạng theo locale `vi-VN`, múi giờ `Asia/Ho_Chi_Minh`; request API workshop có cơ chế hủy (AbortController) khi khách rời trang giữa chừng.

## Acceptance Criteria

### AC1 (Happy Path — Khách mở trang chủ và duyệt đầy đủ các section)

Given Khách truy cập chưa đăng nhập, mở trình duyệt mobile (Safari iOS hoặc Chrome Android — NFR-2.1-02) và vào địa chỉ `/`,

When Trang chủ tải xong trong dưới 2 giây (NFR-2.1-01),

Then Trang hiển thị đầy đủ và đúng thứ tự 7 section theo REQ-2.1-01: Hero với slogan và 2 nút CTA; 3 thẻ khóa học nổi bật (đủ tag, tiêu đề, mô tả, thời lượng, lợi ích); section Ebook với 2 cuốn; 4 lý do "Vì sao chọn"; 2 cảm nhận học viên; form Quà tặng; section Workshop với dữ liệu thật từ API; Header có đủ 6 menu + nút Đăng ký; Footer ở cuối trang — và toàn bộ trang là read-only đối với khách (BR-2.1-03).

### AC2 (Business Rule — Section Workshop tải động từ API, hiển thị đúng lịch và giá)

Given Hệ thống có ≥ 2 workshop đang mở và khách đang ở trang chủ,

When Section Workshop tải dữ liệu thành công từ `GET /workshops?limit=2` (BR-2.1-01, REQ-2.1-05),

Then Hiển thị tối đa 2 workshop (BR-2.1-02), mỗi workshop có tiêu đề, lịch dạng `HH:mm - HH:mm | Thứ, dd/mm/yyyy` theo giờ Việt Nam (ví dụ `19:00 - 21:00 | Thứ Năm, 20/11/2026`), giá đúng định dạng VNĐ hoặc nhãn "Miễn phí" nếu giá = 0, và tên giảng viên; bấm nút "Tham gia đào tạo trực tuyến" ở Hero cuộn mượt tới đúng section `#workshop` này.

### AC3 (Edge Case — Workshop API trả lỗi / rỗng)

Given Khách đang ở trang chủ và section Workshop đang tải,

When (1) API trả lỗi hoặc mất kết nối mạng,

Then (1) Section Workshop hiển thị thông báo lỗi tại chỗ: "Không tải được danh sách workshop" — các section còn lại của trang chủ **không bị ảnh hưởng**, khách vẫn duyệt bình thường;

When (2) API trả thành công nhưng danh sách workshop trống (chưa có workshop mở),

Then (2) Section hiển thị nhãn "Hiện chưa có workshop nào mở đăng ký. Quay lại sau nhé!" thay vì để vùng trống hoặc lỗi kỹ thuật.

### AC4 (Edge Case — Trang chủ tải với trạng thái loading)

Given Section Workshop cần thời gian gọi API trong khi phần nội dung tĩnh đã hiển thị,

When Khách cuộn tới section Workshop trong lúc dữ liệu chưa về,

Then Section hiển thị 2 khối skeleton (placeholder nhấp nháy nhẹ) đúng vị trí thẻ workshop — không nhảy layout (layout shift) khi dữ liệu về; nội dung tĩnh (Hero, Khóa học, Ebook...) không bị chặn bởi request workshop.

### AC5 (Business Rule — Điều hướng từ trang chủ)

Given Khách đang ở trang chủ,

When Khách bấm lần lượt các điểm điều hướng,

Then (1) Menu "Các khóa học" và nút "Nhận chương trình học ngay" đưa đến `/courses`; (2) "Xem tất cả khóa học" đưa đến `/courses`; (3) "Tham gia đào tạo trực tuyến" cuộn tới section `#workshop` ngay trên trang (không rời trang); (4) menu Về chúng tôi / Ebook / Workshop / Liên hệ đưa đến đúng trang tương ứng; (5) nút Đăng ký đưa đến `/register` (REQ-2.1-02, REQ-2.1-03).

### AC6 (UX — Form Quà tặng nhập liệu cơ bản)

Given Khách đang ở section Quà tặng,

When Khách nhập Họ tên và Email vào form rồi bấm "Nhận Ebook",

Then Form chấp nhận nhập liệu, hiển thị ô nhập có nhãn trợ năng (aria-label) rõ ràng và dòng cam kết "Thông tin của bạn được cam kết bảo mật tuyệt đối 100%" (REQ-2.1-06). *(Lưu ý hiện trạng: submit hiện chỉ giữ lại dữ liệu tại client, chưa gọi API lưu lead — việc xử lý lead/email được ghi trong Out of Scope.)*

### AC7 (UX — Responsive theo thiết bị)

Given Khách truy cập trang chủ bằng desktop (≥ 1024px) và bằng mobile (< 640px),

When So sánh hai lần tải trang,

Then Trên desktop: Hero bố cục 2 cột (nội dung trái — ảnh phải), khóa học hiển thị 3 cột, menu điều hướng dạng hàng ngang đầy đủ; trên mobile: các section xếp dọc 1 cột, thẻ khóa học xếp chồng, menu thu gọn thành thanh ngang cuộn ngang dưới logo; không có nội dung nào bị tràn/cắt mất trên cả hai bố cục (NFR-2.1-02).

## Out of Scope

- Đăng nhập / Đăng ký tài khoản — thuộc US-04 (Module Xác thực).
- Trang danh sách & chi tiết khóa học (mua/đăng ký khóa) — thuộc trang `/courses` và US-08.
- Đăng ký workshop, thanh toán — thuộc US-24, US-25, US-26.
- Mua Ebook / nhận link tải — thuộc US-11, US-26.
- Hệ thống xử lý lead từ form Quà tặng (lưu DB, gửi email ebook tự động) — hiện form chỉ thu dữ liệu tại client; sẽ tách US riêng khi làm Sprint 5 (Email/Resend).
- CMS cho Quản trị viên chỉnh sửa nội dung giới thiệu, khóa học nổi bật, cảm nhận học viên trên trang chủ — nội dung hiện quản lý qua code (dữ liệu tĩnh) theo REQ-2.1-07.
