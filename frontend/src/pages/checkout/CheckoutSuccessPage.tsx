import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  Headphones,
  MailCheck,
  MonitorPlay,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { SiteHeader } from '../../components/layout/SiteHeader'
import { SiteFooter } from '../../components/layout/SiteFooter'
import { readEnrollmentRecord } from './checkout-data'
import './checkout-page.css'
import './checkout-success-page.css'

const formatTimestamp = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Đang cập nhật'
  const dateText = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
  const timeText = new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
  return `${dateText} • ${timeText}`
}

function SuccessHeader({
  studentName,
  courseTitle,
  orderId,
  createdAt,
}: {
  studentName: string
  courseTitle: string
  orderId: string
  createdAt: string
}) {
  return (
    <section className="payment-success-hero" aria-labelledby="payment-success-title">
      <div className="payment-success-icon">
        <CheckCircle2 size={48} strokeWidth={1.7} />
        <span><ShieldCheck size={15} /></span>
      </div>
      <p className="payment-success-security">GIAO DỊCH ĐƯỢC XÁC THỰC AN TOÀN</p>
      <h1 id="payment-success-title">Thanh Toán &amp; Đăng Ký Khóa Học Thành Công!</h1>
      <p className="payment-success-subtitle">
        Chào mừng bạn <strong>{studentName}</strong> đã chính thức trở thành học viên khóa{' '}
        <strong className="payment-success-course-name">{courseTitle}</strong> tại Lumina English Academy.
      </p>

      <div className="payment-success-metadata">
        <div>
          <FileCheck2 size={17} />
          <span><small>Mã đơn hàng</small><strong>{orderId}</strong></span>
        </div>
        <div>
          <Clock3 size={17} />
          <span><small>Thời gian xác nhận</small><strong>{formatTimestamp(createdAt)}</strong></span>
        </div>
        <div>
          <CheckCircle2 size={17} />
          <span><small>Trạng thái giao dịch</small><strong className="payment-success-status">Đã thanh toán hoàn tất</strong></span>
        </div>
      </div>
    </section>
  )
}

export function CheckoutSuccessPage() {
  const enrollment = readEnrollmentRecord()

  if (!enrollment) {
    return (
      <div className="login-page checkout-page success-page">
        <SiteHeader brandName="Your English Voice" />
        <main className="checkout-success-main checkout-success-missing">
          <section className="payment-success-empty">
            <span><FileCheck2 size={27} /></span>
            <h1>Chưa tìm thấy đơn hàng hoàn tất</h1>
            <p>Vui lòng quay lại trang thanh toán để tiếp tục quy trình đăng ký khóa học.</p>
            <a className="checkout-primary-button" href="/checkout">Quay lại thanh toán <ArrowRight size={16} /></a>
          </section>
        </main>
        <SiteFooter brandName="Your English Voice" />
      </div>
    )
  }

  return (
    <div className="login-page checkout-page success-page">
      <SiteHeader brandName="Your English Voice" />
      <main className="checkout-success-main">
        <SuccessHeader
          studentName={enrollment.studentName}
          courseTitle={enrollment.courseTitle}
          orderId={enrollment.orderId}
          createdAt={enrollment.createdAt}
        />

        <div className="checkout-success-content">
          <section className="success-course-card" aria-labelledby="registered-course-title">
            <header className="success-section-heading">
              <h2 id="registered-course-title"><BookOpen size={17} /> Chi tiết khóa học đăng ký</h2>
              <span className="success-vip-badge">LỚP CHUYÊN SÂU VIP</span>
            </header>

            <div className="success-course-overview">
              <div className="success-course-image" role="img" aria-label="Lớp học IELTS">
                <span className="success-image-label">BAND 7.0+</span>
                <MonitorPlay size={37} />
                <span>IELTS MASTERCLASS</span>
              </div>
              <div className="success-course-overview-copy">
                <h3>{enrollment.courseTitle}</h3>
                <p><UserRound size={13} /> Giảng viên phụ trách: <strong>ThS. Mark Davies</strong> (IELTS 8.5)</p>
                <div className="success-instructor">
                  <span><UserRound size={16} /></span>
                  <div><strong>ThS. Mark Davies</strong><small>Cựu Giảng Khảo Khóa Thi Cambridge, 12 năm kinh nghiệm</small></div>
                </div>
              </div>
            </div>

            <div className="success-schedule-grid">
              <div className="success-schedule-item">
                <h3><CalendarDays size={13} /> Ngày khai giảng</h3>
                <strong>25/08/2025</strong>
                <small>Thời lượng: 24 tuần (72 buổi chuyên sâu)</small>
              </div>
              <div className="success-schedule-item">
                <h3><MonitorPlay size={13} /> Lịch học trực tuyến</h3>
                <strong>Thứ 2 - 4 - 6</strong>
                <small>19:30 - 21:00 qua Zoom Interactive Pro</small>
              </div>
            </div>

            <div className="success-zalo-box">
              <span className="success-zalo-icon"><Headphones size={18} /></span>
              <div>
                <strong>Nhóm Zalo Lớp &amp; Trợ Giảng Riêng</strong>
                <small>Hỗ trợ của bạn bè &amp; Speaking &amp; Writing 24/7</small>
              </div>
              <a href="https://zalo.me/" target="_blank" rel="noreferrer">
                Tham gia ngay <ExternalLink size={12} />
              </a>
            </div>
          </section>

          <aside className="success-next-column">
            <section className="success-steps-card" aria-labelledby="success-steps-title">
              <h2 id="success-steps-title"><span><Check size={15} /></span> Các bước tiếp theo của bạn</h2>

              <article className="success-step">
                <span className="success-step-number">1</span>
                <div>
                  <h3>Kiểm tra Email &amp; Hóa đơn <MailCheck size={14} /></h3>
                  <p>
                    Biên nhận học phí và thông tin tài khoản Portal đã gửi tới{' '}
                    <strong>{enrollment.studentEmail}</strong>. Vui lòng kiểm tra cả hộp thư Spam nếu chưa thấy.
                  </p>
                </div>
              </article>

              <article className="success-step">
                <span className="success-step-number">2</span>
                <div>
                  <h3>Làm bài Test Đánh Giá Đầu Vào <BadgeCheck size={14} /></h3>
                  <p>
                    Bài test 4 kỹ năng kéo dài 45 phút giúp ThS. Mark Davies cá nhân hóa bài tập và phân nhóm lộ trình phù hợp với năng lực thực tế của bạn trước ngày 25/08.
                  </p>
                  <a href="/login">Làm bài kiểm tra ngay <ArrowRight size={13} /></a>
                </div>
              </article>
            </section>

            <section className="success-activation-card" aria-labelledby="success-activation-title">
              <h2 id="success-activation-title">Thao tác kích hoạt ngay</h2>
              <p>Đăng nhập để xem thông tin lớp học và bắt đầu lộ trình của bạn.</p>
              <a className="checkout-primary-button success-login-button" href="/login">
                <UserRound size={16} /> Đăng nhập ngay
              </a>
            </section>

            <div className="success-payment-note">
              <ShieldCheck size={14} />
              <span>Giao dịch mô phỏng · {enrollment.amount.toLocaleString('vi-VN')} đ</span>
              <strong>Không phát sinh khoản thu thật</strong>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter brandName="Your English Voice" />
    </div>
  )
}
