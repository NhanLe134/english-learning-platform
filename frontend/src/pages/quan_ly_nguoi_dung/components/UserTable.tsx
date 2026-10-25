import React, { useState } from 'react'
import { Check, Copy, GraduationCap, ShieldCheck, CheckCircle2, Lock, Unlock, Trash2 } from 'lucide-react'
import type { UserProfile, UserRole } from '../types'
import type { ConfirmActionType } from './ConfirmActionModal'

interface UserTableProps {
  users: UserProfile[]
  loading?: boolean
  onActionClick: (user: UserProfile, action: ConfirmActionType) => void
}

export const UserTable: React.FC<UserTableProps> = ({ users, loading, onActionClick }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopyHash = (id: string, hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedId(id)
    setTimeout(() => {
      setCopiedId(null)
    }, 2000)
  }

  // Format hash for clean display: "$2b$12$e8K9...7aXp"
  const formatHash = (hash: string) => {
    if (!hash || hash.length < 16) return hash || '••••••••'
    const start = hash.slice(0, 11)
    const end = hash.slice(-4)
    return `${start}...${end}`
  }

  // Format date & time into two lines (e.g., 15/10/2024 and 14:30)
  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return { date: dateStr, time: '' }
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')

      return {
        date: `${day}/${month}/${year}`,
        time: `${hours}:${minutes}`,
      }
    } catch {
      return { date: dateStr, time: '' }
    }
  }

  const renderRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'STUDENT':
        return (
          <span className="role-badge role-student">
            <span className="student-dot">●</span> Học viên
          </span>
        )
      case 'TEACHER':
        return (
          <span className="role-badge role-teacher">
            <GraduationCap size={14} className="role-icon" /> Giáo viên
          </span>
        )
      case 'ADMIN':
        return (
          <span className="role-badge role-admin">
            <ShieldCheck size={14} className="role-icon" /> Admin
          </span>
        )
      default:
        return <span className="role-badge role-student">{role}</span>
    }
  }

  return (
    <div className="user-table-card">
      <div className="table-responsive">
        <table className="user-table">
          <thead>
            <tr>
              <th className="th-user">NGƯỜI DÙNG & AVATAR</th>
              <th className="th-contact">EMAIL & SỐ ĐIỆN THOẠI</th>
              <th className="th-role">VAI TRÒ</th>
              <th className="th-password">MẬT KHẨU</th>
              <th className="th-date">NGÀY TẠO</th>
              <th className="th-actions text-center">THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="table-loading-cell">
                  <div className="spinner"></div>
                  <span>Đang tải danh sách người dùng từ Supabase...</span>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-empty-cell">
                  Không tìm thấy người dùng nào trong cơ sở dữ liệu.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const { date, time } = formatDateTime(user.created_at)
                const isLocked = user.status === 'locked'

                return (
                  <tr key={user.id} className={`user-row ${isLocked ? 'row-locked' : ''}`}>
                    {/* 1. User & Avatar */}
                    <td className="td-user">
                      <div className="user-info-group">
                        <div className="avatar-wrapper">
                          <img
                            src={
                              user.avatar_url ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                user.full_name
                              )}&background=F60005&color=fff&size=100`
                            }
                            alt={user.full_name}
                            className={`user-avatar ${isLocked ? 'avatar-muted' : ''}`}
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                user.full_name
                              )}&background=F60005&color=fff&size=100`
                            }}
                          />
                        </div>
                        <div className="user-name-group">
                          <div className="user-name-row">
                            <span className={`user-full-name ${isLocked ? 'name-strikethrough' : ''}`}>
                              {user.full_name}
                            </span>
                            {user.is_verified && (
                              <CheckCircle2 size={15} className="verified-badge-icon" />
                            )}
                          </div>
                          {user.nickname && (
                            <span className={`user-nickname ${isLocked ? 'nickname-violate' : ''}`}>
                              {user.nickname}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Email & Phone */}
                    <td className="td-contact">
                      <div className="contact-group">
                        <span className="contact-email">{user.email}</span>
                        {user.phone_number && (
                          <span className="contact-phone">{user.phone_number}</span>
                        )}
                      </div>
                    </td>

                    {/* 3. Role */}
                    <td className="td-role">{renderRoleBadge(user.role)}</td>

                    {/* 4. Password Hash with Copy */}
                    <td className="td-password">
                      <div className="password-hash-pill">
                        <span className="hash-code">{formatHash(user.password_hash)}</span>
                        <button
                          type="button"
                          className="copy-hash-btn"
                          title="Sao chép toàn bộ mã Hash"
                          onClick={() => handleCopyHash(user.id, user.password_hash)}
                        >
                          {copiedId === user.id ? (
                            <Check size={14} className="copied-icon" />
                          ) : (
                            <Copy size={14} className="copy-icon" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* 5. Created Date */}
                    <td className="td-date">
                      <div className="date-group">
                        <span className="date-day">{date}</span>
                        {time && <span className="date-time">{time}</span>}
                      </div>
                    </td>

                    {/* 6. Action Column: Lock/Unlock & Delete */}
                    <td className="td-actions text-center">
                      <div className="action-buttons-group">
                        {/* Lock / Unlock Toggle Button */}
                        <button
                          type="button"
                          className={`action-btn-pill ${isLocked ? 'action-btn-locked' : 'action-btn-unlocked'}`}
                          title={isLocked ? 'Nhấn để mở khóa tài khoản' : 'Nhấn để khóa tài khoản'}
                          onClick={() => onActionClick(user, isLocked ? 'unlock' : 'lock')}
                        >
                          {isLocked ? (
                            <>
                              <Lock size={15} className="action-icon-lock" />
                              <span className="action-btn-label">Bị khóa</span>
                            </>
                          ) : (
                            <>
                              <Unlock size={15} className="action-icon-unlock" />
                              <span className="action-btn-label">Mở</span>
                            </>
                          )}
                        </button>

                        {/* Delete User Button */}
                        <button
                          type="button"
                          className="action-btn-delete"
                          title="Xóa người dùng vĩnh viễn khỏi CSDL Supabase"
                          onClick={() => onActionClick(user, 'delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
