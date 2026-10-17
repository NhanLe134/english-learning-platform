import type { PropsWithChildren } from 'react'

export function AdminLayout({ children }: PropsWithChildren) {
  return <main className="role-layout">{children}</main>
}
