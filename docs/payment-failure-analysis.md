# BÁO CÁO PHÂN TÍCH XỬ LÝ SỰ CỐ: THANH TOÁN THÀNH CÔNG NHƯNG KHÔNG LƯU ĐƯỢC DỮ LIỆU

**Dự án:** English Learning Platform (Your English Voice)
**Ngày phân tích:** 15/11/2026
**Mục tiêu:** Kiểm tra hệ thống xử lý tình huống học viên đã thanh toán thành công nhưng dữ liệu đơn hàng / đăng ký khóa học (Enrollment) không được ghi nhận vào Database.
**Hạn chế:** Chỉ đọc source code, không chỉnh sửa code, không thay đổi DB/migration, không thanh toán thật, không gửi webhook thật, không tiết lộ giá trị biến môi trường bí mật.

---

## 1. TỔNG QUAN LUỒNG ĐĂNG KÝ KHÓA HỌC VÀ THANH TOÁN HIỆN TẠI

Hệ thống sử dụng Express 5 + TypeScript ESM, Supabase (PostgreSQL) làm dữ liệu chính, SePay làm cổng thanh toán. Luồng chính diễn ra qua các bước sau:

### 1.1 Bước 1-2: Học viên chọn khóa học và tạo đơn hàng

- **Frontend:** `frontend/src/pages/checkout/CheckoutPage.tsx` (lüssel `handlePayment` lignes 238-249) gọi `sepayApi.createOrder()` trong `frontend/src/pages/checkout/sepayApi.ts` (lînes 106-117).
- Gửi `POST /api/payment/orders` (đã đăng nhập) hoặc `POST /api/payment/orders/guest` (chưa đăng nhập, email đã xác minh).
- **Backend controller:** `backend/src/modules/payments/payments.controller.ts`
  - `createOrder()` lignes 50-98
  - `createGuestOrder()` lignes 12-48
- **Backend service:** `backend/src/modules/payments/payments.service.ts`, `PaymentService.createOrder()` lignes 30-108.
- **Repository:** `backend/src/modules/payments/payments.repository.ts`
  - `findPublishedCourse()` lignes 74-100
  - `findStudentSummary()` lignes 102-116
  - `findPendingOrderForStudentCourse()` lignes 56-72 (dùng lại đơn pending nếu còn hiệu lực)
  - `createOrder()` lignes 35-54 (chèn vào bảng `course_orders` với `status = 'pending'`)
- Kết quả trả về frontend: `orderId`, `status`, `transferContent` (mã nội dung chuyển khoản), `checkoutUrl`/`checkoutFields` (chế độ hosted), hoặc `paymentInformation` (QR VietQR, chế độ direct_qr).

### 1.3 Bước 3-4: Học viên thanh toán và SePay gửi xác nhận

Hai chế độ (xem `backend/src/config/env.ts` dòng 16, `SEPAY_CHECKOUT_MODE`):

- **hosted:** Học viên được chuyển hướng tới trang thanh toán của SePay. Sau khi thanh toán, SePay gửi **IPN webhook** tới `POST /api/payment/sepay-webhook` (`payments.controller.ts` lignes 367-445), xác thực qua header `X-Secret-Key` (`env.sepayIpnSecretKey`).
- **direct_qr:** Học viên quét mã QR VietQR và chuyển khoản. SePay gửi **Bank Transaction Webhook** tới `POST /api/payment/sepay-bank-webhook` (`payments.controller.ts` lignes 100-166), xác thực qua HMAC SHA-256 trên raw body + timestamp (`X-SePay-Timestamp`, `X-SePay-Signature`, `env.sepayBankWebhookSecret`).

### 1.5 Bước 5-7: Backend xác nhận, cập nhật đơn hàng, tạo Enrollment

Đây là phần **quan trọng nhất** của báo cáo:

- `PaymentService.handleSePayWebhook()` (`payments.service.ts` lignes 142-213) xác thực thông báo (amount, currency, transaction_status, v.v.) rồi gọi:
  - `this.repository.confirmVerifiedPayment(order.id, sepayOrderId, transactionId, amountIn)` (`payments.repository.ts` lignes 166-193)
- Repository gọi **RPC PostgreSQL** `public.confirm_course_order_payment` (migration `supabase/migrations/20261111000000_atomic_course_payment_confirmation.sql` lignes 4-97).
- RPC thực hiện **trong một transaction duy nhất** (PostgreSQL plpgsql `BEGIN`/`COMMIT` ngầm):
  1. Khóa hàng đơn hàng (`SELECT ... FOR UPDATE`, dòng 33).
  2. Cập nhật `course_orders` → `status = 'paid'`, `provider_transaction_id`, `paid_at` (dòng 62-68).
  3. Chèn `course_enrollments` (`status = 'active'`) với `ON CONFLICT (course_id, student_id) DO UPDATE` (dòng 79-85) → **không tạo trùng lặp**.
  4. Cập nhật `profiles` → `status = 'active'` nếu profile đang `pending` (dòng 87-90).
- Sau khi transaction DB commit xong, service gọi `this.confirmationEmails.releaseAfterEnrollmentAndSend(order.id)` (`payments.service.ts` dòng 203) để đưa email xác nhận vào hàng đợi outbox (`payment_confirmation_email_outbox`).

### 1.8 Bước 8: Frontend nhận và hiển thị kết quả

- `frontend/src/pages/checkout/CheckoutSuccessPage.tsx` (lînes 40-350) gọi `sepayApi.getOrderStatus()` (GET `/api/payment/orders/:orderId`) mỗi 3 giây (`paymentPollingIntervalMs = 3000`, `payment-config.ts` dòng 4) và theo dõi Realtime stream (`watchOrderStatus`, `sepayApi.ts` lignes 137-197).
- Khi `status === 'paid'` và `enrollmentExists === true`, hiển thị nút "Vào học ngay" dẫn tới `/courses/:slug`.
- Nếu `enrollmentExists === false` sau khi paid, hiện thông báo: "Payment is confirmed, but course access is not available yet. Check again or contact support." (dòng 339).

---

## 2. CÁC FILE VÀ THÀNH PHẦN CODE LIÊN QUAN

| # | File | Vai trò |
|---|------|---------|
| 1 | `backend/src/modules/payments/payments.controller.ts` | Controller webhook (`sepayWebhook` dòng 367, `sepayBankWebhook` dòng 100), tạo đơn (`createOrder` dòng 50), xem đơn (`getOrder` dòng 168). |
| 2 | `backend/src/modules/payments/payments.service.ts` | Business logic: `handleSePayWebhook` (dòng 142), `handleSePayBankWebhook` (dòng 215), `createOrder` (dòng 30). |
| 3 | `backend/src/modules/payments/payments.repository.ts` | Data access: `confirmVerifiedPayment` (dòng 166) gọi RPC; `findOrderByTransferContent` (dòng 152); `findPendingOrderForStudentCourse` (dòng 56). |
| 4 | `backend/src/modules/payments/payments.errors.ts` | `PaymentWebhookError` (dòng 1-9). |
| 5 | `backend/src/modules/payments/payments.types.ts` | Type `SePayWebhookEvent`, `VerifyPaymentResult`, `PaymentOrder`. |
| 6 | `backend/src/modules/payments/payment-confirmation-email.service.ts` | Outbox email: `releaseAfterEnrollmentAndSend` (dòng 52), `processDueJobs` (dòng 57), retry (`sendOne` dòng 73). |
| 7 | `backend/src/modules/payments/payment-confirmation-email.repository.ts` | CRUD outbox email: `claim`, `markSent`, `markFailed`, `recoverStaleJobs` (dòng 69). |
| 8 | `backend/src/modules/payments/order-status-realtime.service.ts` | Realtime stream `subscribeToOrderStatus` (dòng 8) cho frontend theo dõi trạng thái đơn. |
| 9 | `backend/src/server.ts` | Khởi động listener và **timer retry email mỗi 60 giây** (dòng 29-33). |
| 10 | `backend/src/app.ts` | Middleware `express.json` bắt `rawBody` chỉ cho path `/api/payment/sepay-bank-webhook` (dòng 42-49). |
| 11 | `supabase/migrations/20261111000000_atomic_course_payment_confirmation.sql` | Định nghĩa RPC `confirm_course_order_payment` (dòng 4-97) — **trái tim xử lý thanh toán nguyên tử**. |
| 12 | `supabase/migrations/20261108000000_create_course_orders_table.sql` | Bảng `course_orders`, RLS policies. |
| 13 | `supabase/migrations/20261109000000_add_sepay_order_reference.sql` | Cột `provider_order_id`, unique index. |
| 14 | `supabase/migrations/20261110000000_create_payment_confirmation_email_outbox.sql` | Bảng `payment_confirmation_email_outbox` + trigger `queue_payment_confirmation_email` (dòng 36-79). |
| 15 | `supabase/migrations/20261021235100_initial_schema.sql` | Bảng `course_enrollments` (dòng 66) với `UNIQUE (course_id, student_id)`. |
| 16 | `frontend/src/pages/checkout/CheckoutPage.tsx` | Trang tạo đơn, hiển thị QR, nút thanh toán. |
| 17 | `frontend/src/pages/checkout/CheckoutSuccessPage.tsx` | Trang kết quả, polling trạng thái, hiển thị enrollment. |
| 18 | `frontend/src/pages/checkout/sepayApi.ts` | API client frontend (`createOrder`, `getOrderStatus`, `watchOrderStatus`). |
| 19 | `frontend/src/pages/checkout/payment-config.ts` | Cấu hình polling/timeout và `paymentSupportPhone` (dùng `VITE_SUPPORT_PHONE`). |
| 20 | `frontend/src/pages/contact/ContactPage.tsx` | Thông tin liên hệ hỗ trợ (hotline, email, địa chỉ) — **hardcode trong component frontend**. |
| 21 | `backend/src/modules/payments/payments.atomic.integration.test.ts` | Test tích hợp RPC atomic (chạy khi `PAYMENT_TEST_DATABASE_URL` được thiết lập). |
| 22 | `backend/src/modules/payments/payments.service.test.ts` | Test đơn vị cho webhook, idempotency, lỗi DB, lỗi email. |
| 23 | `backend/src/openapi.ts` | Swagger/OpenAPI docs (chưa có endpoint webhook chi tiết — xem phần 9). |

---

## 3. KẾT QUẢ KIỂM TRA TỪNG TÌNH HUẬN LỖI

### 3.1 Không thể cập nhật trạng thái đơn hàng thành PAID

| Mục | Nội dung |
|-----|----------|
| Nguyên nhân có thể | RPC `confirm_course_order_payment` ném exception (ví dụ: amount mismatch, provider_transaction_id trùng khác, order không tìm thấy, lỗi kết nối DB). |
| Xử lý hiện tại | `payments.repository.ts` dòng 181-187: bắt lỗi RPC, log `databaseErrorCode`, ném `Error` với message "Unable to confirm paid course order and enrollment". `payments.controller.ts` dòng 431-444: bắt lỗi, trả HTTP 500 (hoặc status của `PaymentWebhookError`). SePay **nhận HTTP 500 → sẽ gửi lại webhook** (dựa trên cơ chế retry của SePay, không nằm trong source code này). |
| Rollback | **Có.** RPC chạy trong transaction PostgreSQL; nếu ném exception, toàn bộ transaction rollback. Được chứng minh bởi test `payments.atomic.integration.test.ts` lignes 112-136 (giả lập lỗi insert enrollment → rollback, order vẫn `pending`, profile vẫn `pending`, enrollment_count = 0). |
| Nguy cơ paid nhưng không có Enrollment | **Không có** trong trường hợp này, vì RPC atomic: order và enrollment cùng thành công cùng thất bại. |
| Cơ chế thử lại | Backend **không tự retry** RPC. Phụ thuộc vào SePay gửi lại webhook. |
| Trùng lặp Enrollment | Không, vì chưa commit gì. |

### 3.2 Không thể tạo bản ghi Enrollment

| Mục | Nội dung |
|-----|----------|
| Nguyên nhân | Lỗi constraint/trigger trên bảng `course_enrollments` bên trong RPC. |
| Xử lý hiện tại | Cùng transaction với cập nhật đơn hàng. Nếu insert enrollment thất bại, toàn bộ transaction rollback (order không được chuyển thành `paid`). |
| Rollback | **Có** (atomic). |
| Nguy cơ paid nhưng không có Enrollment | **Không** — vì nếu enrollment bị lỗi, order cũng không được đánh dấu paid. |
| Cơ chế thử lại | Không có retry trực tiếp ở backend; phụ thuộc SePay retry webhook. |

### 3.3 Database mất kết nối trong lúc xử lý thanh toán

| Mục | Nội dung |
|-----|----------|
| Xử lý hiện tại | Supabase client ném lỗi, truyền lên `payments.controller.ts`, trả HTTP 500. SePay sẽ retry webhook sau. |
| Rollback | Transaction chưa commit → rollback tự động. |
| Nguy cơ paid nhưng không có Enrollment | Không, vì DB chưa commit. |
| Lưu ý | Không có bảng "giao dịch cần xử lý lại" (payment outbox cho đơn hàng) — chỉ có outbox cho **email** (`payment_confirmation_email_outbox`). Nếu webhook bị mất hoàn toàn (SePay không retry), đơn hàng sẽ bị kẹt ở `pending` và không có cơ chế tự phát hiện. |

### 3.4 Transaction / RPC thực hiện thất bại

| Mục | Nội dung |
|-----|----------|
| Xử lý hiện tại | Test `payments.service.test.ts` dòng 243-249: khi `confirmationFailure = true`, service ném lỗi, order giữ nguyên `pending`, `enrollmentCount = 0`, `activationAttempts = 0`. |
| Rollback | Có (atomic). |
| Cơ chế thử lại | Không có retry ở backend; phụ thuộc SePay. |

### 3.5 Cập nhật đơn hàng thành công nhưng tạo Enrollment thất bại

| Mục | Nội dung |
|-----|----------|
| Xử lý hiện tại | **Không thể xảy ra** với RPC hiện tại vì cả hai thao tác nằm trong cùng một transaction plpgsql. Nếu insert enrollment bị lỗi, exception được ném → toàn bộ transaction rollback → đơn hàng không được chuyển thành `paid`. |
| By evidence | `payments.atomic.integration.test.ts` lignes 112-136 mô phỏng genau tình huống này (trigger reject enrollment) và xác nhận rollback hoàn toàn. |

### 3.6 Dịch vụ thanh toán gửi lại webhook do không nhận được phản hồi thành công

| Mục | Nội dung |
|-----|----------|
| Xử lý hiện tại | Nếu backend trả HTTP 500 (lỗi DB/RPC) hoặc kết nối ngắt trước khi gửi HTTP 200, SePay sẽ gửi lại webhook (cơ chế retry của SePay, bên ngoài source code này). |
| Idempotency | **Có.** RPC kiểm tra `provider_transaction_id` (dòng 45-48 của migration): nếu transaction đã được dùng để thanh toán đơn này, ném exception "A different transaction already paid this order" (với transaction khác) hoặc chấp nhận lại (với cùng transaction). Khi order đã `paid`, RPC cập nhật `provider_order_id`/`provider_transaction_id` bằng `COALESCE` (dòng 53-57), giữ nguyên `paid_at`, trả `isNewlyPaid = false`. |
| Trùng lặp Enrollment | Không. `INSERT ... ON CONFLICT (course_id, student_id) DO UPDATE` chỉ cập nhật status, không chèn bản ghi mới (dòng 79-85 của migration). |
| By evidence | `payments.service.test.ts` dòng 177-188: duplicate IPN → `isNewlyPaid = false`, `enrollmentCount = 1` (không tăng). |

### 3.7 Webhook được gửi nhiều lần

| Mục | Nội dung |
|-----|----------|
| Xử lý hiện tại | Idempotent như trên. RPC trả `isNewlyPaid = false` cho lần thứ 2 trở đi. Service vẫn gọi `releaseAfterEnrollmentAndSend` (email outbox) mỗi lần, nhưng outbox email có trạng thái và idempotency key qua Resend (`payment-confirmation-email.service.ts` dòng 86, `idempotencyKey = 'payment-confirmation/${orderId}`). |
| Trùng lặp Enrollment | Không. |

### 3.8 Người dùng quay lại trang thanh toán trong khi Backend chưa hoàn tất xử lý

| Mục | Nội dung |
|-----|----------|
| Xử lý hiện tại | Frontend `CheckoutSuccessPage.tsx` polling trạng thái đơn mỗi 3 giây và dùng Realtime stream (`order-status-realtime.service.ts`). Nếu đơn vẫn `pending`, trang hiển thị loader "Đang xác nhận thanh toán" và nút "Kiểm tra lại thanh toán". Nếu timeout (`paymentConfirmationTimeoutMs`, mặc định 120s), hiện `timedOut = true` và thông báo "Hệ thống chưa nhận được xác nhận thanh toán. Nếu bạn đã chuyển khoản, vui lòng liên hệ bộ phận hỗ trợ để được kiểm tra." (dòng 219). |
| Nguy cơ thanh toán trùng | Frontend **không khuyên user thanh toán lại** khi trạng thái không rõ (xem lưu ý phần 4 của yêu cầu). Nút "Tạo đơn thanh toán mới" chỉ hiện khi đơn đã `expired` (`CheckoutPage.tsx` dòng 382). |

---

## 4. NHỮNG LỖI ĐÃ ĐƯỢC XỬ LÝ VÀ NHỮNG LỖI CHƯA ĐƯỢC XỬ LÝ

### 4.1 Đã xử lý tốt (có bằng chứng trong code)

| Vấn đề | Cơ chế xử lý | File / Dòng |
|--------|--------------|-------------|
| Webhook trùng lặp (idempotency) | RPC kiểm tra `provider_transaction_id`; `INSERT ... ON CONFLICT` cho enrollment; `isNewlyPaid = false` cho lần lặp. | Migration `20261111000000` dòng 45-57, 79-85; `payments.service.test.ts` dòng 177-188, 370-383 |
| Rollback khi lỗi DB/RPC | Toàn bộ order + enrollment + profile activation trong 1 transaction PostgreSQL. | Migration `20261111000000` (plpgsql atomic); test dòng 112-136 |
| Lỗi sau commit (email outbox) | Order và enrollment đã commit; email vào outbox trạng thái `waiting_for_enrollment` → `pending`, có retry worker. | `payments.service.ts` dòng 203; `payment-confirmation-email.repository.ts` dòng 43-54; test `payments.service.test.ts` dòng 251-257 |
| Retry email gửi thất bại | `processDueJobs` chạy mỗi 60 giây (`server.ts` dòng 29-33), retry với backoff, tối đa 8 lần sau đó chuyển `needs_review`. | `payment-confirmation-email.service.ts` dòng 57-71; repository dòng 155-174 |
| Đơn hàng hết hạn (pending quá thời gian) | `expireStaleOrders` / `markOrderExpired` chuyển pending → expired. | `payments.service.ts` dòng 136-140; repository dòng 195-207 |
| SePay notification không phải APPROVED | Bị từ chối, không cấp quyền. | `payments.service.ts` dòng 174-176 |
| Sai amount / currency / tài khoản SePay | Bị từ chối với lỗi 422. | `payments.service.ts` dòng 149-189, 216-238 |

### 4.2 Chưa xử lý / Chưa tìm thấy trong source code

| Vấn đề | Trạng thái | By evidence |
|--------|------------|-------------|
| **Bảng/hàng đợi để lưu giao dịch cần xử lý lại (payment outbox cho đơn hàng)** | **Chưa tìm thấy.** Chỉ có outbox cho email (`payment_confirmation_email_outbox`). Không có bảng lưu "đơn hàng đã thanh toán ở cổng nhưng chưa xác nhận được ở platform" để xử lý lại. | Tìm toàn bộ `supabase/migrations/` và `backend/src/modules/payments/` — không tìm thấy bảng/payment retry outbox cho đơn hàng. |
| **Cơ chế tự retry xử lý webhook khi ghi DB thất bại** | **Chưa có.** Backend trả HTTP 500, phụ thuộc SePay retry. Không có job nội bộ_scan đơn hàng pending bị kẹt. | `payments.controller.ts` dòng 431-444 (chỉ trả lỗi, không đẩy vào hàng đợi retry nội bộ). |
| **Cơ chế đối soát trạng thái thanh toán với SePay (reconciliation)** | **Chưa tìm thấy.** Không có endpoint/job gọi API SePay để kiểm tra trạng thái đơn hàng cũ và khôi phục enrollment. | Không tìm thấy hàm gọi SePay API inquiry/tra cứu giao dịch trong `backend/src/modules/payments/`. |
| **Trang/Admin kiểm tra đơn hàng bị lỗi (paid nhưng không có enrollment)** | **Chưa có.** Frontend admin chỉ có `quan_ly_nguoi_dung` (user management) và `khoa_hoc_bai_tap` (course management), không có quản lý đơn hàng/thanh toán. Backend cũng không có route admin cho orders. | `frontend/src/pages/quan_ly_nguoi_dung/` chỉ chứa user/course management; `backend/src/modules/` chỉ có `auth, users, courses, payments, workshops` (không có admin orders). |
| **Email/thông báo đến bộ phận hỗ trợ khi webhook xử lý thất bại** | **Chưa tìm thấy.** Chỉ có email xác nhận gửi đến học viên (`payment-confirmation-email-service`). Không có email cảnh báo đến support khi RPC lỗi lặp lại. | Không tìm thấy `sendSupportAlert`, `notifySupport`, hoặc tương tự trong `backend/src/`. |
| **Thông tin liên hệ hỗ trợ được cấu hình ở backend** | **Chưa có cấu hình backend.** Frontend dùng `VITE_SUPPORT_PHONE` (`payment-config.ts` dòng 3) và ContactPage hardcode hotline `0397 714 129` và email `trangnn.ulis@gmail.com` (`ContactPage.tsx` dòng 81, 95). Đây là thông tin hiển thị cho khách hàng, không phải cấu hình hỗ trợ nội bộ cho sự cố thanh toán. |
| **Xử lý trường hợp process crash sau khi DB commit nhưng trước khi gửi HTTP 200** | Phầnialmente xử lý qua idempotency (SePay retry → RPC nhận lại đơn đã paid → không duplicate). Tuy nhiên không có log/audit lưu lại "webhook processed but response failed". | `payments.controller.ts` chỉ log sau khi có `result` (dòng 414-418), nếu crash trước đó thì không có_trace. |

---

## 5. NGUY CƠ HỌC VIÊN ĐÃ THANH TOÁN NHƯNG KHÔNG ĐƯỢC CẤP QUYỀN KHÓA HỌC

| Tình huống | Nguy cơ | Cơ chế giảm thiểu hiện có | Mức độ |
|------------|---------|-------------------------|--------|
| Thanh toán thành công ở SePay, nhưng webhook không đến backend (mất mạng, SePay lỗi) | **CAO** — tiền đã chuyển, đơn hàng vẫn `pending`, không có enrollment. | Không có. Không có job đối soát với SePay, không có bảng lưu giao dịch chờ xử lý. | HIGH |
| Webhook đếnBackend, RPC thành công (order + enrollment commit), nhưng HTTP 200 không gửi kịp (process crash) | Thấp — SePay retry webhook, RPC idempotent nhận lại đơn đã paid, không tạo enrollment trùng. | Idempotency RPC + ON CONFLICT enrollment. | LOW |
| RPC thành công, nhưng email xác nhận không gửi được | Không ảnh hưởng quyền truy cập khóa học (enrollment đã có). Chỉ thất bại email. | Outbox email retry mỗi 60s, tối đa 8 lần, sau đó `needs_review`. | MEDIUM (chi tiết email, không phải quyền truy cập) |
| Đơn hàng đã paid nhưng enrollment bị xóa/trouble sau đó (ví dụ admin xóa enrollment thủ công) | Không có cơ chế phát hiện tự động. | Không có. | MEDIUM |

**Kết luận về nguy cơ:** Vì RPC `confirm_course_order_payment` là **atomic** (order + enrollment + profile trong 1 transaction), tình huống "đơn hàng đã paid trong DB nhưng không có enrollment" **không thể xảy ra do lỗi code phía backend** trong luồng thông thường. Nguy cơ lớn nhất là **webhook không bao giờ đến backend** hoặc **backend không phản hồi thành công**, dẫn đến đơn hàng kẹt ở `pending` trong khi tiền đã được SePay ghi nhận. Hiện tại hệ thống **không có cơ chế tự phát hiện và khôi phục** trường hợp này.

---

## 6. CƠ CH�Ế RETRY, WEBHOOK IDEMPOTENCY, TRANSACTION VÀ KHÔI PHỤC DỮ LIỆU HIỆN CÓ

### 6.1 Transaction (Atomicity)

- File: `supabase/migrations/20261111000000_atomic_course_payment_confirmation.sql` dòng 4-97
- Hàm `confirm_course_order_payment` chạy trong một transaction plpgsql, thực hiện:
  1. `SELECT ... FOR UPDATE` (khóa hàng đơn hàng)
  2. `UPDATE course_orders SET status = 'paid'`
  3. `INSERT INTO course_enrollments ... ON CONFLICT ... DO UPDATE`
  4. `UPDATE profiles SET status = 'active'`
- Nếu bất kỳ bước nào thất bại → toàn bộ transaction rollback.
- Chỉ `service_role` được phép EXECUTE (dòng 99-101), anon/authenticated bị từ chối.

### 6.2 Webhook Idempotency

- RPC kiểm tra `provider_transaction_id` (dòng 45-48 migration): nếu khác → ném exception; nếu giống và order đã paid → cập nhật thông tin tham chiếu bằng `COALESCE`, giữ nguyên `paid_at`, trả `isNewlyPaid = false`.
- Enrollment dùng `ON CONFLICT (course_id, student_id) DO UPDATE` (dòng 79-85) → không tạo trùng lặp.
- Service `handleSePayWebhook` và `handleSePayBankWebhook` đều gọi cùng RPC, nên cả hai kênh webhook đều idempotent.

### 6.3 Retry

| Loại retry | Cơ chế | File / Dòng |
|------------|--------|-------------|
| Email xác nhận sau thanh toán | Outbox `payment_confirmation_email_outbox`, `processDueJobs` mỗi 60s, backoff 1→5→15→60→360→720→1440 phút, tối đa 8 lần, sau đó `needs_review`. | `server.ts` dòng 29-33; `payment-confirmation-email.service.ts` dòng 57-71; repository dòng 155-174, 69-104 |
| Webhook thanh toán | **Không có retry nội bộ ở backend.** Phụ thuộc SePay gửi lại webhook khi nhận HTTP != 200. | `payments.controller.ts` dòng 431-444 (chỉ trả lỗi) |
| Đơn hàng pending hết hạn | `expireStaleOrders` chuyển pending → expired. | `payments.service.ts` dòng 136-140 |

### 6.4 Khôi phục dữ liệu

- Email outbox: `recoverStaleJobs()` récup các job `sending` bị treo quá 10 phút (`payment-confirmation-email.repository.ts` dòng 69-104).
- **Không có** cơ chế khôi phục đơn hàng thanh toán bị kẹt (không có payment retry outbox, không có reconciliation job).

---

## 7. NỘI DUNG THÔNG BÁO ĐỀ XUẤT CHO TỪNG TÌNH HUẬN

Lưu ý: Không được thông báo thất bại nếu SePay đã xác nhận thành công; không được khuyên thanh toán lại khi chưa đối soát rõ ràng; không yêu cầu mật khẩu/OTP/thông tin nhạy cảm.

### Trường hợp 1: Thanh toán thành công và cấp quyền khóa học thành công

- **Tiêu đề:** Thanh toán thành công — Khóa học đã được kích hoạt
- **Nội dung:** Cảm ơn bạn đã đăng ký khóa học [Tên khóa học]. Giao dịch đã được xác nhận và khóa học hiện đã có trong thư viện học tập của bạn. Bạn có thể vào học ngay.
- **Trạng thái đơn hàng:** Đã thanh toán (paid)
- **Hành động:** Nhấn nút "Vào học ngay" để mở khóa học.
- **Mã đơn hàng/giao dịch:** Hiển thị mã đơn hàng và mã giao dịch SePay để người dùng lưu lại (tùy chọn).
- **Liên hệ hỗ trợ:** Không bắt buộc, nhưng có thể hiển thị hotline/email nếu cần.

### Trường hợp 2: Đã nhận xác nhận thanh toán nhưng hệ thống chưa hoàn tất ghi nhận đơn hàng / cấp quyền

- **Tiêu đề:** Đang hoàn tất đơn hàng của bạn
- **Nội dung:** Chúng tôi đã nhận thông báo thanh toán từ SePay và đang xử lý đơn hàng của bạn. Quá trình này thường hoàn tất trong vài phút. Vui lòng đợi hoặc bấm "Kiểm tra lại thanh toán" để cập nhật trạng thái.
- **Trạng thái đơn hàng:** Đang xử lý / Đang chờ xác nhận
- **Hành động:** Đợi hoặc nhấn nút "Kiểm tra lại thanh toán". Không thanh toán lại.
- **Mã đơn hàng:** Có, hiển thị mã đơn hàng để người dùng tham khảo.
- **Liên hệ hỗ trợ:** Nếu trạng thái không thay đổi sau khoảng thời gian dài (ví dụ trên 15-30 phút), liên hệ bộ phận hỗ trợ kèm mã đơn hàng.

### Trường hợp 3: Thanh toán thành công nhưng hệ thống không thể lưu dữ liệu vào Database

- **Tiêu đề:** Đang xử lý giao dịch của bạn
- **Nội dung:** Giao dịch của bạn đã được SePay xác nhận, nhưng hệ thống chúng tôi đang gặp sự cố kỹ thuật khi lưu đơn hàng. Tiền bạn đã chuyển vẫn an toàn và sẽ được xử lý. Vui lòng không thanh toán lại.
- **Trạng thái đơn hàng:** Chưa xác định / Đang xử lý (đơn hàng chưa được cập nhật thành 'paid' trong hệ thống)
- **Hành động:** Không thanh toán lại. Lưu lại mã giao dịch SePay (nếu có) và mã đơn hàng (nếu có). Liên hệ bộ phận hỗ trợ để được kiểm tra và khôi phục.
- **Mã đơn hàng/giao dịch:** Cần — cung cấp mã đơn hàng và/hoặc mã giao dịch SePay khi liên hệ hỗ trợ.
- **Liên hệ hỗ trợ:** Có, liên hệ bộ phận hỗ trợ học viên kèm mã đơn hàng/giao dịch.

### Trường hợp 4: Hệ thống chưa xác định được giao dịch đã thanh toán thành công hay chưa

- **Tiêu đề:** Chưa thể xác nhận trạng thái thanh toán
- **Nội dung:** Hệ thống chưa nhận được xác nhận hoàn tất từ SePay cho đơn hàng này. Nếu bạn đã chuyển khoản, vui lòng đợi hệ thống cập nhật hoặc liên hệ hỗ trợ để được kiểm tra. Đừng thanh toán lại trước khi đã được tư vấn, để tránh bị thanh toán trùng.
- **Trạng thái đơn hàng:** Đang chờ (pending) / Chưa xác định
- **Hành động:** Đợi hệ thống cập nhật tự động hoặc bấm "Kiểm tra lại thanh toán". Nếu quá thời gian chờ (ví dụ 2 giờ), liên hệ hỗ trợ.
- **Mã đơn hàng:** Có — hiển thị mã đơn hàng.
- **Liên hệ hỗ trợ:** Có, nếu trạng thái không thay đổi sau thời gian chờ hợp lý.

### Trường hợp 5: Hệ thống đã khôi phục và cấp quyền truy cập khóa học thành công sau sự cố

- **Tiêu đề:** Khóa học của bạn đã được kích hoạt
- **Nội dung:** Chúng tôi đã xử lý xong sự cố kỹ thuật và khóa học [Tên khóa học] hiện đã có trong thư viện của bạn. Bạn có thể vào học ngay.
- **Trạng thái đơn hàng:** Đã thanh toán (paid)
- **Hành động:** Nhấn nút "Vào học ngay".
- **Mã đơn hàng:** Có, hiển thị để người dùng lưu.
- **Liên hệ hỗ trợ:** Không bắt buộc, có thể cung cấp hotline/email nếu người dùng còn thắc mắc.

---

## 8. ĐỀ XUẤT QUY TRÌNH HỖ TRỢ VÀ ĐỐI SOÁT GIAO DỊCH

### 8.1 Các cơ chế cần bổ sung (chưa có trong source code)

1. **Bảng/hàng đợi thanh toán cần xử lý lại (payment retry outbox):** Lưu lại các đơn hàng có `status = 'pending'` nhưng đã được SePay thông báo thanh toán, hoặc các đơn hàng `pending` quá hạn mà chưa có webhook tương ứng. Job định kỳ scan và xử lý lại.
2. **Cơ chế đối soát với SePay:** Job định kỳ (ví dụ mỗi ngày hoặc mỗi giờ) gọi API tra cứu giao dịch của SePay cho các đơn hàng `pending` gần hết hạn hoặc đã hết hạn, so sánh trạng thái và khôi phục enrollment nếu SePay xác nhận đã thanh toán.
3. **Trang/Admin quản lý đơn hàng bị lỗi:** Cho phép admin xem danh sách đơn hàng `pending` quá hạn, đơn hàng `paid` nhưng không có enrollment, và có nút "Xử lý lại / Khôi phục quyền truy cập".
4. **Email cảnh báo đến bộ phận hỗ trợ:** Khi webhook xử lý thất bại liên tiếp (ví dụ 3 lần RPC lỗi) hoặc khi phát hiện đơn hàng `pending` quá 24 giờ, gửi email thông báo đến đội ngũ hỗ trợ (không được in giá trị email/API key vào báo cáo này).
5. **Audit log cho webhook:** Lưu lại mỗi lần nhận webhook, kết quả xử lý (thành công/thất bại), mã giao dịch, để có thể truy vết khi发生争议.

### 8.2 Thông tin liên hệ hỗ trợ đã có trong frontend (không bịa thêm)

- **Hotline:** `0397 714 129` (hiển thị trên `ContactPage.tsx` dòng 81 và `CheckoutSuccessPage.tsx`/`CheckoutPage.tsx` thông qua `paymentSupportPhone`).
- **Email:** `trangnn.ulis@gmail.com` (hiển thị trên `ContactPage.tsx` dòng 95).
- **Địa chỉ:** 69 Dương Thị Xuân Quý, Phường Mỹ An, Quận Ngũ Hành Sơn, TP. Đà Nẵng (`ContactPage.tsx` dòng 106-107).
- **Giờ làm việc:** Thứ Hai – Chủ Nhật: 08:00 – 21:00 (`ContactPage.tsx` dòng 119-120).
- **Cấu hình frontend:** `VITE_SUPPORT_PHONE` được đọc trong `payment-config.ts` dòng 3.

> Ghi chú: Không có cấu hình liên hệ hỗ trợ nội bộ (email/phone cho đội ngũ kỹ thuật xử lý sự cố thanh toán) trong backend source code. Tất cả thông tin liên hệ ở trên chỉ dùng để hiển thị cho khách hàng trên frontend.

---

## 9. DANH SÁCH VẤN ĐỀ CẦN BỔ SUNG HOẶC CẢI THIỆN

| STT | Vấn đề | Mức độ | File liên quan | Gợi ý |
|-----|--------|--------|----------------|-------|
| 1 | Không có bảng/hàng đợi lưu giao dịch thanh toán cần xử lý lại | HIGH | `supabase/migrations/`, `backend/src/modules/payments/` | Thêm bảng `payment_retry_outbox` lưu các đơn hàng cần xử lý lại sau sự cố. |
| 2 | Không có cơ chế tự retry xử lý webhook khi DB/RPC lỗi | HIGH | `payments.controller.ts`, `payments.service.ts` | Thêm job nội bộ retry các webhook thất bại hoặc đánh dấu đơn hàng cần xử lý lại. |
| 3 | Không có công việc đối soát định kỳ với SePay | HIGH | `backend/src/modules/payments/` | Thêm job gọi API SePay tra cứu trạng thái các đơn hàng pending/expiring và khôi phục enrollment nếu cần. |
| 4 | Không có trang admin quản lý đơn hàng/thanh toán lỗi | MEDIUM | `frontend/src/pages/quan_ly_nguoi_dung/`, `backend/src/modules/` | Thêm module admin để xem/tìm kiếm đơn hàng, hỗ trợ khôi phục quyền truy cập. |
| 5 | Không có email/thông báo cảnh báo đến bộ phận hỗ trợ khi sự cố thanh toán | MEDIUM | `backend/src/modules/payments/` | Thêm gửi email cảnh báo khi RPC lỗi lặp lại hoặc đơn hàng pending quá hạn. |
| 6 | Không có audit log chi tiết cho từng lần nhận webhook | MEDIUM | `payments.controller.ts`, `payments.service.ts` | Lưu log nhận/xử lý webhook với mã giao dịch, kết quả, thời gian. |
| 7 | OpenAPI docs chưa dokument chi tiết các endpoint webhook và mã lỗi | LOW | `backend/src/openapi.ts` | Cập nhật Swagger docs cho `/sepay-webhook`, `/sepay-bank-webhook`, các trạng thái đơn hàng. |
| 8 | Thông tin liên hệ hỗ trợ chỉ cứng (hardcode) trên frontend, không có cấu hình backend | LOW | `ContactPage.tsx`, `payment-config.ts` | Cân nhắc cấu hình hỗ trợ qua biến môi trường frontend (với tiền tố `VITE_`). |

---

## 10. KẾT LUẬN VỀ MỨC ĐỘ AN TOÀN CỦA LUỒNG THANH TOÁN HIỆN TẠI

### 10.1 Điều hệ thống làm TỐT

- **Atomicity:** RPC `confirm_course_order_payment` đảm bảo đơn hàng `paid` và enrollment `active` luôn cùng thành công hoặc cùng thất bại. Không thể có đơn hàng đã `paid` mà thiếu enrollment do lỗi code trong transaction này (được chứng minh bởi test tích hợp `payments.atomic.integration.test.ts`).
- **Idempotency:** Webhook trùng lặp được xử lý an toàn, không tạo enrollment trùng lặp, không thay đổi `paid_at` ban đầu.
- **Rollback:** Khi lỗi DB/RPC, toàn bộ thay đổi được rollback, đơn hàng giữ nguyên trạng thái cũ (`pending`, `expired`, v.v.).
- **Email retry:** Outbox email có cơ chế retry và 회복 tự động tốt.

### 10.2 Những khoảng trống an toàn

- **Nguy cơ cao nhất:** Nếu SePay đã ghi nhận thanh toán thành công nhưng webhook **không bao giờ đến** backend (mất mạng, lỗi SePay, hoặc backend không phản hồi 200 kịp thời), đơn hàng sẽ bị kẹt ở trạng thái `pending`. Hiện tại **không có cơ chế tự phát hiện và khôi phục** trường hợp này — học viên đã mất tiền nhưng chưa được cấp quyền khóa học, và hệ thống không主動 thông báo cho admin hay học viên về sự cố này.
- **Không có trang quản lý đơn hàng lỗi** cho admin hỗ trợ.
- **Không có đối soát định kỳ** với SePay.

### 10.3 Phân loại mức độ nghiêm trọng tổng thể

| Mức độ | Mô tả | Có trong hệ thống hiện tại? |
|--------|-------|----------------------------|
| **CRITICAL** | Mất tiền hoặc mất dữ liệu giao dịch mà không có khả năng khôi phục | **Không có bằng chứng** — nhờ atomic RPC, dữ liệu không bị mất nửa chừng. |
| **HIGH** | Thanh toán thành công nhưng không được cấp quyền khóa học | **Có nguy cơ** nếu webhook không đến/bị lỗi và không có cơ chế đối soát tự động. Chưa có cách khôi phục tự động. |
| **MEDIUM** | Lỗi hiển thị, thông báo, hỗ trợ khôi phục chưa đầy đủ | **Có** — chưa có admin quản lý đơn hàng lỗi, chưa có email cảnh báo support, chưa có đối soát SePay. |
| **LOW** | Cải thiện trải nghiệm người dùng | Có một số điểm có thể cải thiện UX ở trang kết quả thanh toán. |

### 10.4 Câu trả lời ngắn gọn

**Hệ thống hiện có thể bảo vệ người dùng trong tình huống đã thanh toán nhưng chưa được cấp quyền khóa học hay không?**

- Trong trường hợp **webhook đến backend và RPC chạy thành công**: **Có**, hệ thống bảo vệ tốt — đơn hàng và enrollment được tạo nguyên tử, không bị mất dữ liệu, không bị trùng lặp.
- Trong trường hợp **webhook không đến backend hoặc backend lỗi trước khi commit**: **Không**, hệ thống hiện không có cơ chế tự phát hiện, không có hàng đợi xử lý lại, không có đối soát với SePay, và không có trang quản lý đơn hàng lỗi cho admin. Học viên có thể đã mất tiền nhưng chưa được cấp quyền, và cần liên hệ hỗ trợ thủ công (kèm mã đơn hàng/giao dịch) để được xử lý.

Để giảm thiểu mức rủi ro **HIGH** này, dự án cần bổ sung: (1) bảng/job xử lý lại giao dịch thanh toán bị kẹt, (2) công việc đối soát định kỳ với SePay, (3) trang admin quản lý đơn hàng lỗi, và (4) cơ chế thông báo sự cố thanh toán đến đội ngũ hỗ trợ.

---