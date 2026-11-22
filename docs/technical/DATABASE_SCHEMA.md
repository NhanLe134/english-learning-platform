# Database Schema

# DATABASE REQUIREMENTS — ENGLISH LEARNING WEBSITE

## 1. Tổng quan

- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth
- **File Storage:** Supabase Storage
- **Mục tiêu:** Xây dựng cấu trúc CSDL ban đầu cho website học tiếng Anh.
- **Phạm vi:** Tài khoản, khóa học, video bài giảng, Daily Word, Ebook, bài tập, chấm bài, Workshop, Zoom và thanh toán.
- **Nguyên tắc:** Thiết kế đơn giản, dễ mở rộng theo từng Sprint. Không triển khai thêm bảng hoặc chức năng ngoài phạm vi nếu chưa có yêu cầu.

## 2. Quy ước chung

- Khóa chính mặc định: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
- Thời gian: `TIMESTAMPTZ`.
- Ngày: `DATE`.
- Tiền: `NUMERIC(12,2)`.
- Trạng thái: `TEXT` kết hợp `CHECK` constraint.
- Các bảng nghiệp vụ nên có `created_at TIMESTAMPTZ DEFAULT now()`.
- Bổ sung `updated_at` cho các bảng thường xuyên cập nhật.
- Khóa ngoại phải tham chiếu đến bảng hợp lệ.
- Các bảng liên kết nhiều-nhiều phải có khóa chính hoặc UNIQUE constraint phù hợp.
- Dùng `ON DELETE` phù hợp với nghiệp vụ; không xóa dây chuyền dữ liệu thanh toán hoặc bài nộp.
- Bật RLS cho các bảng nghiệp vụ có dữ liệu người dùng.
- Không lưu mật khẩu dạng văn bản thuần.
- Không lưu Access Token hoặc Refresh Token gốc trong bảng nghiệp vụ.
- Video, audio, ảnh và tài liệu lưu trong Supabase Storage; database lưu đường dẫn hoặc storage path.
- Không tự tạo lại bảng quản lý tài khoản thay thế `auth.users`.

## 3. Tài khoản và phân quyền

### 3.1. `profiles`

Mục đích: Lưu thông tin cá nhân của người dùng.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK, FK → `auth.users.id` |
| `full_name` | TEXT | NOT NULL |
| `avatar_url` | TEXT | NULL |
| `phone` | TEXT | NULL |
| `status` | TEXT | NOT NULL, DEFAULT 'active' |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

Status: `active`, `locked`, `pending`.

### 3.2. `user_roles`

Mục đích: Phân quyền người dùng.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `profiles.id`, NOT NULL |
| `role` | TEXT | NOT NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

Role: `student`, `teacher`, `admin`.

UNIQUE: `(user_id, role)`.

### 3.3. `user_sessions` — Optional

Chỉ tạo nếu cần quản lý phiên đăng nhập riêng ngoài Supabase Auth.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `profiles.id`, NOT NULL |
| `refresh_token_hash` | TEXT | NOT NULL |
| `expires_at` | TIMESTAMPTZ | NOT NULL |
| `revoked_at` | TIMESTAMPTZ | NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

Không lưu token gốc. Không tạo bảng này nếu chỉ dùng Supabase Auth mặc định.

## 4. Khóa học và bài giảng

### 4.1. `courses`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | NULL |
| `thumbnail_url` | TEXT | NULL |
| `teacher_id` | UUID | FK → `profiles.id`, NOT NULL |
| `status` | TEXT | NOT NULL, DEFAULT 'draft' |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

Status: `draft`, `published`, `archived`.

### 4.2. `topics`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `course_id` | UUID | FK → `courses.id`, NOT NULL |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | NULL |
| `sort_order` | INT | NOT NULL, DEFAULT 0 |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

### 4.3. `lessons`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `topic_id` | UUID | FK → `topics.id`, NOT NULL |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | NULL |
| `video_url` | TEXT | NULL |
| `duration_seconds` | INT | NULL |
| `sort_order` | INT | NOT NULL, DEFAULT 0 |
| `status` | TEXT | NOT NULL, DEFAULT 'draft' |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

Status: `draft`, `published`.

### 4.4. `lesson_materials`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `lesson_id` | UUID | FK → `lessons.id`, NOT NULL |
| `file_name` | TEXT | NOT NULL |
| `file_url` | TEXT | NOT NULL |
| `file_type` | TEXT | NULL |
| `status` | TEXT | NOT NULL, DEFAULT 'draft' |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

Status: `draft`, `published`. Students can access materials only when both the
material and its lesson are published.

### 4.5. `course_enrollments`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `course_id` | UUID | FK → `courses.id`, NOT NULL |
| `student_id` | UUID | FK → `profiles.id`, NOT NULL |
| `status` | TEXT | NOT NULL, DEFAULT 'active' |
| `enrolled_at` | TIMESTAMPTZ | DEFAULT now() |

UNIQUE: `(course_id, student_id)`.

Status: `active`, `completed`, `cancelled`.

### 4.6. `lesson_progress`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `lesson_id` | UUID | FK → `lessons.id`, NOT NULL |
| `student_id` | UUID | FK → `profiles.id`, NOT NULL |
| `last_position_seconds` | INT | NOT NULL, DEFAULT 0 |
| `progress_percent` | NUMERIC(5,2) | NOT NULL, DEFAULT 0 |
| `is_completed` | BOOLEAN | NOT NULL, DEFAULT false |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

UNIQUE: `(lesson_id, student_id)`.

## 5. Daily Word và Ebook

### 5.1. `daily_words`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `word` | TEXT | NOT NULL |
| `phonetic` | TEXT | NULL |
| `meaning` | TEXT | NOT NULL |
| `example` | TEXT | NULL |
| `audio_url` | TEXT | NULL |
| `image_url` | TEXT | NULL |
| `created_by` | UUID | FK → `profiles.id`, NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

### 5.2. `daily_word_schedules`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `daily_word_id` | UUID | FK → `daily_words.id`, NOT NULL |
| `publish_date` | DATE | NOT NULL |
| `status` | TEXT | NOT NULL, DEFAULT 'scheduled' |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

Status: `scheduled`, `published`, `cancelled`.

Chỉ đặt UNIQUE cho `publish_date` nếu nghiệp vụ quy định mỗi ngày chỉ có một từ.

### 5.3. `student_word_progress`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `student_id` | UUID | FK → `profiles.id`, NOT NULL |
| `daily_word_id` | UUID | FK → `daily_words.id`, NOT NULL |
| `is_learned` | BOOLEAN | NOT NULL, DEFAULT false |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

UNIQUE: `(student_id, daily_word_id)`.

### 5.4. `ebooks`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | NULL |
| `cover_url` | TEXT | NULL |
| `file_url` | TEXT | NULL |
| `price` | NUMERIC(12,2) | NOT NULL, DEFAULT 0 |
| `status` | TEXT | NOT NULL, DEFAULT 'draft' |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

Status: `draft`, `published`, `hidden`.

### 5.5. `ebook_orders`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `student_id` | UUID | FK → `profiles.id`, NOT NULL |
| `ebook_id` | UUID | FK → `ebooks.id`, NOT NULL |
| `amount` | NUMERIC(12,2) | NOT NULL |
| `status` | TEXT | NOT NULL, DEFAULT 'pending' |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

Status: `pending`, `paid`, `cancelled`, `refunded`.

## 6. Ngân hàng câu hỏi và bài tập

### 6.1. `question_banks`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `teacher_id` | UUID | FK → `profiles.id`, NOT NULL |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | NULL |
| `topic` | TEXT | NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

### 6.2. `exercises`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `teacher_id` | UUID | FK → `profiles.id`, NOT NULL |
| `course_id` | UUID | FK → `courses.id`, NULL |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | NULL |
| `time_limit_minutes` | INT | NULL |
| `max_score` | NUMERIC(6,2) | NOT NULL, DEFAULT 100 |
| `status` | TEXT | NOT NULL, DEFAULT 'draft' |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

Status: `draft`, `published`, `archived`.

### 6.3. `questions`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `question_bank_id` | UUID | FK → `question_banks.id`, NOT NULL |
| `question_type` | TEXT | NOT NULL |
| `content` | TEXT | NOT NULL |
| `media_url` | TEXT | NULL |
| `correct_answer` | JSONB | NULL |
| `points` | NUMERIC(6,2) | NOT NULL, DEFAULT 1 |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

Question type: `multiple_choice`, `fill_blank`, `matching`, `listening`, `writing`, `speaking`, `reorder`.

`correct_answer` chỉ được truy cập bởi người có quyền quản lý/chấm bài. Không để đáp án chuẩn bị lộ qua API cho học viên trước khi nộp.
Học viên đọc nội dung câu hỏi đã xuất bản qua view `published_questions`;
view này không bao gồm `correct_answer`.

### 6.4. `exercise_questions`

| Column | Type | Constraints |
|---|---|---|
| `exercise_id` | UUID | PK, FK → `exercises.id` |
| `question_id` | UUID | PK, FK → `questions.id` |
| `sort_order` | INT | NOT NULL, DEFAULT 0 |
| `points` | NUMERIC(6,2) | NOT NULL, DEFAULT 1 |

Composite primary key: `(exercise_id, question_id)`.

### 6.5. `exercise_attempts`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `exercise_id` | UUID | FK → `exercises.id`, NOT NULL |
| `student_id` | UUID | FK → `profiles.id`, NOT NULL |
| `started_at` | TIMESTAMPTZ | DEFAULT now() |
| `submitted_at` | TIMESTAMPTZ | NULL |
| `score` | NUMERIC(6,2) | NULL |
| `status` | TEXT | NOT NULL, DEFAULT 'in_progress' |

Status: `in_progress`, `submitted`, `graded`.

### 6.6. `student_answers`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `attempt_id` | UUID | FK → `exercise_attempts.id`, NOT NULL |
| `question_id` | UUID | FK → `questions.id`, NOT NULL |
| `answer` | JSONB | NOT NULL |
| `is_correct` | BOOLEAN | NULL |
| `score` | NUMERIC(6,2) | NULL |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

UNIQUE: `(attempt_id, question_id)` nếu mỗi câu chỉ có một câu trả lời hiện tại trong một lần làm bài.

### 6.7. `submissions`

Dùng cho bài Writing và Speaking.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `attempt_id` | UUID | FK → `exercise_attempts.id`, NOT NULL |
| `question_id` | UUID | FK → `questions.id`, NOT NULL |
| `text_content` | TEXT | NULL |
| `file_url` | TEXT | NULL |
| `word_count` | INT | NULL |
| `status` | TEXT | NOT NULL, DEFAULT 'draft' |
| `submitted_at` | TIMESTAMPTZ | NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

### 6.8. `teacher_reviews`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `submission_id` | UUID | FK → `submissions.id`, NOT NULL |
| `teacher_id` | UUID | FK → `profiles.id`, NOT NULL |
| `score` | NUMERIC(6,2) | NOT NULL |
| `feedback` | TEXT | NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

## 7. Workshop và thanh toán

### 7.1. `workshops`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | NULL |
| `teacher_id` | UUID | FK → `profiles.id`, NOT NULL |
| `start_time` | TIMESTAMPTZ | NOT NULL |
| `end_time` | TIMESTAMPTZ | NOT NULL |
| `price` | NUMERIC(12,2) | NOT NULL, DEFAULT 0 |
| `max_participants` | INT | NOT NULL |
| `zoom_meeting_id` | TEXT | NULL |
| `zoom_url` | TEXT | NULL |
| `status` | TEXT | NOT NULL, DEFAULT 'scheduled' |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

Status: `scheduled`, `ongoing`, `completed`, `cancelled`.

### 7.2. `workshop_registrations`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `workshop_id` | UUID | FK → `workshops.id`, NOT NULL |
| `student_id` | UUID | FK → `profiles.id`, NOT NULL |
| `amount` | NUMERIC(12,2) | NOT NULL |
| `status` | TEXT | NOT NULL, DEFAULT 'pending' |
| `registered_at` | TIMESTAMPTZ | DEFAULT now() |

UNIQUE: `(workshop_id, student_id)`.

Status: `pending`, `confirmed`, `cancelled`, `attended`.

### 7.3. `payments`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `student_id` | UUID | FK → `profiles.id`, NOT NULL |
| `ebook_order_id` | UUID | FK → `ebook_orders.id`, NULL |
| `workshop_registration_id` | UUID | FK → `workshop_registrations.id`, NULL |
| `amount` | NUMERIC(12,2) | NOT NULL |
| `provider` | TEXT | NOT NULL |
| `provider_transaction_id` | TEXT | NULL |
| `status` | TEXT | NOT NULL, DEFAULT 'pending' |
| `paid_at` | TIMESTAMPTZ | NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

Provider: `vnpay`, `momo`, `qr`.

Status: `pending`, `success`, `failed`, `refunded`.

Ràng buộc:
- Mỗi payment phải liên kết với đúng một loại đơn hàng.
- `ebook_order_id` và `workshop_registration_id` không được cùng NULL hoặc cùng có giá trị.
- Xác thực trạng thái thanh toán tại backend qua callback/webhook đã xác minh hoặc cơ chế đối soát của nhà cung cấp.
- Không lưu API Secret, API Key bí mật hoặc thông tin thanh toán nhạy cảm vào bảng này.

### 7.4. `email_notifications`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `profiles.id`, NOT NULL |
| `email` | TEXT | NOT NULL |
| `subject` | TEXT | NOT NULL |
| `notification_type` | TEXT | NOT NULL |
| `status` | TEXT | NOT NULL, DEFAULT 'pending' |
| `sent_at` | TIMESTAMPTZ | NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

Status: `pending`, `sent`, `failed`.

## 8. Quan hệ giữa các bảng

1. `auth.users` 1–1 `profiles`.
2. `profiles` 1–N `user_roles`.
3. `profiles` 1–N `courses` thông qua `teacher_id`.
4. `courses` 1–N `topics`.
5. `topics` 1–N `lessons`.
6. `lessons` 1–N `lesson_materials`.
7. `profiles` N–N `courses` thông qua `course_enrollments`.
8. `profiles` N–N `lessons` thông qua `lesson_progress`.
9. `daily_words` 1–N `daily_word_schedules`.
10. `profiles` N–N `daily_words` thông qua `student_word_progress`.
11. `ebooks` 1–N `ebook_orders`.
12. `question_banks` 1–N `questions`.
13. `exercises` N–N `questions` thông qua `exercise_questions`.
14. `exercises` 1–N `exercise_attempts`.
15. `exercise_attempts` 1–N `student_answers`.
16. `exercise_attempts` 1–N `submissions`.
17. `submissions` 1–N `teacher_reviews` nếu cần lưu lịch sử chấm.
18. `workshops` 1–N `workshop_registrations`.
19. `ebook_orders` 1–N `payments` hoặc `workshop_registrations` 1–N `payments`, theo loại đơn hàng.
20. `profiles` 1–N `email_notifications`.

## 9. Yêu cầu bảo mật Supabase

- Bật RLS cho các bảng có dữ liệu người dùng.
- Người dùng chỉ được đọc/cập nhật hồ sơ của mình, ngoại trừ các trường và thao tác quản trị được cấp quyền rõ ràng.
- Học viên chỉ được xem tiến độ, câu trả lời, bài nộp và kết quả của chính mình.
- Giảng viên chỉ được quản lý khóa học, câu hỏi và bài nộp trong phạm vi được phân công.
- Chỉ Admin hoặc backend đáng tin cậy được thay đổi quyền quản trị và khóa/mở tài khoản.
- Không cho học viên đọc đáp án chuẩn trong `questions.correct_answer` trước khi nộp bài. Nên sử dụng RPC hoặc backend để chấm điểm thay vì cấp quyền đọc trực tiếp cột đáp án.
- Không đưa `service_role` key vào frontend.
- Cấu hình Storage policies riêng cho file công khai và file riêng tư.
- Không xem việc ẩn nút trên giao diện là cơ chế bảo mật.

## 10. Yêu cầu triển khai cho Agent

1. Đọc toàn bộ tài liệu trước khi thay đổi repository.
2. Kiểm tra cấu trúc dự án và các migration Supabase hiện có.
3. Không xóa hoặc ghi đè dữ liệu/migration hiện có nếu chưa được cho phép.
4. Tạo migration SQL theo thứ tự phụ thuộc khóa ngoại.
5. Tạo PK, FK, NOT NULL, UNIQUE, CHECK và các index cần thiết.
6. Bật RLS và tạo policies tối thiểu an toàn; không tạo policy cho phép mọi người đọc/ghi toàn bộ dữ liệu.
7. Nếu policy phụ thuộc vai trò, kiểm tra vai trò một cách an toàn và tránh đệ quy RLS.
8. Thiết lập `updated_at` bằng trigger khi cần.
9. Kiểm tra migration trên môi trường phát triển.
10. Báo cáo các bảng đã tạo, các migration, policies, giả định và vấn đề chưa giải quyết.

### Phạm vi chưa yêu cầu

- Chưa cần xây dựng UI.
- Chưa cần triển khai toàn bộ API nghiệp vụ.
- Chưa cần tích hợp thật VNPAY, MoMo hoặc Zoom.
- Chưa cần thiết kế chi tiết mọi loại câu hỏi ngoài cấu trúc chung.
- Không tự thêm bảng mới ngoài tài liệu trừ khi phát hiện yêu cầu kỹ thuật bắt buộc; phải nêu lý do trước khi mở rộng phạm vi.

**Mục tiêu cuối:** Có schema Supabase ban đầu nhất quán, có khóa ngoại, bảo mật cơ bản và đủ khả năng mở rộng khi triển khai các Sprint tiếp theo.
