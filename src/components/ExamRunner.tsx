import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { AttemptReason } from '../lib/attempt'
import { clearAttempt, readAttempt, writeAttempt } from '../lib/attempt'
import { gradeExam } from '../lib/score'
import { canSpeak, speakJapanese, speechRate, stopSpeaking } from '../lib/speech'
import { formatClock } from '../lib/time'
import { type ChoiceKey, type Exam } from '../data/types'
import { useLocale } from '../i18n/locale'

type Phase = 'ready' | 'running' | 'result'

interface AttemptState {
  phase: Phase
  answers: Record<string, string>
  deadline: number | null
  reason: AttemptReason | null
}

function loadAttempt(examId: string): AttemptState {
  const saved = readAttempt(examId)
  if (!saved) {
    return { phase: 'ready', answers: {}, deadline: null, reason: null }
  }
  if (saved.phase === 'running' && Date.now() >= saved.deadline) {
    const expired: AttemptState = {
      phase: 'result',
      answers: saved.answers,
      deadline: saved.deadline,
      reason: 'time',
    }
    writeAttempt(examId, {
      answers: expired.answers,
      deadline: saved.deadline,
      phase: 'result',
      reason: 'time',
    })
    return expired
  }
  return {
    phase: saved.phase,
    answers: saved.answers,
    deadline: saved.deadline,
    reason: saved.reason ?? null,
  }
}

function isChoice(value: string | undefined): value is ChoiceKey {
  return value === '1' || value === '2' || value === '3' || value === '4'
}

export function ExamRunner({ exam }: { exam: Exam }) {
  const { t, themeName } = useLocale()
  const sectionName = t.sections[exam.section]
  const [attempt, setAttempt] = useState<AttemptState>(() => loadAttempt(exam.id))
  const [now, setNow] = useState(() => Date.now())
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [speechError, setSpeechError] = useState(!canSpeak())
  const finishedRef = useRef(attempt.phase === 'result')
  const attemptRef = useRef(attempt)
  attemptRef.current = attempt

  useEffect(() => {
    document.title = t.examTitle(exam.level, sectionName, exam.variant)
  }, [exam.level, exam.variant, sectionName, t])

  useEffect(() => {
    if (!canSpeak()) return
    const prime = () => {
      window.speechSynthesis.getVoices()
    }
    prime()
    window.speechSynthesis.addEventListener('voiceschanged', prime)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', prime)
      stopSpeaking()
    }
  }, [])

  useEffect(() => {
    if (attempt.phase !== 'running') return
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [attempt.phase])

  useEffect(() => {
    if (attempt.phase !== 'running' || attempt.deadline === null) return
    const timerId = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(timerId)
  }, [attempt.deadline, attempt.phase])

  useEffect(() => {
    if (attempt.phase !== 'running' || attempt.deadline === null) return
    if (now < attempt.deadline) return
    finish('time')
  }, [attempt.deadline, attempt.phase, now])

  const remainingMs =
    attempt.phase === 'running' && attempt.deadline !== null
      ? Math.max(0, attempt.deadline - now)
      : exam.timeLimitSec * 1000
  const timerClass =
    attempt.phase === 'running' && remainingMs <= 10_000
      ? 'timer is-danger'
      : attempt.phase === 'running' && remainingMs <= 60_000
        ? 'timer is-warning'
        : 'timer'

  function finish(nextReason: AttemptReason) {
    if (finishedRef.current) return
    finishedRef.current = true
    stopSpeaking()
    setSpeakingId(null)
    const current = attemptRef.current
    const deadline = current.deadline ?? Date.now()
    const next: AttemptState = {
      phase: 'result',
      answers: current.answers,
      deadline,
      reason: nextReason,
    }
    writeAttempt(exam.id, {
      answers: next.answers,
      deadline,
      phase: 'result',
      reason: nextReason,
    })
    setAttempt(next)
  }

  function start() {
    const deadline = Date.now() + exam.timeLimitSec * 1000
    finishedRef.current = false
    const next: AttemptState = { phase: 'running', answers: {}, deadline, reason: null }
    writeAttempt(exam.id, { answers: {}, deadline, phase: 'running', reason: null })
    setNow(Date.now())
    setAttempt(next)
  }

  function select(questionId: string, key: ChoiceKey) {
    if (attempt.phase !== 'running' || attempt.deadline === null) return
    setAttempt((current) => {
      const next: AttemptState = {
        ...current,
        answers: { ...current.answers, [questionId]: key },
      }
      if (next.deadline !== null) {
        writeAttempt(exam.id, {
          answers: next.answers,
          deadline: next.deadline,
          phase: 'running',
          reason: null,
        })
      }
      return next
    })
  }

  function submit() {
    const unanswered = exam.questions.filter((question) => !attempt.answers[question.id]).length
    if (unanswered > 0) {
      const confirmed = window.confirm(t.confirmUnanswered(unanswered))
      if (!confirmed) return
    }
    finish('submit')
  }

  function retry() {
    clearAttempt(exam.id)
    finishedRef.current = false
    stopSpeaking()
    setSpeakingId(null)
    setAttempt({ phase: 'ready', answers: {}, deadline: null, reason: null })
  }

  function confirmLeave(event: { preventDefault: () => void }) {
    if (attempt.phase !== 'running') return
    const confirmed = window.confirm(t.confirmLeave)
    if (!confirmed) event.preventDefault()
  }

  async function play(questionId: string, script: string) {
    if (speakingId === questionId) {
      stopSpeaking()
      setSpeakingId(null)
      return
    }
    setSpeakingId(questionId)
    try {
      await speakJapanese(script, speechRate(exam.level))
    } catch {
      setSpeechError(true)
    } finally {
      setSpeakingId((current) => (current === questionId ? null : current))
    }
  }

  const grade = attempt.phase === 'result' ? gradeExam(exam, attempt.answers) : null
  const answeredCount = exam.questions.filter((question) => attempt.answers[question.id]).length

  return (
    <div className="exam-page">
      <div className="exam-bar">
        <div>
          <p className="eyebrow">
            <Link to="/levels/$level" params={{ level: exam.level }} onClick={confirmLeave}>
              {exam.level}
            </Link>
            <span aria-hidden="true"> / </span>
            {sectionName}
            <span aria-hidden="true"> / </span>
            {t.round(exam.variant)}
          </p>
          <h1>{themeName(exam.theme)}</h1>
        </div>
        <div className={timerClass} role="timer" aria-label={t.timerAria(formatClock(remainingMs))}>
          <span className="timer-label">
            {attempt.phase === 'result' ? t.timerDone : attempt.phase === 'ready' ? t.timerLimit : t.timerLeft}
          </span>
          <span className="timer-value">
            {attempt.phase === 'result' ? '00:00' : formatClock(remainingMs)}
          </span>
        </div>
      </div>

      {attempt.phase === 'ready' ? (
        <section className="sheet">
          <p className="lede">
            {t.intro(sectionName, exam.variant, t.minutes(exam.timeLimitSec / 60))}
          </p>
          <dl className="fact-grid">
            <div>
              <dt>{t.questionCount}</dt>
              <dd>{t.fiveQuestions}</dd>
            </div>
            <div>
              <dt>{t.pointsLabel}</dt>
              <dd>{t.pointsEach(exam.pointsPerQuestion)}</dd>
            </div>
            <div>
              <dt>{t.fullScoreLabel}</dt>
              <dd>100</dd>
            </div>
            <div>
              <dt>{t.passScore}</dt>
              <dd>{t.passPoints(exam.passScore)}</dd>
            </div>
          </dl>
          {exam.section === 'listening' ? <p className="notice">{t.listeningNotice}</p> : null}
          <div className="action-row">
            <button type="button" className="btn primary" onClick={start}>
              {t.start}
            </button>
            <Link to="/levels/$level" params={{ level: exam.level }} className="btn ghost">
              {t.back}
            </Link>
          </div>
        </section>
      ) : null}

      {attempt.phase !== 'ready' ? (
        <div className="exam-layout">
          <div className="question-stack">
            {exam.questions.map((question, index) => {
              const selected = attempt.answers[question.id]
              const detail = grade?.details.find((item) => item.id === question.id)
              const showScript = attempt.phase === 'result' || speechError
              return (
                <article key={question.id} id={`q-${question.id}`} className="sheet question">
                  <header className="question-head">
                    <h2>{t.question(index + 1)}</h2>
                    {detail ? (
                      <span className={detail.correct ? 'pill pass' : 'pill fail'}>
                        {detail.correct ? t.correct : t.incorrect} · {t.points(detail.points)}
                      </span>
                    ) : null}
                  </header>
                  {exam.section === 'listening' && question.script ? (
                    <div className="listen-box">
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          if (question.script) void play(question.id, question.script)
                        }}
                      >
                        {speakingId === question.id ? t.stop : t.play}
                      </button>
                      {showScript ? <p className="script">{question.script}</p> : <p className="script hidden-note">{t.scriptHidden}</p>}
                    </div>
                  ) : null}
                  <p className="prompt">{question.prompt}</p>
                  <div className="choices" role="radiogroup" aria-label={t.question(index + 1)}>
                    {question.choices.map((choice) => {
                      const isSelected = selected === choice.key
                      const isAnswer = choice.key === question.answer
                      const reviewClass =
                        attempt.phase === 'result' && isAnswer
                          ? ' is-correct'
                          : attempt.phase === 'result' && isSelected
                            ? ' is-wrong'
                            : isSelected
                              ? ' is-selected'
                              : ''
                      return (
                        <button
                          key={choice.key}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          className={`choice${reviewClass}`}
                          disabled={attempt.phase !== 'running'}
                          onClick={() => select(question.id, choice.key)}
                        >
                          <span className="choice-key">{choice.key}</span>
                          <span>{choice.text}</span>
                        </button>
                      )
                    })}
                  </div>
                  {detail ? (
                    <p className="explanation">
                      {t.yourAnswer}: {isChoice(selected) ? selected : t.unanswered} / {t.correctAnswer}: {question.answer}
                      <br />
                      {question.explanation}
                    </p>
                  ) : null}
                </article>
              )
            })}
          </div>

          <aside className="score-panel">
            {grade ? (
              <div className={grade.passed ? 'result is-pass' : 'result is-fail'}>
                <div className={grade.passed ? 'stamp is-pass' : 'stamp is-fail'} aria-hidden="true">
                  {grade.passed ? t.pass : t.fail}
                </div>
                <p className="result-label">{t.verdict}</p>
                <p className="result-verdict">{grade.passed ? t.pass : t.fail}</p>
                {attempt.reason === 'time' ? <p className="notice">{t.timeUp}</p> : null}
                <dl className="result-stats">
                  <div>
                    <dt>{t.score}</dt>
                    <dd>
                      {grade.score}
                      <span> / {grade.total}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>{t.passScore}</dt>
                    <dd>{grade.passScore}</dd>
                  </div>
                  <div>
                    <dt>{t.correctCount}</dt>
                    <dd>
                      {grade.correctCount}
                      <span> / {grade.questionCount}</span>
                    </dd>
                  </div>
                </dl>
                <div className="score-track" aria-hidden="true">
                  <div className="score-fill" style={{ width: `${grade.score}%` }} />
                  <div className="score-mark" style={{ left: `${grade.passScore}%` }} />
                </div>
                <p className="score-caption">{t.scaleCaption(grade.passScore)}</p>
                <div className="action-row">
                  <button type="button" className="btn primary" onClick={retry}>
                    {t.again}
                  </button>
                  <Link to="/levels/$level" params={{ level: exam.level }} className="btn ghost">
                    {t.roundList}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="result">
                <p className="result-label">{t.progress}</p>
                <p className="result-verdict">
                  {answeredCount}
                  <span> / {exam.questions.length}</span>
                </p>
                <p className="lede">{t.blankWrong(exam.passScore)}</p>
                <div className="q-nav">
                  {exam.questions.map((question, index) => (
                    <a
                      key={question.id}
                      href={`#q-${question.id}`}
                      className={attempt.answers[question.id] ? 'is-done' : undefined}
                    >
                      {index + 1}
                    </a>
                  ))}
                </div>
                <button type="button" className="btn primary" onClick={submit}>
                  {t.submit}
                </button>
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  )
}
