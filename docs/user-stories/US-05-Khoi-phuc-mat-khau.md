# US-05 - Khôi phục mật khẩu (quên mật khẩu)

## ID và Tên

**Mã:** US-05  
**Tên:** Khôi phục mật khẩu (quên mật khẩu)

## User Story Statement

As a **Người dùng chưa đăng nhập (Guest)**,

I want **yêu cầu khôi phục mật khẩu thông qua email**,

so that **tôi có thể lấy lại quyền truy cập tài khoản khi quên mật khẩu**.

## Context

### Functional Requirements (FR)

- FR-01: Hệ thống cho phép khách yêu cầu khôi phục mật khẩu bằng cách cung cấp địa chỉ email.
- FR-02: Hệ thống gửi mật khẩu tạm thời qua email cho khách.
- FR-03: Hệ thống trả về thông báo chung dù email có tồn tại trên hệ thống hay không (để bảo vệ quyền riêng tư).
- FR-04: Hỗ trợ khôi phục mật khẩu cho cả tài khoản học viên và tài khoản quản trị.

### Business Rules (BR)

- BR-01: Email phải đúng định dạng. Nếu email không hợp lệ, hệ thống trả về thông báo chung mà không xử lý thêm.
- BR-02: Hệ thống yêu cầu cấu hình dịch vụ email để gửi mật khẩu tạm thời. Nếu chưa cấu hình, hệ thống thông báo dịch vụ khôi phục mật khẩu chưa khả dụng.
- BR-03: Hệ thống hỗ trợ khôi phục mật khẩu cho tài khoản học viên và tài khoản quản trị thông qua email đã đăng ký.
- BR-04: Chỉ gửi email khôi phục mật khẩu nếu tài khoản đang trong trạng thái hoạt động. Nếu tài khoản không tồn tại hoặc không hoạt động, hệ thống trả về thông báo chung (không tiết lộ).
- BR-05: Mật khẩu tạm thời được tạo ngẫu nhiên.
- BR-06: Email chứa mật khẩu tạm thời và liên kết đến trang đăng nhập trên giao diện người dùng.
- BR-07: Đối với tài khoản học viên, hệ thống cập nhật mật khẩu mới nhưng không tự động thay đổi trạng thái xác minh email hoặc trạng thái tài khoản chỉ vì người dùng thực hiện khôi phục mật khẩu.
- BR-08: Đối với tài khoản quản trị, hệ thống thực hiện cập nhật mật khẩu thông qua dịch vụ quản trị bên thứ ba.
- BR-09: Sau khi khôi phục thành công, hệ thống thu hồi tất cả phiên làm việc hiện tại của tài khoản đó.
- BR-10: Hệ thống luôn trả về thông báo chung ("Nếu địa chỉ email này tồn tại trên hệ thống, một mật khẩu tạm thời sẽ được gửi") dù thành công hay không (trừ lỗi hệ thống).

### Non-functional Requirements (NFR)

- NFR-01: Hệ thống giới hạn tốc độ gửi yêu cầu khôi phục mật khẩu.
- NFR-02: Yêu cầu nguồn gốc yêu cầu (Origin) phải khớp với địa chỉ frontend hoặc API được phép.

### Architecture Decisions (ADR)

- Không có.

## Business Flow

1. Khách truy cập trang quên mật khẩu và nhập địa chỉ email.
2. Khách gửi yêu cầu khôi phục mật khẩu.
3. Hệ thống kiểm tra định dạng email. Nếu email không hợp lệ, hệ thống trả về thông báo chung.
4. Hệ thống kiểm tra khả năng gửi email. Nếu dịch vụ email chưa khả dụng, hệ thống thông báo lỗi dịch vụ.
5. Hệ thống xác định tài khoản tương ứng với email được cung cấp.
6. Nếu tài khoản không tồn tại hoặc không đủ điều kiện khôi phục, hệ thống trả về thông báo chung.
7. Nếu tài khoản hợp lệ, hệ thống tạo mật khẩu tạm thời.
8. Hệ thống cập nhật mật khẩu:
   - Với tài khoản học viên: cập nhật mật khẩu trong hệ thống.
   - Với tài khoản quản trị: cập nhật mật khẩu thông qua dịch vụ quản trị bên thứ ba.
9. Sau khi cập nhật mật khẩu thành công, hệ thống gửi email chứa mật khẩu tạm thời và liên kết đến trang đăng nhập.
10. Hệ thống thu hồi các phiên làm việc hiện tại của tài khoản.
11. Hệ thống trả về thông báo chung cho khách.

## Acceptance Criteria

### AC1 - Happy Path: Gửi email khôi phục thành công (tài khoản học viên)

Given: Tài khoản học viên tồn tại, đang trong trạng thái hoạt động, dịch vụ email đã được cấu hình đầy đủ.

When: Khách gửi yêu cầu khôi phục mật khẩu với địa chỉ email hợp lệ.

Then: Hệ thống cập nhật mật khẩu, gửi email chứa mật khẩu tạm thời, thu hồi tất cả phiên làm việc hiện tại của tài khoản và trả về thông báo chung cho khách.

### AC2 - Happy Path: Gửi email khôi phục thành công (tài khoản quản trị)

Given: Tài khoản quản trị tồn tại trong dịch vụ quản trị bên thứ ba.

When: Khách gửi yêu cầu khôi phục mật khẩu với email của quản trị.

Then: Hệ thống cập nhật mật khẩu qua dịch vụ quản trị bên thứ ba và thông báo chung cho khách.

### AC3 - Validation: Email không hợp lệ

Given: Địa chỉ email không đúng định dạng.

When: Khách gửi yêu cầu khôi phục mật khẩu.

Then: Hệ thống trả về thông báo chung (không tiết lộ email không hợp lệ).

### AC4 - Validation: Email không tồn tại

Given: Địa chỉ email không liên kết với bất kỳ tài khoản nào trên hệ thống.

When: Khách gửi yêu cầu khôi phục mật khẩu.

Then: Hệ thống trả về thông báo chung (không tiết lộ xem email có tồn tại hay không).

### AC5 - Authentication: Tài khoản không hoạt động

Given: Tài khoản tồn tại nhưng đang trong trạng thái bị khóa hoặc chờ thanh toán.

When: Khách gửi yêu cầu khôi phục mật khẩu.

Given: Tài khoản tồn tại nhưng không đủ điều kiện khôi phục mật khẩu, chẳng hạn đang bị khóa hoặc ở trạng thái không được phép khôi phục.

### AC6 - Error: Chưa cấu hình dịch vụ email

Given: Hệ thống chưa cấu hình thông tin gửi email.

When: Khách gửi yêu cầu khôi phục mật khẩu với email hợp lệ.

Then: Hệ thống thông báo dịch vụ khôi phục mật khẩu chưa khả dụng.

### AC7 - Error: Gửi email thất bại

Given: Dịch vụ email từ chối gửi email.

When: Khách gửi yêu cầu khôi phục mật khẩu.

Then: Hệ thống thông báo không thể gửi email khôi phục. Mật khẩu chỉ được cập nhật khi quy trình khôi phục đáp ứng đầy đủ điều kiện thành công.

### AC8 - Error: Không thể cập nhật mật khẩu

Given: Email đã được gửi nhưng hệ thống không thể cập nhật mật khẩu trong cơ sở dữ liệu.

When: Khách gửi yêu cầu khôi phục mật khẩu.

Then: Hệ thống không xác nhận khôi phục thành công, thông báo lỗi phù hợp và hướng dẫn khách liên hệ bộ phận hỗ trợ nếu cần.

### AC9 - Security: Nguồn yêu cầu không được phép

Given: Nguồn yêu cầu không khớp với địa chỉ frontend hoặc API được phép.

When: Khách gửi yêu cầu khôi phục mật khẩu.

Then: Hệ thống từ chối xử lý yêu cầu và thông báo lỗi nguồn gốc không được phép.

## Out of Scope

- Đặt lại mật khẩu bằng mã đặt lại mật khẩu (chức năng mã đặt lại mật khẩu trong hệ thống chưa được sử dụng bởi bất kỳ API nào).
- Đăng nhập vào hệ thống (thuộc US-03).
- Xác minh email qua mã OTP (thuộc US-02).

## Implementation Status

Đã triển khai