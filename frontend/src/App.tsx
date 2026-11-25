import { useEffect, useState } from 'react'
import { QuanLyNguoiDungPage } from './pages/quan_ly_nguoi_dung'
import { QuanLyThanhToanPage } from './pages/quan_ly_thanh_toan'
import ThemBaiGiangPage from './pages/them_bai_giang'
import { QuanLyBaiGiangKhoaHocPage } from './pages/quan_ly_bai_giang'
import { QuanLyBaiTapPage } from './pages/quan_ly_bai_tap'
import { HomePage } from './pages/home/HomePage'
import { AboutPage } from './pages/about/AboutPage'
import { EbooksPage } from './pages/ebooks/EbooksPage'
import { StudentEbookPage } from './pages/ebooks/StudentEbookPage'
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
import { StudentWorkshopPage } from './pages/workshops/StudentWorkshopPage'
import { DailyWordPage } from './pages/daily-word/DailyWordPage'
// Popup Daily Word KHÔNG render toàn cục nữa — chỉ trong StudentCoursesPage (/my-courses)
import { ContactPage } from './pages/contact/ContactPage'
import { TeacherDashboardPage } from './pages/courses/TeacherDashboardPage'
import { TeacherAccountActionPage } from './pages/auth/TeacherAccountActionPage'
import { AuthProvider } from './pages/auth/AuthContext'
import { useAuth } from './pages/auth/auth-context'
import {
  GUEST_NAVIGATE_EVENT,
  isGuestRegistrationFlowPath,
  navigateGuestFlow,
} from './pages/auth/registration-draft'

function AppRoutes() {
  const { initializationError, isInitializing, user } = useAuth()
  const [location, setLocation] = useState(() => ({
    pathname: window.location.pathname,
    search: window.location.search,
  }))
  const pathname = location.pathname
  const isAdminRoute = pathname.startsWith('/admin')
  const isTeacherArea = pathname.startsWith('/teacher')
  const isTeacherPublicRoute = ['/teacher/login', '/teacher/activate', '/teacher/reset-password', '/teacher/forgot-password'].includes(pathname)
  const isStudentArea = pathname === '/my-courses' || pathname.startsWith('/student') || pathname.startsWith('/my-courses/')
  const isAuthCallback = pathname === '/auth/callback'
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(pathname)
  const isRoleAwareCourseOrCheckoutRoute =
    pathname === '/course' ||
    pathname.startsWith('/courses/') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/thanh-toan')
  const isLegacyCourseListRoute = pathname === '/khoa-hoc' || pathname === '/courses'

  useEffect(() => {
    const syncLocation = () => {
      setLocation({
        pathname: window.location.pathname,
        search: window.location.search,
      })
    }
    window.addEventListener('popstate', syncLocation)
    window.addEventListener(GUEST_NAVIGATE_EVENT, syncLocation)
    return () => {
      window.removeEventListener('popstate', syncLocation)
      window.removeEventListener(GUEST_NAVIGATE_EVENT, syncLocation)
    }
  }, [])

  useEffect(() => {
    if (user || !isGuestRegistrationFlowPath(pathname)) return
    const handleGuestFlowLinkClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return
      const rawHref = anchor.getAttribute('href')
      if (!rawHref || rawHref.startsWith('#')) return
      try {
        const url = new URL(anchor.href, window.location.origin)
        if (url.origin === window.location.origin && isGuestRegistrationFlowPath(url.pathname)) {
          event.preventDefault()
          navigateGuestFlow(`${url.pathname}${url.search}${url.hash}`)
        }
      } catch {
        // Ignore malformed links.
      }
    }
    document.addEventListener('click', handleGuestFlowLinkClick)
    return () => {
      document.removeEventListener('click', handleGuestFlowLinkClick)
    }
  }, [pathname, user])

  useEffect(() => {
    if (isInitializing || isAuthCallback) return

    if (user?.role === 'ADMIN') {
      // 1 trình duyệt 1 tài khoản: Đã đăng nhập Admin thì chỉ hiển thị trang Admin.
      // Dù mở tab mới hay nhập bất kỳ link nào (/, /course, /login, /register...), đều tự chuyển về trang quản trị
      if (!isAdminRoute) {
        window.location.replace('/admin/dashboard')
      }
    } else if (user?.role === 'TEACHER') {
      if (!isTeacherArea || pathname === '/teacher/login' || pathname === '/teacher/forgot-password') {
        window.location.replace('/teacher/dashboard')
      }
    } else if (user?.role === 'STUDENT') {
      // Học viên đã đăng nhập: không vào được admin, teacher và không mở lại trang login/register
      if (isAdminRoute || isTeacherArea) {
        window.location.replace('/login')
      } else if (isAuthPage) {
        // Redirect to role-appropriate default page – never blindly redirect to /checkout.
        // The checkout flow itself will navigate here when needed.
        window.location.replace('/my-courses')
      } else if (isLegacyCourseListRoute) {
        window.location.replace(`/course${window.location.search}${window.location.hash}`)
      }
    } else {
      // Chưa đăng nhập mà truy cập route admin, student hoặc teacher được bảo vệ
      if (isAdminRoute) {
        window.location.replace('/login')
      } else if (isStudentArea) {
        window.location.replace('/login')
      } else if (isTeacherArea && !isTeacherPublicRoute) {
        window.location.replace('/login')
      } else if (isLegacyCourseListRoute) {
        window.location.replace(`/course${window.location.search}${window.location.hash}`)
      }
    }
  }, [isAdminRoute, isAuthCallback, isAuthPage, isInitializing, isLegacyCourseListRoute, isStudentArea, isTeacherArea, isTeacherPublicRoute, pathname, user])

  // Trạng thái đang xác minh quyền hoặc đang điều hướng
  if (!isAuthCallback) {
    if (isInitializing && (isAuthPage || isRoleAwareCourseOrCheckoutRoute)) {
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
    if (user?.role === 'TEACHER' && !isTeacherArea && !isAdminRoute && pathname !== '/auth/callback') {
      return <main className="auth-route-status" role="status">Đang chuyển đến trang giáo viên…</main>
    }

    if (isAdminRoute && (isInitializing || user?.role !== 'ADMIN')) {
      return (
        <main className="auth-route-status" role="status">
          {isInitializing ? 'Đang xác minh phiên đăng nhập…' : 'Đang chuyển đến trang đăng nhập…'}
        </main>
      )
    }
    if (isTeacherArea && !isTeacherPublicRoute && (isInitializing || user?.role !== 'TEACHER')) {
      return (
        <main className="auth-route-status" role="status">
          {isInitializing ? 'Đang xác minh phiên đăng nhập…' : 'Đang chuyển đến trang đăng nhập…'}
        </main>
      )
    }
    if (isStudentArea && (isInitializing || user?.role !== 'STUDENT')) {
      return <main className="auth-route-status" role="status">Đang chuyển đến khu vực phù hợp…</main>
    }

    if (user && isAuthPage) {
      return (
        <main className="auth-route-status" role="status">
          Đang chuyển đến trang khóa học…
        </main>
      )
    }

    if (isLegacyCourseListRoute) {
      return (
        <main className="auth-route-status" role="status">
          Đang chuyển đến trang khóa học…
        </main>
      )
    }
  }

  let page
  switch (pathname) {
    case '/teacher/login':
      page = <LoginPage />
      break
    case '/teacher/activate':
      page = <TeacherAccountActionPage mode="activate" />
      break
    case '/teacher/reset-password':
      page = <TeacherAccountActionPage mode="reset" />
      break
    case '/teacher/dashboard':
      page = <TeacherDashboardPage />
      break
    case '/teacher/forgot-password':
      page = <ForgotPasswordPage />
      break
    case '/admin':
    case '/admin/dashboard':
    case '/admin/users':
      page = <QuanLyNguoiDungPage />
      break
    case '/admin/payments':
      page = <QuanLyThanhToanPage />
      break
    case '/admin/courses':
      page = <CourseManagementPage />
      break
    case '/admin/exercises':
      page = <QuanLyBaiTapPage />
      break
    case '/admin/lessons':
      // Quản lý bài giảng của một khóa học (?courseId=...)
      page = <QuanLyBaiGiangKhoaHocPage />
      break
    case '/daily-word':
    case '/admin/daily-word':
      page = <DailyWordPage />
      break
    case '/admin/lessons/new':
    case '/teacher/lessons/new':
      // Trang "Thêm bài giảng & Bài tập" (giao diện tĩnh theo Figma)
      page = <ThemBaiGiangPage />
      break
    case '/about':
    case '/ve-chung-toi':
      page = <AboutPage />
      break
    case '/course':
      page = user?.role === 'STUDENT' ? <StudentCoursesPage /> : <CourseListPage />
      break
    case '/student/courses':
    case '/my-courses':
    case '/student':
    case '/khoa-hoc-cua-toi':
      page = <StudentCoursesPage />
      break
    case '/student/ebooks':
    case '/student/ebook':
    case '/ebooks':
    case '/ebook':
    case '/sach-dien-tu':
      page = user?.role === 'STUDENT' ? <StudentEbookPage /> : <EbooksPage />
      break
    case '/student/workshops':
    case '/student/workshop':
    case '/workshops':
    case '/workshop':
      page = user?.role === 'STUDENT' ? <StudentWorkshopPage /> : <WorkshopsPage />
      break
    case '/contact':
    case '/lien-he':
      page = <ContactPage />
      break
    case '/register':
      page = <RegisterPage search={location.search} />
      break
    case '/forgot-password':
      page = <ForgotPasswordPage />
      break
    case '/auth/callback':
      page = <OAuthCallbackPage />
      break
    case '/checkout':
    case '/thanh-toan':
      page = <CheckoutPage key={location.search} />
      break
    case '/checkout/payment':
    case '/thanh-toan/qr':
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

        const courseRoute = pathname.match(/^\/courses?\/([^/]+)$/)
        if (courseRoute && courseRoute[1]) {
          const decodedSlug = decodeURIComponent(courseRoute[1])
          page = <CourseDetailPage key={decodedSlug} identifier={decodedSlug} />
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
