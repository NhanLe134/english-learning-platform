import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, RefreshCw, AlertTriangle, Download } from 'lucide-react'
import { Sidebar } from '../quan_ly_nguoi_dung/components/Sidebar'
import { TopHeader } from '../quan_ly_nguoi_dung/components/TopHeader'
import { OrderFilterBar } from './components/OrderFilterBar'
import { OrderTable } from './components/OrderTable'
import { OrderPagination } from './components/OrderPagination'
import { OrderDetailModal } from './components/OrderDetailModal'
import { paymentApi } from './services/paymentApi'
import { useAuth } from '../auth/auth-context'
import type {
  PaymentFilterState,
  AdminPaymentOrder,
  PaginationInfo,
} from './types'
import '../quan_ly_nguoi_dung/quan_ly_nguoi_dung.css'
import './quan_ly_thanh_toan.css'

export const QuanLyThanhToanPage: React.FC = () => {
  const { accessToken, refreshSession } = useAuth()

  // State for filters & pagination
  const [filters, setFilters] = useState<PaymentFilterState>({
    search: '',
    status: 'ALL',
    enrollment: 'ALL',
    courseId: undefined,
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 20,
    sortBy: 'created_at',
    sortOrder: 'desc',
  })

  // State for order data
  const [orders, setOrders] = useState<AdminPaymentOrder[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  })
  const [loading, setLoading] = useState<boolean>(true)
  const [exporting, setExporting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())

  // State for detail modal
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean
    order: AdminPaymentOrder | null
    loading: boolean
  }>({
    isOpen: false,
    order: null,
    loading: false,
  })

  // State for toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  // Load orders from backend API
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const ordersResult = await paymentApi.getOrders(
        filters,
        accessToken,
        async () => (await refreshSession()).accessToken
      )
      setOrders(ordersResult.items)
      setPagination(ordersResult)
      setSelectedOrderIds(new Set())
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ'
      setError(errMsg)
      setOrders([])
      setPagination({ page: 1, limit: 20, total: 0, totalPages: 1 })
      setSelectedOrderIds(new Set())
    } finally {
      setLoading(false)
    }
  }, [accessToken, filters, refreshSession])

  // Fetch orders: immediate on page/filter change, debounced only on search input typing
  const isFirstMount = useRef(true)
  const prevSearchRef = useRef(filters.search)

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      void loadOrders()
      return
    }

    const searchChanged = prevSearchRef.current !== filters.search
    prevSearchRef.current = filters.search

    if (searchChanged) {
      const timer = setTimeout(() => {
        void loadOrders()
      }, 300)
      return () => clearTimeout(timer)
    }

    void loadOrders()
  }, [loadOrders, filters.search])

  // Handle filter changes
  const handleFilterChange = useCallback((updates: Partial<PaymentFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }))
  }, [])

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }))
  }, [])

  // Handle page size change
  const handlePageSizeChange = useCallback((newLimit: number) => {
    setFilters((prev) => ({ ...prev, limit: newLimit, page: 1 }))
  }, [])

  // Handle view detail
  const loadOrderDetail = useCallback(async (
    orderId: string,
    fallbackOrder: AdminPaymentOrder | null = null
  ) => {
    setDetailModal({ isOpen: true, order: fallbackOrder, loading: true })
    try {
      const detailedOrder = await paymentApi.getOrderDetail(
        orderId,
        accessToken,
        async () => (await refreshSession()).accessToken
      )
      if (new URLSearchParams(window.location.search).get('orderId') === orderId) {
        setDetailModal({ isOpen: true, order: detailedOrder, loading: false })
      }
    } catch {
      if (new URLSearchParams(window.location.search).get('orderId') === orderId) {
        setDetailModal({ isOpen: true, order: fallbackOrder, loading: false })
      }
    }
  }, [accessToken, refreshSession])

  const handleViewDetail = useCallback((order: AdminPaymentOrder) => {
    const url = new URL(window.location.href)
    url.searchParams.set('orderId', order.orderId)
    window.history.replaceState({}, '', url.toString())
    void loadOrderDetail(order.orderId, order)
  }, [loadOrderDetail])

  const handleCloseDetail = useCallback(() => {
    setDetailModal({ isOpen: false, order: null, loading: false })
    const url = new URL(window.location.href)
    if (url.searchParams.has('orderId')) {
      url.searchParams.delete('orderId')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  // Auto-open modal if orderId is in URL query
  const handledInitialOrderIdRef = useRef(false)
  useEffect(() => {
    if (handledInitialOrderIdRef.current || !accessToken) return
    const urlParams = new URLSearchParams(window.location.search)
    const targetOrderId = urlParams.get('orderId')
    if (!targetOrderId) return

    handledInitialOrderIdRef.current = true
    const found = orders.find((o) => o.orderId === targetOrderId)
    if (found) {
      queueMicrotask(() => void loadOrderDetail(targetOrderId, found))
    } else {
      queueMicrotask(() => void loadOrderDetail(targetOrderId))
    }
  }, [accessToken, loadOrderDetail, orders])

  // Handle selection
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(new Set(orders.map((o) => o.orderId)))
    } else {
      setSelectedOrderIds(new Set())
    }
  }, [orders])

  const handleSelectOrder = useCallback((orderId: string, checked: boolean) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(orderId)
      else next.delete(orderId)
      return next
    })
  }, [])

  const handleExportData = async () => {
    try {
      setExporting(true)
      let ordersToExport: AdminPaymentOrder[] = []

      // If specific orders are selected, export those
      if (selectedOrderIds.size > 0) {
        ordersToExport = orders.filter((o) => selectedOrderIds.has(o.orderId))
      } else {
        // Otherwise fetch all matching orders using current filters (up to 1000 items)
        const res = await paymentApi.getOrders(
          { ...filters, page: 1, limit: 1000 },
          accessToken,
          async () => (await refreshSession()).accessToken
        )
        ordersToExport = res.items
      }

      if (ordersToExport.length === 0) {
        showToast('error', 'Không có dữ liệu đơn hàng nào để xuất.')
        return
      }

      paymentApi.exportOrdersToCsv(ordersToExport)
      showToast('success', `Đã xuất thành công ${ordersToExport.length} đơn hàng ra file CSV!`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xuất dữ liệu'
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

  const hasData = orders.length > 0

  return (
    <div className="payment-management-page-container">
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
      <Sidebar activeTab="thanh_toan" onTabChange={navigateAdmin} />

      {/* Main Content Area */}
      <div className="payment-management-main-wrapper">
        {/* Top Header */}
        <TopHeader currentPage="Quản lý thanh toán" />

        {/* Page Content */}
        <main className="payment-management-content">
          {/* API error banner (Trạng thái 2 – Lỗi tải dữ liệu) */}
          {error && (
            <div className="api-error-banner">
              <div className="error-banner-left">
                <AlertTriangle size={20} className="warning-note-icon" />
                <div>
                  <strong>Không tải được danh sách đơn hàng:</strong> {error}
                </div>
              </div>
              <div className="error-banner-actions">
                <button
                  type="button"
                  className="btn-banner-action"
                  onClick={() => {
                    void loadOrders()
                  }}
                  disabled={loading}
                >
                  <RefreshCw size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  Thử lại
                </button>
              </div>
            </div>
          )}

          {/* Page Header */}
          <div className="page-header">
            <div className="page-header-content">
              <h1>Quản lý thanh toán</h1>
              <p>
                Theo dõi đơn hàng, kiểm tra giao dịch và quản lý trạng thái thanh toán khóa học.
              </p>
            </div>
            <button
              type="button"
              className="btn-export"
              onClick={() => {
                void handleExportData()
              }}
              disabled={loading || exporting}
            >
              <Download size={16} />
              <span>{exporting ? 'Đang xuất dữ liệu…' : 'Export dữ liệu'}</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <OrderFilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
          />

          {/* Table Section */}
          <div className="table-section">
            <div className="table-header">
              <h2>Danh sách đơn hàng thanh toán</h2>
            </div>

            {/* Order Data Table */}
            <OrderTable
              orders={orders}
              loading={loading}
              onViewDetail={handleViewDetail}
              onSelectAll={handleSelectAll}
              onSelectOrder={handleSelectOrder}
              selectedOrderIds={selectedOrderIds}
            />
          </div>

          {/* Table Footer: Pagination */}
          {!error && !loading && hasData && (
            <OrderPagination
              pagination={pagination}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </main>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={detailModal.isOpen}
        order={detailModal.order}
        loading={detailModal.loading}
        onClose={handleCloseDetail}
      />
    </div>
  )
}

export default QuanLyThanhToanPage
