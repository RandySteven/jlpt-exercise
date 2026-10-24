import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useLocale } from '../i18n/locale'
import { resetServerProbe } from '../lib/availability'

export const Route = createFileRoute('/server-down')({
  component: ServerDownPage,
})

function ServerDownPage() {
  const { t } = useLocale()

  useEffect(() => {
    document.title = t.serverDownTitle
  }, [t.serverDownTitle])

  return (
    <section className="sheet narrow">
      <p className="eyebrow">503</p>
      <h1>{t.serverDownTitle}</h1>
      <p className="lede">{t.serverDownBody}</p>
      <Link to="/" className="btn primary" onClick={() => resetServerProbe()}>
        {t.serverDownRetry}
      </Link>
    </section>
  )
}
