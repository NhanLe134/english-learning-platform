import React from 'react'
import { Lock, Unlock, Trash2, X, AlertTriangle } from 'lucide-react'
import type { UserProfile } from '../types'

export type ConfirmActionType = 'lock' | 'unlock' | 'delete'

interface ConfirmActionModalProps {
  isOpen: boolean
  type: ConfirmActionType
  user: UserProfile | null
  loading?: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  isOpen,
  type,
  user,
  loading = false,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !user) return null

  const getModalConfig = () => {
    switch (type) {
      case 'lock':
        return {
          icon: <Lock size={22} className="confirm-icon-lock" />,
          iconBgClass: 'confirm-icon-wrapper-warning',
          title: 'Xác nhận Khóa tài khoản',
          actionBtnClass: 'btn-confirm-warning',
          actionBtnText: 'Khóa tài khoản',
          description: (
            <>
              Bạn có chắc chắn muốn <strong>khóa tài khoản</strong> của người dùng{' '}
              <strong className="text-highlight">{user.full_name}</strong> (<code>{user.email}</code>)? Người dùng này sẽ bị tạm ngưng toàn bộ quyền đăng nhập vào hệ thống EngMaster.
            </>
          ),
        }
      case 'unlock':
        return {
          icon: <Unlock size={22} className="confirm-icon-unlock" />,
          iconBgClass: 'confirm-icon-wrapper-success',
          title: 'Xác nhận Mở khóa tài khoản',
          actionBtnClass: 'btn-confirm-success',
          actionBtnText: 'Mở khóa ngay',
          description: (
            <>
              Bạn có chắc chắn muốn <strong>mở khóa</strong> cho tài khoản của{' '}
              <strong className="text-highlight">{user.full_name}</strong> (<code>{user.email}</code>)? Người dùng sẽ có thể đăng nhập và sử dụng hệ thống bình thường.
            </>
          ),
        }
      case 'delete':
        return {
          icon: <Trash2 size={22} className="confirm-icon-delete" />,
          iconBgClass: 'confirm-icon-wrapper-danger',
          title: 'Xác nhận Xóa người dùng vĩnh viễn',
          actionBtnClass: 'btn-confirm-danger',
          actionBtnText: 'Xóa vĩnh viễn',
          description: (
            <>
              Bạn có chắc chắn muốn <strong>xóa người dùng</strong>{' '}
              <strong className="text-highlight">{user.full_name}</strong> (<code>{user.email}</code>) khỏi hệ thống? Hành động này sẽ xóa dữ liệu vĩnh viễn khỏi cơ sở dữ liệu Supabase và <strong>không thể hoàn tác</strong>.
            </>
          ),
        }
    }
  }

  const config = getModalConfig()

  return (
    <div className="modal-backdrop">
      <div className="modal-card confirm-modal-card">
        {/* Header */}
        <div className="confirm-modal-header">
          <div className="confirm-modal-header-left">
            <div className={`confirm-icon-box ${config.iconBgClass}`}>
              {config.icon}
            </div>
            <div>
              <h3 className="confirm-modal-title">{config.title}</h3>
              <p className="confirm-modal-target">Tài khoản: {user.email}</p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="confirm-modal-body">
          <div className="confirm-warning-box">
            <AlertTriangle size={18} className="warning-note-icon" />
            <div className="confirm-modal-desc">{config.description}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="confirm-modal-footer">
          <button
            type="button"
            className="modal-cancel-btn"
            onClick={onClose}
            disabled={loading}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className={`modal-submit-btn ${config.actionBtnClass}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                <span>Đang xử lý...</span>
              </>
            ) : (
              config.actionBtnText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
