# US-4.4 — Quản lý Video bài giảng: Đăng tải, Sửa & Xóa (Giảng viên)

As a Giảng viên (GV),

I want đăng tải video bài giảng mới vào khóa học bằng cách dán link YouTube, tự sửa tiêu đề/mô tả/link/tài liệu đính kèm và tự xóa video không còn dùng,

so that tôi chủ động xây dựng và cập nhật nội dung khóa học của mình bất kỳ lúc nào mà không phải phụ thuộc Quản trị viên hay kỹ thuật viên.

## Context

- REQ-4.4-01 (FR): GV đăng tải video bài giảng mới bằng cách dán link YouTube, nhập tiêu đề và mô tả, gán vào khóa học của mình.
- REQ-4.4-02 (FR): GV sửa thông tin video (tiêu đề, mô tả, link YouTube, tài liệu đính kèm) và xóa video.
- REQ-4.4-03 (FR): GV chọn khóa học có sẵn hoặc tạo khóa học mới ngay trong luồng đăng tải.
- REQ-4.4-04 (FR): Video gắn trực tiếp vào khóa học (course → video); không sắp xếp thứ tự bài học — học viên tự chọn bài bất kỳ để học.
- REQ-4.4-05 (FR): Tài liệu đính kèm là tùy chọn (có thể không đính kèm; có thể đính kèm nhiều tài liệu).
- BR-4.4-01 (Ownership): GV chỉ được thêm/sửa/xóa video trong **khóa học mình sở hữu**; hệ thống chặn cả UI (ẩn nút) và API (trả lỗi quyền) với GV thao tác khóa học của người khác.
- BR-4.4-02 (Single Source of Truth — link video): Hệ thống chỉ chấp nhận link YouTube hợp lệ (`youtube.com/watch?v=...`, `youtu.be/...`, dạng playlist); mọi định dạng link khác (Drive, Stream, mp4 trực tiếp...) bị từ chối. Link được chuẩn hóa về dạng embed để phát trong nền tảng.
- BR-4.4-03 (Metadata Integrity): Tiêu đề là bắt buộc, không trùng với tiêu đề video khác trong cùng khóa học; khóa học là bắt buộc phải chọn trước khi đăng tải.
- BR-4.4-04 (Delete Confirmation & Impact): Xóa video phải qua modal xác nhận; modal hiển thị cảnh báo video bị xóa là **vĩnh viễn** và dữ liệu tiến độ học (lesson_progress) của học viên đối với video đó sẽ mất; xóa chỉ thực hiện sau khi GV bấm "Xác nhận xóa".
- BR-4.4-05 (Explicit Confirmation cho tác động lớn): Tạo khóa học mới ngay trong luồng đăng tải phải qua modal/form xác nhận riêng — không tự động tạo khóa học rỗng khi GV chỉ dán link mà chưa hoàn tất.
- NFR-4.4-01: Thao tác đăng tải/sửa/xóa hoàn tất và cập nhật giao diện trong vòng **< 2 giây** kể từ khi backend phản hồi thành công.
- NFR-4.4-02: Vận hành mượt trên trình duyệt mobile (Safari iOS & Chrome Android).
- Ràng buộc kỹ thuật: Link video chỉ được đọc/tuần tự hóa từ dữ liệu hệ thống (single source of truth — không tự chế biến URL ngoài validator); quyền sở hữu khóa học kiểm tra ở cả frontend và backend (không tin UI).

## Acceptance Criteria

### AC1 (Happy Path — Đăng tải video hợp lệ vào khóa học có sẵn)

Given GV đã đăng nhập với vai trò Giảng viên và sở hữu khóa học "IELTS Speaking Cơ bản",

When GV mở màn hình Quản lý Video bài giảng, bấm "Đăng tải video mới", chọn khóa học "IELTS Speaking Cơ bản", dán link `https://www.youtube.com/watch?v=XXXX`, nhập tiêu đề "Bài 1 — Giới thiệu Part 1" và mô tả, rồi bấm "Đăng tải" — REQ-4.4-01,

Then Hệ thống kiểm tra link hợp lệ theo BR-4.4-02 và tiêu đề hợp lệ theo BR-4.4-03, lưu video vào khóa học kèm thumbnail YouTube tự động lấy từ link, hiển thị video mới trong danh sách bài giảng của khóa học trong vòng < 2 giây (NFR-4.4-01); GV không phải thao tác thêm bất kỳ bước duyệt nào.

### AC2 (Edge Case — Link không hợp lệ hoặc không phải YouTube)

Given GV đang ở form "Đăng tải video mới",

When GV dán link không phải YouTube (ví dụ `https://drive.google.com/file/d/...`) hoặc link sai định dạng (ví dụ `youtube.com/` thiếu video ID), rồi bấm "Đăng tải",

Then Hệ thống chặn thao tác, hiển thị lỗi đỏ tại ô nhập link: "Link không hợp lệ. Chỉ chấp nhận link video YouTube (youtube.com/watch hoặc youtu.be)"; video không được lưu; các trường khác GV đã nhập được bảo toàn nguyên vẹn để GV chỉ sửa lại link.

### AC3 (Edge Case — Thiếu thông tin bắt buộc / trùng tiêu đề)

Given GV đang ở form "Đăng tải video mới" và khóa học đã chọn có sẵn video "Bài 1 — Giới thiệu Part 1",

When (1) GV bấm "Đăng tải" khi chưa nhập tiêu đề hoặc chưa chọn khóa học,

Then (1) Hệ thống chặn submit, highlight viền đỏ các trường thiếu kèm nhãn "Bắt buộc"; con trỏ tập trung vào trường thiếu đầu tiên (BR-4.4-03);

When (2) GV nhập tiêu đề "Bài 1 — Giới thiệu Part 1" (đã tồn tại trong cùng khóa học) và bấm "Đăng tải",

Then (2) Hệ thống chặn submit, hiển thị lỗi "Tiêu đề này đã tồn tại trong khóa học. Vui lòng đặt tiêu đề khác" (BR-4.4-03).

### AC4 (Business Rule — Quyền sở hữu khóa học)

Given GV-B sở hữu khóa học "Tiếng Anh giao tiếp", còn GV-A không sở hữu khóa học nào của GV-B,

When GV-A truy cập trang quản lý video của khóa học "Tiếng Anh giao tiếp" bằng URL trực tiếp hoặc gọi API thêm/sửa/xóa video của khóa học đó,

Then Giao diện không hiển thị nút "Đăng tải / Sửa / Xóa" đối với khóa học không thuộc sở hữu; mọi API tương ứng trả lỗi quyền (403 Forbidden) kèm thông báo "Bạn không có quyền thao tác trên khóa học này" — chặn ở cả frontend và backend (BR-4.4-01).

### AC5 (Business Rule — Sửa video)

Given Video "Bài 1 — Giới thiệu Part 1" đã đăng tải trong khóa học của GV và GV đang mở form sửa video,

When GV sửa mô tả, thay link YouTube mới và lưu,

Then Hệ thống hợp lệ hóa lại link theo BR-4.4-02, cập nhật dữ liệu và giao diện trong vòng < 2 giây; thumbnail tự cập nhật theo link mới; học viên vào lại khóa học thấy bản nội dung mới (không còn bản cũ ở bất kỳ đâu trong nền tảng).

### AC6 (Business Rule — Xóa video kèm xác nhận và cảnh báo tác động)

Given Video "Bài 2 — Part 2 Sample Answers" có học viên đã học và có tiến độ lưu (lesson_progress),

When GV bấm "Xóa" trên video đó,

Then Hệ thống hiển thị modal xác nhận nêu rõ: tên video, cảnh báo "Xóa là vĩnh viễn — không thể hoàn tác" và "Tiến độ học của học viên đối với video này sẽ mất" (BR-4.4-04); video chỉ bị xóa sau khi GV bấm "Xác nhận xóa"; sau khi xóa, video biến mất khỏi danh sách bài giảng của khóa học ở mọi thiết bị; nếu GV đóng modal mà không xác nhận thì không có gì thay đổi.

### AC7 (Business Rule — Tạo khóa học mới trong luồng đăng tải)

Given GV chưa có khóa học phù hợp cho video sắp đăng,

When GV bấm "Tạo khóa học mới" ngay trong form đăng tải, nhập tên khóa học và xác nhận,

Then Hệ thống tạo khóa học mới thuộc sở hữu GV (BR-4.4-01, REQ-4.4-03), tự động chọn khóa học này trong ô chọn khóa học của form đăng tải; GV tiếp tục dán link và đăng tải bình thường; nếu GV hủy form tạo khóa học thì form đăng tải giữ nguyên trạng thái nhập dở (BR-4.4-05).

### AC8 (Business Rule — Tài liệu đính kèm tùy chọn)

Given GV đang ở form đăng/sửa video,

When (1) GV bỏ trống phần tài liệu đính kèm và bấm "Đăng tải",

Then (1) Video vẫn đăng tải thành công (REQ-4.4-05);

When (2) GV đính kèm 2 tài liệu (link/URL tài liệu) rồi đăng tải,

Then (2) Cả 2 tài liệu được lưu và hiển thị cùng video; học viên xem video sẽ thấy phần tải tài liệu kèm theo; GV xóa bớt 1 tài liệu trong form sửa thì chỉ tài liệu đó bị gỡ, video và tài liệu còn lại giữ nguyên.

### AC9 (Fallback / Error Handling — Mất kết nối khi thao tác)

Given GV đang nhập form đăng tải video và thiết bị mất kết nối mạng hoặc API trả lỗi khi GV bấm "Đăng tải",

When Yêu cầu gửi đi thất bại,

Then Hệ thống hiển thị banner đỏ "Lỗi kết nối. Video chưa được đăng tải. Vui lòng kiểm tra mạng và thử lại" kèm nút "Thử lại"; toàn bộ dữ liệu form (link, tiêu đề, mô tả, tài liệu đính kèm, khóa học đã chọn) được bảo toàn nguyên vẹn; khi bấm "Thử lại" (hoặc mạng khôi phục), hệ thống gửi lại đúng dữ liệu đó và đăng tải thành công — GV không phải nhập lại từ đầu. Tương tự cho thao tác Sửa và Xóa: thao tác thất bại không làm thay đổi dữ liệu hiện có.

### AC10 (UX — Thumbnail preview và xác nhận đăng)

Given GV vừa dán link YouTube hợp lệ vào ô link,

When Ô link mất focus (blur) và hệ thống nhận diện link hợp lệ,

Then Thumbnail video tự hiển thị ngay cạnh ô link để GV xác nhận mình đã dán đúng video (theo REQ-4.4-01); nếu link không hợp lệ, ô link chuyển đỏ ngay tại chỗ theo AC2 mà không cần chờ bấm "Đăng tải".

## Out of Scope

- Trình phát video, kiểm soát quyền xem của học viên (chỉ HV đã đăng ký/mua) và tự động lưu tiến độ xem (%) — thuộc US-08 (HV).
- Upload file video trực tiếp (Cloudinary/Supabase Storage) — giai đoạn này chỉ nhận link YouTube; upload trực tiếp sẽ xem xét ở giai đoạn sau.
- Cấu trúc course → topic → lesson và sắp xếp thứ tự bài học — video gắn thẳng vào khóa học, học viên học tự do theo REQ-4.4-04.
- Trạng thái Nháp/Đã xuất bản và luồng QT duyệt nội dung trước khi hiển thị — chưa chốt, bỏ qua giai đoạn này.
- Giới hạn số lượng video mỗi khóa học — không giới hạn ở giai đoạn này.
- Quản lý Daily Word, Ebook, bài tập, thanh toán — thuộc các US khác (US-09, US-10, US-11, Sprint 3–5).
