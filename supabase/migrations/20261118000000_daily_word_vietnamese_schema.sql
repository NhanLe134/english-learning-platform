-- ==============================================================================
-- Migration: Quản lý Daily Word và Lịch Đăng Tự Động (Tên bảng và cột bằng Tiếng Việt)
-- ==============================================================================

-- 1. Bảng Kho từ vựng hàng ngày (Nội dung từ, Phiên âm, US/UK audio và Flashcard)
CREATE TABLE IF NOT EXISTS public.tu_vung_hang_ngay (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tu_tieng_anh TEXT NOT NULL,
  phien_am_ipa TEXT NOT NULL,
  tu_loai TEXT NOT NULL,
  dinh_nghia_tieng_anh TEXT NOT NULL,
  dinh_nghia_tieng_viet TEXT NOT NULL,
  vi_du_tieng_anh TEXT NOT NULL,
  vi_du_tieng_viet TEXT NOT NULL,
  duong_dan_am_thanh TEXT,
  am_thanh_us TEXT,
  am_thanh_uk TEXT,
  phien_am_ipa_us TEXT,
  phien_am_ipa_uk TEXT,
  nhan_phan_loai TEXT DEFAULT 'Oxford 3000',
  ngay_tao TIMESTAMPTZ NOT NULL DEFAULT now(),
  ngay_cap_nhat TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Bảng Lịch đăng phát hành từ vựng mỗi ngày
CREATE TABLE IF NOT EXISTS public.lich_dang_tu_vung (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tu_vung_id UUID NOT NULL REFERENCES public.tu_vung_hang_ngay (id) ON DELETE CASCADE,
  ngay_phat_hanh DATE NOT NULL UNIQUE,
  gio_phat_hanh TIME NOT NULL DEFAULT '07:00:00',
  trang_thai TEXT NOT NULL DEFAULT 'cho_phat_hanh'
    CHECK (trang_thai IN ('cho_phat_hanh', 'dang_hoat_dong', 'da_qua', 'tam_dung')),
  nguon_du_lieu TEXT NOT NULL DEFAULT 'thu_cong'
    CHECK (nguon_du_lieu IN ('thu_cong', 'boc_tach_tep', 'ai_import')),
  ten_tep_nguon TEXT,
  da_gui_thong_bao BOOLEAN NOT NULL DEFAULT false,
  thoi_gian_gui_thong_bao TIMESTAMPTZ,
  ngay_tao TIMESTAMPTZ NOT NULL DEFAULT now(),
  ngay_cap_nhat TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Bảng Hàng đợi ôn tập Flashcard (Dành cho học viên khi tương tác flashcard)
CREATE TABLE IF NOT EXISTS public.hang_doi_on_tap_tu_vung (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hoc_vien_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  tu_vung_id UUID NOT NULL REFERENCES public.tu_vung_hang_ngay (id) ON DELETE CASCADE,
  muc_do_ghi_nho TEXT NOT NULL CHECK (muc_do_ghi_nho IN ('chua_thuoc', 'tam_thuoc', 'da_thuoc')),
  vi_tri_hang_doi INTEGER NOT NULL DEFAULT 1,
  ngay_on_tap_tiep_theo DATE NOT NULL,
  ngay_cap_nhat TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_hang_doi_hoc_vien_tu UNIQUE (hoc_vien_id, tu_vung_id)
);

-- 4. Indexes tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_lich_dang_ngay_phat_hanh ON public.lich_dang_tu_vung (ngay_phat_hanh);
CREATE INDEX IF NOT EXISTS idx_lich_dang_trang_thai ON public.lich_dang_tu_vung (trang_thai);
CREATE INDEX IF NOT EXISTS idx_tu_vung_tieng_anh ON public.tu_vung_hang_ngay (tu_tieng_anh);
CREATE INDEX IF NOT EXISTS idx_hang_doi_hoc_vien ON public.hang_doi_on_tap_tu_vung (hoc_vien_id, ngay_on_tap_tiep_theo);

-- 5. Kích hoạt Row Level Security (RLS)
ALTER TABLE public.tu_vung_hang_ngay ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lich_dang_tu_vung ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hang_doi_on_tap_tu_vung ENABLE ROW LEVEL SECURITY;

-- Chính sách RLS cho tu_vung_hang_ngay
DROP POLICY IF EXISTS "Cho phep doc tu vung" ON public.tu_vung_hang_ngay;
CREATE POLICY "Cho phep doc tu vung" ON public.tu_vung_hang_ngay FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cho phep quan ly tu vung" ON public.tu_vung_hang_ngay;
CREATE POLICY "Cho phep quan ly tu vung" ON public.tu_vung_hang_ngay FOR ALL USING (true) WITH CHECK (true);

-- Chính sách RLS cho lich_dang_tu_vung
DROP POLICY IF EXISTS "Cho phep doc lich dang" ON public.lich_dang_tu_vung;
CREATE POLICY "Cho phep doc lich dang" ON public.lich_dang_tu_vung FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cho phep quan ly lich dang" ON public.lich_dang_tu_vung;
CREATE POLICY "Cho phep quan ly lich dang" ON public.lich_dang_tu_vung FOR ALL USING (true) WITH CHECK (true);

-- Chính sách RLS cho hang_doi_on_tap_tu_vung
DROP POLICY IF EXISTS "Cho phep quan ly hang doi flashcard" ON public.hang_doi_on_tap_tu_vung;
CREATE POLICY "Cho phep quan ly hang doi flashcard" ON public.hang_doi_on_tap_tu_vung FOR ALL USING (true) WITH CHECK (true);

-- Cấp toàn quyền cho anon, authenticated và service_role
GRANT ALL ON public.tu_vung_hang_ngay TO anon, authenticated, service_role;
GRANT ALL ON public.lich_dang_tu_vung TO anon, authenticated, service_role;
GRANT ALL ON public.hang_doi_on_tap_tu_vung TO anon, authenticated, service_role;

-- ==============================================================================
-- 6. HÀM DỌN DẸP DỮ LIỆU CŨ HƠN 2 THÁNG (GIẢM TẢI & LÀM NHẸ DATABASE)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.don_dep_du_lieu_tu_vung_cu_hon_2_thang()
RETURNS TABLE (
  so_lich_da_xoa INT,
  so_tu_da_xoa INT,
  ngay_moc_cat DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_moc_cat DATE;
  v_so_lich INT := 0;
  v_so_tu INT := 0;
BEGIN
  -- Mốc thời gian: Ngày hiện tại trừ đi 2 tháng
  v_moc_cat := CURRENT_DATE - INTERVAL '2 months';

  -- Đếm số lượng lịch phát hành cũ sẽ bị xóa
  SELECT COUNT(*) INTO v_so_lich
  FROM public.lich_dang_tu_vung
  WHERE ngay_phat_hanh < v_moc_cat;

  -- Xóa các từ vựng gắn với các ngày cũ này
  -- Nhờ ON DELETE CASCADE, các dòng trong lich_dang_tu_vung và hang_doi_on_tap_tu_vung sẽ tự động bị xóa
  WITH tu_can_xoa AS (
    SELECT DISTINCT tu_vung_id
    FROM public.lich_dang_tu_vung
    WHERE ngay_phat_hanh < v_moc_cat
  ),
  da_xoa AS (
    DELETE FROM public.tu_vung_hang_ngay
    WHERE id IN (SELECT tu_vung_id FROM tu_can_xoa)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_so_tu FROM da_xoa;

  -- Xóa dự phòng các lịch đăng mồ côi (nếu có)
  DELETE FROM public.lich_dang_tu_vung
  WHERE ngay_phat_hanh < v_moc_cat;

  RETURN QUERY SELECT v_so_lich, v_so_tu, v_moc_cat;
END;
$$;

GRANT EXECUTE ON FUNCTION public.don_dep_du_lieu_tu_vung_cu_hon_2_thang() TO anon, authenticated, service_role;

-- Làm mới schema cache của Supabase PostgREST
NOTIFY pgrst, 'reload schema';
