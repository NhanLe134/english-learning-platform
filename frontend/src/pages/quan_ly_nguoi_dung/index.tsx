import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Ticket, CheckCircle2, AlertCircle, Database, RefreshCw, AlertTriangle } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { TopHeader } from './components/TopHeader'
import { UserFilterBar } from './components/UserFilterBar'
import { UserTable } from './components/UserTable'
import { UserPagination } from './components/UserPagination'
import { CreateUserModal } from './components/CreateUserModal'
import { ConfirmActionModal, type ConfirmActionType } from './components/ConfirmActionModal'
import { userApi } from './services/userApi'
import type { CreateUserInput, PaginationInfo, UserFilterState, UserProfile } from './types'
import './quan_ly_nguoi_dung.css'

export const QuanLyNguoiDungPage: React.FC = () => {
  // State for filters & pagination
  const [filters, setFilters] = useState<UserFilterState>({
    search: '',
    role: 'ALL',
    status: 'ALL',
    page: 1,
    limit: 10,
  })

  // State for user data
  const [users, setUsers] = useState<UserProfile[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  })
  const [loading, setLoading] = useState<boolean>(false)
  const [exporting, setExporting] = useState<boolean>(false)

  // State for Supabase connection status / error banner
  const [supabaseError, setSupabaseError] = useState<string | null>(null)
  const [isSeeding, setIsSeeding] = useState<boolean>(false)

  // State for create modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false)

  // State for action confirmation modal (Lock / Unlock / Delete)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    type: ConfirmActionType
    user: UserProfile | null
    loading: boolean
  }>({
    isOpen: false,
    type: 'lock',
    user: null,
    loading: false,
  })

  // State for toast feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => {
      setToast(null)
    }, 4000)
  }

  // Load user data directly from Supabase via API
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await userApi.getUsers(filters)
      setUsers(res.data)
      setPagination(res.pagination)
      setSupabaseError(null)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ'
      setSupabaseError(errMsg)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Debounced fetch on filter or page change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers()
    }, 200)

    return () => clearTimeout(timer)
  }, [loadUsers])

  // Handle filter changes
  const handleFilterChange = (updates: Partial<UserFilterState>) => {
    setFilters((prev) => ({
      ...prev,
      ...updates,
    }))
  }

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }))
  }

  // Open confirmation modal for lock/unlock or delete
  const handleOpenActionModal = (user: UserProfile, type: ConfirmActionType) => {
    setConfirmModal({
      isOpen: true,
      type,
      user,
      loading: false,
    })
  }

  // Execute confirmed action (Lock, Unlock, or Delete)
  const handleExecuteAction = async () => {
    const { user, type } = confirmModal
    if (!user) return

    try {
      setConfirmModal((prev) => ({ ...prev, loading: true }))

      if (type === 'lock') {
        await userApi.updateStatus(user.id, 'locked')
        showToast('success', `Đã khóa tài khoản của ${user.full_name} (${user.email})`)
      } else if (type === 'unlock') {
        await userApi.updateStatus(user.id, 'active')
        showToast('success', `Đã mở khóa tài khoản của ${user.full_name} (${user.email})`)
      } else if (type === 'delete') {
        await userApi.deleteUser(user.id)
        showToast('success', `Đã xóa vĩnh viễn người dùng ${user.full_name} khỏi Supabase`)
      }

      setConfirmModal({ isOpen: false, type: 'lock', user: null, loading: false })
      await loadUsers()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Thao tác thất bại'
      showToast('error', msg)
      setConfirmModal((prev) => ({ ...prev, loading: false }))
    }
  }

  // Handle create user submit
  const handleCreateUser = async (data: CreateUserInput) => {
    try {
      const created = await userApi.createUser(data)
      showToast(
        'success',
        `Đã lưu người dùng vào Supabase: ${created.full_name} (${created.role === 'ADMIN' ? 'Quản trị viên' : 'Giáo viên'})`
      )
      await loadUsers()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tạo tài khoản'
      showToast('error', msg)
      throw err
    }
  }

  // Handle seed data into Supabase
  const handleSeedData = async () => {
    try {
      setIsSeeding(true)
      const res = await userApi.seedSupabase()
      showToast('success', res.message || 'Đã seed dữ liệu mẫu vào Supabase thành công!')
      await loadUsers()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi seed dữ liệu Supabase'
      showToast('error', msg)
    } finally {
      setIsSeeding(false)
    }
  }

  // Handle export CSV
  const handleExportCsv = async () => {
    try {
      setExporting(true)
      await userApi.exportCsv(filters)
      showToast('success', 'Đã tải xuống file CSV danh sách người dùng từ Supabase thành công!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xuất file CSV'
      showToast('error', msg)
    } finally {
      setExporting(false)
    }
  }

  // Handle "Tạo mã đăng ký" feature
  const handleGenerateRegistrationCode = () => {
    const code = `ENG-${Math.random().toString(36).substring(2, 8).toUpperCase()}-2025`
    navigator.clipboard.writeText(code)
    showToast('success', `Đã tạo & sao chép mã đăng ký mới: ${code}`)
  }

  return (
    <div className="user-management-page-container">
      {/* Toast Notification Container */}
      {toast && (
        <div className="app-toast-container">
          <div className={`app-toast ${toast.type}`}>
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} className="toast-icon-success" />
            ) : (
              <AlertCircle size={18} className="toast-icon-error" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Left Navigation Sidebar */}
      <Sidebar activeTab="quan_ly_nguoi_dung" />

      {/* Main Content Area (Crisp White Background) */}
      <div className="user-management-main-wrapper">
        {/* Top Header */}
        <TopHeader />

        {/* Page Content */}
        <main className="user-management-content">
          {/* Supabase Status / Error Alert Banner */}
          {supabaseError && (
            <div className="supabase-status-banner">
              <div className="supabase-banner-left">
                <AlertTriangle size={20} className="warning-note-icon" />
                <div>
                  <strong>Chưa kết nối được Supabase:</strong> {supabaseError}
                  <div style={{ fontSize: '12px', marginTop: '2px', color: '#78350F' }}>
                    💡 Hãy điền <code>SUPABASE_URL</code> và <code>SUPABASE_SERVICE_ROLE_KEY</code> vào file <code>backend/.env</code> rồi khởi động lại server.
                  </div>
                </div>
              </div>
              <div className="supabase-banner-actions">
                <button
                  type="button"
                  className="btn-banner-action"
                  onClick={loadUsers}
                  disabled={loading}
                >
                  <RefreshCw size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  Thử lại
                </button>
                <button
                  type="button"
                  className="btn-banner-action"
                  onClick={handleSeedData}
                  disabled={isSeeding}
                >
                  <Database size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  {isSeeding ? 'Đang seed...' : 'Seed dữ liệu'}
                </button>
              </div>
            </div>
          )}

          {/* Page Title & Top Actions Row */}
          <div className="page-title-row">
            <h1 className="page-main-title">QUẢN LÝ NGƯỜI DÙNG</h1>
            <div className="page-top-actions">
              {/* Button: + Thêm Giáo viên / Admin (Primary Red #F60005) */}
              <button
                type="button"
                className="btn-primary-red"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus size={18} />
                <span>Thêm Giáo viên / Admin</span>
              </button>

              {/* Button: Tạo mã Đăng ký (Secondary Outline) */}
              <button
                type="button"
                className="btn-secondary-outline"
                onClick={handleGenerateRegistrationCode}
                title="Tạo mã đăng ký khóa học cho học viên"
              >
                <Ticket size={17} />
                <span>Tạo mã Đăng ký</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <UserFilterBar
            filters={filters}
            totalUsers={pagination.total}
            onFilterChange={handleFilterChange}
          />

          {/* User Data Table with THAO TÁC column */}
          <UserTable
            users={users}
            loading={loading}
            onActionClick={handleOpenActionModal}
          />

          {/* Table Footer: Count, Export CSV, and Pagination */}
          <UserPagination
            pagination={pagination}
            onPageChange={handlePageChange}
            onExportCsv={handleExportCsv}
            exporting={exporting}
          />
        </main>
      </div>

      {/* Create User Modal Popup */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateUser}
      />

      {/* Confirmation Modal for Lock / Unlock / Delete */}
      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        type={confirmModal.type}
        user={confirmModal.user}
        loading={confirmModal.loading}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleExecuteAction}
      />
    </div>
  )
}

export default QuanLyNguoiDungPage
