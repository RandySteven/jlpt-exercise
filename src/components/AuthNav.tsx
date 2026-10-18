import { Link } from '@tanstack/react-router'
import { useLocale } from '../i18n/locale'
import { useAuth } from '../lib/auth'

export function AuthNav() {
  const { t } = useLocale()
  const { user, signOut } = useAuth()

  return (
    <nav className="auth-nav" aria-label={t.account}>
      {user ? (
        <>
          <Link to="/generate" className="btn ghost" activeProps={{ 'aria-current': 'page' }}>
            {t.generateNav}
          </Link>
          <span className="auth-name">{user.name}</span>
          <button type="button" className="btn ghost" onClick={signOut}>
            {t.signOut}
          </button>
        </>
      ) : (
        <>
          <Link to="/sign-in" className="btn ghost" activeProps={{ 'aria-current': 'page' }}>
            {t.signIn}
          </Link>
          <Link to="/sign-up" className="btn primary" activeProps={{ 'aria-current': 'page' }}>
            {t.signUp}
          </Link>
        </>
      )}
    </nav>
  )
}
