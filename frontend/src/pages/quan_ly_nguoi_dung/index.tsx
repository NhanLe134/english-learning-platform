import React, { useState, useEffect, useCallback } from 'react'
import { Plus, CheckCircle2, AlertCircle, Database, RefreshCw, AlertTriangle } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { TopHeader } from './components/TopHeader'
import { UserFilterBar } from './components/UserFilterBar'
import { UserTable } from './components/UserTable'
import { UserPagination } from './components/UserPagination'
import { CreateUserModal } from './components/CreateUserModal'
import { ConfirmActionModal, type ConfirmActionType } from './components/ConfirmActionModal'
import { EditUserModal, type EditUserPayload } from './components/EditUserModal'
import { userApi } from './services/userApi'
import { useAuth } from '../auth/auth-context'
import type { CreateUserInput, PaginationInfo, UserFilterState, UserProfile } from './types'
import './quan_ly_nguoi_dung.css'

export const QuanLyNguoiDungPage: React.FC = () => {
  const { accessToken, refreshSession } = useAuth()
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

  // State for user-management API failures
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
  const [editingTeacher, setEditingTeacher] = useState<UserProfile | null>(null)

  // Lưu chỉnh sửa hồ sơ người dùng (mọi vai trò) qua PATCH /users/:id/profile
  const handleUpdateUser = async (input: EditUserPayload) => {
    if (!editingTeacher) return
    await userApi.updateUserProfile(editingTeacher.id, input, accessToken, async () => (await refreshSession()).accessToken)
    setEditingTeacher(null)
    showToast('success', 'Đã cập nhật hồ sơ người dùng.')
    await loadUsers()
  }

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
      const res = await userApi.getUsers(
        filters,
        accessToken,
        async () => (await refreshSession()).accessToken
      )
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
  }, [accessToken, filters, refreshSession])

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
        await userApi.updateStatus(
          user.id,
          'locked',
          accessToken,
          async () => (await refreshSession()).accessToken,
          user.role
        )
        showToast('success', `Đã khóa tài khoản của ${user.full_name} (${user.email})`)
      } else if (type === 'unlock') {
        if (user.role === 'TEACHER' && user.status === 'pending') {
          await userApi.resendTeacherActivation(user.id, accessToken, async () => (await refreshSession()).accessToken)
          showToast('success', `Đã gửi lại liên kết kích hoạt đến ${user.email}`)
        } else {
          await userApi.updateStatus(user.id, 'active', accessToken, async () => (await refreshSession()).accessToken, user.role)
          showToast('success', `Đã mở khóa tài khoản của ${user.full_name} (${user.email})`)
        }
      } else if (type === 'delete') {
        if (user.role === 'TEACHER') {
          await userApi.updateStatus(user.id, 'deactivated', accessToken, async () => (await refreshSession()).accessToken, user.role)
          showToast('success', `Đã vô hiệu hóa tài khoản ${user.full_name}`)
        } else {
          await userApi.deleteUser(user.id, accessToken, async () => (await refreshSession()).accessToken)
          showToast('success', `Đã xóa vĩnh viễn người dùng ${user.full_name} khỏi Supabase`)
        }
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
      const created = await userApi.createUser(
        data,
        accessToken,
        async () => (await refreshSession()).accessToken
      )
      showToast(
        'success',
        created.role === 'TEACHER'
          ? `Đã tạo tài khoản giáo viên. Giáo viên có thể đăng nhập bằng mật khẩu khởi tạo: ${created.email}`
          : `Đã lưu quản trị viên: ${created.full_name} (${created.email})`
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
      const res = await userApi.seedSupabase(
        accessToken,
        async () => (await refreshSession()).accessToken
      )
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
      await userApi.exportCsv(
        filters,
        accessToken,
        async () => (await refreshSession()).accessToken
      )
      showToast('success', 'Đã tải xuống file CSV danh sách người dùng từ Supabase thành công!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xuất file CSV'
      showToast('error', msg)
    } finally {
      setExporting(false)
    }
  }

  const navigateAdmin = (tab: string) => {
    if (tab === 'quan_ly_nguoi_dung') window.location.assign('/admin/users')
    if (tab === 'khoa_hoc_bai_tap') window.location.assign('/admin/courses')
    if (tab === 'thanh_toan') window.location.assign('/admin/payments')
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
      <Sidebar activeTab="quan_ly_nguoi_dung" onTabChange={navigateAdmin} />

      {/* Main Content Area (Crisp White Background) */}
      <div className="user-management-main-wrapper">
        {/* Top Header */}
        <TopHeader />

        {/* Page Content */}
        <main className="user-management-content">
          {/* User-management API error banner */}
          {supabaseError && (
            <div className="supabase-status-banner">
              <div className="supabase-banner-left">
                <AlertTriangle size={20} className="warning-note-icon" />
                <div>
                  <strong>Không tải được danh sách người dùng:</strong> {supabaseError}
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
            <h1 className="page-main-title">Quản Lý Người Dùng</h1>
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
            onEditClick={setEditingTeacher}
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
      <EditUserModal key={editingTeacher?.id ?? 'none'} user={editingTeacher} onClose={() => setEditingTeacher(null)} onSave={handleUpdateUser} />
    </div>
  )
}

export default QuanLyNguoiDungPage
