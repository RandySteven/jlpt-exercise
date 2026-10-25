import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { LEVELS, type Exam, type LevelId } from '../data/types'
import { useLocale } from '../i18n/locale'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { examsFromGenerated, exerciseReady, readGeneration, requestExercise, writeGeneration } from '../lib/generated-exam'
import { getExercise, listExercises, submitExercise, type ListedExercise } from '../lib/exercises'

export const Route = createFileRoute('/generate/')({
  component: GeneratePage,
})

type Phase = 'form' | 'loading' | 'ready' | 'error'

function GeneratePage() {
  const { t, themeName } = useLocale()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [level, setLevel] = useState<LevelId>('N5')
  const [phase, setPhase] = useState<Phase>('form')
  const [exams, setExams] = useState<Exam[]>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [history, setHistory] = useState<ListedExercise[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [submitState, setSubmitState] = useState<'idle' | 'pending' | 'sent' | 'failed'>('idle')

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
    if (!user) return
    let cancelled = false
    listExercises(user.accessToken)
      .then((items) => {
        if (!cancelled) {
          setHistory(items)
          setHistoryLoaded(true)
        }
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        if (caught instanceof ApiError && caught.status === 401) signOut()
      })
    return () => {
      cancelled = true
    }
  }, [phase, signOut, user])

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
        if (caught instanceof ApiError && caught.status === 403) {
          void navigate({ to: '/subscribe' })
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
  }, [navigate, phase, signOut, t.generateFailed, t.generateInProgress, user])

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
    setSubmitState('idle')
    setStatus(generation.response?.status ?? '')
    setPhase('loading')
  }

  async function openListed(item: ListedExercise) {
    if (!user) return
    setError('')
    setPhase('loading')
    setStatus(item.status)
    try {
      const response = await getExercise(user.accessToken, item.id)
      const levelNumber = Number(response.jlpt_level.replace(/^N/, ''))
      writeGeneration({
        email: user.email,
        idempotencyKey: item.reference_id || crypto.randomUUID(),
        level: Number.isFinite(levelNumber) ? levelNumber : itemLevel(item),
        response,
      })
      if (exerciseReady(response)) {
        setExams(examsFromGenerated(response))
        setPhase('ready')
        return
      }
      setStatus(response.status)
      if (response.status === 'FAILED') {
        setError(t.generateFailed)
        setPhase('error')
        return
      }
      setPhase('loading')
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        signOut()
        return
      }
      setError(messageFrom(caught, t.generateFailed))
      setPhase('error')
    }
  }

  async function sendAnswers() {
    if (!user) return
    const stored = readGeneration(user.email)
    const id = stored?.response?.id
    if (!id || exams.length === 0) return
    setSubmitState('pending')
    try {
      await submitExercise(user.accessToken, id, exams)
      setSubmitState('sent')
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        signOut()
        return
      }
      setSubmitState('failed')
    }
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
          <div className="action-row">
            <button type="button" className="btn primary" onClick={() => void sendAnswers()} disabled={submitState === 'pending' || submitState === 'sent'}>
              {submitState === 'pending' ? t.exerciseSubmitting : t.exerciseSubmit}
            </button>
            {submitState === 'sent' ? <p className="lede">{t.exerciseSubmitted}</p> : null}
            {submitState === 'failed' ? (
              <p className="form-error" role="alert">
                {t.exerciseSubmitFailed}
              </p>
            ) : null}
          </div>
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

      {history.length > 0 ? (
        <section className="sheet">
          <h2>{t.exerciseHistory}</h2>
          <div className="variant-list">
            {history.map((item) => (
              <button key={item.id} type="button" className="variant-link" onClick={() => void openListed(item)}>
                <span className="variant-round">{levelLabel(item.jlpt_level)}</span>
                <span className="variant-theme">{item.status}</span>
                <span className="variant-go">{t.exerciseOpen}</span>
              </button>
            ))}
          </div>
        </section>
      ) : historyLoaded ? (
        <p className="lede">{t.exerciseEmpty}</p>
      ) : null}
    </div>
  )
}

function itemLevel(item: ListedExercise) {
  const level = Number(item.jlpt_level.replace(/^N/, ''))
  return Number.isFinite(level) ? level : 5
}

function levelLabel(value: string) {
  return value.startsWith('N') ? value : `N${value}`
}

function messageFrom(caught: unknown, fallback: string) {
  return caught instanceof Error && caught.message ? caught.message : fallback
}
