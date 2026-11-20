import React, { useEffect, useState } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  User,
  BookOpen,
  ArrowLeft,
  Download,
  FileText,
  FileAudio,
  Check,
} from 'lucide-react'
import { StudentHeader } from './components/StudentHeader'
import { CURRENT_STUDENT } from './student-courses-data'
import {
  STUDENT_COURSE_DETAIL,
  type LessonItem,
  type QuizQuestion,
} from './student-course-detail-data'
import './student-course-detail.css'

interface StudentCourseDetailPageProps {
  courseSlug?: string
}

export const StudentCourseDetailPage: React.FC<StudentCourseDetailPageProps> = ({
  courseSlug: _courseSlug,
}) => {
  const courseData = STUDENT_COURSE_DETAIL
  const videoDurationSeconds = 18 * 60 + 45
  const quizStartSeconds = Math.floor(videoDurationSeconds * 0.9)

  // Interactive UI states
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoSeconds, setVideoSeconds] = useState(0)
  const [showQuizPopup, setShowQuizPopup] = useState(false)
  const [lessonCompleted, setLessonCompleted] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [bilingualSubtitles, setBilingualSubtitles] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState<'1.0x' | '1.25x' | '1.5x'>('1.0x')

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({})
  const [answeredQuestions, setAnsweredQuestions] = useState(0)
  const [quizFeedback, setQuizFeedback] = useState<{
    kind: 'correct' | 'incorrect'
    message: string
    action: 'next' | 'complete' | 'restart'
  } | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<'objectives' | 'attachments'>('objectives')

  // Lesson sidebar state
  const [activeLessonId, setActiveLessonId] = useState<string>('lesson-4')
  const [lessonsList, setLessonsList] = useState<LessonItem[]>(courseData.lessons)
  const completedLessons = lessonsList.filter((lesson) => lesson.status === 'completed').length
  const progressLessonCount = Math.min(
    courseData.totalLessons,
    completedLessons + (lessonCompleted ? 0 : 1)
  )
  const overallProgressPercent = lessonCompleted
    ? Math.round((completedLessons / courseData.totalLessons) * 10000) / 100
    : courseData.overallProgressPercent

  useEffect(() => {
    if (!isPlaying || showQuizPopup || lessonCompleted) return
    const timer = window.setInterval(() => {
      const nextSeconds = Math.min(videoSeconds + 1, videoDurationSeconds)
      setVideoSeconds(nextSeconds)
      if (nextSeconds >= quizStartSeconds) {
        setIsPlaying(false)
        setShowQuizPopup(true)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isPlaying, lessonCompleted, quizStartSeconds, showQuizPopup, videoDurationSeconds, videoSeconds])

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const currentQuestion: QuizQuestion =
    courseData.quiz.questions[currentQuestionIndex] ?? courseData.quiz.questions[0]!

  const handleSelectOption = (optionId: string) => {
    if (quizFeedback) return
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: optionId,
    }))
  }

  const handleCheckAnswer = () => {
    if (quizFeedback) return
    const answer = selectedAnswers[currentQuestionIndex]
    if (!answer) {
      showToast('Vui lòng chọn một đáp án trước khi kiểm tra.')
      return
    }
    if (answer !== currentQuestion.correctOptionId) {
      setQuizFeedback({
        kind: 'incorrect',
        message: 'Chưa chính xác. Hãy xem lại video từ đầu rồi thử lại nhé.',
        action: 'restart',
      })
      return
    }

    const isLastQuestion = answeredQuestions + 1 === courseData.quiz.questions.length
    setQuizFeedback({
      kind: 'correct',
      message: isLastQuestion
        ? 'Chính xác! Bạn đã trả lời đúng tất cả. Bấm OK để hoàn thành bài học.'
        : 'Chính xác! Bấm OK để tiếp tục sang câu tiếp theo.',
      action: isLastQuestion ? 'complete' : 'next',
    })
  }

  const handleQuizFeedbackOk = () => {
    if (!quizFeedback) return
    const action = quizFeedback.action
    setQuizFeedback(null)

    if (action === 'restart') {
      setShowQuizPopup(false)
      setCurrentQuestionIndex(0)
      setSelectedAnswers({})
      setAnsweredQuestions(0)
      setVideoSeconds(0)
      setIsPlaying(true)
      return
    }

    setAnsweredQuestions((count) => count + 1)
    if (action === 'complete') {
      setLessonCompleted(true)
      setShowQuizPopup(false)
      setIsPlaying(false)
      setVideoSeconds(videoDurationSeconds)
      setLessonsList((lessons) => lessons.map((lesson) =>
        lesson.id === activeLessonId
          ? { ...lesson, status: 'completed', progressPercent: 100 }
          : lesson
      ))
      return
    }

    setCurrentQuestionIndex((index) => index + 1)
  }

  const handleSeekVideo = (event: React.MouseEvent<HTMLDivElement>) => {
    if (lessonCompleted) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const seekPercent = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
    const seekSeconds = Math.round(seekPercent * videoDurationSeconds)
    if (seekSeconds >= quizStartSeconds) {
      setVideoSeconds(quizStartSeconds)
      setIsPlaying(false)
      setShowQuizPopup(true)
      return
    }
    setVideoSeconds(seekSeconds)
  }

  const currentLessonItem = lessonsList.find((l) => l.id === activeLessonId) || lessonsList[3]!

  return (
    <div className="student-detail-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-brand-600 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Student Navigation Header */}
      <StudentHeader student={CURRENT_STUDENT} />

      {/* Main Container */}
      <main className="student-detail-content">
        {/* Breadcrumb & Back Link Row */}
        <div className="student-breadcrumb-row">
          <nav aria-label="Breadcrumb" className="student-breadcrumbs">
            <a href="/student/courses" className="student-breadcrumb-link">
              🎓 Khóa Học Của Tôi
            </a>
            <span className="student-breadcrumb-separator">›</span>
            <a href="/student/courses" className="student-breadcrumb-link">
              {courseData.courseTitle}
            </a>
            <span className="student-breadcrumb-separator">›</span>
            <span className="student-breadcrumb-current">
              {currentLessonItem.title}
            </span>
          </nav>

          <a href="/student/courses" className="student-back-link">
            <ArrowLeft size={14} />
            <span>Quay lại Khóa Học Của Tôi</span>
          </a>
        </div>

        {/* Course Header Banner & Progress Card */}
        <section className="course-detail-header-card" aria-label="Thông tin khóa học">
          <div className="course-detail-title-group">
            <span className="course-status-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
              {courseData.badgeText}
            </span>
            <h1 className="course-main-title">{courseData.courseTitle}</h1>
            <div className="course-meta-row">
              <div className="course-meta-item">
                <User size={14} className="text-brand-600" />
                <span>
                  Giảng viên: <strong>{courseData.instructor}</strong>
                </span>
              </div>
              <div className="course-meta-item">
                <BookOpen size={14} className="text-brand-600" />
                <span>{courseData.totalLessons} Bài Học chuẩn hóa</span>
              </div>
            </div>
          </div>

          {/* Right Progress Card */}
          <div className="course-overall-progress-card">
            <div className="overall-progress-top-row">
              <span className="overall-progress-label">Tiến độ tổng thể</span>
              <span className="overall-progress-percent">
                {progressLessonCount}/{courseData.totalLessons} bài ({overallProgressPercent}%)
              </span>
            </div>
            <div className="overall-progress-track">
              <div
                className="overall-progress-fill"
                style={{ width: `${overallProgressPercent}%` }}
              />
            </div>
            <div className="overall-progress-bottom-meta">
              <span className="meta-completed-lessons">
                Đã hoàn thành {completedLessons} bài
              </span>
              <span className="meta-current-step">
                {lessonCompleted ? `Bài ${currentLessonItem.lessonNumber}: Hoàn thành 100%` : `Bài ${currentLessonItem.lessonNumber}: Đang học`}
              </span>
            </div>
          </div>
        </section>

        {/* Two-column Main Grid */}
        <div className="student-detail-grid">
          {/* Left Column (Video Player + Quiz + Key Takeaways) */}
          <div className="learning-main-column">
            <div className="video-quiz-stage">
            {/* Section A: Video Player Frame */}
            <section aria-label="Khu vực xem bài giảng">
              <div className="video-player-container">
                {/* Background image & gradient representation */}
                <div className="video-screen-content">
                  <img
                    src={courseData.instructorAvatar}
                    alt="Giảng viên Trang English giảng bài"
                    className="video-bg-img"
                  />
                  <div className="video-overlay-gradient" />

                  {/* Mock IPA board in video studio */}
                  <div className="mock-board-container">
                    <div className="board-title">
                      International Phonetic Alphabet (IPA) — American English
                    </div>
                    <div className="board-grid-ipa">
                      <div className="board-ipa-cell">
                        <div className="board-ipa-symbol">/iː/</div>
                        <div className="board-ipa-word">Sheep</div>
                      </div>
                      <div className="board-ipa-cell">
                        <div className="board-ipa-symbol">/ɪ/</div>
                        <div className="board-ipa-word">Ship</div>
                      </div>
                      <div className="board-ipa-cell">
                        <div className="board-ipa-symbol">/ʊ/</div>
                        <div className="board-ipa-word">Book</div>
                      </div>
                      <div className="board-ipa-cell">
                        <div className="board-ipa-symbol">/uː/</div>
                        <div className="board-ipa-word">Shoot</div>
                      </div>
                      <div className="board-ipa-cell">
                        <div className="board-ipa-symbol">/e/</div>
                        <div className="board-ipa-word">Left</div>
                      </div>
                      <div className="board-ipa-cell">
                        <div className="board-ipa-symbol">/ə/</div>
                        <div className="board-ipa-word">Teacher</div>
                      </div>
                      <div className="board-ipa-cell">
                        <div className="board-ipa-symbol">/ɜː/</div>
                        <div className="board-ipa-word">Bird</div>
                      </div>
                      <div className="board-ipa-cell">
                        <div className="board-ipa-symbol">/ɔː/</div>
                        <div className="board-ipa-word">Door</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Video Overlay Bar */}
                <div className="video-top-overlay">
                  <div className="video-lesson-badge">
                    <span className="lesson-chip-red">Bài 4</span>
                    <span>Thì hiện tại hoàn thành</span>
                  </div>

                  <span className="video-quality-tag">
                    <span>📺</span> 1080p
                  </span>
                </div>

                {/* Center Big Play Button */}
                <button
                  type="button"
                  className="video-center-play-btn"
                  onClick={() => !showQuizPopup && !lessonCompleted && setIsPlaying(!isPlaying)}
                  title={isPlaying ? 'Tạm dừng video' : 'Phát video'}
                  aria-label={isPlaying ? 'Tạm dừng video' : 'Phát video'}
                >
                  {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                </button>

                {/* Bottom Controls Bar */}
                <div className="video-bottom-controls">
                  {/* Scrubber Bar */}
                  <div
                    className="video-progress-scrubber"
                    onClick={handleSeekVideo}
                    role="slider"
                    tabIndex={0}
                    aria-label="Tiến độ video"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round((videoSeconds / videoDurationSeconds) * 100)}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowRight') setVideoSeconds((seconds) => Math.min(quizStartSeconds, seconds + 10))
                      if (event.key === 'ArrowLeft') setVideoSeconds((seconds) => Math.max(0, seconds - 10))
                    }}
                  >
                    <div className="scrubber-fill" style={{ width: `${(videoSeconds / videoDurationSeconds) * 100}%` }}>
                      <span className="scrubber-thumb" />
                    </div>
                  </div>

                  <div className="video-controls-row">
                    <div className="video-controls-left">
                      <button
                        type="button"
                        className="control-icon-btn"
                        onClick={() => !showQuizPopup && !lessonCompleted && setIsPlaying(!isPlaying)}
                        aria-label="Play/Pause"
                      >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      </button>

                      <button
                        type="button"
                        className="control-icon-btn"
                        onClick={() => setIsMuted(!isMuted)}
                        aria-label="Âm lượng"
                      >
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>

                      <span className="video-timestamp">
                        {`${Math.floor(videoSeconds / 60).toString().padStart(2, '0')}:${(videoSeconds % 60).toString().padStart(2, '0')} / 18:45`}
                      </span>
                    </div>

                    <div className="video-controls-right">
                      <button
                        type="button"
                        className={`control-pill-btn ${bilingualSubtitles ? 'bg-brand-600/60' : ''}`}
                        onClick={() => setBilingualSubtitles(!bilingualSubtitles)}
                      >
                        <span>[cc] Song ngữ Anh - Việt</span>
                      </button>

                      <button
                        type="button"
                        className="control-pill-btn"
                        onClick={() => {
                          const next = playbackSpeed === '1.0x' ? '1.25x' : playbackSpeed === '1.25x' ? '1.5x' : '1.0x'
                          setPlaybackSpeed(next)
                          showToast(`Tốc độ phát: ${next}`)
                        }}
                      >
                        <span>{playbackSpeed}</span>
                      </button>

                      <button
                        type="button"
                        className="control-icon-btn"
                        onClick={() => showToast('Đã bật chế độ toàn màn hình')}
                        aria-label="Toàn màn hình"
                      >
                        <Maximize2 size={17} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Green Video Completion Bar */}


              {/* Lesson Status Alert Box */}

            </section>

            {/* Section B: Teacher-Created Quiz Section */}
            <section
              id="quiz-section"
              className={`quiz-section-card quiz-overlay ${showQuizPopup ? 'is-visible' : ''}`}
              aria-labelledby="quiz-section-heading"
              aria-modal={showQuizPopup ? 'true' : undefined}
              role={showQuizPopup ? 'dialog' : undefined}
              aria-hidden={!showQuizPopup}
            >
              <div className="quiz-header-title-row">
                <h2 id="quiz-section-heading" className="quiz-main-heading">
                  <span>📝</span> Kiểm tra bài học
                </h2>
                <p className="quiz-sub-desc">Trả lời đúng từng câu để hoàn thành bài học.</p>
              </div>
              <div className="quiz-stepper-row">
                <span className="quiz-stepper-label">Câu {currentQuestionIndex + 1} / {courseData.quiz.questions.length}</span>
                <span className="quiz-stepper-count">Đúng {answeredQuestions}/{courseData.quiz.questions.length}</span>
              </div>
              <div className="quiz-question-box">
                <span className="question-tag-pill">{currentQuestion.questionNumberStr}</span>
                <h3 className="question-text-heading">{currentQuestion.questionText}</h3>
                <div className="quiz-options-group" role="radiogroup" aria-label="Các đáp án">
                  {currentQuestion.options.map((option) => {
                    const isSelected = selectedAnswers[currentQuestionIndex] === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`quiz-option-item ${isSelected ? 'selected' : ''}`}
                        disabled={Boolean(quizFeedback)}
                        onClick={() => handleSelectOption(option.id)}
                        role="radio"
                        aria-checked={isSelected}
                      >
                        <span className="quiz-option-left">
                          <span className="quiz-radio-outer">
                            {isSelected && <span className="quiz-radio-inner" />}
                          </span>
                          <span className="quiz-option-text">{option.text}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              {quizFeedback ? (
                <div className={`quiz-feedback-card ${quizFeedback.kind}`} role="status" aria-live="polite">
                  <span className="quiz-feedback-message">{quizFeedback.message}</span>
                  <button type="button" className="btn-submit-quiz" onClick={handleQuizFeedbackOk}>
                    <Check size={15} />
                    <span>OK</span>
                  </button>
                </div>
              ) : (
                <div className="quiz-actions-footer">
                  <span className="quiz-sub-desc">Video đã tạm dừng trong lúc làm bài.</span>
                  <button type="button" className="btn-submit-quiz" onClick={handleCheckAnswer}>
                    <Check size={15} />
                    <span>Kiểm tra đáp án</span>
                  </button>
                </div>
              )}
            </section>

            </div>

            {/* Section C: Tabbed Content & Key Takeaways */}
            <section className="course-tabs-section" aria-label="Nội dung bổ trợ bài học">
              <div className="course-tabs-header" role="tablist">
                <button
                  type="button"
                  className={`course-tab-btn ${activeTab === 'objectives' ? 'active' : ''}`}
                  onClick={() => setActiveTab('objectives')}
                  role="tab"
                  aria-selected={activeTab === 'objectives'}
                >
                  <span>🎯 Mục Tiêu Bài Học & Ghi Chú</span>
                </button>

                <button
                  type="button"
                  className={`course-tab-btn ${activeTab === 'attachments' ? 'active' : ''}`}
                  onClick={() => setActiveTab('attachments')}
                  role="tab"
                  aria-selected={activeTab === 'attachments'}
                >
                  <span>📁 Tài Liệu Đính Kèm (PDF, Audio MP3)</span>
                  <span className="tab-count-badge">{courseData.attachments.length}</span>
                </button>

              </div>

              <div className="course-tab-body">
                {/* Tab 1: Objectives */}
                {activeTab === 'objectives' && (
                  <div>
                    <h3 className="tab-lead-heading">Mục tiêu trọng tâm: Bài 4</h3>
                    <p className="tab-lead-desc">{courseData.currentLesson.objectivesSummary}</p>
                  </div>
                )}

                {/* Tab 2: Attachments */}
                {activeTab === 'attachments' && (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-ink-500 mb-2">
                      Tải xuống tài liệu học tập chuẩn hóa đính kèm theo Bài 4:
                    </p>
                    {courseData.attachments.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-white hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                            {file.type === 'pdf' ? (
                              <FileText size={18} />
                            ) : file.type === 'mp3' ? (
                              <FileAudio size={18} />
                            ) : (
                              <Download size={18} />
                            )}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-ink-900 mb-0.5">{file.name}</h5>
                            <span className="text-[11px] text-ink-500">{file.size} • Định dạng {file.type.toUpperCase()}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-ink-700 hover:text-brand-600 hover:border-brand-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                          onClick={() => showToast(`Bắt đầu tải xuống file "${file.name}"...`)}
                        >
                          <Download size={13} />
                          <span>Tải về</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </section>
          </div>

          {/* Right Column (Curriculum Sidebar - "Danh Sách Bài Học") */}
          <aside className="curriculum-sidebar-card">
            <div className="curriculum-header-row">
              <h2 className="curriculum-title-text">
                <BookOpen size={18} className="text-brand-600" />
                <span>Danh Sách Bài Học</span>
              </h2>
              <span className="curriculum-total-chip">{courseData.totalLessons} bài</span>
            </div>

            {/* Note banner */}
            <div className="curriculum-notice-banner">
              <span className="text-sm">💡</span>
              <span>
                Học viên có thể tự do mở bất kỳ bài học nào để học tập theo lộ trình cá nhân.
              </span>
            </div>

            {/* Lessons List Stack */}
            <div className="curriculum-lessons-stack">
              {lessonsList.map((lesson) => {
                const isSelected = lesson.id === activeLessonId
                const isCompleted = lesson.status === 'completed'

                return (
                  <div
                    key={lesson.id}
                    className={`curriculum-lesson-item ${
                      isSelected ? 'active' : isCompleted ? 'completed' : ''
                    }`}
                    onClick={() => {
                      setActiveLessonId(lesson.id)
                      showToast(`Đã chuyển tới ${lesson.title}`)
                    }}
                  >
                    <div className="lesson-thumbnail">
                      <img src={['/hero-classroom.png', '/giaovien3.png', '/giaovien2.jpg', courseData.instructorAvatar][(lesson.lessonNumber - 1) % 4]} alt="" loading="lazy" />
                      <span className="lesson-thumbnail-duration">{lesson.duration}</span>
                      <span className="lesson-thumbnail-play"><Play size={10} fill="currentColor" /></span>
                    </div>
                    <div className="lesson-item-text-group">
                      <h4 className="lesson-item-title">{lesson.title}</h4>
                      <div className="lesson-item-meta">
                        <span>⏱ {lesson.duration} • </span>
                        {isCompleted ? (
                          <strong>Đã Hoàn Thành ✓ (100%)</strong>
                        ) : isSelected ? (
                          <span>ĐANG CHỌN / ĐANG HỌC ({lesson.progressPercent}%)</span>
                        ) : (
                          <span>Chưa Bắt Đầu (0%)</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default StudentCourseDetailPage


