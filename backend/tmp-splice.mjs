import { readFileSync, writeFileSync } from 'node:fs'

const path = 'src/pages/courses/StudentCourseDetailPage.tsx'
const lines = readFileSync(path, 'utf8').split('\n')

// Tìm dòng bắt đầu: chứa "{isExerciseOpen && ("
const startIdx = lines.findIndex((l) => l.includes('{isExerciseOpen && ('))
if (startIdx === -1) {
  console.error('Không tìm thấy dòng bắt đầu popup')
  process.exit(1)
}

// Tìm dòng kết thúc: dòng `)}` đóng biểu thức (độ thụt lề 16 spaces)
let endIdx = -1
for (let i = startIdx + 1; i < lines.length; i++) {
  if (lines[i].trim() === ')}') {
    endIdx = i
    break
  }
}
if (endIdx === -1) {
  console.error('Không tìm thấy dòng kết thúc popup')
  process.exit(1)
}

console.log(`Thay lines ${startIdx + 1}..${endIdx + 1}`)

const newBlock = [
  '                {isExerciseOpen && currentQuiz && (',
  '                  <StudentQuizOverlay',
  '                    questions={currentQuiz.questions}',
  '                    lessonTitle={currentLessonItem?.title ?? \'\'}',
  '                    onClose={() => setIsExerciseOpen(false)}',
  '                    onSubmit={async (answers) => {',
  '                      const result = await lessonApi.submitQuiz(',
  '                        activeLessonId,',
  '                        answers,',
  '                        accessToken,',
  '                        async () => (await refreshSession()).accessToken,',
  '                      )',
  '                      return result',
  '                    }}',
  '                    onPassed={() => {',
  '                      const completedLessonId = currentLessonItem?.id',
  '                      const dur =',
  '                        trackerRef.current.getDuration() ||',
  '                        currentLessonItem?.durationSeconds ||',
  '                        videoDuration ||',
  '                        0',
  '                      const finalPosition = Math.floor(',
  '                        Math.max(',
  '                          trackerRef.current.getLessonId() === completedLessonId',
  '                            ? trackerRef.current.getLastValidTime()',
  '                            : currentLessonItem?.lastPositionSeconds ?? 0,',
  '                          dur',
  '                        )',
  '                      )',
  '                      if (completedLessonId) {',
  '                        if (trackerRef.current.getLessonId() === completedLessonId) {',
  '                          trackerRef.current.markLessonCompleted()',
  '                        }',
  '                        setIsExerciseOpen(false)',
  '                        setVideoCompletedByLesson((prev) => ({ ...prev, [completedLessonId]: true }))',
  '                        setVideoWatchedPercent(100)',
  '                        setLessonsList((prev) =>',
  '                          prev.map((item) =>',
  '                            item.id === completedLessonId',
  '                              ? { ...item, status: \'completed\', progressPercent: 100, lastPositionSeconds: finalPosition }',
  '                              : item,',
  '                          ),',
  '                        )',
  '                        void handleUpdateProgress(',
  '                          completedLessonId,',
  '                          finalPosition,',
  '                          100,',
  '                          true,',
  '                          dur > 0 ? dur : undefined,',
  '                          false,',
  '                        )',
  '                        showToast(\'🎉 Chính xác! Bạn đã hoàn thành bài học.\')',
  '                      }',
  '                    }}',
  '                    onFailed={(message) => showToast(message)}',
  '                  />',
  '                )}',
]

lines.splice(startIdx, endIdx - startIdx + 1, ...newBlock)
writeFileSync(path, lines.join('\n'))
console.log('Splice xong')
