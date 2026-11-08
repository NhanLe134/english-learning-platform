import { useEffect } from 'react'
import { QuanLyNguoiDungPage } from './pages/quan_ly_nguoi_dung'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { OAuthCallbackPage } from './pages/auth/OAuthCallbackPage'
import { CourseManagementPage } from './pages/courses/CourseManagementPage'
import { CourseDetailPage } from './pages/courses/CourseDetailPage'
import { CourseListPage } from './pages/courses/CourseListPage'
import { CheckoutPage } from './pages/checkout/CheckoutPage'
import { CheckoutSuccessPage } from './pages/checkout/CheckoutSuccessPage'
import { AuthProvider } from './pages/auth/AuthContext'
import { useAuth } from './pages/auth/auth-context'

function AppRoutes() {
  const { initializationError, isInitializing, user } = useAuth()
  const pathname = window.location.pathname
  const isAdminRoute = ['/admin/users', '/admin/courses'].includes(pathname)

  useEffect(() => {
    if (isAdminRoute && !isInitializing && user?.role !== 'ADMIN') {
      window.location.replace('/login')
    } else if (
      !isAdminRoute &&
      window.location.pathname === '/login' &&
      !isInitializing &&
      user?.role === 'ADMIN'
    ) {
      window.location.replace('/admin/users')
    }
  }, [isAdminRoute, isInitializing, user])

  if (isAdminRoute && (isInitializing || user?.role !== 'ADMIN')) {
    return (
      <main className="auth-route-status" role="status">
        {isInitializing ? 'Đang xác minh phiên đăng nhập…' : 'Đang chuyển đến trang đăng nhập…'}
      </main>
    )
  }

  let page
  switch (window.location.pathname) {
    case '/admin/users':
      page = <QuanLyNguoiDungPage />
      break
    case '/admin/courses':
      page = <CourseManagementPage />
      break
    case '/courses':
    case '/khoa-hoc':
      page = <CourseListPage />
      break
    case '/register':
      page = <RegisterPage />
      break
    case '/forgot-password':
      page = <ForgotPasswordPage />
      break
    case '/auth/callback':
      page = <OAuthCallbackPage />
      break
    case '/checkout':
    case '/thanh-toan':
      page = <CheckoutPage />
      break
    case '/checkout/success':
    case '/payment-success':
    case '/thanh-toan/thanh-cong':
      page = <CheckoutSuccessPage />
      break
    case '/':
      page = <CourseListPage />
      break
    case '/login':
      page = <LoginPage />
      break
    default:
      {
        const courseRoute = pathname.match(/^\/(?:courses|khoa-hoc)\/([^/]+)$/)
        page = courseRoute
          ? <CourseDetailPage identifier={decodeURIComponent(courseRoute[1])} />
          : <CourseListPage />
      }
  }
  return (
    <>
      {initializationError && (
        <div className="auth-global-error" role="alert">{initializationError}</div>
      )}
      {page}
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
