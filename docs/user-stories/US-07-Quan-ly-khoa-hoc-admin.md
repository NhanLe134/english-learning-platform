# US-07 - Quản lý khóa học (Quản trị viên)

## ID và Tên

**Mã:** US-07  
**Tên:** Quản lý khóa học (Quản trị viên)

## User Story Statement

As a **Quản trị viên**,

I want **tạo, cập nhật, thay đổi trạng thái và xóa khóa học trên hệ thống**,

so that **tôi có thể quản lý danh mục khóa học được cung cấp cho người học**.

## Context

### Functional Requirements (FR)

- FR-01: Hệ thống cho phép quản trị viên xem danh sách các khóa học đang quản lý (có phân trang, tìm kiếm và lọc).
- FR-02: Hệ thống cho phép quản trị viên tạo khóa học mới.
- FR-03: Hệ thống cho phép quản trị viên cập nhật thông tin khóa học hiện có.
- FR-04: Hệ thống cho phép quản trị viên thay đổi trạng thái khóa học.
- FR-05: Hệ thống cho phép quản trị viên xóa khóa học.
- FR-06: Tất cả chức năng quản lý khóa học yêu cầu người dùng đã đăng nhập và có vai trò Quản trị viên.

### Business Rules (BR)

- BR-01: Chỉ người dùng có vai trò Quản trị viên được truy cập các chức năng quản lý khóa học.
- BR-02: Khi tạo hoặc cập nhật khóa học, các trường bắt buộc bao gồm: tên khóa học, đường dẫn danh mục, danh mục, trình độ và đối tượng học viên.
- BR-03: Tên khóa học không được để trống và không vượt quá 200 ký tự.
- BR-04: Đường dẫn danh mục phải dùng chữ thường, số và dấu gạch ngang, không vượt quá 180 ký tự và phải duy nhất trong hệ thống.
- BR-05: Danh mục không được để trống và không vượt quá 100 ký tự.
- BR-06: Trình độ khóa học phải là một trong các giá trị: người mới bắt đầu, trung cấp, nâng cao.
- BR-07: Đối tượng học viên không được để trống và không vượt quá 500 ký tự.
- BR-08: Giá khóa học phải là số không âm, không vượt quá 99,999,999 và tối đa hai chữ số thập phân.
- BR-09: Giá khuyến mãi (nếu có) không được vượt quá giá khóa học.
- BR-10: Tổng số bài học phải là số nguyên không âm, không vượt quá 100.000 bài.
- BR-11: Ảnh đại diện (nếu có) phải là đường dẫn web hợp lệ (http hoặc https).
- BR-12: Trạng thái khóa học chỉ có thể là "đraft" hoặc "công bố".
- BR-13: Nếu đường dẫn danh mục đã tồn tại, hệ thống thông báo lỗi trùng lặp.
- BR-14: Nếu khóa học không tồn tại, hệ thống thông báo không tìm thấy khóa học.
- BR-15: Không cho phép xóa khóa học đang có học viên đăng ký hoặc còn nội dung liên kết với khóa học.
- BR-16: Trạng thái khóa học chỉ có thể thay đổi giữa "đraft" và "công bố".

### Non-functional Requirements (NFR)

- NFR-01: Danh sách khóa học hỗ trợ phân trang (trang và số lượng trên mỗi trang).
- NFR-02: Danh sách khóa học hỗ trợ lọc theo từ khóa tìm kiếm, danh mục, trình độ, trạng thái và sắp xếp.
- NFR-03: Không có khóa học: hiển thị trạng thái danh sách trống, Có lỗi khi tải dữ liệu: thông báo không thể tải danh sách và cho phép thử lại.

### Architecture Decisions (ADR)

- Không có.

## Business Flow

### Luồng xem danh sách khóa học (quản trị viên)

1. Quản trị viên truy cập trang quản lý khóa học.
2. Hệ thống kiểm tra quyền truy cập của quản trị viên.
3. Quản trị viên có thể lọc danh sách theo từ khóa, danh mục, trình độ, trạng thái và sắp xếp theo các tiêu chí khác nhau.
4. Hệ thống hiển thị danh sách khóa học kèm thông tin phân trang.

### Luồng tạo khóa học mới

1. Quản trị viên truy cập trang tạo khóa học và nhập thông tin khóa học (tên, đường dẫn danh mục, mô tả, danh mục, trình độ, đối tượng, giá, giá khuyến mãi, tổng số bài học, ảnh đại diện, trạng thái).
2. Hệ thống kiểm tra quyền truy cập và tính hợp lệ của thông tin khóa học.
3. Hệ thống tạo khóa học mới trong hệ thống với giáo viên là quản trị viên hiện tại.
4. Nếu đường dẫn danh mục đã tồn tại, hệ thống thông báo lỗi trùng lặp.
5. Hệ thống thông báo tạo khóa học thành công và hiển thị chi tiết khóa học vừa tạo.

### Luồng cập nhật khóa học

1. Quản trị viên chọn khóa học cần cập nhật và nhập thông tin mới.
2. Hệ thống kiểm tra mã khóa học hợp lệ và tính hợp lệ của thông tin cập nhật.
3. Hệ thống cập nhật thông tin khóa học trong hệ thống.
4. Nếu khóa học không tồn tại, hệ thống thông báo không tìm thấy.
5. Hệ thống thông báo cập nhật thành công.

### Luồng thay đổi trạng thái khóa học

1. Quản trị viên chọn khóa học và chọn trạng thái mới (đraft hoặc công bố).
2. Hệ thống kiểm tra mã khóa học và trạng thái mới hợp lệ.
3. Hệ thống cập nhật trạng thái khóa học.
4. Nếu khóa học không tồn tại, hệ thống thông báo không tìm thấy.
5. Hệ thống thông báo cập nhật trạng thái thành công.

### Luồng xóa khóa học

1. Quản trị viên chọn khóa học cần xóa.
2. Hệ thống kiểm tra khóa học có tồn tại hay không.
3. Hệ thống kiểm tra khóa học có đăng ký học hoặc nội dung liên kết hay không.
4. Nếu có liên kết, hệ thống thông báo không thể xóa khóa học.
5. Nếu không có liên kết, hệ thống thực hiện xóa khóa học.
6. Hệ thống thông báo xóa thành công.

## Acceptance Criteria

### AC1 - Happy Path: Tạo khóa học mới

Given: Quản trị viên đã đăng nhập và cung cấp đầy đủ thông tin khóa học hợp lệ (tên, đường dẫn danh mục duy nhất, danh mục, trình độ, đối tượng học viên, giá).

When: Quản trị viên gửi yêu cầu tạo khóa học mới.

Then: Hệ thống tạo khóa học mới, gán giáo viên là quản trị viên hiện tại và thông báo tạo thành công.

### AC2 - Authorization: Không phải Quản trị viên

Given: Người dùng có vai trò Học viên hoặc Giáo viên.

When: Người dùng truy cập chức năng quản lý khóa học.

Then: Hệ thống từ chối truy cập và thông báo lỗi không có quyền truy cập.

### AC3 - Authentication: Chưa đăng nhập

Given: Không có phiên đăng nhập hiệu lực.

When: Người dùng truy cập chức năng quản lý khóa học.

Then: Hệ thống yêu cầu đăng nhập.

### AC4 - Validation: Đường dẫn danh mục trùng lặp

Given: Đường dẫn danh mục đã tồn tại trong hệ thống.

When: Quản trị viên tạo khóa học với đường dẫn danh mục trùng.

Then: Hệ thống không tạo khóa học và thông báo lỗi đường dẫn danh mục đã tồn tại.

### AC5 - Validation: Thông tin khóa học không hợp lệ

Given: Tên khóa học quá dài, đường dẫn danh mục sai định dạng, giá khuyến mãi vượt quá giá khóa học, etc.

When: Quản trị viên gửi thông tin tạo hoặc cập nhật khóa học.

Then: Hệ thống không xử lý và thông báo lỗi tương ứng.

### AC6 - Happy Path: Cập nhật khóa học

Given: Khóa học tồn tại và quản trị viên là người quản lý.

When: Quản trị viên gửi yêu cầu cập nhật khóa học với thông tin hợp lệ.

Then: Hệ thống cập nhật khóa học và thông báo thành công.

### AC7 - Not Found: Cập nhật khóa học không tồn tại

Given: Mã khóa học không tồn tại trong hệ thống.

When: Quản trị viên gửi yêu cầu cập nhật khóa học.

Then: Hệ thống thông báo không tìm thấy khóa học.

### AC8 - Happy Path: Thay đổi trạng thái khóa học

Given: Khóa học tồn tại.

When: Quản trị viên gửi yêu cầu thay đổi trạng thái thành "công bố".

Then: Hệ thống cập nhật trạng thái khóa học và thông báo thành công.

### AC9 - Validation: Trạng thái không hợp lệ

Given: Trạng thái khóa học khác "đraft" và "công bố".

When: Quản trị viên gửi yêu cầu thay đổi trạng thái.

Then: Hệ thống thông báo lỗi trạng thái khóa học phải là đraft hoặc công bố.

### AC10 - Happy Path: Xóa khóa học

Given: Khóa học tồn tại và không có đăng ký học hoặc nội dung liên kết.

When: Quản trị viên gửi yêu cầu xóa khóa học.

Then: Hệ thống xóa khóa học và thông báo xóa thành công.

### AC11 - Validation: Không thể xóa khóa học đang có liên kết

Given: Khóa học có đăng ký học hoặc nội dung liên kết trong hệ thống.

When: Quản trị viên gửi yêu cầu xóa khóa học.

Then: Hệ thống không xóa và thông báo không thể xóa khóa học khi có đăng ký học hoặc nội dung liên kết.

### AC12 - Happy Path: Xem danh sách khóa học (quản trị viên)

Given: Quản trị viên đã đăng nhập.

When: Quản trị viên truy cập trang quản lý khóa học với thông tin phân trang.

Then: Hệ thống hiển thị danh sách khóa học kèm thông tin phân trang.

### AC13 - Empty State: Không có khóa học

**Given:** Hệ thống không có khóa học nào trong danh sách quản lý.

**When:** Quản trị viên truy cập trang quản lý khóa học.

**Then:** Hệ thống hiển thị trạng thái danh sách trống và không hiển thị dữ liệu khóa học mẫu.

### AC14 - Error: Không thể tải danh sách khóa học

**Given:** Hệ thống gặp lỗi khi tải danh sách khóa học.

**When:** Quản trị viên truy cập trang quản lý khóa học.

**Then:** Hệ thống thông báo không thể tải danh sách khóa học và cung cấp tùy chọn thử lại.

## Out of Scope

- Xem khóa học công khai (thuộc US-06).
- Đăng ký khóa học (thuộc US-08).
- Quản lý chủ đề và bài học (chưa có chức năng trong hệ thống).

## Implementation Status

Đã triển khai