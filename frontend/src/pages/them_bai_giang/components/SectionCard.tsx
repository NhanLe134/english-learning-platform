import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface SectionCardProps {
  icon: LucideIcon
  title: ReactNode
  subtitle: string
  badge?: ReactNode
  children: ReactNode
}

/**
 * Khung section card dùng chung cho cả 3 section cột trái và 3 card cột phải:
 * nền trắng, border slate-200, bo góc 8px, padding 28px, header có đường kẻ
 * phân cách slate-100 phía dưới.
 */
export function SectionCard({ icon: Icon, title, subtitle, badge, children }: SectionCardProps) {
  return (
    <section className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-7">
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
        <span className="flex size-8 items-center justify-center rounded bg-brand-50">
          <Icon className="size-3.5 text-brand-600" aria-hidden />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2 text-base font-semibold leading-6 text-ink-900">
            {title}
            {badge}
          </span>
          <span className="text-xs text-ink-500">{subtitle}</span>
        </span>
      </div>
      {children}
    </section>
  )
}
