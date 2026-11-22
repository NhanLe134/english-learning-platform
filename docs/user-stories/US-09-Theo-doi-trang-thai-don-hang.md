# US-09 - Hiển thị trạng thái đơn hàng sau thanh toán

## ID và Tên

- **Mã:** US-09
- **Tên:** Hiển thị trạng thái đơn hàng sau thanh toán

## User Story Statement

As a **Học viên**,

I want **xem trạng thái và thông tin đơn hàng ngay trên màn hình sau khi thực hiện thanh toán**,

so that **tôi biết giao dịch đã thành công hay chưa và khóa học đã được cấp quyền truy cập hay chưa**.

## Context

### Functional Requirements (FR)

- FR-01: Hệ thống hiển thị trạng thái đơn hàng sau khi học viên thực hiện thanh toán.
- FR-02: Hệ thống hiển thị thông tin đơn hàng bao gồm mã đơn hàng, tên khóa học, số tiền, phương thức thanh toán và trạng thái thanh toán.
- FR-03: Khi thanh toán thành công, hệ thống hiển thị thông báo thanh toán thành công và thông tin khóa học đã đăng ký.
- FR-04: Khi thanh toán đang chờ xác nhận hoặc chưa thành công, hệ thống hiển thị trạng thái tương ứng.
- FR-05: Khi đơn hàng hết hạn, hệ thống hiển thị trạng thái đơn hàng đã hết hạn.

### Business Rules (BR)

- BR-01: Hệ thống chỉ hiển thị thông tin đơn hàng tương ứng với đơn hàng mà học viên vừa thực hiện thanh toán.
- BR-02: Trạng thái đơn hàng được hiển thị theo trạng thái xác nhận thanh toán của hệ thống.
- BR-03: Chỉ khi đơn hàng được xác nhận thanh toán thành công, hệ thống mới hiển thị kết quả thanh toán thành công.
- BR-04: Khi đơn hàng đã thanh toán thành công, hệ thống hiển thị thông tin khóa học và trạng thái đăng ký khóa học tương ứng.
- BR-05: Nếu đơn hàng chưa được xác nhận thanh toán thành công, hệ thống không hiển thị thông báo đã thanh toán thành công.

### Non-functional Requirements (NFR)

- Không có yêu cầu phi chức năng riêng được xác định trong phạm vi User Story này.

### Architecture Decisions (ADR)

- Không có.

## Business Flow

### Luồng hiển thị trạng thái đơn hàng sau thanh toán

1. Học viên thực hiện thanh toán đơn hàng.
2. Sau khi thanh toán, học viên được chuyển về màn hình kết quả đơn hàng.
3. Hệ thống lấy thông tin đơn hàng tương ứng.
4. Hệ thống kiểm tra trạng thái đơn hàng.
5. Nếu đơn hàng đã thanh toán thành công, hệ thống hiển thị thông báo thanh toán thành công, thông tin khóa học và trạng thái đăng ký khóa học.
6. Nếu đơn hàng đang chờ xác nhận, hệ thống hiển thị trạng thái đang chờ thanh toán hoặc chờ xác nhận.
7. Nếu đơn hàng chưa thanh toán thành công hoặc đã hết hạn, hệ thống hiển thị trạng thái tương ứng.

## Acceptance Criteria

### AC1 - Happy Path: Thanh toán thành công

**Given:** Học viên đã thực hiện thanh toán và đơn hàng được hệ thống xác nhận thanh toán thành công.

**When:** Học viên được chuyển đến màn hình kết quả đơn hàng.

**Then:** Hệ thống hiển thị thông báo thanh toán thành công, thông tin đơn hàng, tên khóa học và trạng thái đăng ký khóa học.

### AC2 - Pending: Đơn hàng đang chờ xác nhận thanh toán

**Given:** Học viên đã thực hiện thanh toán nhưng hệ thống chưa nhận được xác nhận thanh toán thành công.

**When:** Học viên truy cập màn hình kết quả đơn hàng.

**Then:** Hệ thống hiển thị trạng thái đang chờ xác nhận thanh toán và không thông báo thanh toán thành công.

### AC3 - Edge Case: Thanh toán chưa thành công

**Given:** Đơn hàng chưa được xác nhận thanh toán thành công.

**When:** Học viên truy cập màn hình kết quả đơn hàng.

**Then:** Hệ thống hiển thị trạng thái thanh toán tương ứng và không hiển thị thông báo thanh toán thành công.

### AC4 - Edge Case: Đơn hàng hết hạn

**Given:** Đơn hàng đã hết thời hạn thanh toán và có trạng thái hết hạn.

**When:** Học viên truy cập màn hình kết quả đơn hàng.

**Then:** Hệ thống hiển thị trạng thái đơn hàng đã hết hạn.

### AC5 - Happy Path: Hiển thị thông tin khóa học sau thanh toán

**Given:** Đơn hàng đã được xác nhận thanh toán thành công và học viên đã được đăng ký khóa học.

**When:** Học viên xem màn hình kết quả đơn hàng.

**Then:** Hệ thống hiển thị thông tin khóa học và trạng thái đăng ký khóa học tương ứng.

## Out of Scope

- Tạo đơn hàng và thực hiện thanh toán (thuộc US-08).
- Xác thực thông báo thanh toán từ dịch vụ (thuộc US-08).
- Theo dõi trạng thái đơn hàng theo thời gian thực bằng kết nối riêng.
- Tra cứu đơn hàng công khai bằng mã đơn hàng.
- Quản lý đơn hàng bởi quản trị viên.

## Implementation Status

Đã triển khai (cần đối chiếu với chức năng thực tế trên hệ thống).