import { useEffect } from 'react'
import { QuanLyNguoiDungPage } from './pages/quan_ly_nguoi_dung'
import { HomePage } from './pages/home/HomePage'
import { AboutPage } from './pages/about/AboutPage'
import { EbooksPage } from './pages/ebooks/EbooksPage'
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
  const isAdminRoute = pathname.startsWith('/admin')
  const isAuthCallback = pathname === '/auth/callback'
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(pathname)

  useEffect(() => {
    if (isInitializing || isAuthCallback) return

    if (user?.role === 'ADMIN') {
      // 1 trình duyệt 1 tài khoản: Đã đăng nhập Admin thì chỉ hiển thị trang Admin.
      // Dù mở tab mới hay nhập bất kỳ link nào (/, /courses, /login, /register...), đều tự chuyển về trang quản trị
      if (!isAdminRoute) {
        window.location.replace('/admin/users')
      }
    } else if (user) {
      // Học viên đã đăng nhập: không vào được admin và không mở lại trang login/register
      if (isAdminRoute) {
        window.location.replace('/login')
      } else if (isAuthPage) {
        window.location.replace(`/checkout${window.location.search}`)
      }
    } else {
      // Chưa đăng nhập mà truy cập route admin
      if (isAdminRoute) {
        window.location.replace('/login')
      }
    }
  }, [isAdminRoute, isAuthCallback, isAuthPage, isInitializing, user])

  // Trạng thái đang xác minh quyền hoặc đang điều hướng
  if (!isAuthCallback) {
    if (user?.role === 'ADMIN' && !isAdminRoute) {
      return (
        <main className="auth-route-status" role="status">
          Đang chuyển đến trang quản trị…
        </main>
      )
    }

    if (isAdminRoute && (isInitializing || user?.role !== 'ADMIN')) {
      return (
        <main className="auth-route-status" role="status">
          {isInitializing ? 'Đang xác minh phiên đăng nhập…' : 'Đang chuyển đến trang đăng nhập…'}
        </main>
      )
    }

    if (user && isAuthPage) {
      return (
        <main className="auth-route-status" role="status">
          Đang chuyển đến trang thanh toán…
        </main>
      )
    }
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
    case '/ebooks':
    case '/sach-dien-tu':
      page = <EbooksPage />
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
    case '/about':
      page = <AboutPage />
      break
    case '/home':
      page = <HomePage />
      break
    case '/':
      page = <HomePage />
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
