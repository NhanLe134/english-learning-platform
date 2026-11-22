# US-04 - Quản lý phiên đăng nhập (làm mới, đăng xuất, xem thông tin)

## 1. ID và Tên

- **Mã:** US-04
- **Tên:** Quản lý phiên đăng nhập (làm mới, đăng xuất, xem thông tin)

## 2. User Story Statement

As a **Học viên / Giáo viên / Quản trị viên** (đã đăng nhập vào hệ thống),

I want **làm mới mã truy cập, đăng xuất khỏi hệ thống và xem thông tin tài khoản hiện tại**,

so that **tôi có thể duy trì phiên làm việc liên tục và thoát hệ thống một cách an toàn khi không cần sử dụng nữa**.

## 3. Context

### 3.1. Functional Requirements (FR)

- FR-01: Hệ thống cho phép người dùng làm mới mã truy cập khi phiên hiện tại sắp hết hiệu lực.
- FR-02: Hệ thống cho phép người dùng đăng xuất khỏi hệ thống.
- FR-03: Hệ thống cho phép người dùng xem thông tin tài khoản hiện tại, bao gồm mã tài khoản, email và vai trò.
- FR-04: Sau khi đăng xuất thành công, phiên làm việc hiện tại không còn được sử dụng.
- FR-05: Đăng xuất thành công chỉ trả về xác nhận đã thoát phiên, không cung cấp nội dung chi tiết.

### 3.2. Business Rules (BR)

- BR-01: Làm mới mã truy cập yêu cầu mã làm mới phiên hợp lệ.
- BR-02: Phiên làm việc phải tồn tại trong hệ thống, chưa bị thu hồi và chưa hết thời gian hiệu lực.
- BR-03: Mã làm mới phiên phải khớp với thông tin phiên được lưu trong hệ thống.
- BR-04: Sau khi làm mới thành công, hệ thống tạo mã truy cập mới và mã làm mới phiên mới; mã làm mới phiên cũ không còn được sử dụng.
- BR-05: Nếu phát hiện mã làm mới phiên không khớp do bị đánh cắp hoặc sử dụng lại, hệ thống thu hồi phiên liên quan và từ chối làm mới.
- BR-06: Nếu tài khoản người dùng không hoạt động hoặc chưa xác minh email, hệ thống thu hồi phiên và từ chối làm mới.
- BR-07: Đăng xuất có thể sử dụng mã truy cập hoặc mã làm mới phiên hợp lệ để xác định phiên cần thu hồi.
- BR-08: Nếu đăng xuất không cung cấp thông tin xác thực hợp lệ, hệ thống thông báo phiên không hợp lệ hoặc đã hết hiệu lực.
- BR-09: Xem thông tin tài khoản yêu cầu người dùng đã đăng nhập và phiên làm việc còn hiệu lực.

### 3.3. Non-functional Requirements (NFR)

- NFR-01: Nguồn gốc yêu cầu phải khớp với địa chỉ frontend hoặc API được phép khi thực hiện làm mới phiên hoặc đăng xuất.
- NFR-02: Mã làm mới phiên phải được lưu trữ an toàn và không được truy cập trực tiếp từ mã chạy trên trình duyệt.

### 3.4. Architecture Decisions (ADR)

- Không có.

## 4. Business Flow

### 4.1. Luồng làm mới mã truy cập

1. Người dùng gửi yêu cầu làm mới mã truy cập kèm theo mã làm mới phiên.
2. Hệ thống kiểm tra nguồn gốc yêu cầu.
3. Hệ thống kiểm tra mã làm mới phiên, bao gồm tính hợp lệ, thời hạn sử dụng và trạng thái của phiên.
4. Hệ thống kiểm tra tài khoản người dùng phải đang hoạt động và đã xác minh email.
5. Nếu tất cả điều kiện hợp lệ, hệ thống tạo mã truy cập mới và mã làm mới phiên mới, đồng thời thu hồi phiên cũ.
6. Hệ thống trả về thông tin phiên mới cho người dùng.
7. Nếu quá trình làm mới thất bại, hệ thống từ chối yêu cầu và thông báo lỗi phù hợp. Trường hợp phát hiện mã làm mới phiên đã bị sử dụng lại, hệ thống xử lý thu hồi phiên theo quy tắc bảo mật.

### 4.2. Luồng đăng xuất

1. Người dùng gửi yêu cầu đăng xuất kèm theo mã truy cập hoặc mã làm mới phiên.
2. Hệ thống kiểm tra nguồn gốc yêu cầu.
3. Hệ thống xác định phiên cần đăng xuất dựa trên thông tin xác thực được cung cấp.
4. Nếu thông tin xác thực hợp lệ, hệ thống thu hồi phiên làm việc tương ứng.
5. Hệ thống xóa thông tin mã làm mới phiên được lưu trên thiết bị người dùng.
6. Hệ thống xác nhận đăng xuất thành công.
7. Nếu không có thông tin xác thực hợp lệ, hệ thống thông báo phiên không hợp lệ hoặc đã hết hiệu lực.

### 4.3. Luồng xem thông tin tài khoản hiện tại

1. Người dùng gửi yêu cầu xem thông tin tài khoản.
2. Hệ thống xác thực mã truy cập và xác định người dùng từ phiên làm việc hiện tại.
3. Nếu phiên hợp lệ, hệ thống trả về thông tin tài khoản gồm mã tài khoản, email và vai trò.
4. Nếu người dùng chưa đăng nhập hoặc mã truy cập không hợp lệ, hệ thống thông báo yêu cầu xác thực.

## 5. Acceptance Criteria

### AC1 - Happy Path: Làm mới mã truy cập thành công

**Given:** Người dùng có mã làm mới phiên hợp lệ, phiên làm việc còn hiệu lực, tài khoản đang hoạt động và đã xác minh email.

**When:** Người dùng gửi yêu cầu làm mới mã truy cập.

**Then:** Hệ thống trả về mã truy cập mới và mã làm mới phiên mới; mã làm mới phiên cũ không còn được sử dụng.

### AC2 - Validation: Thiếu mã làm mới phiên

**Given:** Người dùng không có mã làm mới phiên hợp lệ.

**When:** Người dùng gửi yêu cầu làm mới mã truy cập.

**Then:** Hệ thống từ chối yêu cầu và thông báo phiên không hợp lệ hoặc đã hết hiệu lực.

### AC3 - Authentication: Phiên đã bị thu hồi

**Given:** Phiên làm việc đã bị thu hồi trước đó.

**When:** Người dùng gửi yêu cầu làm mới mã truy cập.

**Then:** Hệ thống không làm mới phiên và thông báo phiên không hợp lệ hoặc đã hết hiệu lực.

### AC4 - Authentication: Phiên hết hiệu lực

**Given:** Phiên làm việc đã hết thời gian hiệu lực.

**When:** Người dùng gửi yêu cầu làm mới mã truy cập.

**Then:** Hệ thống không làm mới phiên và thông báo phiên không hợp lệ hoặc đã hết hiệu lực.

### AC5 - Security: Mã làm mới phiên bị sử dụng lại

**Given:** Mã làm mới phiên đã được sử dụng trước đó và không còn khớp với thông tin phiên hiện tại.

**When:** Người dùng gửi yêu cầu làm mới mã truy cập bằng mã này.

**Then:** Hệ thống từ chối làm mới, thu hồi phiên liên quan theo quy tắc bảo mật và thông báo phiên không hợp lệ hoặc đã hết hiệu lực.

### AC6 - Happy Path: Đăng xuất thành công

**Given:** Người dùng có mã truy cập hoặc mã làm mới phiên hợp lệ.

**When:** Người dùng gửi yêu cầu đăng xuất.

**Then:** Hệ thống thu hồi phiên làm việc, xóa thông tin mã làm mới phiên trên thiết bị và xác nhận đăng xuất thành công.

### AC7 - Authentication: Đăng xuất không có thông tin xác thực

**Given:** Người dùng không cung cấp mã truy cập và không có mã làm mới phiên.

**When:** Người dùng gửi yêu cầu đăng xuất.

**Then:** Hệ thống xử lý theo quy tắc xác thực của chức năng và thông báo phiên không hợp lệ hoặc đã hết hiệu lực nếu yêu cầu bị từ chối.

### AC8 - Happy Path: Xem thông tin tài khoản hiện tại

**Given:** Người dùng đã đăng nhập và có mã truy cập hợp lệ.

**When:** Người dùng gửi yêu cầu xem thông tin tài khoản.

**Then:** Hệ thống trả về thông tin tài khoản gồm mã tài khoản, email và vai trò.

### AC9 - Authentication: Xem thông tin tài khoản khi chưa đăng nhập

**Given:** Người dùng không có mã truy cập hợp lệ.

**When:** Người dùng gửi yêu cầu xem thông tin tài khoản.

**Then:** Hệ thống từ chối yêu cầu và thông báo người dùng cần xác thực.

### AC10 - Security: Nguồn yêu cầu không được phép

**Given:** Nguồn yêu cầu không khớp với địa chỉ frontend hoặc API được phép.

**When:** Người dùng gửi yêu cầu làm mới mã truy cập hoặc đăng xuất.

**Then:** Hệ thống từ chối xử lý yêu cầu và thông báo nguồn gốc yêu cầu không được phép.

## 6. Out of Scope

- Đăng nhập vào hệ thống (thuộc US-03).
- Xác minh email (thuộc US-02).
- Khôi phục mật khẩu (thuộc US-05).
- Chức năng thu hồi tất cả phiên của một người dùng.

## 7. Implementation Status

Đã triển khai.