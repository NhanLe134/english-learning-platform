import { useEffect } from 'react'
import { QuanLyNguoiDungPage } from './pages/quan_ly_nguoi_dung'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { AuthProvider } from './pages/auth/AuthContext'
import { useAuth } from './pages/auth/auth-context'

function AppRoutes() {
  const { initializationError, isInitializing, user } = useAuth()
  const isAdminUsersRoute = window.location.pathname === '/admin/users'

  useEffect(() => {
    if (isAdminUsersRoute && !isInitializing && user?.role !== 'ADMIN') {
      window.location.replace('/login')
    } else if (
      !isAdminUsersRoute &&
      (window.location.pathname === '/' || window.location.pathname === '/login') &&
      !isInitializing &&
      user?.role === 'ADMIN'
    ) {
      window.location.replace('/admin/users')
    }
  }, [isAdminUsersRoute, isInitializing, user])

  if (isAdminUsersRoute && (isInitializing || user?.role !== 'ADMIN')) {
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
    case '/register':
      page = <RegisterPage />
      break
    case '/forgot-password':
      page = <ForgotPasswordPage />
      break
    case '/reset-password':
      page = <ResetPasswordPage />
      break
    case '/':
    case '/login':
    default:
      page = <LoginPage />
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
