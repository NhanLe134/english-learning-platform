# Deployment

## Tổng quan

| Thành phần | Nền tảng | URL |
| --- | --- | --- |
| Backend API | Render (Web Service, gói Free) | `https://english-learning-platform-b9yd.onrender.com/api` |
| Database | Supabase (PostgreSQL) | `https://uwmzqdixewdqkmnnoquo.supabase.co` |
| Frontend | Chưa deploy — dùng `VITE_API_URL` trỏ tới backend khi deploy | — |

- Backend **tự động deploy lại** mỗi khi push code lên nhánh `dev` (Auto-Deploy).
- Kiểm tra backend đang sống: `GET https://english-learning-platform-b9yd.onrender.com/api/health` → `{"status":"ok"}`.

## Cấu hình Render (backend)

| Thiết lập | Giá trị |
| --- | --- |
| Branch | `dev` |
| Root Directory | `backend` |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm run start` |
| Health Check Path | `/api/health` |

> **Lưu ý Build Command:** cờ `--include=dev` là **bắt buộc**. Các package `typescript` và
> `@types/*` nằm trong `devDependencies`; nếu không có cờ này, `NODE_ENV=production`
> khiến npm bỏ qua chúng và `tsc` sẽ lỗi (`TS7016`/`TS2591`) khi build.

## Biến môi trường production (đặt trên Render Dashboard)

**Không bao giờ commit file `.env` thật.** Secret lấy từ Supabase Dashboard → *Settings → API*.

### Bắt buộc

| Biến | Giá trị | Ghi chú |
| --- | --- | --- |
| `NODE_ENV` | `production` | Kích hoạt validate nghiêm ngặt ở `backend/src/config/env.ts` |
| `AUTH_JWT_SECRET` | chuỗi random ≥ 32 bytes | `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"` |
| `DATABASE_URL` | connection string Supabase | ⚠️ dùng **Session Pooler** (`aws-0-<region>.pooler.supabase.com:5432`) — Render Free chỉ có IPv4, không nối được host trực tiếp `db.<ref>.supabase.co` (IPv6). Username pooler dạng `postgres.<project-ref>`. Mật khẩu phải URL-encode (`@` → `%40`) |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` | |
| `SUPABASE_SERVICE_ROLE_KEY` | key service role | Dùng cho course catalog |
| `SUPABASE_PUBLISHABLE_KEY` | key publishable/anon | |
| `FRONTEND_URL` | `https://<domain-frontend>` | **Cập nhật sau khi deploy frontend.** Validate: bắt buộc HTTPS trong production, không chứa credentials — sai là server từ chối khởi động. Cũng là nguồn whitelist CORS |
| `API_ORIGIN` | `https://english-learning-platform-b9yd.onrender.com` | Domain service Render |

### Tùy chọn theo luồng

| Biến | Luồng |
| --- | --- |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Đăng nhập Google — thêm callback `https://english-learning-platform-b9yd.onrender.com/api/auth/google/callback` vào Google Cloud Console |
| `RESEND_API_KEY`, `EMAIL_FROM` | Gửi email OTP |
| `CLOUDINARY_*` | Upload ảnh |
| `SEPAY_API_KEY`, `PAYOS_*` | Thanh toán |

`PORT` không cần đặt — Render tự inject.

## Biến môi trường frontend (khi deploy)

Vite nhúng lúc **build**, nên phải đặt trước khi build/deploy frontend:

```
VITE_API_URL=https://english-learning-platform-b9yd.onrender.com/api
VITE_SUPABASE_URL=https://uwmzqdixewdqkmnnoquo.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key>
VITE_GOOGLE_CLIENT_ID=<nếu dùng>
```

Sau khi có domain frontend: cập nhật `FRONTEND_URL` trên Render → **Save and Deploy**,
nếu không trình duyệt sẽ chặn mọi API call bằng lỗi CORS.

## Hạn chế đã biết (gói Free)

- Service **ngủ sau 15 phút không có traffic** — request đầu tiên sau đó chậm 30–60 giây
  trong khi instance khởi động lại. Không phải lỗi.
- Log deploy xem tại Render Dashboard → service → **Deployments** → chọn deploy → Logs.

## Checklist khi thay đổi cấu hình

1. Sửa biến môi trường trên Render → **Save and Deploy**
2. Xem Logs tới dòng `API server listening on port ...` + `Your service is live 🎉`
3. Test `GET /api/health` và `GET /api/courses/catalog`
4. Ghi lại mọi thay đổi config vào chính tài liệu này (commit lên `dev`)
