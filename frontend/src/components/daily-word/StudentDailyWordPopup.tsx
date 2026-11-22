import React, { useState, useEffect } from 'react'
import {
  X,
  Play,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { dailyWordApi } from '../../pages/daily-word/services/dailyWordApi'
import { useAuth } from '../../pages/auth/auth-context'

interface FlashcardItem {
  id: string
  tu_vung_id: string
  tu_tieng_anh: string
  phien_am_ipa: string
  phien_am_ipa_us?: string | null
  phien_am_ipa_uk?: string | null
  tu_loai: string
  dinh_nghia_tieng_anh: string
  dinh_nghia_tieng_viet: string
  vi_du_tieng_anh: string
  vi_du_tieng_viet?: string
  la_tu_hom_nay: boolean
}

// Dữ liệu mẫu dự phòng ban đầu nếu học viên mới chưa có từ trong database
const FALLBACK_WORDS: FlashcardItem[] = [
  {
    id: 'sample-1',
    tu_vung_id: 'word-eloquent',
    tu_tieng_anh: 'Eloquent',
    phien_am_ipa: "/'el.ə.kwənt/",
    phien_am_ipa_us: "/'el.ə.kwənt/",
    phien_am_ipa_uk: '/ˈel.ə.kwənt/',
    tu_loai: 'Adjective • Tính từ',
    dinh_nghia_tieng_anh: 'Fluent or persuasive in speaking or writing; clearly expressive.',
    dinh_nghia_tieng_viet: 'Hùng biện, lưu loát, truyền cảm hứng & thuyết phục.',
    vi_du_tieng_anh: 'The argument presented was notably eloquent and backed by data.',
    vi_du_tieng_viet: 'Lập luận được đưa ra đặc biệt giàu sức thuyết phục và được chứng minh bằng số liệu.',
    la_tu_hom_nay: true,
  },
]

function highlightKeyword(sentence: string, keyword: string) {
  if (!sentence || !keyword) return sentence
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Bôi đỏ NGUYÊN CẢ TỪ chứa từ khóa (kể cả khi từ trong câu có thêm đuôi
  // biến thể như handsome/handsom, accomplished/accomplish) thay vì chỉ đúng chuỗi khớp
  const parts = sentence.split(new RegExp(`([A-Za-z']*${escaped}[A-Za-z']*)`, 'gi'))
  return (
    <>
      &ldquo;
      {parts.map((part, i) =>
        part.toLowerCase().includes(keyword.toLowerCase()) ? (
          <span
            key={i}
            className="rounded bg-red-100/90 px-1 py-0.5 font-bold text-brand-700 not-italic"
          >
            {part}
          </span>
        ) : (
          part
        )
      )}
      &rdquo;
    </>
  )
}

export const StudentDailyWordPopup: React.FC = () => {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  // Ngày hôm nay theo múi giờ máy học viên, định dạng YYYY-MM-DD
  function todayStr(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  // Trạng thái "đã xem" lưu theo user: { ngày, ID từ hôm nay đã hiển thị }.
  // Popup hiện lại khi: sang ngày mới, HOẶC admin đăng TỪ MỚI trong ngày
  // (ID từ hôm nay khác ID đã xem lần trước).
  function seenKey(): string {
    return `daily_word_seen_${user?.id ?? 'guest'}`
  }
  function readSeen(): { date: string; wordId: string } | null {
    try {
      const raw = localStorage.getItem(seenKey())
      return raw ? (JSON.parse(raw) as { date: string; wordId: string }) : null
    } catch {
      return null
    }
  }
  function writeSeen(wordId: string) {
    try {
      localStorage.setItem(seenKey(), JSON.stringify({ date: todayStr(), wordId }))
    } catch {
      // Bỏ qua nếu storage bị chặn
    }
  }
  const [isFlipped, setIsFlipped] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [words, setWords] = useState<FlashcardItem[]>(FALLBACK_WORDS)
  const [playingAudio, setPlayingAudio] = useState<'us' | 'uk' | null>(null)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const currentWord = words[currentIndex] || words[0]

  // Tải từ hôm nay và hàng đợi ôn tập của học viên
  useEffect(() => {
    let isMounted = true

    async function loadStudentWords() {
      try {
        const wordList: FlashcardItem[] = []

        // 1. Lấy từ Daily Word hôm nay
        const todayWord = await dailyWordApi.layTuVungHomNay()
        if (todayWord?.tu_vung) {
          wordList.push({
            id: todayWord.id,
            tu_vung_id: todayWord.tu_vung_id,
            tu_tieng_anh: todayWord.tu_vung.tu_tieng_anh,
            phien_am_ipa: todayWord.tu_vung.phien_am_ipa || "/'el.ə.kwənt/",
            phien_am_ipa_us: todayWord.tu_vung.phien_am_ipa_us || todayWord.tu_vung.phien_am_ipa,
            phien_am_ipa_uk: todayWord.tu_vung.phien_am_ipa_uk || todayWord.tu_vung.phien_am_ipa,
            tu_loai: todayWord.tu_vung.tu_loai || 'Word',
            dinh_nghia_tieng_anh: todayWord.tu_vung.dinh_nghia_tieng_anh,
            dinh_nghia_tieng_viet: todayWord.tu_vung.dinh_nghia_tieng_viet,
            vi_du_tieng_anh: todayWord.tu_vung.vi_du_tieng_anh,
            vi_du_tieng_viet: todayWord.tu_vung.vi_du_tieng_viet,
            la_tu_hom_nay: true,
          })
        }

        // 2. Lấy hàng đợi ôn tập nếu học viên đã đăng nhập
        if (user?.id) {
          const queue = await dailyWordApi.layHangDoiFlashcard(user.id)
          if (Array.isArray(queue) && queue.length > 0) {
            queue.forEach((q: any) => {
              if (q.tu_vung && q.tu_vung.id !== todayWord?.tu_vung_id) {
                wordList.push({
                  id: q.id,
                  tu_vung_id: q.tu_vung_id,
                  tu_tieng_anh: q.tu_vung.tu_tieng_anh,
                  phien_am_ipa: q.tu_vung.phien_am_ipa,
                  phien_am_ipa_us: q.tu_vung.phien_am_ipa_us || q.tu_vung.phien_am_ipa,
                  phien_am_ipa_uk: q.tu_vung.phien_am_ipa_uk || q.tu_vung.phien_am_ipa,
                  tu_loai: q.tu_vung.tu_loai,
                  dinh_nghia_tieng_anh: q.tu_vung.dinh_nghia_tieng_anh,
                  dinh_nghia_tieng_viet: q.tu_vung.dinh_nghia_tieng_viet,
                  vi_du_tieng_anh: q.tu_vung.vi_du_tieng_anh,
                  vi_du_tieng_viet: q.tu_vung.vi_du_tieng_viet,
                  la_tu_hom_nay: false,
                })
              }
            })
          }
        }

        if (isMounted) {
          const list = wordList.length > 0 ? wordList : FALLBACK_WORDS
          setWords(list)

          // Quyết định hiển thị: hiện khi có TỪ MỚI trong ngày
          // (ID từ hôm nay khác ID đã xem lần trước) hoặc sang ngày mới
          const today = todayStr()
          const todayWordId = list.find((w) => w.la_tu_hom_nay)?.id ?? 'fallback'
          const seen = readSeen()
          const shouldShow = !seen || seen.date !== today || seen.wordId !== todayWordId
          if (shouldShow) {
            setIsOpen(true)
            writeSeen(todayWordId) // Ghi nhận ngay khi hiển thị — mỗi từ chỉ hiện 1 lần
          }
        }
      } catch (err) {
        console.warn('Lỗi tải từ vựng học viên:', err)
      }
    }

    void loadStudentWords()
    return () => {
      isMounted = false
    }
  }, [user?.id])

  // Phát âm thanh chuẩn US hoặc UK
  function handlePlayPronunciation(e: React.MouseEvent, giong: 'us' | 'uk') {
    e.stopPropagation()
    if (!currentWord?.tu_tieng_anh) return
    setPlayingAudio(giong)

    const audioUrl = dailyWordApi.layUrlPhatAm(currentWord.tu_tieng_anh, giong)
    const audio = new Audio(audioUrl)

    audio.onended = () => setPlayingAudio(null)
    audio.onerror = () => {
      try {
        const utterance = new SpeechSynthesisUtterance(currentWord.tu_tieng_anh)
        utterance.lang = giong === 'uk' ? 'en-GB' : 'en-US'
        utterance.rate = 0.85
        utterance.onend = () => setPlayingAudio(null)
        utterance.onerror = () => setPlayingAudio(null)
        window.speechSynthesis.speak(utterance)
      } catch {
        setPlayingAudio(null)
      }
    }

    audio.play().catch(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(currentWord.tu_tieng_anh)
        utterance.lang = giong === 'uk' ? 'en-GB' : 'en-US'
        utterance.rate = 0.85
        utterance.onend = () => setPlayingAudio(null)
        utterance.onerror = () => setPlayingAudio(null)
        window.speechSynthesis.speak(utterance)
      } catch {
        setPlayingAudio(null)
      }
    })
  }

  // Đánh giá flashcard: lưu mức ghi nhớ rồi CHUYỂN SANG THẺ TIẾP THEO.
  // Chỉ đóng popup khi thẻ hiện tại là thẻ CUỐI (đã duyệt hết bộ thẻ) —
  // đóng bằng X vẫn hoạt động ở bất kỳ lúc nào.
  async function handleRateWord(e: React.MouseEvent, mucDo: 'chua_thuoc' | 'tam_thuoc' | 'da_thuoc') {
    e.stopPropagation()
    if (user?.id && currentWord?.tu_vung_id) {
      try {
        await dailyWordApi.danhGiaFlashcard(user.id, currentWord.tu_vung_id, mucDo)
      } catch {
        // bỏ qua — vẫn chuyển thẻ kể cả khi API lỗi
      }
    }

    setIsFlipped(false)
    if (currentIndex >= words.length - 1) {
      // Đây là thẻ cuối → đóng popup (đã duyệt hết)
      markShownToday()
    } else {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  // Điều hướng lướt sang từ khác
  function handleNext(e?: React.MouseEvent) {
    e?.stopPropagation()
    if (words.length <= 1) return
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev + 1) % words.length)
  }

  function handlePrev(e?: React.MouseEvent) {
    e?.stopPropagation()
    if (words.length <= 1) return
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev - 1 + words.length) % words.length)
  }

  // Xử lý vuốt màn hình (Swipe gesture)
  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX)
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX - touchEndX
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext()
      } else {
        handlePrev()
      }
    }
    setTouchStartX(null)
  }

  // Đóng popup: ghi nhận từ hôm nay đã xem — trong ngày không hiện lại từ này.
  // Nếu admin đăng từ mới (ID khác) popup sẽ hiện thêm một lần nữa.
  function markShownToday() {
    const todayWordId = words.find((w) => w.la_tu_hom_nay)?.id ?? 'fallback'
    writeSeen(todayWordId)
    setIsOpen(false)
  }

  function handleClose() {
    markShownToday()
  }

  // Khi tắt là sẽ không thấy nữa
  if (!isOpen) {
    return null
  }

  return (
    <aside
      aria-label="Daily Word Flashcard"
      className="fixed top-16 right-4 sm:right-6 z-50 select-none animate-in fade-in slide-in-from-top-3 duration-300"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Khung thẻ Popup Flashcard 3D Flip */}
      <div className="relative w-[340px] sm:w-[365px]">
        {/* Nút tắt [X] nằm gọn góc trên cùng bên phải */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute -top-3 -right-2 z-20 flex size-7 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-400 shadow-md transition-all hover:bg-slate-100 hover:text-slate-800 hover:scale-105 active:scale-95 cursor-pointer"
          title="Đóng từ vựng"
        >
          <X className="size-3.5" />
        </button>

        {/* Nút lướt sang trái / phải khi có nhiều hơn 1 từ */}
        {words.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 flex size-7 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-500 shadow-md transition-all hover:bg-slate-100 hover:text-slate-900 hover:scale-105 active:scale-95 cursor-pointer"
              title="Từ trước đó"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 flex size-7 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-500 shadow-md transition-all hover:bg-slate-100 hover:text-slate-900 hover:scale-105 active:scale-95 cursor-pointer"
              title="Từ tiếp theo"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}

        {/* Container hiệu ứng 3D lật thẻ */}
        <div
          onClick={() => setIsFlipped((f) => !f)}
          style={{ perspective: '1200px' }}
          className="cursor-pointer"
        >
          <div
            style={{
              transformStyle: 'preserve-3d',
              transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
            className="relative min-h-[295px] w-full"
          >
            {/* ======================================================== */}
            {/* MẶT TRƯỚC (FRONT SIDE)                                  */}
            {/* ======================================================== */}
            <div
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
              className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
            >
              {/* Header: Nhãn MẶT TRƯỚC */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  MẶT TRƯỚC
                </span>
                {words.length > 1 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    {currentIndex + 1} / {words.length}
                  </span>
                )}
              </div>

              {/* Thân thẻ: Từ vựng nổi bật + Dấu chấm đỏ đặc trưng */}
              <div className="my-auto flex flex-col items-center text-center py-2">
                <div className="flex items-center justify-center">
                  <h2 className="text-3xl font-serif font-black tracking-tight text-slate-900">
                    {currentWord.tu_tieng_anh}
                  </h2>
                  <span className="ml-1 mb-4 size-2 rounded-full bg-brand-600 shadow-xs animate-pulse" />
                </div>

                {/* Từ loại pill */}
                <div className="mt-1">
                  <span className="inline-block rounded-full bg-red-50 px-3 py-0.5 text-[11px] font-bold text-brand-700 border border-brand-100/60">
                    {currentWord.tu_loai}
                  </span>
                </div>

                {/* Khung Phiên âm IPA + 2 nút phát âm US / UK hình tròn đỏ */}
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/50 px-3.5 py-1.5 shadow-2xs">
                  <span className="font-mono text-xs font-semibold text-slate-600">
                    {currentWord.phien_am_ipa}
                  </span>

                  {/* Nút phát âm US */}
                  <button
                    type="button"
                    onClick={(e) => handlePlayPronunciation(e, 'us')}
                    className={`flex size-6 items-center justify-center rounded-full text-white transition-all duration-150 active:scale-90 cursor-pointer ${
                      playingAudio === 'us' ? 'bg-brand-700 ring-2 ring-brand-200' : 'bg-brand-600 hover:bg-brand-700'
                    }`}
                    title="Phát âm chuẩn Mỹ (US)"
                  >
                    <Play className="size-2.5 fill-current ml-0.5" />
                  </button>
                  <span className="text-[10px] font-bold text-slate-700 mr-1">US</span>

                  {/* Nút phát âm UK */}
                  <button
                    type="button"
                    onClick={(e) => handlePlayPronunciation(e, 'uk')}
                    className={`flex size-6 items-center justify-center rounded-full text-white transition-all duration-150 active:scale-90 cursor-pointer ${
                      playingAudio === 'uk' ? 'bg-brand-700 ring-2 ring-brand-200' : 'bg-brand-600 hover:bg-brand-700'
                    }`}
                    title="Phát âm chuẩn Anh (UK)"
                  >
                    <Play className="size-2.5 fill-current ml-0.5" />
                  </button>
                  <span className="text-[10px] font-bold text-slate-700">UK</span>
                </div>

                <p className="mt-2 text-[10px] text-slate-400">
                  Chạm để nghe phát âm chuẩn • Click thẻ để lật
                </p>
              </div>

              {/* Footer thẻ: Thương hiệu YourEnglishVoice & Nhãn Từ hôm nay */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                <span className="text-slate-400 font-medium tracking-tight">YourEnglishVoice</span>
                <span className="font-extrabold text-brand-700 flex items-center gap-1">
                  {currentWord.la_tu_hom_nay ? (
                    <>
                      <Sparkles className="size-3 text-brand-600" />
                      <span>Từ hôm nay</span>
                    </>
                  ) : (
                    <span>Từ ôn tập</span>
                  )}
                </span>
              </div>
            </div>

            {/* ======================================================== */}
            {/* MẶT SAU (BACK SIDE)                                     */}
            {/* ======================================================== */}
            <div
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
              className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
            >
              {/* Header: Từ vựng + IPA + Nhãn MẶT SAU màu đỏ */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-serif font-black text-slate-900 text-sm">
                    {currentWord.tu_tieng_anh}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 font-medium">
                    {currentWord.phien_am_ipa}
                  </span>
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-600">
                  MẶT SAU
                </span>
              </div>

              {/* 3 Khối nội dung giải nghĩa chuẩn theo ảnh thiết kế */}
              <div className="my-auto space-y-2 py-1">
                {/* 1. Academic Definition */}
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-2 text-left">
                  <span className="block text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">
                    DEFINITION
                  </span>
                  <p className="mt-0.5 text-[11.5px] font-medium leading-tight text-slate-800">
                    {currentWord.dinh_nghia_tieng_anh}
                  </p>
                </div>

                {/* 2. Giải nghĩa Tiếng Việt */}
                <div className="rounded-xl border border-red-100 bg-red-50/20 p-2 text-left">
                  <span className="block text-[9.5px] font-extrabold uppercase tracking-wider text-brand-600">
                    GIẢI NGHĨA TIẾNG VIỆT
                  </span>
                  <p className="mt-0.5 text-[11.5px] font-bold leading-tight text-slate-900">
                    {currentWord.dinh_nghia_tieng_viet}
                  </p>
                </div>

                {/* 3. Ví dụ IELTS với viền đỏ bên trái */}
                <div className="rounded-r-xl border-l-3 border-brand-600 bg-slate-50/50 p-2 pl-2.5 text-left">
                  <span className="block text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500">
                    VÍ DỤ 
                  </span>
                  <p className="mt-0.5 text-[11px] leading-tight text-slate-700 italic">
                    {highlightKeyword(currentWord.vi_du_tieng_anh, currentWord.tu_tieng_anh)}
                  </p>
                </div>
              </div>

              {/* Footer: 3 nút đánh giá Spaced Repetition (🔴 Chưa nhớ, 🟡 Tạm nhớ, 🟢 Thuộc) */}
              <div className="border-t border-slate-100 pt-2">
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => handleRateWord(e, 'chua_thuoc')}
                    className="inline-flex h-6.5 items-center justify-center gap-1 rounded-md border border-red-200 bg-transparent px-1.5 text-[10px] font-medium text-red-600 transition-colors duration-150 hover:border-red-300 hover:bg-red-50/30 active:scale-95 cursor-pointer whitespace-nowrap"
                    title="Xếp vào vị trí ôn tập thứ 3"
                  >
                    <span className="size-1.5 rounded-full bg-red-500" />
                    <span className="inline-block scale-[0.7]">Chưa nhớ</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleRateWord(e, 'tam_thuoc')}
                    className="inline-flex h-6.5 items-center justify-center gap-1 rounded-md border border-amber-200 bg-transparent px-1.5 text-[10px] font-medium text-amber-600 transition-colors duration-150 hover:border-amber-300 hover:bg-amber-50/30 active:scale-95 cursor-pointer whitespace-nowrap"
                    title="Xếp vào vị trí ôn tập thứ 7"
                  >
                    <span className="size-1.5 rounded-full bg-amber-500" />
                    <span className="inline-block scale-[0.7]">Tạm nhớ</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleRateWord(e, 'da_thuoc')}
                    className="inline-flex h-6.5 items-center justify-center gap-1 rounded-md border border-emerald-200 bg-transparent px-1.5 text-[10px] font-medium text-emerald-600 transition-colors duration-150 hover:border-emerald-300 hover:bg-emerald-50/30 active:scale-95 cursor-pointer whitespace-nowrap"
                    title="Đã thành thạo từ vựng này"
                  >
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span className="inline-block scale-[0.7]">Thuộc</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default StudentDailyWordPopup
