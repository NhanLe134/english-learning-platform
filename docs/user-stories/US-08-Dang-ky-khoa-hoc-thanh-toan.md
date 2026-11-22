# US-08 - Đăng ký khóa học và thanh toán

## ID và Tên

**Mã:** US-08  
**Tên:** Đăng ký khóa học và thanh toán

## User Story Statement

As a **Học viên** (hoặc **Khách đã xác minh email**),

I want **tạo đơn hàng khóa học, thanh toán và nhận quyền truy cập khóa học sau khi thanh toán thành công**,

so that **tôi có thể học khóa học đã mua**.

## Context

### Functional Requirements (FR)

- FR-01: Hệ thống cho phép học viên đã đăng nhập tạo đơn hàng thanh toán cho khóa học.
- FR-02: Hệ thống cho phép khách đã xác minh email tạo đơn hàng thanh toán cho khóa học (không cần đăng nhập).
- FR-03: Hệ thống nhận thông báo thanh toán từ dịch vụ thanh toán (SePay) qua thông báo trực tiếp (webhook).
- FR-04: Hệ thống nhận thông báo chuyển khoản ngân hàng trực tiếp từ dịch vụ thanh toán ngân hàng (SePay Bank).
- FR-05: Sau khi thanh toán thành công, hệ thống cập nhật trạng thái đơn hàng, cấp quyền truy cập khóa học và kích hoạt tài khoản học viên.
- FR-06: Hệ thống gửi email xác nhận thanh toán cho khách hàng.

### Business Rules (BR)

- BR-01: Tạo đơn hàng yêu cầu người dùng đã đăng nhập (trừ trường hợp khách đã xác minh email).
- BR-02: Mã khóa học phải đúng định dạng mã định danh duy nhất.
- BR-03: Khóa học phải đang được công bố trong hệ thống.
- BR-04: Số tiền thanh toán là giá khuyến mãi nếu có, ngược lại là giá khóa học.
- BR-05: Mã tham chiếu giao dịch được hệ thống sinh ra theo định dạng nhất định.
- BR-06: Đơn hàng có thời gian chờ thanh toán là 15 phút.
- BR-07: Nếu đã có đơn hàng đang chờ thanh toán cho cùng học viên và cùng khóa học (chưa hết hạn), hệ thống sử dụng đơn hàng cũ thay vì tạo đơn mới.
- BR-08: Chế độ thanh toán được cấu hình trong hệ thống (thanh toán qua trang trung gian hoặc mã QR trực tiếp).
- BR-09: Chế độ mã QR trực tiếp: hệ thống cung cấp thông tin chuyển khoản (tên ngân hàng, số tài khoản, tên chủ tài khoản, mã QR, số tiền, mã tham chiếu, thời gian hết hạn).
- BR-10: Chế độ trang trung gian: hệ thống cung cấp liên kết thanh toán và các trường thông tin thanh toán.
- BR-11: Thông báo thanh toán từ dịch vụ yêu cầu xác thực bảo mật. Chỉ chấp nhận thông báo thanh toán đã được duyệt.
- BR-12: Thông báo chuyển khoản ngân hàng yêu cầu xác thực chữ ký bảo mật và thời gian gửi không sai hơn 5 phút. Chỉ cho phép khi chế độ mã QR trực tiếp được bật.
- BR-13: Xác minh thông báo: hệ thống kiểm tra mã đơn hàng, số tiền khớp với đơn hàng và mã tham chiếu dịch vụ thanh toán.
- BR-14: Xác nhận thanh toán được thực hiện theo giao dịch nguyên tử: đánh dấu đơn hàng đã thanh toán, tạo đăng ký khóa học cho học viên và kích hoạt tài khoản học viên (nếu đang chờ thanh toán).
- BR-15: Chức năng xác nhận thanh toán chỉ được thực hiện bởi dịch vụ hệ thống có quyền cao nhất.
- BR-16: Nếu thông báo thanh toán được gửi lại nhiều lần (trùng lặp) và đơn hàng đã được thanh toán trước đó, hệ thống vẫn xử lý thành công nhưng không tạo đăng ký khóa học trùng lặp.
- BR-17: Sau khi xác nhận thanh toán, hệ thống giải phóng và gửi email xác nhận thanh toán.
- BR-18: Email xác nhận thanh toán được quản lý trong hàng đợi với các trạng thái xử lý và có cơ chế thử lại định kỳ.
- BR-19: Đơn hàng đang chờ thanh toán quá thời gian quy định sẽ được đánh dấu là đã hết hạn.

### Non-functional Requirements (NFR)

- NFR-01: Thông báo chuyển khoản ngân hàng ghi lại nội dung chi tiết để xác thực chữ ký bảo mật.
- NFR-02: Thông báo thanh toán trực tiếp từ dịch vụ không yêu cầu xác thực phiên đăng nhập.
- NFR-03: Hệ thống giới hạn tốc độ gửi yêu cầu tạo đơn hàng cho khách.
- NFR-04: Yêu cầu nguồn gốc yêu cầu (Origin) phải khớp với địa chỉ frontend hoặc API được phép khi tạo đơn hàng cho khách.
- NFR-05: Hệ thống hỗ trợ theo dõi trạng thái đơn hàng theo thời gian thực.
- NFR-06: Email xác nhận thanh toán được gửi qua dịch vụ email với mã nhận dạng duy nhất để tránh gửi trùng.

### Architecture Decisions (ADR)

- Không có.

## Business Flow

### Luồng tạo đơn hàng (học viên đã đăng nhập)

1. Học viên chọn khóa học trên giao diện người dùng và gửi yêu cầu tạo đơn hàng thanh toán kèm mã khóa học.
2. Hệ thống xác thực phiên đăng nhập của học viên.
3. Hệ thống tra cứu thông tin khóa học đã công bố. Nếu không tìm thấy, hệ thống thông báo lỗi.
4. Hệ thống tra cứu thông tin học viên. Nếu không tìm thấy, hệ thống thông báo lỗi.
5. Hệ thống tính số tiền thanh toán (giá khuyến mãi nếu có, ngược lại giá khóa học).
6. Hệ thống kiểm tra xem đã có đơn hàng đang chờ thanh toán cho học viên và khóa học này chưa (chưa hết hạn). Nếu có, hệ thống sử dụng đơn hàng cũ.
7. Nếu chưa có đơn hàng, hệ thống tạo đơn hàng mới với mã tham chiếu giao dịch và thời gian hết hạn là 15 phút từ thời điểm tạo.
8. Nếu chế độ thanh toán là trang trung gian, hệ thống tạo liên kết thanh toán và các trường thông tin thanh toán.
9. Nếu chế độ thanh toán là mã QR trực tiếp, hệ thống tạo thông tin chuyển khoản (tên ngân hàng, số tài khoản, tên chủ tài khoản, mã QR, số tiền, mã tham chiếu, thời gian hết hạn).
10. Hệ thống trả về thông tin đơn hàng, liên kết thanh toán hoặc thông tin chuyển khoản cho học viên.

### Luồng tạo đơn hàng (khách chưa đăng nhập)

1. Khách đã xác minh email (từ bước xác minh email) gửi yêu cầu tạo đơn hàng thanh toán kèm mã khóa học và địa chỉ email.
2. Hệ thống kiểm tra nguồn gốc yêu cầu và giới hạn tốc độ yêu cầu.
3. Hệ thống tra cứu học viên đã xác minh email theo địa chỉ email cung cấp. Nếu không tìm thấy, hệ thống thông báo yêu cầu xác minh email trước khi tạo đơn hàng thanh toán.
4. Hệ thống tạo đơn hàng thanh toán cho học viên tìm được.
5. Hệ thống trả về thông tin đơn hàng cho khách.

### Luồng thông báo thanh toán (dịch vụ thanh toán SePay)

1. Dịch vụ thanh toán gửi thông báo thanh toán đến hệ thống kèm theo mã bảo mật.
2. Hệ thống xác thực mã bảo mật. Nếu sai, hệ thống từ chối thông báo.
3. Hệ thống kiểm tra định dạng nội dung thông báo.
4. Nếu thông báo là giao dịch bị hủy, hệ thống xác nhận đã nhận thông báo.
5. Nếu thông báo không phải loại thanh toán đã được duyệt, hệ thống thông báo lỗi.
6. Hệ thống phân tích thông tin thông báo thanh toán (thời gian, mã đơn hàng, mã giao dịch, số tiền, số tiền đơn hàng, số hóa đơn).
7. Hệ thống tra cứu đơn hàng theo số hóa đơn (mã tham chiếu giao dịch). Nếu không tìm thấy, hệ thống thông báo không tìm thấy đơn hàng.
8. Hệ thống kiểm tra mã tham chiếu dịch vụ thanh toán khớp với đơn hàng (nếu đã có).
9. Hệ thống kiểm tra thông báo đại diện cho thanh toán đã được duyệt (trạng thái đơn hàng đã được chốt, loại giao dịch là thanh toán, phương thức thanh toán là chuyển khoản ngân hàng).
10. Hệ thống kiểm tra tiền tệ là đồng Việt Nam và tất cả các số tiền khớp với đơn hàng.
11. Hệ thống thực hiện xác nhận thanh toán theo giao dịch nguyên tử (đánh dấu đơn hàng đã thanh toán, tạo đăng ký khóa học, kích hoạt tài khoản học viên nếu đang chờ thanh toán).
12. Nếu đơn hàng đã được thanh toán trước đó (thông báo trùng lặp), hệ thống xử lý thành công nhưng không tạo đăng ký khóa học mới.
13. Hệ thống giải phóng và gửi email xác nhận thanh toán.
14. Hệ thống xác nhận đã nhận thông báo cho dịch vụ thanh toán để dịch vụ dừng gửi lại.

### Luồng thông báo chuyển khoản ngân hàng trực tiếp (SePay Bank)

1. Dịch vụ thanh toán ngân hàng gửi thông báo chuyển khoản đến hệ thống kèm theo thời gian gửi và chữ ký bảo mật.
2. Hệ thống kiểm tra chế độ thanh toán mã QR trực tiếp đã được bật hay chưa. Nếu chưa, hệ thống từ chối.
3. Hệ thống xác thực chữ ký bảo mật dựa trên thời gian gửi và nội dung thông báo. Thời gian gửi không được sai hơn 5 phút. Nếu sai, hệ thống từ chối.
4. Hệ thống kiểm tra định dạng nội dung thông báo.
5. Hệ thống kiểm tra thông tin chuyển khoản: loại giao dịch là tiền vào, số tài khoản khớp với tài khoản Merchant được cấu hình, mã giao dịch là số dương, số tiền lớn hơn 0, nội dung chuyển khoản không quá độ dài cho phép.
6. Hệ thống tra cứu đơn hàng theo nội dung chuyển khoản. Kiểm tra số tiền và tiền tệ khớp với đơn hàng.
7. Hệ thống thực hiện xác nhận thanh toán theo giao dịch nguyên tử.
8. Hệ thống giải phóng và gửi email xác nhận thanh toán.
9. Hệ thống xác nhận đã xử lý thông báo.

### Luồng xác nhận thanh toán theo giao dịch nguyên tử

1. Hệ thống thực hiện xác nhận thanh toán cho đơn hàng (mã đơn hàng, mã tham chiếu dịch vụ, mã giao dịch dịch vụ, số tiền).
2. Hệ thống khóa đơn hàng để tránh xử lý trùng lặp.
3. Hệ thống kiểm tra đơn hàng tồn tại, tiền tệ là đồng Việt Nam và số tiền khớp.
4. Hệ thống kiểm tra mã tham chiếu dịch vụ và mã giao dịch dịch vụ (tránh chi tiêu hai lần).
5. Nếu đơn hàng đã được thanh toán trước đó, hệ thống cập nhật mã tham chiếu nếu thiếu và đánh dấu không phải lần thanh toán mới.
6. Nếu đơn hàng đang trong trạng thái chờ, hết hạn, thất bại hoặc đã hủy, hệ thống cập nhật trạng thái thành đã thanh toán, lưu mã giao dịch và thời gian thanh toán, đánh dấu là lần thanh toán mới.
7. Hệ thống tạo đăng ký khóa học cho học viên (nếu đăng ký đã bị hủy, hệ thống khôi phục lại trạng thái hoạt động).
8. Hệ thống kích hoạt tài khoản học viên (nếu tài khoản đang trong trạng thái chờ thanh toán).
9. Hệ thống trả về kết quả xác nhận thanh toán.
10. Hệ thống tạo bản ghi email xác nhận thanh toán trong hàng đợi xử lý.

## Acceptance Criteria

### AC1 - Happy Path: Tạo đơn hàng (học viên)

Given: Học viên đã đăng nhập, khóa học đang được công bố và có giá hợp lệ.

When: Học viên gửi yêu cầu tạo đơn hàng thanh toán kèm mã khóa học.

Then: Hệ thống tạo đơn hàng thanh toán trong trạng thái chờ, cung cấp mã tham chiếu giao dịch, thời gian hết hạn (15 phút sau) và thông tin thanh toán (mã QR hoặc liên kết thanh toán).

### AC2 - Happy Path: Tạo đơn hàng (khách đã xác minh email)

Given: Khách đã xác minh email và cung cấp địa chỉ email và mã khóa học hợp lệ.

When: Khách gửi yêu cầu tạo đơn hàng thanh toán.

Then: Hệ thống tạo đơn hàng thanh toán cho học viên tương ứng với địa chỉ email.

### AC3 - Validation: Khách chưa xác minh email

Given: Địa chỉ email không liên kết với tài khoản đã xác minh email.

When: Khách gửi yêu cầu tạo đơn hàng thanh toán.

Then: Hệ thống từ chối và thông báo yêu cầu xác minh email trước khi tạo đơn hàng thanh toán.

### AC4 - Validation: Mã khóa học không hợp lệ

Given: Mã khóa học không đúng định dạng mã định danh duy nhất.

When: Người dùng gửi yêu cầu tạo đơn hàng thanh toán.

Then: Hệ thống thông báo yêu cầu mã khóa học hợp lệ.

### AC5 - Validation: Khóa học không tìm thấy

Given: Mã khóa học không tồn tại hoặc chưa được công bố.

When: Học viên gửi yêu cầu tạo đơn hàng thanh toán.

Then: Hệ thống thông báo khóa học không tìm thấy hoặc không còn khả dụng.

### AC6 - Happy Path: Thông báo thanh toán thành công

Given: Dịch vụ thanh toán gửi thông báo thanh toán đã được duyệt với thông tin hợp lệ và mã bảo mật đúng.

When: Hệ thống nhận thông báo thanh toán.

Then: Hệ thống cập nhật đơn hàng thành trạng thái đã thanh toán, tạo đăng ký khóa học, kích hoạt tài khoản học viên (nếu đang chờ thanh toán), gửi email xác nhận và đánh dấu lần thanh toán mới.

### AC7 - Idempotency: Thông báo thanh toán trùng lặp

Given: Đơn hàng đã được thanh toán trước đó và dịch vụ thanh toán gửi lại thông báo tương tự.

When: Hệ thống nhận thông báo thanh toán trùng lặp.

Then: Hệ thống xác nhận xử lý thành công, đánh dấu không phải lần thanh toán mới, đơn hàng vẫn ở trạng thái đã thanh toán và không tạo đăng ký khóa học trùng lặp.

### AC8 - Validation: Số tiền thông báo không khớp

Given: Số tiền trong thông báo thanh toán khác số tiền của đơn hàng.

When: Hệ thống nhận thông báo thanh toán.

Then: Hệ thống từ chối và thông báo lỗi số tiền không khớp.

### AC9 - Validation: Thông báo không được xác thực

Given: Mã bảo mật sai hoặc thiếu.

When: Hệ thống nhận thông báo thanh toán.

Then: Hệ thống từ chối và thông báo lỗi mã bảo mật không hợp lệ.

### AC10 - Validation: Thông báo ngân hàng chữ ký sai

Given: Chữ ký bảo mật không khớp hoặc thời gian gửi vượt quá 5 phút.

When: Hệ thống nhận thông báo chuyển khoản ngân hàng.

Then: Hệ thống từ chối và thông báo lỗi xác thực thông báo thanh toán không hợp lệ.

### AC11 - Validation: Chức năng thanh toán ngân hàng chưa bật

Given: Chế độ thanh toán mã QR trực tiếp chưa được bật trong hệ thống.

When: Hệ thống nhận thông báo chuyển khoản ngân hàng.

Then: Hệ thống thông báo chức năng thanh toán ngân hàng trực tiếp chưa được kích hoạt.

### AC12 - Edge Case: Đơn hàng hết hạn

Given: Đơn hàng đang chờ thanh toán đã quá thời gian hết hạn.

When: Người dùng xem chi tiết đơn hàng.

Then: Hệ thống đánh dấu đơn hàng là đã hết hạn.

### AC13 - Edge Case: Thông báo cho đơn hàng không tồn tại

Given: Thông báo thanh toán tham chiếu đến số hóa đơn không có đơn hàng tương ứng.

When: Hệ thống nhận thông báo thanh toán.

Then: Hệ thống thông báo không tìm thấy đơn hàng cho số hóa đơn đó.

### AC14 - Security: Phân biệt chuyển hướng trình duyệt và xác nhận thanh toán từ hệ thống

Given: Dịch vụ thanh toán chuyển hướng trình duyệt của khách đến trang thành công hoặc lỗi trên giao diện người dùng.

When: Trình duyệt tải trang thành công.

Then: Đây chỉ là chuyển hướng từ trình duyệt, không phải là xác nhận thanh toán thực tế. Xác nhận thanh toán thực sự chỉ từ thông báo thanh toán từ dịch vụ backend qua giao dịch nguyên tử.

## Out of Scope

- Xem chi tiết đơn hàng (thuộc US-09).
- Theo dõi trạng thái đơn hàng theo thời gian thực (thuộc US-09).
- Các dịch vụ thanh toán khác (Stripe, PayPal, Momo, VNPay) - hệ thống chỉ hỗ trợ SePay.
- Thanh toán workshop hoặc ebook (có bảng dữ liệu trong hệ thống nhưng chưa có chức năng thanh toán).

## Implementation Status

Đã triển khai