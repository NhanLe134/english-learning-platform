import React, { useState } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  CheckCircle2,
  Clock,
  User,
  BookOpen,
  ArrowLeft,
  Download,
  FileText,
  FileAudio,
  Send,
  Check,
} from 'lucide-react'
import { StudentHeader } from './components/StudentHeader'
import { CURRENT_STUDENT } from './student-courses-data'
import { useAuth } from '../auth/auth-context'
import {
  STUDENT_COURSE_DETAIL,
  type LessonItem,
  type QuizQuestion,
  type KeyTakeawayCard,
} from './student-course-detail-data'
import './student-course-detail.css'

interface StudentCourseDetailPageProps {
  courseSlug?: string
}

export const StudentCourseDetailPage: React.FC<StudentCourseDetailPageProps> = ({
  courseSlug: _courseSlug,
}) => {
  const { user } = useAuth()
  const courseData = STUDENT_COURSE_DETAIL

  // Interactive UI states
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [bilingualSubtitles, setBilingualSubtitles] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState<'1.0x' | '1.25x' | '1.5x'>('1.0x')

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1) // 0-indexed: index 1 is Question 2 (matches reference screenshot!)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({
    0: 'B', // Question 1 answered
    1: 'B', // Question 2 selected in screenshot
  })
  const [quizSubmitted, setQuizSubmitted] = useState(false)

  // Tab state
  const [activeTab, setActiveTab] = useState<'objectives' | 'attachments' | 'discussion'>('objectives')

  // Lesson sidebar state
  const [activeLessonId, setActiveLessonId] = useState<string>('lesson-4')
  const [lessonsList] = useState<LessonItem[]>(courseData.lessons)

  // Discussion comments
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<Array<{ id: string; author: string; role: string; content: string; time: string }>>([
    {
      id: 'c-1',
      author: 'Trang English',
      role: 'Giảng viên',
      content:
        'Chào các bạn học viên! Ở Bài 4 này, trọng tâm lớn nhất là phản xạ Small Talk tự nhiên. Hãy chú ý nối âm giữa "How" và "have", ngữ điệu rơi nhẹ ở cuối câu hỏi nhé.',
      time: '2 ngày trước',
    },
    {
      id: 'c-2',
      author: 'Sarah',
      role: 'Học viên',
      content:
        'Thưa cô, trong môi trường văn phòng quốc tế, câu trả lời "Same old, same old" có bị coi là quá suồng sã với sếp không ạ?',
      time: '5 giờ trước',
    },
  ])

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Audio speech synthesis helper
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showToast(`Đang phát âm: "${text}"`)
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }

  const currentQuestion: QuizQuestion =
    courseData.quiz.questions[currentQuestionIndex] ?? courseData.quiz.questions[0]!

  const handleSelectOption = (optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: optionId,
    }))
  }

  const handleScrollToQuiz = () => {
    const el = document.getElementById('quiz-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleSubmitQuiz = () => {
    setQuizSubmitted(true)
    const total = courseData.quiz.questions.length
    let correctCount = 0
    courseData.quiz.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctOptionId) {
        correctCount++
      }
    })
    showToast(`Chúc mừng! Bạn đã đạt ${correctCount}/${total} câu hỏi (${Math.round((correctCount / total) * 100)}%). Hoàn thành bài kiểm tra!`)
  }

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    const newComment = {
      id: `c-${Date.now()}`,
      author: user?.fullName || CURRENT_STUDENT.name,
      role: 'Học viên',
      content: commentText.trim(),
      time: 'Vừa xong',
    }
    setComments((prev) => [...prev, newComment])
    setCommentText('')
    showToast('Đã gửi câu hỏi thảo luận tới giảng viên!')
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
                {courseData.completedLessons + 1}/{courseData.totalLessons} bài ({courseData.overallProgressPercent}%)
              </span>
            </div>
            <div className="overall-progress-track">
              <div
                className="overall-progress-fill"
                style={{ width: `${courseData.overallProgressPercent}%` }}
              />
            </div>
            <div className="overall-progress-bottom-meta">
              <span className="meta-completed-lessons">
                Đã hoàn thành {courseData.completedLessons} bài
              </span>
              <span className="meta-current-step">
                Bài {courseData.currentLessonNumber}: Đang làm quiz
              </span>
            </div>
          </div>
        </section>

        {/* Two-column Main Grid */}
        <div className="student-detail-grid">
          {/* Left Column (Video Player + Quiz + Key Takeaways) */}
          <div className="learning-main-column">
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
                  onClick={() => setIsPlaying(!isPlaying)}
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
                    onClick={() => showToast('Đã tua đến thời điểm được chọn')}
                  >
                    <div className="scrubber-fill" style={{ width: '100%' }}>
                      <span className="scrubber-thumb" />
                    </div>
                  </div>

                  <div className="video-controls-row">
                    <div className="video-controls-left">
                      <button
                        type="button"
                        className="control-icon-btn"
                        onClick={() => setIsPlaying(!isPlaying)}
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

                      <span className="video-timestamp">18:45 / 18:45</span>
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
              <div className="video-completion-banner mt-3">
                <div className="completion-banner-left">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>
                    Trạng thái xem video:{' '}
                    <strong>ĐÃ HOÀN THÀNH 100% (18:45/18:45)</strong>
                  </span>
                </div>
                <span className="completion-chip-green">
                  <span>🟢</span> Video đã tích lũy giờ học
                </span>
              </div>

              {/* Lesson Status Alert Box */}
              <div className="lesson-status-alert-card mt-3">
                <div className="lesson-status-left">
                  <div className="lesson-status-icon-box">
                    <BookOpen size={18} />
                  </div>
                  <div className="lesson-status-text">
                    <h4>
                      Trạng thái bài học: 💡 Đang Học{' '}
                      <span className="text-xs font-normal text-ink-500">
                        (Video: 100% ✓ | Bài kiểm tra: Sẵn sàng làm)
                      </span>
                    </h4>
                    <p>
                      Điều kiện hoàn thành 100%: Xem hết video bài học VÀ Đạt bài kiểm tra trắc nghiệm từ giáo viên (tối thiểu 80%).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-start-quiz-cta"
                  onClick={handleScrollToQuiz}
                >
                  <span>Làm Bài Kiểm Tra</span>
                  <span>↓</span>
                </button>
              </div>
            </section>

            {/* Section B: Teacher-Created Quiz Section */}
            <section
              id="quiz-section"
              className="quiz-section-card"
              aria-labelledby="quiz-section-heading"
            >
              <div className="quiz-header-title-row">
                <h2 id="quiz-section-heading" className="quiz-main-heading">
                  <span>📝</span> {courseData.quiz.title}
                </h2>
                <p className="quiz-sub-desc">{courseData.quiz.subtitle}</p>
              </div>

              {/* Quiz Meta Chips */}
              <div className="quiz-meta-chips-row">
                <div className="quiz-meta-chip">
                  <span>📋</span> {courseData.quiz.totalQuestions} Câu hỏi
                </div>
                <div className="quiz-meta-chip">
                  <Clock size={13} className="text-brand-600" />
                  <span>Thời gian: {courseData.quiz.durationMinutes} phút</span>
                </div>
                <div className="quiz-meta-chip">
                  <span>🎯</span> Điểm đạt: {courseData.quiz.passingScoreStr}
                </div>
                <div className="quiz-meta-chip">
                  <span>👤</span> GV: {courseData.quiz.instructorName}
                </div>
              </div>

              {/* Quiz Progress Stepper */}
              <div className="quiz-stepper-row">
                <div className="quiz-stepper-left">
                  <span className="quiz-stepper-label">Tiến độ làm bài:</span>
                  <div className="quiz-bubbles-list" role="tablist">
                    {courseData.quiz.questions.map((q, idx) => {
                      const isCompleted = idx < currentQuestionIndex
                      const isActive = idx === currentQuestionIndex
                      return (
                        <button
                          key={q.id}
                          type="button"
                          className={`quiz-bubble ${
                            isActive ? 'active' : isCompleted ? 'completed' : 'pending'
                          }`}
                          onClick={() => setCurrentQuestionIndex(idx)}
                          aria-label={`Câu hỏi ${idx + 1}`}
                        >
                          {isCompleted ? '✓' : idx + 1}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="quiz-stepper-count">
                  {currentQuestionIndex + 1} / {courseData.quiz.totalQuestions}
                </div>
              </div>

              {/* Question Card */}
              <div className="quiz-question-box">
                <span className="question-tag-pill">
                  {currentQuestion.questionNumberStr}
                </span>

                <h3 className="question-text-heading">
                  {currentQuestion.questionText}
                </h3>

                {/* Pronunciation Audio Bar */}
                <div
                  className="quiz-audio-pronounce-card"
                  onClick={() => speakText(currentQuestion.audioText)}
                  title="Bấm để nghe phát âm giọng bản ngữ"
                >
                  <div className="audio-icon-circle">
                    <Volume2 size={15} />
                  </div>
                  <span className="audio-label-text">
                    Bấm để nghe cách phát âm câu hỏi:{' '}
                    <strong>Audio Native Speaker (00:03)</strong>
                  </span>
                </div>

                {/* Options List */}
                <div className="quiz-options-group" role="radiogroup">
                  {currentQuestion.options.map((opt) => {
                    const isSelected = selectedAnswers[currentQuestionIndex] === opt.id
                    return (
                      <div
                        key={opt.id}
                        className={`quiz-option-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectOption(opt.id)}
                        role="radio"
                        aria-checked={isSelected}
                      >
                        <div className="quiz-option-left">
                          <div className="quiz-radio-outer">
                            {isSelected && <span className="quiz-radio-inner" />}
                          </div>
                          <span className="quiz-option-text">{opt.text}</span>
                        </div>

                        {isSelected && (
                          <Check size={16} className="quiz-correct-icon" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Quiz Navigation & Submit Footer */}
              <div className="quiz-actions-footer">
                <div className="quiz-nav-buttons-group">
                  <button
                    type="button"
                    className="btn-quiz-nav"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  >
                    <span>← Câu trước</span>
                  </button>
                  <button
                    type="button"
                    className="btn-quiz-nav"
                    disabled={currentQuestionIndex === courseData.quiz.questions.length - 1}
                    onClick={() =>
                      setCurrentQuestionIndex((prev) =>
                        Math.min(courseData.quiz.questions.length - 1, prev + 1)
                      )
                    }
                  >
                    <span>Câu tiếp theo →</span>
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-submit-quiz"
                  onClick={handleSubmitQuiz}
                >
                  <Check size={15} />
                  <span>{quizSubmitted ? 'Đã Nộp Bài Kiểm Tra' : 'Nộp Bài Kiểm Tra'}</span>
                </button>
              </div>
            </section>

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

                <button
                  type="button"
                  className={`course-tab-btn ${activeTab === 'discussion' ? 'active' : ''}`}
                  onClick={() => setActiveTab('discussion')}
                  role="tab"
                  aria-selected={activeTab === 'discussion'}
                >
                  <span>💬 Thảo Luận Cùng Giảng Viên</span>
                  <span className="tab-count-badge">{comments.length}</span>
                </button>
              </div>

              <div className="course-tab-body">
                {/* Tab 1: Objectives & Key Takeaways */}
                {activeTab === 'objectives' && (
                  <div>
                    <h3 className="tab-lead-heading">Mục tiêu trọng tâm: Bài 4</h3>
                    <p className="tab-lead-desc">{courseData.currentLesson.objectivesSummary}</p>

                    <h4 className="key-takeaways-subheading">
                      CỤM TỪ & PHẢN XẠ THEN CHỐT (KEY TAKEAWAYS)
                    </h4>

                    {/* 2x2 Grid of Key Takeaway Cards */}
                    <div className="key-takeaways-grid">
                      {courseData.keyTakeaways.map((item: KeyTakeawayCard) => (
                        <div key={item.id} className="key-takeaway-card">
                          <div className="takeaway-header-row">
                            <span className="takeaway-word-title">
                              <span>{item.word}</span>
                              <button
                                type="button"
                                className="speaker-tiny-btn"
                                onClick={() => speakText(item.word)}
                                title={`Nghe phát âm "${item.word}"`}
                                aria-label={`Nghe phát âm "${item.word}"`}
                              >
                                <Volume2 size={14} />
                              </button>
                            </span>
                            <span className={`takeaway-tag-pill ${item.tagColor}`}>
                              {item.tag}
                            </span>
                          </div>

                          <div className="takeaway-phonetic">{item.phonetic}</div>
                          <div className="takeaway-meaning">{item.meaning}</div>
                          <div className="takeaway-example">“{item.example}”</div>
                        </div>
                      ))}
                    </div>
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

                {/* Tab 3: Discussion */}
                {activeTab === 'discussion' && (
                  <div>
                    {/* Add comment form */}
                    <form onSubmit={handleAddComment} className="mb-5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Đặt câu hỏi cho giảng viên Trang English về Bài 4..."
                          className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-ink-900 focus:outline-none focus:border-brand-600 focus:bg-white"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Send size={13} />
                          <span>Gửi</span>
                        </button>
                      </div>
                    </form>

                    {/* Comments list */}
                    <div className="flex flex-col gap-3">
                      {comments.map((c) => (
                        <div key={c.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-ink-900">{c.author}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  c.role === 'Giảng viên'
                                    ? 'bg-brand-100 text-brand-700'
                                    : 'bg-gray-200 text-ink-700'
                                }`}
                              >
                                {c.role}
                              </span>
                            </div>
                            <span className="text-[11px] text-ink-400">{c.time}</span>
                          </div>
                          <p className="text-xs text-ink-700 leading-relaxed m-0">{c.content}</p>
                        </div>
                      ))}
                    </div>
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
                    <div
                      className={`lesson-status-icon-pill ${
                        isSelected
                          ? 'active'
                          : isCompleted
                          ? 'completed'
                          : 'not-started'
                      }`}
                    >
                      {isCompleted ? (
                        <Check size={13} />
                      ) : isSelected ? (
                        <Play size={12} className="ml-0.5 fill-current" />
                      ) : (
                        <Play size={12} className="ml-0.5" />
                      )}
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
