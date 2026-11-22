# 📚 Tài liệu dự án — Your English Voice

Mục lục tổng hợp tất cả tài liệu của dự án, chia theo 3 nhóm.

## 🎯 Product — tài liệu sản phẩm

| Tài liệu | Nội dung |
|---|---|
| [REQUIREMENTS.md](product/REQUIREMENTS.md) | Yêu cầu tổng quan của hệ thống |
| [product_backlog.md](product/product_backlog.md) | Product Backlog 29 US chia theo 5 sprint — **làm theo thứ tự US nhỏ → lớn** |
| [user-story/](product/user-story/) | Chi tiết từng User Story (US-01, US-02, …) |

## 🔧 Technical — tài liệu kỹ thuật

| Tài liệu | Nội dung |
|---|---|
| [API_DOCUMENTATION.md](technical/API_DOCUMENTATION.md) | Danh mục API của backend (kèm Swagger tại `/docs` khi chạy server) |
| [DATABASE_SCHEMA.md](technical/DATABASE_SCHEMA.md) | Schema database Supabase: bảng, quan hệ, migration |
| [PROJECT_STRUCTURE.md](technical/PROJECT_STRUCTURE.md) | Cấu trúc thư mục & kiến trúc mã nguồn |
| [PAYMENT_FLOW.md](technical/PAYMENT_FLOW.md) | Luồng thanh toán SePay/VietQR: từ đặt hàng đến webhook |

## 🚀 Operations — triển khai & vận hành

| Tài liệu | Nội dung |
|---|---|
| [DEPLOYMENT.md](operations/DEPLOYMENT.md) | Hướng dẫn deploy (Vercel, Render, biến môi trường) |

---

## Quy ước

- Tài liệu mới đặt vào đúng nhóm; nếu thuộc nhóm mới thì bổ sung vào mục lục này.
- User Story viết trong `product/user-story/US-XX.md`, mã US khớp với `product/product_backlog.md`.
- Cập nhật trạng thái US trong backlog sau mỗi sprint.
