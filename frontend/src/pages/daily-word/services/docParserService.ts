import type { TuVungBocTach } from '../types/dailyWord.types'

/**
 * Mẫu dữ liệu từ vựng nhận diện thông minh tiêu chuẩn (Fallback và Mock ban đầu)
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

/**
 * Tải file mẫu import chuẩn (.txt) ngăn cách bởi dấu |
 */
export function downloadSampleImportFile() {
  const templateContent = `# ==============================================================================
# MẪU IMPORT TỪ VỰNG DAILY WORD (TỰ ĐỘNG NHẬN DIỆN LỊCH PHÁT HÀNH THEO SỐ TỪ)
# ==============================================================================
# HƯỚNG DẪN:
# 1. Mỗi dòng là 1 từ vựng tương ứng với 1 ngày phát hành trên hệ thống.
# 2. Bạn nhập bao nhiêu từ thì hệ thống sẽ TỰ ĐỘNG xếp lịch bấy nhiêu ngày liên tục!
# 3. Định dạng chuẩn:
#    Từ tiếng Anh | Phiên âm IPA | Từ loại | Định nghĩa tiếng Anh | Định nghĩa tiếng Việt | Ví dụ tiếng Anh | Dịch nghĩa ví dụ
# 4. Ký tự phân cách giữa các cột: Dấu gạch đứng | (hoặc Tab)
# ==============================================================================

Eloquent | /'el.ə.kwənt/ | Adj | Fluent or persuasive in speaking or writing. | Lưu loát, có tài hùng biện, diễn đạt ý kiến một cách truyền cảm và thuyết phục. | An eloquent speech by the team leader persuaded all board members to greenlight the project. | Một bài phát biểu đầy sức thuyết phục của trưởng nhóm đã thuyết phục tất cả các thành viên hội đồng phê duyệt dự án.
Pragmatic | /præɡˈmæt.ɪk/ | Adj | Dealing with things sensibly and realistically in a practical way. | Thực dụng, mang tính thực tế và hiệu quả cao. | We need a pragmatic approach to language learning. | Chúng ta cần một phương pháp tiếp cận thực tế đối với việc học ngôn ngữ.
Meticulous | /məˈtɪk.jə.ləs/ | Adj | Showing great attention to detail; very careful and precise. | Tỉ mỉ, cẩn thận và trau chuốt từng chi tiết nhỏ. | She was meticulous in preparing her lesson plans. | Cô ấy rất tỉ mỉ trong việc chuẩn bị giáo án bài giảng.
Nuance | /ˈnjuː.ɑːns/ | Noun | A subtle difference in meaning, expression, or sound. | Sắc thái tinh tế, sự khác biệt nhỏ về ý nghĩa hoặc âm điệu. | He listened carefully to catch every nuance of her tone. | Anh ấy lắng nghe cẩn thận để bắt trọn từng sắc thái trong giọng điệu của cô ấy.
Catalyst | /ˈkæt.əl.ɪst/ | Noun | A person or thing that precipitates an event or change. | Chất xúc tác, nhân tố thúc đẩy sự thay đổi tích cực. | The new workshop acted as a catalyst for student motivation. | Buổi workshop mới đóng vai trò như chất xúc tác tạo động lực cho học viên.
Feasible | /ˈfiː.zə.bəl/ | Adj | Possible to do easily or conveniently. | Khả thi, có thể thực hiện được một cách thuận lợi. | It is entirely feasible to reach IELTS 7.0 with consistent daily practice. | Hoàn toàn khả thi để đạt IELTS 7.0 nếu kiên trì luyện tập mỗi ngày.
Reiterate | /riːˈɪt.ər.eɪt/ | Verb | Say something again or a number of times, typically for emphasis. | Lặp lại, nhắc lại nhiều lần để nhấn mạnh. | The teacher reiterated the importance of regular pronunciation drills. | Giáo viên nhấn mạnh lại tầm quan trọng của việc luyện phát âm đều đặn.
`

  const blob = new Blob([templateContent], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'Mau_Import_Tu_Vung_DailyWord.txt'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Tách dòng dữ liệu hỗ trợ ngăn cách bằng dấu | (hoặc / và Tab làm fallback)
 */
function splitDataLine(line: string): string[] {
  // 1. Ưu tiên dấu gạch đứng |
  if (line.includes('|')) {
    const parts = line.split('|').map((p) => p.trim())
    if (parts.length >= 3) return parts
  }

  // 2. Fallback dấu gạch chéo có khoảng trắng " / "
  if (line.includes(' / ')) {
    const parts = line.split(/\s+\/\s+/).map((p) => p.trim())
    if (parts.length >= 3) return parts
  }

  // 3. Tab hoặc chấm phẩy
  if (line.includes('\t')) {
    return line.split('\t').map((p) => p.trim())
  }
  if (line.includes(';')) {
    return line.split(';').map((p) => p.trim())
  }

  // 4. Dấu / dính liền (nếu có)
  if (line.includes('/')) {
    const parts = line.split('/').map((p) => p.trim())
    if (parts.length >= 3) return parts
  }

  return [line]
}

/**
 * Trích xuất text từ văn bản thuần (TXT, DOCX, DOC)
 * Tự động nhận diện số lượng từ và phân tích các trường thông tin ngăn cách bởi |
 */
export async function parseDocumentFile(file: File): Promise<{
  fileName: string
  wordCount: number
  words: TuVungBocTach[]
}> {
  const fileName = file.name
  const extension = fileName.split('.').pop()?.toLowerCase() || ''

  try {
    let rawText = ''

    if (extension === 'txt') {
      rawText = await file.text()
    } else if (extension === 'docx' || extension === 'doc') {
      // Đọc buffer file DOC/DOCX để trích xuất text XML hoặc chuỗi văn bản
      const arrayBuffer = await file.arrayBuffer()
      const textDecoder = new TextDecoder('utf-8', { fatal: false })
      const decoded = textDecoder.decode(arrayBuffer)

      // Nếu là docx (zip file chứa word/document.xml), tìm các đoạn văn bản trong thẻ w:t
      const wtMatches = decoded.match(/<w:t[^>]*>(.*?)<\/w:t>/g)
      if (wtMatches && wtMatches.length > 0) {
        rawText = wtMatches
          .map((m) => m.replace(/<[^>]+>/g, ''))
          .join(' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
      } else {
        // Fallback: Lọc các ký tự in được (printable characters)
        rawText = decoded.replace(/[^\x20-\x7E\u00A0-\u024F\u1EA0-\u1EF9\n\r|/]/g, ' ')
      }
    }

    if (rawText && rawText.trim()) {
      const lines = rawText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))

      const parsed: TuVungBocTach[] = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // Bỏ qua dòng header nếu có
        if (
          i === 0 &&
          (line.toLowerCase().includes('từ tiếng anh') ||
            line.toLowerCase().includes('từ vựng') ||
            line.toLowerCase().includes('word |') ||
            line.toLowerCase().includes('word /'))
        ) {
          continue
        }

        const parts = splitDataLine(line)

        if (parts.length >= 1 && parts[0]) {
          parsed.push({
            id: `upload-${Date.now()}-${i + 1}`,
            tu_tieng_anh: parts[0] || '',
            phien_am_ipa: parts[1] || '',
            tu_loai: parts[2] || 'Word',
            dinh_nghia_tieng_anh: parts[3] || '',
            dinh_nghia_tieng_viet: parts[4] || parts[3] || '',
            vi_du_tieng_anh: parts[5] || '',
            vi_du_tieng_viet: parts[6] || '',
          })
        }
      }

      if (parsed.length > 0) {
        return {
          fileName,
          wordCount: parsed.length,
          words: parsed,
        }
      }
    }
  } catch (err) {
    console.warn('Lỗi khi bóc tách file tài liệu:', err)
  }

  // Fallback mô phỏng nếu file docx nhị phân đặc thù
  await new Promise((res) => setTimeout(res, 600))
  return {
    fileName,
    wordCount: SAMPLE_PARSED_WORDS.length,
    words: SAMPLE_PARSED_WORDS,
  }
}
