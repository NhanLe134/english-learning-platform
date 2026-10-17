# PROJECT STRUCTURE

## 1. Project Overview

**Project:** English Learning Platform

### Technology Stack

| Layer | Technology |
|---|---|
| Frontend | ReactJS + TypeScript + Vite |
| Backend | Node.js + Express.js + TypeScript |
| Database | Supabase |
| Authentication | Supabase Auth |
| Image & File Storage | Cloudinary |
| Email Service | Resend |
| Payment Gateway | SePay / PayOS |
| API | REST API |

## 2. Root Directory Structure

```text
english-learning-platform/
├── frontend/
├── backend/
├── docs/
├── .gitignore
└── README.md
```

## 3. Frontend Structure

```text
frontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   ├── forms/
│   │   └── ui/
│   ├── layouts/
│   │   ├── MainLayout.tsx
│   │   ├── StudentLayout.tsx
│   │   ├── InstructorLayout.tsx
│   │   └── AdminLayout.tsx
│   ├── pages/
│   │   ├── home/
│   │   ├── about/
│   │   ├── auth/
│   │   ├── ebooks/
│   │   ├── courses/
│   │   ├── lessons/
│   │   ├── workshops/
│   │   ├── daily-word/
│   │   ├── exercises/
│   │   └── dashboard/
│   ├── features/
│   │   ├── authentication/
│   │   ├── student/
│   │   ├── instructor/
│   │   ├── admin/
│   │   ├── courses/
│   │   ├── ebooks/
│   │   ├── workshops/
│   │   ├── daily-word/
│   │   ├── exercises/
│   │   └── payments/
│   ├── routes/
│   ├── services/
│   ├── hooks/
│   ├── contexts/
│   ├── types/
│   ├── schemas/
│   ├── utils/
│   ├── constants/
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 4. Backend Structure

```text
backend/
├── src/
│   ├── config/
│   │   ├── env.ts
│   │   ├── supabase.ts
│   │   ├── cloudinary.ts
│   │   ├── resend.ts
│   │   └── payment.ts
│   ├── middlewares/
│   │   ├── authenticate.ts
│   │   ├── authorize.ts
│   │   ├── errorHandler.ts
│   │   └── validateRequest.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── instructors/
│   │   ├── courses/
│   │   ├── lessons/
│   │   ├── progress/
│   │   ├── ebooks/
│   │   ├── workshops/
│   │   ├── registrations/
│   │   ├── payments/
│   │   ├── daily-word/
│   │   ├── exercises/
│   │   ├── submissions/
│   │   ├── grading/
│   │   └── reports/
│   ├── integrations/
│   │   ├── supabase/
│   │   ├── cloudinary/
│   │   ├── resend/
│   │   ├── sepay/
│   │   └── payos/
│   ├── jobs/
│   ├── utils/
│   ├── types/
│   ├── app.ts
│   └── server.ts
├── tests/
├── .env.example
├── package.json
└── tsconfig.json
```

## 5. Backend Module Convention

Mỗi module nghiệp vụ có thể được tổ chức như sau:

```text
courses/
├── course.routes.ts
├── course.controller.ts
├── course.service.ts
├── course.repository.ts
├── course.validation.ts
└── course.types.ts
```

| File | Responsibility |
|---|---|
| routes | Khai báo API endpoints |
| controller | Tiếp nhận request, trả response |
| service | Xử lý nghiệp vụ |
| repository | Truy vấn dữ liệu |
| validation | Kiểm tra dữ liệu đầu vào |
| types | Định nghĩa TypeScript types |

## 6. Business Modules

| Module | Main Responsibilities |
|---|---|
| Authentication | Đăng ký, đăng nhập, quên mật khẩu |
| Users | Hồ sơ và phân quyền người dùng |
| Courses | Quản lý khóa học và chủ đề |
| Lessons | Video bài giảng và tài liệu |
| Progress | Theo dõi tiến độ học |
| Ebooks | Danh sách ebook và mua ebook |
| Workshops | Quản lý lịch Zoom/Workshop |
| Registrations | Đăng ký tham gia sự kiện |
| Payments | Thanh toán và xác nhận giao dịch |
| Daily Word | Flashcard từ vựng hằng ngày |
| Exercises | Các dạng bài tập tiếng Anh |
| Submissions | Bài nộp của học viên |
| Grading | Chấm điểm và nhận xét |
| Reports | Báo cáo đăng ký và doanh thu |

## 7. Environment Variables

### Frontend

File: `frontend/.env.example`

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Backend

File: `backend/.env.example`

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

RESEND_API_KEY=
EMAIL_FROM=

SEPAY_API_KEY=

PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
```

**Security rules:**

- Không commit file `.env` lên Git.
- Không đưa `SUPABASE_SERVICE_ROLE_KEY` vào frontend.
- Không để lộ API secrets của Cloudinary, Resend hoặc cổng thanh toán.
- Chỉ cấu hình biến môi trường của các dịch vụ thực sự được sử dụng.

## 8. Documentation Structure

```text
docs/
├── PROJECT_STRUCTURE.md
├── REQUIREMENTS.md
├── DATABASE_SCHEMA.md
├── API_DOCUMENTATION.md
├── PAYMENT_FLOW.md
└── DEPLOYMENT.md
```

## 9. Initialization Commands

### Create Frontend

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
cd ..
```

### Create Backend

```bash
mkdir backend
cd backend
npm init -y
npm install express cors dotenv @supabase/supabase-js cloudinary resend
npm install -D typescript tsx @types/node @types/express @types/cors
npx tsc --init
cd ..
```

### Create Git Repository

```bash
git init
```

## 10. Development Order

1. Initialize frontend and backend.
2. Configure environment variables.
3. Design Supabase database schema and Row Level Security.
4. Implement authentication and role-based authorization.
5. Implement courses, lessons and learning progress.
6. Implement ebooks, workshops and payment integration.
7. Implement Daily Word and exercises.
8. Implement submissions, grading and reports.
9. Test security, business flows and deployment.

## 11. Important Notes

- This document defines the proposed project structure; folders alone do not implement business functionality.
- Confirm whether SePay or PayOS will be used before finalizing payment integration.
- Confirm the video hosting and playback solution.
- Automatic speaking assessment requires a separate speech-recognition or pronunciation-assessment solution.
- Protect paid content and workshop links through server-side authorization.
- Validate payment notifications and prevent duplicate transaction processing.
