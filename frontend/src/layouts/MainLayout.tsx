import type { PropsWithChildren } from 'react'

export function MainLayout({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/">
          English Learning Platform
        </a>
      </header>
      <main>{children}</main>
      <footer className="site-footer">Learn a little every day.</footer>
    </div>
  )
}
