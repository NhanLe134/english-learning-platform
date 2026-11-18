# US-03 - Đăng nhập hệ thống (mật khẩu và Google)

## ID và Tên

**Mã:** US-03  
**Tên:** Đăng nhập hệ thống (mật khẩu và Google)

## User Story Statement

As a *Người dùng** (Giáo viên, Quản trị viên, Học viên),

I want **đăng nhập vào hệ thống bằng email và mật khẩu hoặc qua tài khoản Google**,

so that **tôi có thể truy cập các tính năng dành cho người đã đăng nhập trên hệ thống**.

## Context

### Functional Requirements (FR)

- FR-01: Hệ thống cho phép học viên và giáo viên đăng nhập bằng email và mật khẩu.
- FR-02: Hệ thống hỗ trợ đăng nhập bằng tài khoản Google.
- FR-03: Hệ thống cho phép người dùng hoàn tất quá trình đăng nhập Google và truy cập vào hệ thống.
- FR-04: Hệ thống xác thực thông tin tài khoản Google để xác định danh tính người dùng.
- FR-05: Sau khi đăng nhập thành công, hệ thống tạo phiên đăng nhập cho người dùng.
- FR-06: Hệ thống duy trì trạng thái đăng nhập trong một khoảng thời gian nhất định và hỗ trợ người dùng tiếp tục phiên đăng nhập khi cần.

### Business Rules (BR)

- BR-01: Hệ thống hỗ trợ ba loại tài khoản: học viên (Student), giáo viên (Teacher) và quản trị viên (Admin). Trong đó, học viên tự đăng ký tài khoản, giáo viên được Admin tạo và cấp tài khoản, còn tài khoản Admin được quản lý theo cơ chế quản trị riêng của hệ thống.
- BR-02: Học viên chỉ được đăng nhập khi email đã được xác minh, đã hoàn tất thanh toán khóa học và tài khoản đang ở trạng thái được phép đăng nhập.
- BR-03: Nếu học viên chưa hoàn tất thanh toán khóa học, hệ thống từ chối đăng nhập và yêu cầu học viên hoàn tất thanh toán trước.
- BR-04: Giáo viên được phép đăng nhập bằng tài khoản do Admin cấp khi tài khoản đang ở trạng thái được phép đăng nhập.
- BR-05: Nếu tài khoản không ở trạng thái được phép đăng nhập (ví dụ: bị khóa), hệ thống từ chối đăng nhập.
- BR-06: Khi đăng nhập thất bại, hệ thống hiển thị thông báo phù hợp nhưng không tiết lộ email có tồn tại trong hệ thống hay không.
- BR-07: Mật khẩu đăng nhập phải đáp ứng giới hạn độ dài được hệ thống quy định.

### Non-functional Requirements (NFR)

- NFR-01: Hệ thống phải giới hạn số lượng yêu cầu đăng nhập trong một khoảng thời gian nhất định nhằm hạn chế các hành vi thử mật khẩu liên tục.
- NFR-02: Hệ thống chỉ chấp nhận yêu cầu đăng nhập được gửi từ các nguồn truy cập hợp lệ và được cho phép.
- NFR-03:Thông tin duy trì phiên đăng nhập phải được bảo vệ an toàn, không để lộ trực tiếp cho người dùng hoặc các bên không được phép truy cập.

### Architecture Decisions (ADR)

- Không có.

## Business Flow

### Luồng đăng nhập bằng email và mật khẩu

1. Người dùng truy cập trang đăng nhập và nhập email cùng mật khẩu.
2. Người dùng gửi yêu cầu đăng nhập.
3. Hệ thống kiểm tra tính hợp lệ của email và mật khẩu được cung cấp.
4. Hệ thống xác định loại tài khoản tương ứng với email đăng nhập.

5. **Trường hợp tài khoản học viên:**
   - Hệ thống kiểm tra thông tin đăng nhập.
   - Nếu mật khẩu không chính xác, hệ thống từ chối đăng nhập và hiển thị thông báo lỗi chung.
   - Nếu email chưa được xác minh, hệ thống từ chối đăng nhập.
   - Nếu tài khoản đang trong trạng thái chờ thanh toán, hệ thống từ chối đăng nhập và yêu cầu học viên hoàn tất thanh toán khóa học.
   - Nếu tài khoản bị khóa hoặc không ở trạng thái được phép đăng nhập, hệ thống từ chối đăng nhập.
   - Nếu thông tin hợp lệ, email đã xác minh, khóa học đã được thanh toán và tài khoản đang hoạt động, hệ thống tạo phiên đăng nhập và cho phép học viên truy cập hệ thống.

6. **Trường hợp tài khoản giáo viên:**
   - Hệ thống xác thực thông tin đăng nhập của tài khoản giáo viên do Admin tạo và cấp.
   - Nếu thông tin đăng nhập chính xác và tài khoản đang ở trạng thái được phép đăng nhập, hệ thống tạo phiên đăng nhập và cho phép giáo viên truy cập hệ thống.
   - Nếu thông tin đăng nhập không chính xác hoặc tài khoản không được phép đăng nhập, hệ thống từ chối đăng nhập.

7. **Trường hợp tài khoản quản trị viên:**
   - Hệ thống thực hiện xác thực thông tin đăng nhập thông qua dịch vụ quản trị bên thứ ba.
   - Nếu thông tin xác thực hợp lệ, hệ thống tạo phiên đăng nhập và cho phép quản trị viên truy cập hệ thống.
   - Nếu thông tin xác thực không hợp lệ, hệ thống từ chối đăng nhập.

8. Sau khi đăng nhập thành công, người dùng được chuyển đến giao diện tương ứng với vai trò và quyền hạn của tài khoản.

### Luồng đăng nhập qua Google

1. Khách chọn chức năng đăng nhập bằng Google trên giao diện hệ thống.
2. Hệ thống chuyển hướng khách đến trang xác thực của Google hoặc tiếp nhận thông tin xác thực Google từ ứng dụng khách.
3. Khách hoàn tất xác thực với Google.
4. Hệ thống tiếp nhận và kiểm tra thông tin danh tính từ Google, bao gồm tính hợp lệ và trạng thái xác minh email.
5. Hệ thống tra cứu tài khoản học viên tương ứng với email Google:
   - Nếu tài khoản đã tồn tại, hệ thống tiếp tục kiểm tra trạng thái tài khoản.
   - Nếu chưa tồn tại, hệ thống tạo tài khoản học viên mới từ thông tin Google hợp lệ.
6. Hệ thống kiểm tra điều kiện đăng nhập của tài khoản học viên:
   - Nếu tài khoản đang chờ thanh toán, hệ thống từ chối đăng nhập và yêu cầu hoàn tất thanh toán khóa học.
   - Nếu tài khoản bị khóa hoặc không ở trạng thái được phép đăng nhập, hệ thống từ chối đăng nhập.
   - Nếu tài khoản đủ điều kiện đăng nhập, hệ thống tiếp tục xử lý.
7. Hệ thống tạo phiên đăng nhập và cho phép học viên truy cập các chức năng tương ứng.

## Acceptance Criteria

### AC1 - Happy Path: Học viên đăng nhập thành công bằng email và mật khẩu

**Given:** Tài khoản học viên đã đăng ký, email đã được xác minh, khóa học đã được thanh toán, tài khoản đang trong trạng thái hoạt động và thông tin đăng nhập chính xác.

**When:** Học viên gửi yêu cầu đăng nhập bằng email và mật khẩu.

**Then:** Hệ thống xác thực thành công, tạo phiên đăng nhập và cho phép học viên truy cập các chức năng tương ứng.

### AC2 - Validation: Thiếu email hoặc mật khẩu

**Given:** Người dùng chưa nhập email hoặc mật khẩu.

**When:** Người dùng gửi yêu cầu đăng nhập.

**Then:** Hệ thống từ chối yêu cầu và thông báo người dùng cần cung cấp đầy đủ thông tin đăng nhập.

### AC3 - Authentication: Sai mật khẩu

**Given:** Email tồn tại trong hệ thống nhưng mật khẩu nhập vào không chính xác.

**When:** Người dùng gửi yêu cầu đăng nhập.

**Then:** Hệ thống từ chối đăng nhập và hiển thị thông báo chung rằng email hoặc mật khẩu không đúng.

### AC4 - Authentication: Tài khoản học viên chưa xác minh email

**Given:** Tài khoản học viên tồn tại nhưng email chưa được xác minh.

**When:** Học viên gửi yêu cầu đăng nhập.

**Then:** Hệ thống từ chối đăng nhập và thông báo tài khoản chưa đáp ứng điều kiện đăng nhập.

### AC5 - Authentication: Tài khoản học viên đang chờ thanh toán

**Given:** Tài khoản học viên đã xác minh email nhưng chưa hoàn tất thanh toán khóa học.

**When:** Học viên gửi yêu cầu đăng nhập.

**Then:** Hệ thống từ chối đăng nhập và thông báo yêu cầu hoàn tất thanh toán khóa học trước khi đăng nhập.

### AC6 - Authentication: Tài khoản bị khóa

**Given:** Tài khoản người dùng tồn tại nhưng đang trong trạng thái bị khóa hoặc không được phép đăng nhập.

**When:** Người dùng gửi yêu cầu đăng nhập.

**Then:** Hệ thống từ chối đăng nhập và hiển thị thông báo phù hợp với chính sách bảo mật.

### AC7 - Happy Path: Giáo viên đăng nhập thành công

**Given:** Giáo viên có tài khoản do Admin tạo và cấp, thông tin đăng nhập chính xác và tài khoản đang trong trạng thái được phép đăng nhập.

**When:** Giáo viên gửi yêu cầu đăng nhập bằng email và mật khẩu.

**Then:** Hệ thống xác thực thành công, tạo phiên đăng nhập và cho phép giáo viên truy cập các chức năng dành cho vai trò giáo viên.

### AC8 - Authentication: Giáo viên đăng nhập bằng tài khoản không hợp lệ

**Given:** Tài khoản giáo viên không tồn tại, thông tin đăng nhập không chính xác hoặc tài khoản không được phép đăng nhập.

**When:** Giáo viên gửi yêu cầu đăng nhập.

**Then:** Hệ thống từ chối đăng nhập và hiển thị thông báo lỗi phù hợp.

### AC9 - Happy Path: Học viên đăng nhập Google thành công

**Given:** Thông tin xác thực Google hợp lệ, email đã được Google xác minh, tài khoản học viên đã tồn tại, đã hoàn tất thanh toán khóa học và đang trong trạng thái hoạt động.

**When:** Học viên chọn đăng nhập bằng Google.

**Then:** Hệ thống xác thực thành công, tạo phiên đăng nhập và cho phép học viên truy cập hệ thống.

### AC10 - Edge Case: Tạo tài khoản học viên mới bằng Google

**Given:** Khách chưa có tài khoản học viên trong hệ thống và email Google đã được xác minh.

**When:** Khách chọn đăng nhập bằng Google.

**Then:** Hệ thống tạo tài khoản học viên mới từ thông tin Google và đưa tài khoản vào trạng thái chờ thanh toán. Khách chưa được phép truy cập các chức năng yêu cầu đăng nhập cho đến khi hoàn tất thanh toán khóa học.

### AC11 - Authentication: Học viên đăng nhập Google khi chưa thanh toán

**Given:** Tài khoản học viên đã được xác thực qua Google nhưng đang trong trạng thái chờ thanh toán.

**When:** Học viên thực hiện đăng nhập bằng Google.

**Then:** Hệ thống từ chối đăng nhập và thông báo yêu cầu hoàn tất thanh toán khóa học trước.

### AC12 - Authentication: Email Google chưa được xác minh

**Given:** Thông tin xác thực Google không đáp ứng điều kiện xác minh email.

**When:** Người dùng đăng nhập qua Google.

**Then:** Hệ thống từ chối đăng nhập và thông báo không thể xác minh địa chỉ email Google.

### AC13 - Security: Nguồn yêu cầu không được phép

**Given:** Yêu cầu đăng nhập được gửi từ nguồn không được hệ thống cho phép.

**When:** Người dùng gửi yêu cầu đăng nhập.

**Then:** Hệ thống từ chối xử lý yêu cầu và thông báo nguồn gửi yêu cầu không hợp lệ.

### AC14 - Happy Path: Quản trị viên đăng nhập thành công

**Given:** Tài khoản quản trị viên tồn tại trong dịch vụ quản trị bên thứ ba và thông tin đăng nhập hợp lệ.

**When:** Quản trị viên gửi yêu cầu đăng nhập bằng email và mật khẩu.

**Then:** Hệ thống xác thực thông qua dịch vụ quản trị bên thứ ba, tạo phiên đăng nhập và cho phép quản trị viên truy cập các chức năng quản trị tương ứng.

## Out of Scope

- Xác minh email qua mã OTP (thuộc US-02).
- Làm mới phiên đăng nhập (thuộc US-04).
- Đăng xuất (thuộc US-04).
- Khôi phục mật khẩu (thuộc US-05).

## Implementation Status

Đã triển khai