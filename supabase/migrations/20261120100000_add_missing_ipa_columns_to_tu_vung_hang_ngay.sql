-- Bổ sung 2 cột phiên âm IPA US/UK bị thiếu trên bảng tu_vung_hang_ngay đã tồn tại:
-- file migration gốc 20261118000000 có định nghĩa 2 cột này, nhưng bảng đã được tạo
-- từ phiên bản cũ hơn nên CREATE TABLE IF NOT EXISTS không bổ sung được.
-- Backend ghi 2 cột này khi thêm từ thủ công, xếp lịch hàng loạt và hiển thị popup flashcard.

ALTER TABLE public.tu_vung_hang_ngay
  ADD COLUMN IF NOT EXISTS phien_am_ipa_us TEXT;
ALTER TABLE public.tu_vung_hang_ngay
  ADD COLUMN IF NOT EXISTS phien_am_ipa_uk TEXT;
