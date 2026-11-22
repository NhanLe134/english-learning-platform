# US-06 - Xem danh sách và chi tiết khóa học công khai

## ID và Tên

**Mã:** US-06  
**Tên:** Xem danh sách và chi tiết khóa học công khai

## User Story Statement

As a **Người dùng (Khách / Học viên / Giáo viên / Quản trị viên)**,

I want **xem danh sách các khóa học đã được công bố và xem thông tin chi tiết của từng khóa học**,

so that **tôi có thể tìm hiểu nội dung khóa học trước khi quyết định đăng ký**.

## Context

### Functional Requirements (FR)

- FR-01: Hệ thống cho phép xem danh sách các khóa học đã công bố.
- FR-02: Hệ thống cho phép xem chi tiết một khóa học theo mã khóa học hoặc đường dẫn danh mục (slug).
- FR-03: Hệ thống cho phép kiểm tra và hiển thị thông tin các khóa học được chọn để chuẩn bị đăng ký.
- FR-04: Chỉ cho phép xem các khóa học có trạng thái đã công bố (published).
- FR-05: Chi tiết khóa học bao gồm: mã khóa học, tên khóa học, đường dẫn danh mục, mô tả, danh mục, trình độ, đối tượng, giá tiền, giá khuyến mãi, tổng số bài học, ảnh đại diện, giáo viên, chủ đề và bài học.

### Business Rules (BR)

- BR-01: Xem danh sách khóa học công khai không yêu cầu đăng nhập.
- BR-02: Xem chi tiết khóa học không yêu cầu đăng nhập. Mã khóa học có thể là mã định danh duy nhất hoặc đường dẫn danh mục.
- BR-03: Khi không có khóa học được công bố, hệ thống hiển thị trạng thái danh sách khóa học trống.
- BR-04: Chi tiết khóa học chỉ hiển thị các bài học có trạng thái đã công bố.
- BR-05: Các chủ đề trong khóa học được sắp xếp theo thứ tự hiển thị.
- BR-06: Nếu khóa học không tồn tại hoặc chưa được công bố, hệ thống thông báo không tìm thấy khóa học đã công bố.
- BR-07: Khi kiểm tra danh sách khóa học được chọn, hệ thống tiếp nhận tối đa 50 mã khóa học hợp lệ, trả về các khóa học tìm thấy và thông tin những khóa học không khả dụng.

### Non-functional Requirements (NFR)

- NFR-01: Danh sách khóa học công khai giới hạn hiển thị tối đa 100 khóa học.
- NFR-02: Xem khóa học công khai không yêu cầu xác thực danh tính.

### Architecture Decisions (ADR)

- Không có.

## Business Flow

### Luồng xem danh sách khóa học công khai

1. Người dùng truy cập trang danh mục khóa học.
2. Hệ thống truy vấn danh sách các khóa học đã được công bố.
3. Nếu không có khóa học được công bố, hệ thống hiển thị trạng thái danh sách trống.
4. Hệ thống hiển thị danh sách khóa học cho người dùng (tối đa 100 khóa học).

### Luồng xem chi tiết khóa học

1. Người dùng chọn một khóa học hoặc nhập mã khóa học / đường dẫn danh mục.
2. Hệ thống kiểm tra thông tin định danh khóa học.
3. Hệ thống tra cứu thông tin chi tiết khóa học, chỉ hiển thị khóa học đã được công bố.
4. Nếu không tìm thấy khóa học phù hợp, hệ thống thông báo không tìm thấy khóa học đã công bố.
5. Nếu tìm thấy, hệ thống hiển thị chi tiết khóa học bao gồm thông tin chung, chủ đề và các bài học đã công bố.

### Luồng xem danh sách khóa học đã chọn (dùng cho đăng ký)

1. Người dùng cung cấp danh sách mã khóa học muốn xem.
2. Hệ thống kiểm tra danh sách mã khóa học (tối đa 50 mã, đúng định dạng).
3. Hệ thống tra cứu các khóa học trong danh sách mà trạng thái là đã công bố.
4. Hệ thống trả về danh sách khóa học tìm được và danh sách mã khóa không tìm thấy (nếu có).
5. Nếu có mã khóa không tìm thấy, hệ thống thông báo một hoặc nhiều khóa học không khả dụng.
6. Nếu tất cả mã khóa đều tìm được, hệ thống hiển thị danh sách khóa học tương ứng.

## Acceptance Criteria

### AC1 - Happy Path: Xem danh sách khóa học công khai

Given: Có ít nhất một khóa học có trạng thái đã công bố trong hệ thống.

When: Người dùng truy cập trang danh mục khóa học.

Then: Hệ thống hiển thị danh sách các khóa học đã công bố (tối đa 100 khóa học).

### AC2 - Fallback: Hệ thống không có dữ liệu khóa học

Given: Không có khóa học nào ở trạng thái đã công bố trong hệ thống.

When: Người dùng truy cập trang danh mục khóa học.

Then: Hệ thống hiển thị trạng thái danh sách khóa học trống.

### AC3 - Happy Path: Xem chi tiết khóa học theo mã định danh

Given: Khóa học tồn tại và có trạng thái đã công bố.

When: Người dùng xem chi tiết khóa học theo mã định danh duy nhất.

Then: Hệ thống hiển thị chi tiết khóa học kèm theo chủ đề và các bài học đã công bố.

### AC4 - Happy Path: Xem chi tiết khóa học theo đường dẫn danh mục

Given: Khóa học tồn tại và có đường dẫn danh mục hợp lệ.

When: Người dùng xem chi tiết khóa học theo đường dẫn danh mục.

Then: Hệ thống hiển thị chi tiết khóa học.

### AC5 - Validation: Mã khóa học / đường dẫn danh mục không hợp lệ

Given: Mã khóa học hoặc đường dẫn danh mục không đúng định dạng quy định.

When: Người dùng xem chi tiết khóa học.

Then: Hệ thống thông báo lỗi mã khóa học hoặc đường dẫn danh mục không hợp lệ.

### AC6 - Not Found: Khóa học không tồn tại hoặc chưa được công bố

Given: Khóa học không tồn tại trong hệ thống hoặc trạng thái chưa được công bố.

When: Người dùng xem chi tiết khóa học.

Then: Hệ thống thông báo không tìm thấy khóa học đã công bố.

### AC7 - Happy Path: Xem danh sách khóa học đã chọn

Given: Danh sách mã khóa học hợp lệ và tất cả các khóa học đều đã được công bố.

When: Người dùng yêu cầu xem danh sách khóa học đã chọn.

Then: Hệ thống hiển thị danh sách khóa học tương ứng.

### AC8 - Validation: Có khóa học không tìm thấy

Given: Một số mã khóa học trong danh sách yêu cầu không tồn tại trong hệ thống.

When: Người dùng yêu cầu xem danh sách khóa học đã chọn.

Then: Hệ thống thông báo một hoặc nhiều khóa học không khả dụng và cung cấp danh sách mã không tìm thấy.

### AC9 - Validation: Danh sách mã khóa học không hợp lệ

Given: Danh sách mã khóa học không đúng định dạng hoặc vượt quá 50 mã.

When: Người dùng yêu cầu xem danh sách khóa học đã chọn.

Then: Hệ thống thông báo lỗi kiểm tra dữ liệu đầu vào.

### AC10 - Error: Hệ thống chưa cấu hình kết nối cơ sở dữ liệu

Given: Hệ thống chưa được cung cấp thông tin kết nối đến kho lưu trữ khóa học.

When: Người dùng truy cập danh mục khóa học hoặc xem chi tiết khóa học.

Then: Hệ thống thông báo danh mục khóa học chưa được cấu hình.

## Out of Scope

- Quản lý khóa học bởi quản trị viên (tạo, cập nhật, xóa) - thuộc US-07.
- Đăng ký khóa học - thuộc US-08.
- Xem khóa học theo danh sách phân trang, tìm kiếm, lọc (chỉ có trong quản lý khóa học của quản trị viên - thuộc US-07).

## Implementation Status

Đã triển khai