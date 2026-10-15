import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { AttemptReason } from '../lib/attempt'
import { clearAttempt, readAttempt, writeAttempt } from '../lib/attempt'
import { gradeExam } from '../lib/score'
import { canSpeak, pauseSpeaking, resumeSpeaking, speakJapanese, speechRate, stopSpeaking } from '../lib/speech'
import { formatClock } from '../lib/time'
import { explanationFor } from '../data/bank'
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

const VOLUME_KEY = 'jlpt-listening-volume'
const TEST_CLIP = 'preview'
const TEST_SCRIPT = '音声の確認です。音量と速さを調整できます。'

function readVolume() {
  try {
    const stored = localStorage.getItem(VOLUME_KEY)
    if (stored === null || stored === '') return 1
    const value = Number(stored)
    if (Number.isFinite(value) && value >= 0 && value <= 1) return value
  } catch {
    // Private browsing can block storage. Use the default volume.
  }
  return 1
}

type MediaName = 'play' | 'pause' | 'resume' | 'stop' | 'test'

function MediaIcon({ name }: { name: MediaName }) {
  const props = { viewBox: '0 0 24 24', width: 22, height: 22, 'aria-hidden': true as const }
  if (name === 'pause') {
    return (
      <svg {...props}>
        <path fill="currentColor" d="M6 5h4v14H6zM14 5h4v14h-4z" />
      </svg>
    )
  }
  if (name === 'resume') {
    return (
      <svg {...props}>
        <path fill="currentColor" d="M5 5h2.5v14H5zM10 5.2v13.6a1 1 0 0 0 1.53.85l8.2-6.8a1 1 0 0 0 0-1.7l-8.2-6.8A1 1 0 0 0 10 5.2z" />
      </svg>
    )
  }
  if (name === 'stop') {
    return (
      <svg {...props}>
        <path fill="currentColor" d="M6 6h12v12H6z" />
      </svg>
    )
  }
  if (name === 'test') {
    return (
      <svg {...props}>
        <path fill="currentColor" d="M4 9h3.2L12 5v14l-4.8-4H4z" />
        <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a6.5 6.5 0 0 1 0 10" />
      </svg>
    )
  }
  return (
    <svg {...props}>
      <path fill="currentColor" d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.16-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z" />
    </svg>
  )
}

function IconButton({
  label,
  name,
  onClick,
  disabled,
}: {
  label: string
  name: MediaName
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button type="button" className="btn ghost icon" aria-label={label} onClick={onClick} disabled={disabled}>
      <MediaIcon name={name} />
    </button>
  )
}

function ListeningSetup({
  title,
  volume,
  volumeLabel,
  rate,
  speedLabel,
  testLabel,
  pauseLabel,
  resumeLabel,
  stopLabel,
  canPause,
  canResume,
  canStop,
  onVolume,
  onRate,
  onTest,
  onPause,
  onResume,
  onStop,
}: {
  title: string
  volume: number
  volumeLabel: string
  rate: number
  speedLabel: string
  testLabel: string
  pauseLabel: string
  resumeLabel: string
  stopLabel: string
  canPause: boolean
  canResume: boolean
  canStop: boolean
  onVolume: (volume: number) => void
  onRate: (rate: number) => void
  onTest: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
}) {
  return (
    <div className="audio-setup">
      <p className="audio-setup-title">{title}</p>
      <div className="audio-fields">
        <label>
          {volumeLabel} {Math.round(volume * 100)}%
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(event) => onVolume(Number(event.target.value))}
          />
        </label>
        <label>
          {speedLabel} {rate.toFixed(2)}
          <input
            type="range"
            min={0.7}
            max={1.2}
            step={0.01}
            value={rate}
            onChange={(event) => onRate(Number(event.target.value))}
          />
        </label>
      </div>
      <div className="action-row">
        <IconButton label={testLabel} name="test" onClick={onTest} />
        <IconButton label={pauseLabel} name="pause" onClick={onPause} disabled={!canPause} />
        <IconButton label={resumeLabel} name="resume" onClick={onResume} disabled={!canResume} />
        <IconButton label={stopLabel} name="stop" onClick={onStop} disabled={!canStop} />
      </div>
    </div>
  )
}

export function ExamRunner({ exam }: { exam: Exam }) {
  const { locale, t, themeName } = useLocale()
  const sectionName = t.sections[exam.section]
  const [attempt, setAttempt] = useState<AttemptState>(() => loadAttempt(exam.id))
  const [now, setNow] = useState(() => Date.now())
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [playback, setPlayback] = useState<'idle' | 'playing' | 'paused'>('idle')
  const [volume, setVolume] = useState(readVolume)
  const [rate, setRate] = useState(() => speechRate(exam.level))
  const [speechError, setSpeechError] = useState(!canSpeak())
  const finishedRef = useRef(attempt.phase === 'result')
  const activeClip = useRef<{ id: string; script: string } | null>(null)
  const playToken = useRef(0)
  const volumeRef = useRef(volume)
  const rateRef = useRef(rate)
  const playbackRef = useRef(playback)
  const replayTimer = useRef<number | null>(null)
  volumeRef.current = volume
  rateRef.current = rate
  playbackRef.current = playback
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
    stopAudio()
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

  function stopAudio() {
    playToken.current += 1
    activeClip.current = null
    stopSpeaking()
    setSpeakingId(null)
    setPlayback('idle')
  }

  function replayActiveClip() {
    if (replayTimer.current !== null) window.clearTimeout(replayTimer.current)
    replayTimer.current = window.setTimeout(() => {
      replayTimer.current = null
      const clip = activeClip.current
      if (!clip || playbackRef.current !== 'playing') return
      void play(clip.id, clip.script, volumeRef.current, rateRef.current)
    }, 180)
  }

  function rememberVolume(next: number) {
    setVolume(next)
    volumeRef.current = next
    try {
      localStorage.setItem(VOLUME_KEY, String(next))
    } catch {
      // The slider still applies for this visit.
    }
    replayActiveClip()
  }

  function rememberRate(next: number) {
    setRate(next)
    rateRef.current = next
    replayActiveClip()
  }

  function start() {
    stopAudio()
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
    stopAudio()
    setAttempt({ phase: 'ready', answers: {}, deadline: null, reason: null })
  }

  function confirmLeave(event: { preventDefault: () => void }) {
    if (attempt.phase !== 'running') return
    const confirmed = window.confirm(t.confirmLeave)
    if (!confirmed) event.preventDefault()
  }

  async function play(questionId: string, script: string, nextVolume = volumeRef.current, nextRate = rateRef.current) {
    const token = playToken.current + 1
    playToken.current = token
    activeClip.current = { id: questionId, script }
    setSpeakingId(questionId)
    setPlayback('playing')
    try {
      await speakJapanese(script, nextRate, nextVolume)
    } catch {
      setSpeechError(true)
    } finally {
      if (playToken.current === token) {
        activeClip.current = null
        setSpeakingId(null)
        setPlayback('idle')
      }
    }
  }

  function pause() {
    const clip = activeClip.current
    if (!clip) return
    setPlayback('paused')
    pauseSpeaking()
    window.setTimeout(() => {
      if (activeClip.current?.id !== clip.id) return
      if (!canSpeak() || !window.speechSynthesis.speaking || window.speechSynthesis.paused) return
      playToken.current += 1
      stopSpeaking()
      activeClip.current = clip
      setSpeakingId(clip.id)
      setPlayback('paused')
    }, 160)
  }

  function resume() {
    const clip = activeClip.current
    if (!clip) return
    if (canSpeak() && window.speechSynthesis.paused && window.speechSynthesis.speaking) {
      resumeSpeaking()
      setPlayback('playing')
      return
    }
    void play(clip.id, clip.script)
  }

  const grade = attempt.phase === 'result' ? gradeExam(exam, attempt.answers) : null
  const answeredCount = exam.questions.filter((question) => attempt.answers[question.id]).length
  const audioSetup =
    exam.section === 'listening' ? (
      <ListeningSetup
        title={t.audioSetup}
        volume={volume}
        volumeLabel={t.volume}
        rate={rate}
        speedLabel={t.speed}
        testLabel={t.testAudio}
        pauseLabel={t.pause}
        resumeLabel={t.resume}
        canPause={playback === 'playing'}
        canResume={playback === 'paused'}
        canStop={playback !== 'idle'}
        stopLabel={t.stop}
        onVolume={rememberVolume}
        onRate={rememberRate}
        onTest={() => void play(TEST_CLIP, TEST_SCRIPT)}
        onPause={pause}
        onResume={resume}
        onStop={stopAudio}
      />
    ) : null

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
          {attempt.phase === 'ready' ? audioSetup : null}
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
            {audioSetup}
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
                      <div className="action-row">
                        <IconButton
                          label={t.play}
                          name="play"
                          onClick={() => {
                            if (question.script) void play(question.id, question.script)
                          }}
                        />
                        <IconButton
                          label={t.pause}
                          name="pause"
                          onClick={pause}
                          disabled={speakingId !== question.id || playback !== 'playing'}
                        />
                        <IconButton
                          label={t.resume}
                          name="resume"
                          onClick={resume}
                          disabled={speakingId !== question.id || playback !== 'paused'}
                        />
                        <IconButton
                          label={t.stop}
                          name="stop"
                          onClick={stopAudio}
                          disabled={speakingId !== question.id}
                        />
                      </div>
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
                      {explanationFor(question.explanation, locale)}
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
                  {grade.passed ? '合格' : '不合格'}
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
