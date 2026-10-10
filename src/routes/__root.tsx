import { Link, Outlet, createRootRoute, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { SakuraBackdrop } from '../components/SakuraArt'
import { LanguageSwitch, useLocale } from '../i18n/locale'

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { t } = useLocale()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="site">
      <SakuraBackdrop />
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            試
          </span>
          <span className="brand-text">
            <span className="brand-kicker">{t.brandKicker}</span>
            <span className="brand-title">{t.brandTitle}</span>
          </span>
        </Link>
        <div className="header-tools">
          <p className="header-note">{t.headerNote}</p>
          <LanguageSwitch />
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>{t.footerOriginal}</p>
        <p>{t.footerPass}</p>
      </footer>
    </div>
  )
}

function NotFound() {
  const { t } = useLocale()

  return (
    <section className="sheet narrow">
      <p className="eyebrow">404</p>
      <h1>{t.notFoundTitle}</h1>
      <p className="lede">{t.notFoundBody}</p>
      <Link to="/" className="btn primary">
        {t.backToLevels}
      </Link>
    </section>
  )
}
