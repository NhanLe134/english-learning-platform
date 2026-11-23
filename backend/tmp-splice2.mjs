import { readFileSync, writeFileSync } from 'node:fs'

const path = 'src/pages/courses/StudentCourseDetailPage.tsx'
const lines = readFileSync(path, 'utf8').split('\n')

// Tìm dòng bắt đầu popup: chứa 'Exercise Popup Overlay over video container'
const startIdx = lines.findIndex((l) => l.includes('Exercise Popup Overlay over video container'))
if (startIdx === -1) {
  console.error('Không tìm thấy popup start')
  process.exit(1)
}
// startIdx trỏ tới comment — popup thật bắt đầu từ dòng {isExerciseOpen && ( phía sau
let openIdx = startIdx
for (let i = startIdx; i < lines.length; i++) {
  if (lines[i].includes('{isExerciseOpen && (')) {
    openIdx = i
    break
  }
}

// Tìm dòng kết thúc: `)}` đóng popup — dòng đầu tiên sau openIdx mà trim = ')}'
let endIdx = -1
for (let i = openIdx + 1; i < lines.length; i++) {
  if (lines[i].trim() === ')}') {
    endIdx = i
    break
  }
}
if (endIdx === -1) {
  console.error('Không tìm thấy popup end')
  process.exit(1)
}

console.log(`Thay lines ${openIdx + 1}..${endIdx + 1}`)

const newBlock = [
  '                {/* Quiz popup — nhỏ, căn giữa màn hình video */}',
  '                {isExerciseOpen && (',
  '                  <div',
  '                    className="absolute inset-0 z-40 flex items-center justify-center bg-ink-900/60 p-4"',
  '                  >',
  '                    <div className="w-[min(94%,560px)] max-h-full overflow-y-auto rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">',
  '                      {/* Header gọn */}',
  '                      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">',
  '                        <span className="text-xs font-extrabold uppercase tracking-wider text-brand-600">',
  '                          Câu hỏi {currentQuestionIndex + 1}/{currentLessonExercise.totalQuestions}',
  '                        </span>',
  '                        <button',
  '                          type="button"',
  '                          onClick={() => setIsExerciseOpen(false)}',
  '                          className="flex size-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink-900 cursor-pointer"',
  '                          aria-label="Đóng quiz"',
  '                        >',
  '                          <X size={15} />',
  '                        </button>',
  '                      </div>',
  '',
  '                      {/* Câu hỏi + 4 đáp án */}',
  '                      <div className="px-5 py-4">',
  '                        <p className="text-sm font-bold leading-snug text-ink-900">',
  '                          {currentQuestion.questionText}',
  '                        </p>',
  '                        <div className="mt-3 flex flex-col gap-2">',
  '                          {currentQuestion.options.map((option) => {',
  '                            const isSelected = selectedAnswers[currentQuestionIndex] === option.id',
  '                            return (',
  '                              <button',
  '                                key={option.id}',
  '                                type="button"',
  '                                onClick={() => handleSelectOption(option.id)}',
  '                                className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-xs transition-all cursor-pointer ${',
  "                                  isSelected ? 'border-brand-600 bg-brand-50 font-semibold text-ink-900' : 'border-slate-200 bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50/40'",
  '                                }`',
  '                              >',
  '                                <span',
  '                                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${',
  "                                    isSelected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-500'",
  '                                  }`',
  '                                >',
  '                                  {option.label}',
  '                                </span>',
  '                                <span className="flex-1">{option.text}</span>',
  '                              </button>',
  '                            )',
  '                          })}',
  '                        </div>',
  '',
  '                        {/* Điều hướng + Nộp bài */}',
  '                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">',
  '                          <button',
  '                            type="button"',
  '                            disabled={currentQuestionIndex === 0}',
  '                            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}',
  '                            className="rounded-lg border border-slate-200/90 bg-white px-3 text-[11.5px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 cursor-pointer"',
  '                          >',
  '                            ← Câu trước',
  '                          </button>',
  '                          {currentQuestionIndex < currentLessonExercise.questions.length - 1 ? (',
  '                            <button',
  '                              type="button"',
  '                              disabled={!selectedAnswers[currentQuestionIndex]}',
  '                              onClick={() => setCurrentQuestionIndex((prev) => Math.min(currentLessonExercise.questions.length - 1, prev + 1))}',
  '                              className="rounded-lg bg-brand-600 px-4 py-2 text-[11.5px] font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-40 cursor-pointer"',
  '                            >',
  '                              Câu tiếp theo →',
  '                            </button>',
  '                          ) : (',
  '                            <button',
  '                              type="button"',
  '                              disabled={!selectedAnswers[currentQuestionIndex] || grading}',
  '                              onClick={() => void handleSubmitQuiz()}',
  '                              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-2 text-[11.5px] font-bold text-white shadow-[0_2px_8px_rgba(246,0,5,0.25)] transition-all hover:-translate-y-0.5 disabled:opacity-40 cursor-pointer"',
  '                            >',
  '                              {grading ? (',
  '                                <LoaderCircle size={13} className="animate-spin" />',
  '                              ) : (',
  '                                <Check size={13} />',
  '                              )}',
  '                              Nộp bài',
  '                            </button>',
  '                          )}',
  '                        </div>',
  '                      </div>',
  '                    </div>',
  '                  </div>',
  '                )}',
]

lines.splice(openIdx, endIdx - openIdx + 1, ...newBlock)
writeFileSync(path, lines.join('\n'))
console.log('Splice xong')
