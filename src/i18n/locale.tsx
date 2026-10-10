import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { messages, themeName, type Locale, type Messages } from './messages'

const STORAGE_KEY = 'jlpt-locale'

interface LocaleContextValue {
  locale: Locale
  t: Messages
  setLocale: (locale: Locale) => void
  themeName: (theme: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'id') return stored
  } catch {
    // Private browsing can block storage. Fall through to the browser language.
  }
  return navigator.language.toLowerCase().startsWith('id') ? 'id' : 'en'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // The choice still applies for this visit.
    }
  }, [locale])

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t: messages[locale],
      setLocale,
      themeName: (theme) => themeName(theme, locale),
    }),
    [locale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useLocale must be used within LocaleProvider')
  return value
}

export function LanguageSwitch() {
  const { locale, setLocale, t } = useLocale()

  return (
    <div className="lang-switch" role="group" aria-label={t.language}>
      <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>
        EN
      </button>
      <button type="button" aria-pressed={locale === 'id'} onClick={() => setLocale('id')}>
        ID
      </button>
    </div>
  )
}
