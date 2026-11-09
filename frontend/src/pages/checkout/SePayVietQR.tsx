import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { sepayApi } from './sepayApi'

interface SePayVietQRProps {
  courseId: string
  onPaymentError: (message: string) => void
}

/** Creates an order locally, then submits the signed form to SePay's hosted checkout.
 * SePay renders its official environment-specific checkout there; the browser must post the
 * signed fields (a JSON fetch cannot initialize checkout).
 */
export default function SePayVietQR({ courseId, onPaymentError }: SePayVietQRProps) {
  const { accessToken } = useAuth()
  const [fields, setFields] = useState<Record<string, string | number> | null>(null)
  const [checkoutUrl, setCheckoutUrl] = useState('')
  const [error, setError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const orderRequestRef = useRef<ReturnType<typeof sepayApi.createOrder> | null>(null)
  const submittedRef = useRef(false)

  useEffect(() => {
    let active = true
    if (!accessToken) {
      setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
      return () => { active = false }
    }
    orderRequestRef.current ??= sepayApi.createOrder({ courseId }, accessToken)
    void orderRequestRef.current
      .then((order) => {
        if (!active) return
        setCheckoutUrl(order.checkoutUrl)
        setFields(order.checkoutFields)
      })
      .catch((cause: unknown) => {
        if (!active) return
        const message = cause instanceof Error ? cause.message : 'Không thể tạo đơn thanh toán.'
        setError(message)
        onPaymentError(message)
      })
    return () => { active = false }
  }, [accessToken, courseId, onPaymentError])

  useEffect(() => {
    if (fields && checkoutUrl && !submittedRef.current) {
      submittedRef.current = true
      formRef.current?.requestSubmit()
    }
  }, [fields, checkoutUrl])

  if (error) return <div className="sepay-vietqr pay-error" role="alert"><AlertCircle size={20} /> {error}</div>
  if (!fields || !checkoutUrl) return <div className="sepay-vietqr pay-waiting" role="status"><Loader2 className="sepay-loader" size={22} /> Đang tạo đơn và mở mã QR SePay…</div>

  return (
    <form ref={formRef} action={checkoutUrl} method="POST" className="sepay-checkout-form">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={String(value)} />
      ))}
      <noscript><button type="submit">Tiếp tục tới mã QR SePay</button></noscript>
    </form>
  )
}
