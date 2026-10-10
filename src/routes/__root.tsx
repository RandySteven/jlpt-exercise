import { Link, Outlet, createRootRoute, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="site">
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            試
          </span>
          <span className="brand-text">
            <span className="brand-kicker">日本語能力試験</span>
            <span className="brand-title">演習課題</span>
          </span>
        </Link>
        <p className="header-note">N5–N1 · 75回</p>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>問題は演習用のオリジナルです。公式試験の過去問ではありません。</p>
        <p>各回100点満点。合格点は60点です。</p>
      </footer>
    </div>
  )
}

function NotFound() {
  return (
    <section className="sheet narrow">
      <p className="eyebrow">404</p>
      <h1>ページが見つかりません</h1>
      <p className="lede">指定した級・科目・回はありません。</p>
      <Link to="/" className="btn primary">
        級の一覧へ
      </Link>
    </section>
  )
}
