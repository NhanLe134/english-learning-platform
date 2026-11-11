# Figma Design System — Your English Voice

> Tài liệu thiết kế chuẩn cho toàn bộ trang (Frontend). Được lấy từ trang chủ
> (`HomePage`) và trang khóa học (`CoursesPage`) — mọi trang mới phải tuân theo
> hệ thống này để đảm bảo đồng nhất.

- **Brand:** Your English Voice — "Đưa tiếng nói của người Việt ra thế giới"
- **Tech:** React 19 + Tailwind CSS v4 (token định nghĩa trong
  `frontend/src/index.css`, khối `@theme`)
- **Icon library:** [lucide-react](https://lucide.dev) — không dùng bộ icon khác

---

## 1. Màu sắc (Colors)

### 1.1. Màu chủ đạo — Brand Red (đỏ thương hiệu)

Token Tailwind: `brand-*`. Đây là màu nhận diện chính, dùng cho: logo, nút
chính, link nhấn mạnh, giá tiền, tiêu đề phụ, badge trạng thái.

| Token         | Mã HEX    | Cách dùng                                                       |
| ------------- | --------- | --------------------------------------------------------------- |
| `brand-50`    | `#FEF1F2` | Nền nhạt (badge "Tìm thấy n khóa học", nền hover, hero gradient) |
| `brand-100`   | `#FDE0E3` | Nền nhạt hơn cho trạng thái active                              |
| `brand-200`   | `#FBB5BC` | Viền focus (`focus:ring-brand-200`)                             |
| `brand-500`   | `#E02838` | Đỏ sáng — hover trạng thái phụ                                  |
| `brand-600` ⭐ | `#C8102E` | **Màu chủ đạo** — nút, logo, link, giá, icon nhấn mạnh           |
| `brand-700`   | `#A30D26` | Hover nút chính (`hover:bg-brand-700`)                          |
| `brand-800`   | `#850D21` | Đỏ đậm — trạng thái pressed                                     |
| `brand-900`   | `#6B0A1B` | Đỏ đậm nhất — text trên nền nhạt hiếm dùng                      |

> ⭐ Nếu chỉ chọn 1 màu đại diện brand: **`#C8102E` (brand-600)**.

### 1.2. Màu chữ — Ink (xám đen)

Token Tailwind: `ink-*`.

| Token       | Mã HEX    | Cách dùng                                                      |
| ----------- | --------- | -------------------------------------------------------------- |
| `ink-900`   | `#17181C` | Chữ chính — tiêu đề, tên khóa học, giá trị quan trọng           |
| `ink-700`   | `#3D4046` | Chữ phụ — mô tả ngắn, label, nav link                          |
| `ink-500`   | `#6B7076` | Chữ third-level — placeholder, meta (số buổi), mô tả phụ        |
| `ink-400`   | `#9CA0A6` | Icon không active (toggle grid/list)                            |

### 1.3. Màu trung tính (Tailwind mặc định)

| Token      | Mã HEX    | Cách dùng                                        |
| ---------- | --------- | ------------------------------------------------ |
| `white`    | `#FFFFFF` | Nền card, header, footer text                    |
| `gray-50`  | `#F9FAFB` | Nền section xen kẽ, khối "Không tìm thấy kết quả" |
| `gray-100` | `#F3F4F6` | Nền input/select, chip phụ, viền phân cách       |
| `gray-200` | `#E5E7EB` | Viền card, viền nút phụ, nút pagination          |

### 1.4. Màu chức năng

| Màu        | Mã HEX    | Cách dùng                                |
| ---------- | --------- | ---------------------------------------- |
| `amber-400`| `#FBBF24` | Sao đánh giá (đủ sao, fill trên ảnh card) |
| `black/65` | —         | Nền badge đánh giá trên ảnh (backdrop-blur) |

### 1.5. Gradient ảnh bìa khóa học

Khi chưa có ảnh thật, ảnh bìa card dùng gradient theo chủ đề
(xem `frontend/src/features/courses/courses-data.ts`):

| Khóa học         | Gradient                                              |
| ---------------- | ----------------------------------------------------- |
| IELTS            | `linear-gradient(135deg, #1E3A5F 0%, #2563EB 55%, #60A5FA 100%)` |
| Giao tiếp        | `linear-gradient(135deg, #7C2D12 0%, #EA580C 55%, #FDBA74 100%)` |
| Phát âm          | `linear-gradient(135deg, #3B0764 0%, #7C3AED 55%, #C4B5FD 100%)` |
| TOEIC            | `linear-gradient(135deg, #064E3B 0%, #059669 55%, #6EE7B7 100%)` |
| Mất gốc          | `linear-gradient(135deg, #713F12 0%, #CA8A04 55%, #FDE68A 100%)` |
| Business         | `linear-gradient(135deg, #0F172A 0%, #334155 55%, #94A3B8 100%)` |

Hero nền: `bg-gradient-to-b from-brand-50 via-[#FDF5F6] to-white`.

---

## 2. Font chữ (Typography)

### 2.1. Font family

| Mục đích       | Font                                    |
| -------------- | --------------------------------------- |
| Toàn trang     | **Be Vietnam Pro** (Google Fonts, `@import` trong `index.css`) |
| Fallback       | Inter → Segoe UI → ui-sans-serif → system-ui → sans-serif |

```css
--font-sans: "Be Vietnam Pro", Inter, "Segoe UI", ui-sans-serif, system-ui, sans-serif;
```

> Be Vietnam Pro hiển thị dấu tiếng Việt chuẩn — **không đổi font khác**.

### 2.2. Cỡ chữ & kiểu chữ (Type Scale)

Tất cả dùng `leading-tight` (1.25) cho tiêu đề, `leading-relaxed` (1.625) hoặc
`leading-snug` (1.375) cho đoạn văn.

| Cấp | Tailwind   | Cỡ thực | Line height | Weight          | Cách dùng cụ thể                        |
| --- | ---------- | ------- | ----------- | --------------- | --------------------------------------- |
| D1  | `text-5xl` | 48px    | 40px (1.25) | `font-black` (900) | H1 hero trang chủ / trang khóa học (desktop) |
| D1↓ | `text-4xl` | 36px    | 40px        | `font-black`    | H1 hero (tablet `sm`)                   |
| D1↓ | `text-3xl` | 30px    | 36px        | `font-black`    | H1 hero (mobile)                        |
| H2  | `text-3xl` | 30px    | 36px        | `font-extrabold` (800) | Tiêu đề section lớn (hero section con) |
| H2  | `text-2xl` | 24px    | 32px        | `font-extrabold` | Tiêu đề khối nội dung ("Danh Sách Khóa Học") |
| H3  | `text-lg`  | 18px    | 28px (snug) | `font-bold` (700) | Tiêu đề card khóa học                   |
| H3  | `text-base`| 16px    | 24px        | `font-bold`     | Tiêu đề phụ trong card nhỏ              |
| Body| `text-base`| 16px    | 26px (relaxed) | `font-normal` (400) | Đoạn mô tả hero                    |
| Body| `text-sm`  | 14px    | 22px (relaxed) | `font-normal`    | Đoạn mô tả card, nội dung footer        |
| Small| `text-xs` | 12px    | 16px        | `font-semibold`/`font-bold` | Label form, badge, meta, chip    |
| Tiny | `text-[11px]` | 11px | 16px       | `font-normal`   | Credential giảng viên trong card         |
| Tiny | `text-[10px]` | 10px | 16px       | `font-bold uppercase tracking-wide` | Badge trên ảnh bìa |

### 2.3. Quy tắc sử dụng weight

| Weight            | Tailwind        | Cách dùng                                     |
| ----------------- | --------------- | --------------------------------------------- |
| 900 Black         | `font-black`    | Chỉ dành cho H1 hero                           |
| 800 ExtraBold     | `font-extrabold`| H2 section, giá tiền                           |
| 700 Bold          | `font-bold`     | H3, tên giảng viên, label nhấn, chip dark      |
| 600 SemiBold      | `font-semibold` | Label form, nav, badge                          |
| 500 Medium        | `font-medium`   | Option select, nav mobile, meta                |
| 400 Regular       | (mặc định)      | Đoạn văn                                       |

### 2.4. Màu chữ theo ngữ cảnh

- Tiêu đề: `text-ink-900`, hover card → `text-brand-600`
- Mô tả: `text-ink-700` (hero) / `text-ink-500` (card)
- Giá bán: `text-brand-600` `font-extrabold text-xl`; giá gốc: `text-ink-500 line-through text-sm`
- Điểm nổi bật trên card (mục tiêu/buổi học): `text-brand-600` `text-xs font-bold` + icon

---

## 3. Bo góc (Border Radius)

| Tailwind       | Giá trị | Cách dùng                                        |
| -------------- | ------- | ------------------------------------------------ |
| `rounded-md`   | 6px     | Nút toggle grid/list con                         |
| `rounded-lg`   | 8px     | Nút chính trong card, select, nút pagination     |
| `rounded-xl`   | 12px    | Chip "Bảo đảm đầu ra", logo box, nút "Tìm Kiếm"  |
| `rounded-2xl`  | 16px    | **Card khóa học, khối filter, search bar**       |
| `rounded-3xl`  | 24px    | Khối CTA lớn                                     |
| `rounded-full` | 9999px  | Badge, chip bộ lọc, avatar, nút "Đăng ký"        |

---

## 4. Đổ bóng & hiệu ứng (Shadows & Effects)

| Hiệu ứng              | Tailwind / CSS                            | Cách dùng                       |
| --------------------- | ----------------------------------------- | ------------------------------- |
| Bóng card nhẹ         | `shadow-sm`                               | Card, khối filter               |
| Bóng card hover       | `shadow-lg` (kèm `transition-shadow`)     | Card khi hover                  |
| Bóng tìm kiếm         | `shadow-[0_8px_30px_rgba(200,16,46,0.08)]`| Search bar hero                 |
| Viền card             | `ring-1 ring-gray-100` hoặc `border-gray-100/200` | Card, filter, search   |
| Focus input/select    | `focus:ring-2 focus:ring-brand-200`       | Toàn bộ form control            |
| Header dính mép       | `sticky top-0 z-50 bg-white/95 backdrop-blur` + `border-b border-gray-100` | SiteHeader |
| Badge trên ảnh        | `backdrop-blur-sm` + nền bán trong suốt   | Badge đánh giá, badge trạng thái|
| Hover tương tác       | `transition-colors`                       | Mọi nút/link                    |

---

## 5. Layout & Lưới (Layout & Grid)

### 5.1. Container chuẩn

```html
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
  <!-- max-w-7xl = 1280px; padding: 16px → 24px → 32px -->
</div>
```

### 5.2. Breakpoints (Tailwind mặc định)

| Tên | Chiều rộng | Cách dùng chính                                  |
| --- | ---------- | ------------------------------------------------ |
| —   | < 640px    | Mobile: 1 cột card, menu hamburger                |
| `sm`| ≥ 640px    | Card 2 cột                                        |
| `md`| ≥ 768px    | Hiện chip "Bảo đảm đầu ra" trong search bar       |
| `lg`| ≥ 1024px   | Nav desktop, card 3 cột (`xl`), ẩn menu mobile    |
| `xl`| ≥ 1280px   | Filter 4 cột, card 3 cột                          |

### 5.3. Lưới card khóa học

```html
<!-- Grid view -->
<div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
<!-- List view -->
<div class="flex flex-col gap-5">
```

- Gap chuẩn giữa card: `gap-6` (24px); gap nhỏ: `gap-5`, `gap-3`, `gap-2`
- Section padding dọc: `py-8` (filter) / `pt-10 pb-16` (danh sách) / `pt-14 pb-12` (hero, mobile) / `lg:pt-20 lg:pb-16` (desktop)

---

## 6. Thành phần chuẩn (Components)

### 6.1. Header (SiteHeader)

- Cao `h-16` (64px), nền trắng trong suốt 95% + blur, viền dưới `gray-100`
- Logo: ô vuông 36px (`size-9`) `rounded-xl bg-brand-600` icon trắng + tên brand `text-lg font-extrabold`
- Nav: `text-sm font-medium text-ink-700`, cách nhau `gap-7`, hover `text-brand-600`
- Nút "Đăng ký": `rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white`
- Nút tài khoản: `size-10 rounded-full border border-gray-200`
- Mobile: hamburger `size-10`, menu xổ xuống dạng list

### 6.2. Nút (Buttons)

Quy tắc chung: **button là thẻ `<button>` → `font-bold`** (không dùng `font-semibold`);
riêng cặp CTA hero trang chủ dùng `font-medium`. Cỡ chữ 14px (`text-sm`) cho CTA lớn,
12px (`text-xs`) cho button nằm trong card.

> ⚠️ Lưu ý kỹ thuật: không dùng shorthand `font: inherit` cho `button` trong CSS — nó
> reset `font-weight` và đè mọi class `font-*` của Tailwind (CSS ngoài layer ưu tiên
> hơn `@layer utilities`). Chỉ đặt `font-family: inherit; font-size: 100%`.

| Loại                          | Class chuẩn                                                                                          | Cỡ chữ | Padding    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- | ------ | ---------- |
| Primary lớn (hero, banner CTA)| `rounded-xl bg-brand-600 px-6 py-3 text-sm text-white hover:bg-brand-700` — hero dùng `font-medium`, CTA banner khác `font-bold` | 14px   | 24px / 12px |
| Card button (trong thẻ)       | `rounded-lg px-3 py-2 text-xs font-bold text-white` — nền `bg-brand-600` (mua) / `bg-ink-900` (miễn phí) | 12px   | 12px / 8px  |
| Pill (Đăng ký trên header)    | `rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700`               | 14px   | 20px / 10px |
| Pill nền trắng (CTA trên banner đỏ) | `rounded-full bg-white px-7 py-3 text-sm font-bold text-brand-600 hover:bg-brand-50`            | 14px   | 28px / 12px |
| Chip dark                     | `rounded-full bg-ink-900 px-3 py-1.5 text-xs font-bold text-white`                                   | 12px   | 12px / 6px  |
| Chip light                    | `rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-gray-200`              | 12px   | 12px / 6px  |
| Text link đỏ                  | `text-brand-600 text-sm font-bold hover:text-brand-700` (+ icon `size-4`)                            | 14px   | —          |
| Icon button                   | `size-10 rounded-lg|full border border-gray-200 text-ink-700 hover:border-brand-600 hover:text-brand-600` | —   | —          |

### 6.3. Form control (Select / Input)

- Label: `text-xs font-semibold text-ink-700` + icon `size-3.5` phía trước
- Control: `bg-gray-100 rounded-lg py-2.5 px-4 text-sm font-medium text-ink-900`
  + icon mũi tên `ChevronDown size-4` bên phải (select dùng `appearance-none`)
- Focus: `focus:ring-2 focus:ring-brand-200`

### 6.4. Badge

| Loại                    | Class                                                                         |
| ----------------------- | ----------------------------------------------------------------------------- |
| Trạng thái (trên ảnh)   | `rounded-full bg-brand-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white` |
| Danh mục (trên ảnh)     | `rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-ink-700 shadow-sm` |
| Đánh giá (trên ảnh)     | `rounded-full bg-black/65 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm` + sao `amber-400` |
| Đếm kết quả             | `rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600`         |

### 6.5. Card khóa học (CourseCard)

Cấu trúc từ trên xuống:

1. **Ảnh bìa** `h-44`, `rounded-t-2xl` (nằm trong card `overflow-hidden rounded-2xl`):
   badge trạng thái + danh mục góc trên trái, badge đánh giá góc dưới phải
2. **Meta row**: điểm nổi bật (đỏ, icon) trái — số buổi (`CalendarDays`) phải
3. **Tiêu đề** `text-lg font-bold`, hover đỏ
4. **Mô tả** `text-sm text-ink-500 line-clamp-2` (đúng 2 dòng, có dấu "…")
5. **Giảng viên**: avatar tròn 40px + tên `text-xs font-bold` + credential `text-[11px] text-ink-500`
6. **Giá + CTA**: giá gốc gạch ngang → giá bán `text-xl font-extrabold text-brand-600`,
   nút "Xem chi tiết ›" theo chuẩn **Card button** (mục 6.2: `px-3 py-2 text-xs font-bold`)

### 6.5b. Card ebook (EbooksPage) — bố cục ngang

Khác card khóa học (dọc), card ebook bố cục **ngang: ảnh trái — nội dung phải**,
**tối đa 2 thẻ mỗi dòng** (`grid gap-6 md:grid-cols-2`):

1. **Bìa sách (cột trái)** `w-36 sm:w-44`: khung dọc tỉ lệ sách, nền gradient xám nhạt
   (`#f9fafb → #f3f4f6`) làm "kệ sách", ảnh `object-contain` — **không bao giờ crop** —
   kèm đổ bóng đứng; badge format (góc trên) + số trang (góc dưới); ebook chưa có ảnh
   thì fallback gradient riêng + icon
2. **Nội dung (cột phải)**: danh mục đỏ → tiêu đề `text-lg font-bold` → tác giả →
   mô tả `line-clamp-2` → ⭐ đánh giá + lượt tải → giá + CTA ("Tải xuống" nền `ink-900`
   cho sách miễn phí / "Mua ebook ›" nền `brand-600`) theo chuẩn Card button
   (`px-3 py-2 text-xs font-medium`)

### 6.6. Pagination

- Nút ô vuông `size-10 rounded-lg text-sm font-semibold`
- Active: `bg-brand-600 text-white`; thường: `border border-gray-200 text-ink-700` hover đỏ
- Trang cuối dạng số + dấu "…" ở giữa, mũi tên 2 bên (`disabled: opacity-40`)

### 6.7. Footer (SiteFooter)

- Nền tối/đậm nhấn thương hiệu, chia 4 cột: logo + slogan | Thông tin liên hệ | Chương trình | Hỗ trợ & Pháp lý
- Tiêu đề cột `font-bold`, link `text-sm`, hover đỏ

---

## 7. Icon (Lucide React)

- Kích thước chuẩn: `size-3` (chip ×) · `size-3.5` (label, meta) · `size-4`
  (nút, select, link) · `size-5` (search, avatar fallback) · `size-10` (icon
  minh họa gradient)
- Màu: theo ngữ cảnh chữ kèm theo (`text-ink-500`, `text-brand-600`, `text-white`)
- Icon thường dùng: `Search`, `ArrowRight`, `ChevronDown/Left/Right`,
  `RotateCcw` (đặt lại), `LayoutGrid`/`List` (toggle), `CalendarDays` (buổi học),
  `Star` (đánh giá), `Target`/`Zap`/`Mic`/`Award`/`Sprout`/`Briefcase` (highlight),
  `TrendingUp`, `Users`, `Wallet`, `Layers` (logo), `Menu`/`X`/`User`

---

## 8. Ngôn ngữ nội dung (Voice & Tone)

- Ngôn ngữ: **tiếng Việt**, dấu đầy đủ; tên riêng/nhãn thương hiệu giữ nguyên
- Tiêu đề: Title Case từng chữ cái đầu ("Danh Sách Khóa Học")
- Badge trạng thái: VIẾT HOA ("BEST SELLER", "ĐANG ƯU ĐÃI 25%")
- Giá tiền: định dạng Việt Nam `4.800.000đ` (`toLocaleString('vi-VN') + 'đ'`)
- Đánh giá: `4.9 (1.240)` — 1 chữ số thập phân, số review có dấu chấm ngăn cách
- CTA ngắn, động lực: "Xem chi tiết", "Tìm Kiếm", "Đăng ký", "Đặt lại"
