import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { LEVELS, type Exam, type LevelId } from '../data/types'
import { useLocale } from '../i18n/locale'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { examsFromGenerated, exerciseReady, readGeneration, requestExercise, writeGeneration } from '../lib/generated-exam'

export const Route = createFileRoute('/generate/')({
  component: GeneratePage,
})

type Phase = 'form' | 'loading' | 'ready' | 'error'

function GeneratePage() {
  const { t, themeName } = useLocale()
  const { user, signOut } = useAuth()
  const [level, setLevel] = useState<LevelId>('N5')
  const [phase, setPhase] = useState<Phase>('form')
  const [exams, setExams] = useState<Exam[]>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = `${t.generateTitle} · ${t.pageTitle}`
  }, [t.generateTitle, t.pageTitle])

  useEffect(() => {
    if (!user) return
    const stored = readGeneration(user.email)
    if (!stored) return
    if (stored.response?.status === 'FAILED') return
    if (stored.response && exerciseReady(stored.response)) {
      try {
        setExams(examsFromGenerated(stored.response))
        setPhase('ready')
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : t.generateFailed)
        setPhase('error')
      }
      return
    }
    setStatus(stored.response?.status ?? '')
    setPhase('loading')
  }, [t.generateFailed, user])

  useEffect(() => {
    if (!user || phase !== 'loading') return
    const stored = readGeneration(user.email)
    if (!stored) return
    let cancelled = false
    let timer = 0

    async function tick() {
      if (!user || !stored) return
      try {
        const response = await requestExercise(user.accessToken, stored.level, stored.idempotencyKey)
        if (cancelled) return
        const next = { ...stored, response }
        writeGeneration(next)
        setStatus(response.status)
        if (response.status === 'FAILED') {
          setError(t.generateFailed)
          setPhase('error')
          return
        }
        if (exerciseReady(response)) {
          setExams(examsFromGenerated(response))
          setPhase('ready')
          return
        }
        timer = window.setTimeout(() => void tick(), 2000)
      } catch (caught) {
        if (cancelled) return
        if (caught instanceof ApiError && caught.status === 401) {
          signOut()
          return
        }
        setError(caught instanceof ApiError && caught.status === 409 ? t.generateInProgress : messageFrom(caught, t.generateFailed))
        setPhase('error')
      }
    }

    void tick()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [phase, signOut, t.generateFailed, t.generateInProgress, user])

  function start() {
    if (!user) return
    const existing = readGeneration(user.email)
    const reusable = existing && existing.response?.status !== 'FAILED'
    const generation = {
      email: user.email,
      idempotencyKey: reusable ? existing.idempotencyKey : crypto.randomUUID(),
      level: reusable ? existing.level : Number(level.slice(1)),
      response: reusable ? existing.response : undefined,
    }
    writeGeneration(generation)
    setError('')
    setStatus(generation.response?.status ?? '')
    setPhase('loading')
  }

  if (!user) {
    return (
      <section className="sheet narrow">
        <p className="eyebrow">{t.generateEyebrow}</p>
        <h1>{t.generateTitle}</h1>
        <p className="lede">{t.generateSignIn}</p>
        <Link to="/sign-in" className="btn primary">
          {t.signIn}
        </Link>
      </section>
    )
  }

  return (
    <div className="level-page">
      {phase === 'loading' ? (
        <section className="sheet narrow generate-wait" aria-busy="true" aria-live="polite">
          <p className="eyebrow">{t.generateEyebrow}</p>
          <h1>{t.generateLoadingTitle}</h1>
          <p className="lede">{t.generateLoadingBody}</p>
          <p className="wait-status">{status || 'IN_GENERATED'}</p>
          <div className="wait-mark" aria-hidden="true" />
        </section>
      ) : null}

      {phase === 'ready' ? (
        <section className="sheet">
          <p className="eyebrow">{t.generateEyebrow}</p>
          <h1>{t.generateReadyTitle}</h1>
          <p className="lede">{t.generateReadyBody}</p>
          <div className="variant-list">
            {exams.map((exam) => (
              <Link
                key={exam.id}
                to="/generate/$section"
                params={{ section: exam.section }}
                className="variant-link"
              >
                <span className="variant-round">{t.sections[exam.section]}</span>
                <span className="variant-theme">{themeName(exam.theme)}</span>
                <span className="variant-go">{t.questionTotal(exam.questions.length)}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {phase === 'form' || phase === 'error' ? (
        <section className="sheet narrow">
          <p className="eyebrow">{t.generateEyebrow}</p>
          <h1>{t.generateTitle}</h1>
          <p className="lede">{t.generateLead}</p>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <form
            className="auth-form"
            onSubmit={(event) => {
              event.preventDefault()
              start()
            }}
          >
            <label className="field">
              <span>{t.generateLevel}</span>
              <select value={level} onChange={(event) => setLevel(event.target.value as LevelId)}>
                {LEVELS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn primary block">
              {t.generateStart}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  )
}

function messageFrom(caught: unknown, fallback: string) {
  return caught instanceof Error && caught.message ? caught.message : fallback
}
