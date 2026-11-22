// Múi giờ Việt Nam (UTC+7) — nguồn thống nhất cho mọi phép tính
// "hôm nay / ngày mai" của tính năng Daily Word, bất kể máy chủ chạy múi giờ nào.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000

/** Ngày hôm nay theo giờ Việt Nam, định dạng YYYY-MM-DD */
export function layNgayHomNayVN(): string {
  return new Date(Date.now() + VN_OFFSET_MS).toISOString().slice(0, 10)
}

/** Ngày mai theo giờ Việt Nam, định dạng YYYY-MM-DD */
export function layNgayMaiVN(): string {
  return new Date(Date.now() + VN_OFFSET_MS + ONE_DAY_MS).toISOString().slice(0, 10)
}

/** Mốc "cũ hơn 2 tháng" theo giờ Việt Nam (dùng cho dọn dẹp dữ liệu), YYYY-MM-DD */
export function layMocHaiThangTruocVN(): string {
  const d = new Date(Date.now() + VN_OFFSET_MS)
  d.setUTCMonth(d.getUTCMonth() - 2)
  return d.toISOString().slice(0, 10)
}
