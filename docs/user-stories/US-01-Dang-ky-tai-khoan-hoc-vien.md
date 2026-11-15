# US-01 - Đăng ký tài khoản học viên

## ID và Tên

**Mã:** US-01  
**Tên:** Đăng ký tài khoản học viên

## User Story Statement

As a **Khách (Guest)** (người chưa có tài khoản trên hệ thống),

I want **đăng ký tài khoản học viên với họ tên, ngày sinh, email, số điện thoại, mật khẩu và chọn khóa học muốn theo học**,

so that **tôi có thể sở hữu tài khoản cá nhân, xác minh email và chuẩn bị thanh toán để theo học khóa đã chọn**.

## Context

### Functional Requirements (FR)

- FR-01: Hệ thống cho phép khách đăng ký tài khoản học viên mới.
- FR-02: Thông tin đăng ký bao gồm: họ tên, ngày sinh, email, số điện thoại, mật khẩu, xác nhận mật khẩu, và tùy chọn chọn một hoặc nhiều khóa học.
- FR-03: Hỗ trợ đăng ký liên kết với tài khoản Google (nếu khách cung cấp thông tin xác thực từ Google).
- FR-04: Sau khi đăng ký thành công, hệ thống thông báo tài khoản đang chờ xác minh email.

### Business Rules (BR)

- BR-01: Họ tên là bắt buộc và không vượt quá 120 ký tự.
- BR-02: Ngày sinh là bắt buộc, phải dùng định dạng YYYY-MM-DD và là ngày trong quá khứ (trừ khi đăng ký qua Google).
- BR-03: Email phải đúng định dạng, được chuẩn hóa về chữ thường và không được trùng với email đã đăng ký trên hệ thống.
- BR-04: Số điện thoại là bắt buộc (trừ khi đăng ký qua Google), phải có từ 7 đến 15 chữ số và đúng định dạng số điện thoại.
- BR-05: Mật khẩu và xác nhận mật khẩu phải khớp nhau. Mật khẩu tối thiểu 8 ký tự và không quá 72 byte UTF-8.
- BR-06: Danh sách khóa học chọn (nếu có) phải là mã khóa học hợp lệ, tối đa 50 khóa, và các khóa đó phải đang mở bán (đã công bố).
- BR-07: Nếu đăng ký qua Google, email từ Google phải khớp với email đăng ký trên hệ thống.
- BR-08: Mật khẩu được bảo mật trước khi lưu vào hệ thống.
- BR-09: Tài khoản mới được tạo trong trạng thái chưa xác minh email, chưa thể đăng nhập cho đến khi hoàn tất bước xác minh email.

### Non-functional Requirements (NFR)

- NFR-01: Hệ thống giới hạn tốc độ gửi yêu cầu đăng ký để bảo vệ khỏi lạm dụng.
- NFR-02: Yêu cầu nguồn gốc yêu cầu (Origin) phải khớp với địa chỉ frontend hoặc API được phép.

### Architecture Decisions (ADR)

- Không có.

## Business Flow

1. Khách truy cập trang đăng ký trên giao diện người dùng.
2. Khách nhập đầy đủ thông tin: họ tên, ngày sinh, email, số điện thoại, mật khẩu, xác nhận mật khẩu, và tùy chọn chọn khóa học (hoặc thông tin xác thực Google nếu đăng ký qua Google).
3. Khách gửi yêu cầu đăng ký.
4. Hệ thống kiểm tra tính hợp lệ của thông tin đầu vào (định dạng email, số điện thoại, mật khẩu, ngày sinh, khóa học đã chọn).
5. Nếu thông tin không hợp lệ, hệ thống thông báo lỗi và yêu cầu khách sửa lại.
6. Nếu email đã tồn tại trên hệ thống, hệ thống thông báo lỗi trùng email.
7. Nếu thông tin hợp lệ, hệ thống tạo tài khoản học viên mới trong trạng thái chưa xác minh email.
8. Hệ thống trả lời khách rằng đăng ký thành công và tài khoản đang chờ xác minh email.
9. Sau khi đăng ký, khách chưa thể đăng nhập cho đến khi hoàn tất xác minh email (xem US-02).

## Acceptance Criteria

### AC1 - Happy Path: Đăng ký thành công

Given: Khách cung cấp đầy đủ thông tin hợp lệ (họ tên, ngày sinh, email chưa tồn tại, số điện thoại, mật khẩu khớp xác nhận mật khẩu, danh sách khóa học hợp lệ nếu có).

When: Khách gửi yêu cầu đăng ký tài khoản.

Then: Hệ thống tạo tài khoản mới, thông báo đăng ký thành công và tài khoản đang chờ xác minh email. Tài khoản mới nằm trong trạng thái chưa xác minh email, chưa thể đăng nhập.

### AC2 - Validation: Email đã tồn tại

Given: Email khách nhập đã được đăng ký trên hệ thống trước đó.

When: Khách gửi yêu cầu đăng ký với email trùng.

Then: Hệ thống không tạo tài khoản mới và thông báo lỗi email đã tồn tại.

### AC3 - Validation: Mật khẩu không khớp

Given: Mật khẩu và xác nhận mật khẩu khác nhau.

When: Khách gửi yêu cầu đăng ký.

Then: Hệ thống không tạo tài khoản và thông báo lỗi mật khẩu không khớp.

### AC4 - Validation: Mật khẩu quá ngắn

Given: Mật khẩu ít hơn 8 ký tự.

When: Khách gửi yêu cầu đăng ký.

Then: Hệ thống không tạo tài khoản và thông báo lỗi yêu cầu mật khẩu tối thiểu 8 ký tự.

### AC5 - Validation: Số điện thoại không hợp lệ

Given: Số điện thoại ít hơn 7 chữ số hoặc sai định dạng.

When: Khách gửi yêu cầu đăng ký.

Then: Hệ thống không tạo tài khoản và thông báo lỗi số điện thoại không hợp lệ.

### AC6 - Không yêu cầu đăng nhập trước

Given: Khách là người mới chưa có tài khoản và chưa đăng nhập.

When: Khách truy cập trang đăng ký và gửi thông tin.

Then: Hệ thống cho phép đăng ký mà không yêu cầu khách đã đăng nhập.

### AC7 - Security: Nguồn yêu cầu không được phép

Given: Yêu cầu đăng ký đến từ nguồn gốc không được hệ thống cho phép.

When: Khách gửi yêu cầu đăng ký.

Then: Hệ thống từ chối xử lý yêu cầu và thông báo lỗi nguồn gốc không được phép.

### AC8 - Edge Case: Ngày sinh không hợp lệ

Given: Ngày sinh sai định dạng YYYY-MM-DD hoặc là ngày trong tương lai.

When: Khách gửi yêu cầu đăng ký.

Then: Hệ thống không tạo tài khoản và thông báo lỗi ngày sinh không hợp lệ.

### AC9 - Edge Case: Khóa học đã chọn không tồn tại

Given: Danh sách mã khóa học khách chọn chứa mã khóa không có trong hệ thống hoặc khóa đó không mở bán.

When: Khách gửi yêu cầu đăng ký.

Then: Hệ thống không tạo tài khoản và thông báo lỗi một hoặc nhiều khóa học đã chọn không khả dụng.

### AC10 - Edge Case: Đăng ký qua Google

Given: Khách cung cấp thông tin xác thực từ Google và email từ Google khớp với email đăng ký.

When: Khách gửi yêu cầu đăng ký qua Google.

Then: Hệ thống tạo tài khoản mới với thông tin từ Google (avatar, mã nhận dạng Google nếu có), Hệ thống sử dụng thông tin được Google cung cấp và yêu cầu bổ sung các thông tin đăng ký còn thiếu nếu cần.

## Out of Scope

- Xác minh email qua mã OTP (thuộc US-02).
- Đăng nhập vào hệ thống sau khi đăng ký (thuộc US-03).
- Khôi phục mật khẩu (thuộc US-05).
- Thanh toán khóa học (thuộc US-08).
- Quản lý khóa học bởi quản trị viên (thuộc US-07).

## Implementation Status

Đã triển khai