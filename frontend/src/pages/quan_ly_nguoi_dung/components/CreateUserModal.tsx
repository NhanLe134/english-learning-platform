import React, { useState } from 'react'
import { X, UserPlus, RefreshCw, AlertCircle } from 'lucide-react'
import type { CreateUserInput } from '../types'

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateUserInput) => Promise<void>
}

// Helper to generate temporary secure password
function generateTempPassword(): string {
  const years = [2025, 2026]
  const year = years[Math.floor(Math.random() * years.length)]
  const specials = ['#Temp', '@Pass', '!Secure', '#Master']
  const special = specials[Math.floor(Math.random() * specials.length)]
  const randNum = Math.floor(100 + Math.random() * 900)
  return `EngMaster@${year}${special}${randNum}`
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [role, setRole] = useState<'TEACHER' | 'ADMIN'>('TEACHER')
  const [password, setPassword] = useState('EngMaster@2025#Temp')

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleRegeneratePassword = () => {
    setPassword(generateTempPassword())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!fullName.trim()) {
      setErrorMessage('Vui lòng nhập Họ và tên')
      return
    }

    if (!email.trim()) {
      setErrorMessage('Vui lòng nhập Email công vụ')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Định dạng email không hợp lệ')
      return
    }

    try {
      setSubmitting(true)
      await onSubmit({
        full_name: fullName.trim(),
        nickname: nickname.trim() || undefined,
        email: email.trim(),
        phone_number: phoneNumber.trim() || undefined,
        role,
        password: password.trim(),
      })

      // Reset form
      setFullName('')
      setNickname('')
      setEmail('')
      setPhoneNumber('')
      setPassword('EngMaster@2025#Temp')
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Đã xảy ra lỗi khi tạo tài khoản')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-header-icon-wrapper">
              <UserPlus className="modal-header-icon" size={20} />
            </div>
            <div>
              <h2 className="modal-title">Khởi tạo Tài khoản Giáo viên / Quản trị viên</h2>
              <p className="modal-subtitle">
                Cấp quyền truy cập hệ thống và phân vai trò nhân sự
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="modal-form">
          {errorMessage && (
            <div className="modal-alert-error">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Row 1: Full name & Nickname */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">
                Họ và tên <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Nguyễn Hoàng Nam"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Biệt danh / Nickname</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nam_IELTS"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
          </div>

          {/* Row 2: Email & Phone */}
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">
                Email công vụ <span className="required-star">*</span>
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="nam.nh@engmaster.edu.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input
                type="tel"
                className="form-input"
                placeholder="0987.654.321"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Row 3: Role Selector Cards */}
          <div className="form-group">
            <label className="form-label">
              Cấp quyền Vai trò <span className="required-star">*</span>
            </label>
            <div className="role-selection-grid">
              {/* Teacher Card */}
              <div
                className={`role-choice-card ${role === 'TEACHER' ? 'selected' : ''}`}
                onClick={() => setRole('TEACHER')}
                role="button"
                tabIndex={0}
              >
                <div className="role-choice-radio">
                  <span className={`radio-dot ${role === 'TEACHER' ? 'checked' : ''}`} />
                </div>
                <div className="role-choice-content">
                  <div className="role-choice-title">Giáo viên (Teacher)</div>
                  <div className="role-choice-desc">
                    Tạo đề thi, chấm bài viết, theo dõi học viên
                  </div>
                </div>
              </div>

              {/* Admin Card */}
              <div
                className={`role-choice-card ${role === 'ADMIN' ? 'selected' : ''}`}
                onClick={() => setRole('ADMIN')}
                role="button"
                tabIndex={0}
              >
                <div className="role-choice-radio">
                  <span className={`radio-dot ${role === 'ADMIN' ? 'checked' : ''}`} />
                </div>
                <div className="role-choice-content">
                  <div className="role-choice-title">Quản trị viên (Admin)</div>
                  <div className="role-choice-desc">
                    Toàn quyền hệ thống & quản trị mã
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Initial Password */}
          <div className="form-group">
            <label className="form-label">Mật khẩu khởi tạo</label>
            <div className="password-input-wrapper">
              <input
                type="text"
                className="form-input password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="regenerate-pwd-btn"
                title="Tạo mật khẩu ngẫu nhiên mới"
                onClick={handleRegeneratePassword}
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <p className="form-helper-note">
              Yêu cầu người dùng đổi mật khẩu ở lần đăng nhập đầu tiên.
            </p>
          </div>

          {/* Modal Footer Buttons */}
          <div className="modal-footer">
            <button
              type="button"
              className="modal-cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="modal-submit-btn"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="btn-spinner"></span>
                  <span>Đang khởi tạo...</span>
                </>
              ) : (
                'Tạo tài khoản ngay'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
