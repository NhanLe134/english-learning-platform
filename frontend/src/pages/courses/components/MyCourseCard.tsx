import React, { useState } from 'react'
import { User, BookOpen, Play, CheckCircle2, RotateCcw } from 'lucide-react'
import type { MyCourse } from '../student-courses-data'

interface MyCourseCardProps {
  course: MyCourse
  onContinue?: (course: MyCourse) => void
  onReview?: (course: MyCourse) => void
}

export const MyCourseCard: React.FC<MyCourseCardProps> = ({
  course,
  onContinue,
  onReview,
}) => {
  const isCompleted = course.status === 'completed'
  const [imageError, setImageError] = useState(false)

  const handleCardClick = () => {
    if (isCompleted && onReview) {
      onReview(course)
    } else if (onContinue) {
      onContinue(course)
    } else {
      window.location.assign(`/student/courses/${encodeURIComponent(course.slug || course.id)}`)
    }
  }

  return (
    <article className="my-course-card">
      {/* Thumbnail Box */}
      <div className="my-course-thumb-box">
        {course.thumbnailUrl && !imageError ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-brand-50 text-brand-600">
            <BookOpen size={36} />
          </div>
        )}
        {course.levelBadge && <span className="my-course-level-pill">{course.levelBadge}</span>}
      </div>

      {/* Content Column */}
      <div className="my-course-content">
        <div>
          {/* Header Meta: Status & Last Active */}
          <div className="my-course-header-meta">
            {isCompleted ? (
              <span className="my-course-status-chip-completed">
                <CheckCircle2 size={12} />
                Đã Hoàn Thành
              </span>
            ) : (
              <span className="my-course-status-indicator in-progress">
                <span className="status-pulse-dot" />
                Đang Học
              </span>
            )}
            {course.lastActive && <span className="my-course-last-active">{course.lastActive}</span>}
          </div>

          {/* Title */}
          <h3
            className="my-course-title cursor-pointer hover:text-brand-600 transition-colors"
            onClick={handleCardClick}
          >
            {course.title}
          </h3>

          {/* Instructor */}
          {course.instructor && (
            <div className="my-course-instructor-row">
              <User size={13} />
              <span>{course.instructor}</span>
            </div>
          )}
        </div>

        {/* Progress Section */}
        <div>
          <div className="my-course-progress-meta">
            <span className="my-course-progress-text">
              {course.totalLessons > 0 ? (
                <>
                  {course.totalLessons} bài học •{' '}
                  <strong>
                    {course.completedLessons}/{course.totalLessons} bài hoàn thành
                    {isCompleted ? ' trọn vẹn' : ''}
                  </strong>
                </>
              ) : (
                <strong>Đang cập nhật bài học</strong>
              )}
            </span>
            <span
              className={`my-course-progress-percent ${
                isCompleted ? 'completed' : ''
              }`}
            >
              {course.progressPercent}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="my-course-progress-track">
            <div
              className={`my-course-progress-fill ${
                isCompleted ? 'completed' : ''
              }`}
              style={{ width: `${course.progressPercent}%` }}
            />
          </div>

          {/* Bottom Action Row */}
          <div className="my-course-bottom-action-row">
            {isCompleted ? (
              <div className="my-course-next-lesson">
                <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                <span>Bạn đã hoàn thành tất cả các bài học</span>
              </div>
            ) : (
              <div className="my-course-next-lesson">
                <BookOpen size={14} className="shrink-0 text-ink-500" />
                <span>Tiếp tục học theo lộ trình</span>
              </div>
            )}

            {isCompleted ? (
              <button
                type="button"
                className="btn-review-course"
                onClick={(event) => {
                  event.stopPropagation()
                  if (onReview) {
                    onReview(course)
                  } else {
                    handleCardClick()
                  }
                }}
              >
                <RotateCcw size={13} />
                Ôn Tập Khóa Học
              </button>
            ) : (
              <button
                type="button"
                className="btn-continue-course"
                onClick={(event) => {
                  event.stopPropagation()
                  if (onContinue) {
                    onContinue(course)
                  } else {
                    handleCardClick()
                  }
                }}
              >
                <Play size={12} fill="currentColor" />
                Tiếp Tục Học
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
