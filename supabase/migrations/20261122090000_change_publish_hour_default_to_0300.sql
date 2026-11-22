-- Đổi giờ tự động phát hành từ vựng mặc định từ 07:00 xuống 03:00 sáng
-- (theo yêu cầu nghiệp vụ; các lịch đã tạo giữ nguyên giờ của chúng)

ALTER TABLE public.lich_dang_tu_vung
  ALTER COLUMN gio_phat_hanh SET DEFAULT '03:00:00';
