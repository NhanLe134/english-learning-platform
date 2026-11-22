# US-02 - Xác minh email đăng ký qua mã OTP

## ID và Tên

**Mã:** US-02  
**Tên:** Xác minh email đăng ký qua mã OTP

## User Story Statement

As a **Khách (Guest)** (vừa đăng ký tài khoản học viên nhưng chưa xác minh email),

I want **nhận mã OTP qua email và nhập mã đó để xác minh địa chỉ email của mình**,

so that **tôi có thể xác minh địa chỉ email, hoàn tất bước xác minh tài khoản, từ đó có thể tiến hành đăng ký khóa học**.

## Context

### Functional Requirements (FR)

- FR-01: Hệ thống cho phép khách yêu cầu gửi lại mã OTP xác minh qua email.
- FR-02: Hệ thống cho phép khách nhập mã OTP nhận được để xác minh email.
- FR-03: Sau khi xác minh thành công, hệ thống thông báo tài khoản đã được xác minh.
- FR-04: Trong môi trường phát triển, nếu hệ thống không gửi được email, hệ thống có thể cung cấp mã OTP thay thế để hỗ trợ kiểm tra.

### Business Rules (BR)

- BR-01: Chỉ có thể gửi mã OTP cho tài khoản đã đăng ký, chưa xác minh email và đang trong trạng thái cho phép xác minh.
- BR-02: Có thời gian chờ giữa các lần yêu cầu gửi mã OTP. Nếu khách yêu cầu gửi lại trong thời gian chờ, hệ thống thông báo thời gian còn lại cần đợi.
- BR-03: Nếu email không tồn tại hoặc chưa đăng ký, hệ thống không tiết lộ thông tin này (trả về kết quả khẳng định không gửi mã để bảo vệ quyền riêng tư).
- BR-04: Mã OTP gồm đúng 6 chữ số.
- BR-05: Mã OTP có thời gian hiệu lực hạn định. Nếu vượt quá thời gian, mã bị hết hạn.
BR-06: Khách chỉ được nhập sai mã OTP tối đa một số lần nhất định. Khi đạt giới hạn số lần thử, mã OTP không còn được chấp nhận và khách không thể tiếp tục sử dụng mã đó để xác minh.
- BR-07: Mã OTP chỉ được sử dụng một lần. Sau khi dùng, mã được đánh dấu là đã tiêu thụ.
- BR-08: Sau khi xác minh OTP thành công, hệ thống đánh dấu email của khách đã xác minh và chuyển tài khoản sang trạng thái chờ thanh toán.
- BR-09: Trạng thái "chờ thanh toán" có nghĩa là khách đã xác minh email nhưng chưa thanh toán khóa học, chưa thể đăng nhập vào hệ thống.

### Non-functional Requirements (NFR)

- NFR-01: Hệ thống giới hạn tốc độ gửi yêu cầu gửi lại mã OTP và xác minh OTP.
- NFR-02: Yêu cầu nguồn gốc yêu cầu (Origin) phải khớp với địa chỉ frontend hoặc API được phép.
- NFR-03: Email xác minh được gửi qua dịch vụ email. Trong môi trường phát triển, nếu gửi email thất bại, hệ thống có biện pháp hỗ trợ thay thế.

### Architecture Decisions (ADR)

- Không có.

## Business Flow

### Luồng gửi lại mã OTP

1. Khách truy cập trang xác minh email và nhập địa chỉ email đã đăng ký.
2. Khách yêu cầu gửi lại mã OTP.
3. Hệ thống kiểm tra xem email có tồn tại trong hệ thống và tài khoản chưa xác minh email hay không.
4. Nếu email không tồn tại hoặc tài khoản không thuộc trường hợp cần xác minh, hệ thống không gửi email và không tiết lộ thông tin về sự tồn tại của email.
5. Nếu quá gần lần gửi trước, hệ thống thông báo thời gian còn lại cần đợi trước khi có thể gửi lại.
6. Nếu điều kiện thỏa mãn, hệ thống tạo mã OTP gồm 6 chữ số, gửi qua email cho khách và thông báo yêu cầu đã được tiếp nhận.
7. Khách kiểm tra hộp thư email để lấy mã OTP.

### Luồng xác minh mã OTP

1. Khách nhập địa chỉ email và mã OTP nhận được qua email.
2. Khách gửi yêu cầu xác minh.
3. Hệ thống kiểm tra định dạng email và mã OTP (phải là 6 chữ số).
4. Hệ thống kiểm tra mã OTP trong hệ thống: mã còn hiệu lực, chưa được dùng, số lần thử chưa vượt quá giới hạn.
5. Nếu mã OTP sai, hệ thống tăng số lần thử và thông báo lỗi. Nếu vượt quá giới hạn lần thử, hệ thống từ chối xác minh.
6. Nếu mã OTP đã hết hạn hoặc đã được dùng trước đó, hệ thống thông báo mã không hợp lệ hoặc đã hết hạn.
7. Nếu mã OTP đúng, hệ thống đánh dấu mã đã dùng, cập nhật trạng thái email của khách thành đã xác minh và chuyển tài khoản sang trạng thái chờ thanh toán.
8. Hệ thống thông báo khách xác minh email thành công.

## Acceptance Criteria

### AC1 - Happy Path: Gửi lại mã OTP thành công

Given: Tài khoản đã đăng ký, email chưa xác minh, chưa trong thời gian chờ giữa các lần gửi mã.

When: Khách yêu cầu gửi lại mã OTP với địa chỉ email hợp lệ.

Then: Hệ thống gửi mã OTP qua email và thông báo yêu cầu đã được tiếp nhận.

### AC2 - Happy Path: Xác minh mã OTP thành công

Given: Mã OTP hợp lệ, chưa hết hạn, chưa được dùng, số lần thử chưa đạt giới hạn.

When: Khách gửi yêu cầu xác minh với email và mã OTP đúng.

Then: Hệ thống xác minh email thành công, tài khoản chuyển sang trạng thái chờ thanh toán, hệ thống thông báo xác minh thành công.

### AC3 - Validation: Mã OTP sai định dạng

Given: Mã OTP khách nhập không phải là 6 chữ số.

When: Khách gửi yêu cầu xác minh.

Then: Hệ thống không xử lý và thông báo lỗi mã xác minh phải gồm đúng 6 chữ số.

### AC4 - Validation: Mã OTP sai, hết hạn, đã dùng hoặc hết lượt thử

Given: Mã OTP sai, hoặc mã đã hết hạn, hoặc mã đã được dùng trước đó, hoặc số lần thử đã vượt quá giới hạn.

When: Khách gửi yêu cầu xác minh.

Then: Hệ thống không xác minh và thông báo lỗi mã xác minh không hợp lệ hoặc đã hết hạn.

### AC5 - Validation: Email chưa đăng ký

Given: Địa chỉ email không liên kết với bất kỳ tài khoản nào trên hệ thống.

When: Khách yêu cầu gửi lại mã OTP với email này.

Then: Hệ thống không gửi email và không tiết lộ xem email có tồn tại hay không.

### AC6 - Edge Case: Thời gian chờ giữa các lần gửi mã

Given: Khách vừa yêu cầu gửi mã OTP chưa đầy thời gian chờ quy định.

When: Khách yêu cầu gửi lại mã OTP trước khi hết thời gian chờ.

Then: Hệ thống không gửi mã mới và thông báo thời gian còn lại cần đợi.

### AC7 - Edge Case: Tài khoản đã xác minh email

Given: Tài khoản của khách đã được xác minh email trước đó.

When: Khách gửi yêu cầu xác minh OTP lại.

Then: Hệ thống không xử lý và thông báo lỗi mã không hợp lệ hoặc đã hết hạn.

### AC8 - Security: Email không liên kết với tài khoản nào

Given: Địa chỉ email không tồn tại trong hệ thống.

When: Khách gửi yêu cầu xác minh OTP với email này.

Then: Hệ thống không xử lý yêu cầu xác minh.

## Out of Scope

- Đăng ký tài khoản ban đầu (thuộc US-01).
- Đăng nhập vào hệ thống sau khi xác minh (thuộc US-03, nhưng tài khoản ở trạng thái chờ thanh toán cần hoàn thanh toán trước khi có thể đăng nhập).
- Khôi phục mật khẩu (thuộc US-05).

## Implementation Status

Đã triển khai