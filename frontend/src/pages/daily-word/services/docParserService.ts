import * as XLSX from 'xlsx'
import type { TuVungBocTach } from '../types/dailyWord.types'

/**
 * Mẫu dữ liệu từ vựng chuẩn (dùng để xuất file Excel mẫu)
 */
export const SAMPLE_PARSED_WORDS: TuVungBocTach[] = [
  {
    id: 'parse-1',
    tu_tieng_anh: 'Eloquent',
    phien_am_ipa: "/'el.ə.kwənt/",
    tu_loai: 'Adj',
    dinh_nghia_tieng_anh: 'Fluent or persuasive in speaking or writing.',
    dinh_nghia_tieng_viet: 'Lưu loát, có tài hùng biện, diễn đạt ý kiến một cách truyền cảm và thuyết phục.',
    vi_du_tieng_anh: 'An eloquent speech by the team leader persuaded all board members to greenlight the project.',
    vi_du_tieng_viet: 'Một bài phát biểu đầy sức thuyết phục của trưởng nhóm đã thuyết phục tất cả các thành viên hội đồng phê duyệt dự án.',
  },
  {
    id: 'parse-2',
    tu_tieng_anh: 'Pragmatic',
    phien_am_ipa: '/præɡˈmæt.ɪk/',
    tu_loai: 'Adj',
    dinh_nghia_tieng_anh: 'Dealing with things sensibly and realistically in a practical way.',
    dinh_nghia_tieng_viet: 'Thực dụng, mang tính thực tế và hiệu quả cao.',
    vi_du_tieng_anh: 'We need a pragmatic approach to language learning.',
    vi_du_tieng_viet: 'Chúng ta cần một phương pháp tiếp cận thực tế đối với việc học ngôn ngữ.',
  },
  {
    id: 'parse-3',
    tu_tieng_anh: 'Meticulous',
    phien_am_ipa: '/məˈtɪk.jə.ləs/',
    tu_loai: 'Adj',
    dinh_nghia_tieng_anh: 'Showing great attention to detail; very careful and precise.',
    dinh_nghia_tieng_viet: 'Tỉ mỉ, cẩn thận và trau chuốt từng chi tiết nhỏ.',
    vi_du_tieng_anh: 'She was meticulous in preparing her lesson plans.',
    vi_du_tieng_viet: 'Cô ấy rất tỉ mỉ trong việc chuẩn bị giáo án bài giảng.',
  },
  {
    id: 'parse-4',
    tu_tieng_anh: 'Nuance',
    phien_am_ipa: '/ˈnjuː.ɑːns/',
    tu_loai: 'Noun',
    dinh_nghia_tieng_anh: 'A subtle difference in meaning, expression, or sound.',
    dinh_nghia_tieng_viet: 'Sắc thái tinh tế, sự khác biệt nhỏ về ý nghĩa hoặc âm điệu.',
    vi_du_tieng_anh: 'He listened carefully to catch every nuance of her tone.',
    vi_du_tieng_viet: 'Anh ấy lắng nghe cẩn thận để bắt trọn từng sắc thái trong giọng điệu của cô ấy.',
  },
  {
    id: 'parse-5',
    tu_tieng_anh: 'Catalyst',
    phien_am_ipa: '/ˈkæt.əl.ɪst/',
    tu_loai: 'Noun',
    dinh_nghia_tieng_anh: 'A person or thing that precipitates an event or change.',
    dinh_nghia_tieng_viet: 'Chất xúc tác, nhân tố thúc đẩy sự thay đổi tích cực.',
    vi_du_tieng_anh: 'The new workshop acted as a catalyst for student motivation.',
    vi_du_tieng_viet: 'Buổi workshop mới đóng vai trò như chất xúc tác tạo động lực cho học viên.',
  },
  {
    id: 'parse-6',
    tu_tieng_anh: 'Feasible',
    phien_am_ipa: '/ˈfiː.zə.bəl/',
    tu_loai: 'Adj',
    dinh_nghia_tieng_anh: 'Possible to do easily or conveniently.',
    dinh_nghia_tieng_viet: 'Khả thi, có thể thực hiện được một cách thuận lợi.',
    vi_du_tieng_anh: 'It is entirely feasible to reach IELTS 7.0 with consistent daily practice.',
    vi_du_tieng_viet: 'Hoàn toàn khả thi để đạt IELTS 7.0 nếu kiên trì luyện tập mỗi ngày.',
  },
  {
    id: 'parse-7',
    tu_tieng_anh: 'Reiterate',
    phien_am_ipa: '/riːˈɪt.ər.eɪt/',
    tu_loai: 'Verb',
    dinh_nghia_tieng_anh: 'Say something again or a number of times, typically for emphasis.',
    dinh_nghia_tieng_viet: 'Lặp lại, nhắc lại nhiều lần để nhấn mạnh.',
    vi_du_tieng_anh: 'The teacher reiterated the importance of regular pronunciation drills.',
    vi_du_tieng_viet: 'Giáo viên nhấn mạnh lại tầm quan trọng của việc luyện phát âm đều đặn.',
  },
  {
    id: 'parse-8',
    tu_tieng_anh: 'Empirical',
    phien_am_ipa: '/ɪmˈpɪr.ɪ.kəl/',
    tu_loai: 'Adj',
    dinh_nghia_tieng_anh: 'Based on, concerned with, or verifiable by observation or experience.',
    dinh_nghia_tieng_viet: 'Mang tính thực nghiệm, dựa trên quan sát và trải nghiệm thực tế.',
    vi_du_tieng_anh: 'There is strong empirical evidence that spaced repetition boosts recall.',
    vi_du_tieng_viet: 'Có bằng chứng thực nghiệm rõ ràng cho thấy lặp lại ngắt quãng giúp tăng cường trí nhớ.',
  },
  {
    id: 'parse-9',
    tu_tieng_anh: 'Discrepancy',
    phien_am_ipa: '/dɪˈskrep.ən.si/',
    tu_loai: 'Noun',
    dinh_nghia_tieng_anh: 'A lack of compatibility or similarity between two or more facts.',
    dinh_nghia_tieng_viet: 'Sự khác biệt, sai lệch hoặc bất đồng.',
    vi_du_tieng_anh: 'The discrepancy between British and American spelling is explained clearly.',
    vi_du_tieng_viet: 'Sự khác biệt giữa chính tả Anh - Anh và Anh - Mỹ được giải thích rõ ràng.',
  },
  {
    id: 'parse-10',
    tu_tieng_anh: 'Synthesize',
    phien_am_ipa: '/ˈsɪn.θə.saɪz/',
    tu_loai: 'Verb',
    dinh_nghia_tieng_anh: 'Combine a number of things into a coherent whole.',
    dinh_nghia_tieng_viet: 'Tổng hợp, kết hợp nhiều yếu tố thành một thể thống nhất.',
    vi_du_tieng_anh: 'Students learn to synthesize information from various listening passages.',
    vi_du_tieng_viet: 'Học viên học cách tổng hợp thông tin từ nhiều đoạn nghe khác nhau.',
  },
  {
    id: 'parse-11',
    tu_tieng_anh: 'Viable',
    phien_am_ipa: '/ˈvaɪ.ə.bəl/',
    tu_loai: 'Adj',
    dinh_nghia_tieng_anh: 'Capable of working successfully; feasible.',
    dinh_nghia_tieng_viet: 'Khả thi, có khả năng tồn tại và phát triển tốt.',
    vi_du_tieng_anh: 'Daily vocabulary flashcards offer a viable solution for busy learners.',
    vi_du_tieng_viet: 'Flashcard từ vựng mỗi ngày mang đến giải pháp khả thi cho người học bận rộn.',
  },
  {
    id: 'parse-12',
    tu_tieng_anh: 'Substantiate',
    phien_am_ipa: '/səbˈstæn.ʃi.eɪt/',
    tu_loai: 'Verb',
    dinh_nghia_tieng_anh: 'Provide evidence to support or prove the truth of.',
    dinh_nghia_tieng_viet: 'Chứng minh, củng cố tính xác thực bằng dẫn chứng cụ thể.',
    vi_du_tieng_anh: 'You should substantiate your Writing Task 2 arguments with examples.',
    vi_du_tieng_viet: 'Bạn nên chứng minh các lập luận trong bài Writing Task 2 bằng ví dụ cụ thể.',
  },
]

const EXCEL_HEADERS = [
  'Từ tiếng Anh',
  'Phiên âm IPA',
  'Từ loại',
  'Định nghĩa tiếng Anh',
  'Định nghĩa tiếng Việt',
  'Ví dụ tiếng Anh',
  'Dịch nghĩa ví dụ',
] as const

const SUPPORTED_EXCEL_EXTENSIONS = new Set(['xlsx', 'xls', 'csv'])

type ColumnFieldKey = keyof Omit<TuVungBocTach, 'id'>

const HEADER_ALIASES: Record<ColumnFieldKey, string[]> = {
  tu_tieng_anh: ['từ tiếng anh', 'tu tieng anh', 'từ vựng', 'tu vung', 'word', 'vocabulary'],
  phien_am_ipa: ['phiên âm ipa', 'phien am ipa', 'phiên âm', 'phien am', 'ipa'],
  tu_loai: ['từ loại', 'tu loai', 'loại từ', 'loai tu', 'pos', 'part of speech', 'type'],
  dinh_nghia_tieng_anh: ['định nghĩa tiếng anh', 'dinh nghia tieng anh', 'english definition', 'meaning en'],
  dinh_nghia_tieng_viet: [
    'định nghĩa tiếng việt',
    'dinh nghia tieng viet',
    'giải nghĩa tiếng việt',
    'giai nghia tieng viet',
    'giải nghĩa',
    'nghĩa tiếng việt',
    'nghia',
  ],
  vi_du_tieng_anh: ['ví dụ tiếng anh', 'vi du tieng anh', 'ví dụ thực tế', 'ví dụ', 'example', 'example en'],
  vi_du_tieng_viet: ['dịch nghĩa ví dụ', 'dich nghia vi du', 'dịch ví dụ', 'dich vi du', 'ví dụ tiếng việt', 'example vi'],
}

/**
 * Tải file mẫu import chuẩn Excel (.xlsx)
 */
export function downloadSampleImportFile() {
  const sampleRows = SAMPLE_PARSED_WORDS.slice(0, 7).map((item) => [
    item.tu_tieng_anh,
    item.phien_am_ipa,
    item.tu_loai,
    item.dinh_nghia_tieng_anh,
    item.dinh_nghia_tieng_viet,
    item.vi_du_tieng_anh,
    item.vi_du_tieng_viet,
  ])

  const worksheet = XLSX.utils.aoa_to_sheet([[...EXCEL_HEADERS], ...sampleRows])
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 18 },
    { wch: 10 },
    { wch: 44 },
    { wch: 48 },
    { wch: 52 },
    { wch: 52 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DailyWord')
  XLSX.writeFile(workbook, 'Mau_Import_Tu_Vung_DailyWord.xlsx')
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeHeaderText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function matchHeaderField(headerText: string): ColumnFieldKey | null {
  const normalized = normalizeHeaderText(headerText)
  if (!normalized) return null

  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<[ColumnFieldKey, string[]]>) {
    if (aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
      return field
    }
  }
  return null
}

function detectColumnMapping(firstRow: string[]): {
  hasHeader: boolean
  colIndex: Record<ColumnFieldKey, number>
} {
  const defaultMapping: Record<ColumnFieldKey, number> = {
    tu_tieng_anh: 0,
    phien_am_ipa: 1,
    tu_loai: 2,
    dinh_nghia_tieng_anh: 3,
    dinh_nghia_tieng_viet: 4,
    vi_du_tieng_anh: 5,
    vi_du_tieng_viet: 6,
  }

  const detected: Partial<Record<ColumnFieldKey, number>> = {}
  let matchedCount = 0

  firstRow.forEach((cell, index) => {
    const field = matchHeaderField(cell)
    if (field && detected[field] === undefined) {
      detected[field] = index
      matchedCount += 1
    }
  })

  // Xem là dòng tiêu đề nếu khớp ít nhất 2 cột chuẩn hoặc cột đầu khớp tiêu đề Từ tiếng Anh
  const isHeaderRow = matchedCount >= 2 || detected.tu_tieng_anh !== undefined

  if (!isHeaderRow) {
    return { hasHeader: false, colIndex: defaultMapping }
  }

  return {
    hasHeader: true,
    colIndex: {
      ...defaultMapping,
      ...detected,
    },
  }
}

/**
 * Đọc và bóc tách danh sách từ vựng từ file Excel (.xlsx, .xls) hoặc CSV (.csv).
 */
export async function parseDocumentFile(file: File): Promise<{
  fileName: string
  wordCount: number
  words: TuVungBocTach[]
}> {
  const fileName = file.name
  const extension = fileName.split('.').pop()?.toLowerCase() || ''

  if (!SUPPORTED_EXCEL_EXTENSIONS.has(extension)) {
    throw new Error(
      `Định dạng tệp ".${extension || 'không xác định'}" không được hỗ trợ. Vui lòng chọn tệp Excel (.xlsx, .xls) hoặc .csv.`
    )
  }

  let workbook: XLSX.WorkBook
  try {
    if (extension === 'csv') {
      // Đọc text UTF-8 trước để tránh lỗi font tiếng Việt khi file CSV không có BOM
      const csvText = await file.text()
      workbook = XLSX.read(csvText, { type: 'string' })
    } else {
      const arrayBuffer = await file.arrayBuffer()
      workbook = XLSX.read(arrayBuffer, { type: 'array' })
    }
  } catch {
    throw new Error('Không thể đọc tệp Excel/CSV. Vui lòng kiểm tra tệp không bị hỏng hoặc đặt mật khẩu.')
  }

  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    throw new Error('Tệp Excel không có sheet dữ liệu nào.')
  }

  const sheet = workbook.Sheets[firstSheetName]
  if (!sheet) {
    throw new Error('Không thể truy cập dữ liệu từ sheet đầu tiên trong tệp.')
  }

  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  })

  const rows = rawRows
    .map((row) => row.map(normalizeCell))
    .filter((row) => row.some((cell) => cell !== ''))

  if (rows.length === 0) {
    throw new Error('Tệp không có dữ liệu. Vui lòng điền từ vựng theo file mẫu Excel.')
  }

  const { hasHeader, colIndex } = detectColumnMapping(rows[0] ?? [])
  const dataRows = hasHeader ? rows.slice(1) : rows

  const parsed: TuVungBocTach[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] ?? []
    const word = row[colIndex.tu_tieng_anh] ?? ''
    if (!word || word.startsWith('#')) continue

    const englishDef = row[colIndex.dinh_nghia_tieng_anh] ?? ''
    const vietnameseDef = row[colIndex.dinh_nghia_tieng_viet] ?? ''

    parsed.push({
      id: `upload-${Date.now()}-${i + 1}`,
      tu_tieng_anh: word,
      phien_am_ipa: row[colIndex.phien_am_ipa] ?? '',
      tu_loai: row[colIndex.tu_loai] || 'Word',
      dinh_nghia_tieng_anh: englishDef,
      dinh_nghia_tieng_viet: vietnameseDef || englishDef,
      vi_du_tieng_anh: row[colIndex.vi_du_tieng_anh] ?? '',
      vi_du_tieng_viet: row[colIndex.vi_du_tieng_viet] ?? '',
    })
  }

  if (parsed.length === 0) {
    throw new Error('Không tìm thấy từ vựng hợp lệ nào ở cột "Từ tiếng Anh". Vui lòng kiểm tra lại theo file mẫu.')
  }

  return {
    fileName,
    wordCount: parsed.length,
    words: parsed,
  }
}
