import { useEffect } from 'react'
import { QuanLyNguoiDungPage } from './pages/quan_ly_nguoi_dung'
import { QuanLyThanhToanPage } from './pages/quan_ly_thanh_toan'
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
import { StudentCoursesPage } from './pages/courses/StudentCoursesPage'
import { StudentCourseDetailPage } from './pages/courses/StudentCourseDetailPage'
import { CheckoutPage } from './pages/checkout/CheckoutPage'
import { CheckoutSuccessPage } from './pages/checkout/CheckoutSuccessPage'
import { WorkshopsPage } from './pages/workshops/WorkshopsPage'
import { DailyWordPage } from './pages/daily-word/DailyWordPage'
import { ContactPage } from './pages/contact/ContactPage'
import { AuthProvider } from './pages/auth/AuthContext'
import { useAuth } from './pages/auth/auth-context'
import { StudentDailyWordPopup } from './components/daily-word/StudentDailyWordPopup'

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
        // Redirect to role-appropriate default page – never blindly redirect to /checkout.
        // The checkout flow itself will navigate here when needed.
        window.location.replace('/my-courses')
      }
    } else {
      // Chưa đăng nhập mà truy cập route admin
      if (isAdminRoute) {
        window.location.replace('/login')
      }
    }
  }, [isAdminRoute, isAuthCallback, isAuthPage, isInitializing, pathname, user])

  // Trạng thái đang xác minh quyền hoặc đang điều hướng
  if (!isAuthCallback) {
    if (isInitializing && isAuthPage) {
      return (
        <main className="auth-route-status" role="status">
          Đang khôi phục phiên đăng nhập…
        </main>
      )
    }

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
          Đang chuyển đến trang khóa học…
        </main>
      )
    }
  }

  let page
  switch (window.location.pathname) {
    case '/admin/users':
      page = <QuanLyNguoiDungPage />
      break
    case '/admin/payments':
      page = <QuanLyThanhToanPage />
      break
    case '/admin/courses':
      page = <CourseManagementPage />
      break
    case '/daily-word':
    case '/admin/daily-word':
      page = <DailyWordPage />
      break
    case '/about':
    case '/ve-chung-toi':
      page = <AboutPage />
      break
    case '/courses':
    case '/khoa-hoc':
      page = user?.role === 'STUDENT' ? <StudentCoursesPage /> : <CourseListPage />
      break
    case '/student/courses':
    case '/my-courses':
    case '/student':
    case '/khoa-hoc-cua-toi':
      page = <StudentCoursesPage />
      break
    case '/ebooks':
    case '/ebook':
    case '/sach-dien-tu':
      page = <EbooksPage />
      break
    case '/workshops':
    case '/workshop':
      page = <WorkshopsPage />
      break
    case '/contact':
    case '/lien-he':
      page = <ContactPage />
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
    case '/home':
    case '/':
      page = <HomePage />
      break
    case '/login':
      page = <LoginPage />
      break
    default:
      {
        const studentCourseRoute = pathname.match(
          /^\/(?:student\/courses?|my-courses|khoa-hoc-cua-toi)\/([^/]+)$/
        )
        if (studentCourseRoute && studentCourseRoute[1]) {
          page = <StudentCourseDetailPage courseSlug={decodeURIComponent(studentCourseRoute[1])} />
          break
        }

        const courseRoute = pathname.match(/^\/(?:courses|khoa-hoc)\/([^/]+)$/)
        if (courseRoute && courseRoute[1]) {
          const decodedSlug = decodeURIComponent(courseRoute[1])
          page = user?.role === 'STUDENT'
            ? <StudentCourseDetailPage courseSlug={decodedSlug} />
            : <CourseDetailPage identifier={decodedSlug} />
          break
        }

        page = user?.role === 'STUDENT' ? <StudentCoursesPage /> : <CourseListPage />
      }
  }
  return (
    <>
      {initializationError && (
        <div className="auth-global-error" role="alert">{initializationError}</div>
      )}
      {page}
      {!isAdminRoute && !isAuthPage && !isAuthCallback && pathname !== '/daily-word' && (
        <StudentDailyWordPopup />
      )}
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
