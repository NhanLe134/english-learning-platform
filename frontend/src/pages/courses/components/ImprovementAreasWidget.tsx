import React, { useState } from 'react'
import { Target, AlertTriangle, ChevronRight, X } from 'lucide-react'
import type { ImprovementIssue } from '../student-courses-data'

interface ImprovementAreasWidgetProps {
  issues: ImprovementIssue[]
}

export const ImprovementAreasWidget: React.FC<ImprovementAreasWidgetProps> = ({
  issues,
}) => {
  const [selectedIssue, setSelectedIssue] = useState<ImprovementIssue | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  return (
    <div className="sidebar-widget-card">
      {/* Widget Header */}
      <div className="widget-header-row">
        <div className="widget-header-left">
          <div className="widget-icon-box rose">
            <Target size={18} />
          </div>
          <div className="widget-title-text">
            <h3>Điểm Cần Cải Thiện</h3>
            <p>AI phân tích quá trình học của bạn</p>
          </div>
        </div>

        <span className="widget-badge-ai">● AI INSIGHT</span>
      </div>

      {/* Alert Warning Box */}
      <div className="improvement-alert-box">
        <div className="alert-left-group">
          <AlertTriangle size={15} />
          <span>Bạn đang gặp {issues.length} lỗi thường xuyên</span>
        </div>
        <button
          type="button"
          className="btn-view-details-link"
          onClick={() => setShowDetailModal(true)}
        >
          Chi tiết
        </button>
      </div>

      {/* Issues List */}
      <div className="improvement-issues-list">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="issue-item-card cursor-pointer hover:border-gray-300 transition-colors"
            onClick={() => {
              setSelectedIssue(issue)
              setShowDetailModal(true)
            }}
          >
            <div className="issue-item-top">
              <span className={`issue-category-tag ${issue.categoryColor}`}>
                {issue.category}
              </span>
              <span className="issue-title">{issue.title}</span>
              <span className={`issue-severity-chip ${issue.severityColor}`}>
                {issue.severityBadge}
              </span>
            </div>
            <p className="issue-desc">{issue.description}</p>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <Target size={18} className="text-brand-600" />
                <h4 className="text-base font-extrabold text-ink-900">
                  {selectedIssue ? selectedIssue.title : 'Chi tiết phân tích AI'}
                </h4>
              </div>
              <button
                type="button"
                className="size-8 rounded-full bg-gray-100 hover:bg-gray-200 text-ink-700 flex items-center justify-center transition-colors cursor-pointer"
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedIssue(null)
                }}
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-ink-700 leading-relaxed mb-4">
              {selectedIssue
                ? selectedIssue.description
                : 'Hệ thống AI đã phân tích 12 bài tập nói và 6 bài kiểm tra gần nhất của bạn. Bạn có xu hướng bỏ âm gió /s/, /t/ khi nói nhanh và nhầm lẫn cấu trúc thì.'}
            </p>

            <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl mb-4">
              <h5 className="text-xs font-bold text-rose-800 mb-1">
                Lộ trình khắc phục đề xuất:
              </h5>
              <ul className="text-[11px] text-ink-700 space-y-1 list-disc pl-4">
                <li>Luyện tập 10 phút khẩu hình âm /s/, /t/ với bài tập tương tác.</li>
                <li>Nghe lại ghi âm mẫu của giảng viên bản xứ.</li>
                <li>Hoàn thành bài kiểm tra phản xạ ngữ pháp cuối tuần.</li>
              </ul>
            </div>

            <button
              type="button"
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              onClick={() => {
                setShowDetailModal(false)
                setSelectedIssue(null)
              }}
            >
              <span>Bắt đầu bài luyện tập ngay</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
