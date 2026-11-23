import React, { useState } from 'react'
import { Clock3, CalendarCheck, Sparkles, BarChart2, MessageSquare, FileText, BookOpen, User } from 'lucide-react'
import type { OtherCourse } from '../student-courses-data'

interface OtherCourseCardProps {
  course: OtherCourse
  onEnroll?: (course: OtherCourse) => void
  onViewDetail?: (course: OtherCourse) => void
  enrolling?: boolean
}

export const OtherCourseCard: React.FC<OtherCourseCardProps> = ({
  course,
  onEnroll,
  onViewDetail,
  enrolling = false,
}) => {
  const [imageError, setImageError] = useState(false)
  const formatPrice = (amount: number) => {
    return `${amount.toLocaleString('vi-VN')}đ`
  }

  const getFeatureIcon = (feature: string) => {
    if (feature.includes('AI') || feature.includes('phổ âm thanh')) {
      return <Sparkles size={12} className="text-brand-600 shrink-0" />
    }
    if (feature.includes('Sửa giọng') || feature.includes('khẩu hình')) {
      return <BarChart2 size={12} className="text-emerald-600 shrink-0" />
    }
    if (feature.includes('Scrum') || feature.includes('Standup')) {
      return <MessageSquare size={12} className="text-blue-600 shrink-0" />
    }
    return <FileText size={12} className="text-amber-600 shrink-0" />
  }

  const handleViewDetail = () => {
    if (onViewDetail) {
      onViewDetail(course)
    } else {
      window.location.assign(`/courses/${encodeURIComponent(course.slug || course.id)}`)
    }
  }

  const handleEnrollClick = () => {
    if (onEnroll) {
      onEnroll(course)
    } else {
      window.location.assign(`/checkout?courseId=${encodeURIComponent(course.id || course.slug)}&slug=${encodeURIComponent(course.slug)}`)
    }
  }

  return (
    <article className="other-course-card cursor-pointer" onClick={handleViewDetail}>
      {/* Thumbnail Box */}
      <div className="other-course-thumb-box">
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
        {course.tagBadge && (
          <span
            className={`other-course-category-tag ${
              course.tagBadge.includes('Tech') ? 'dark' : ''
            }`}
          >
            {course.tagBadge}
          </span>
        )}
      </div>

      {/* Content Column */}
      <div className="other-course-content">
        <div>
          {/* Metadata Top Row */}
          <div className="other-course-meta-top">
            {course.levelBadge && (
              <span className={`level-badge-pill ${course.levelBadgeColor}`}>
                {course.levelBadge}
              </span>
            )}
            {course.lessonsCount > 0 && (
              <span className="other-course-duration">
                <Clock3 size={13} />
                {course.lessonsCount} bài học{course.totalHours > 0 ? ` • ${course.totalHours} giờ` : ''}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="other-course-title cursor-pointer hover:text-brand-600 transition-colors">
            {course.title}
          </h3>

          {/* Instructor */}
          {course.instructor && (
            <div className="other-course-instructor">
              <User size={13} aria-hidden="true" />
              <strong>{course.instructor}</strong>
              {course.instructorRole ? ` (${course.instructorRole})` : ''}
            </div>
          )}

          {/* Feature Highlights List */}
          {course.features && course.features.length > 0 && (
            <div className="other-course-features-list">
              {course.features.map((feature, idx) => (
                <span key={idx} className="feature-pill-tag">
                  {getFeatureIcon(feature)}
                  <span>{feature}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Price & CTA */}
        <div className="other-course-bottom-row">
          <div className="other-course-price-group">
            <span className="sale-price">{formatPrice(course.price)}</span>
            {course.originalPrice > course.price && (
              <>
                <span className="original-price">{formatPrice(course.originalPrice)}</span>
                {course.discountPercent > 0 && (
                  <span className="discount-badge">-{course.discountPercent}%</span>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            className="btn-enroll-now"
            disabled={enrolling}
            onClick={(event) => {
              event.stopPropagation()
              handleEnrollClick()
            }}
          >
            <CalendarCheck size={14} />
            Đăng Ký Ngay
          </button>
        </div>
      </div>
    </article>
  )
}
