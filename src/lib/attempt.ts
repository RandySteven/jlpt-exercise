export type AttemptReason = 'submit' | 'time'

export interface Attempt {
  answers: Record<string, string>
  deadline: number
  phase: 'running' | 'result'
  reason: AttemptReason | null
}

export function attemptKey(examId: string) {
  return `jlpt-attempt:${examId}`
}

export function readAttempt(examId: string): Attempt | null {
  try {
    const raw = sessionStorage.getItem(attemptKey(examId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isAttempt(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export function writeAttempt(examId: string, attempt: Attempt) {
  sessionStorage.setItem(attemptKey(examId), JSON.stringify(attempt))
}

export function clearAttempt(examId: string) {
  sessionStorage.removeItem(attemptKey(examId))
}

const QUESTION_ID = /^N[1-5]-(grammar|listening|language)-[1-5]-[1-5]$/
const CHOICES = new Set(['1', '2', '3', '4'])

function isAttempt(value: unknown): value is Attempt {
  if (!value || typeof value !== 'object') return false
  const attempt = value as Partial<Attempt>
  if (!isAnswerMap(attempt.answers)) return false
  if (typeof attempt.deadline !== 'number' || !Number.isFinite(attempt.deadline)) return false
  if (attempt.phase !== 'running' && attempt.phase !== 'result') return false
  if (attempt.reason != null && attempt.reason !== 'submit' && attempt.reason !== 'time') return false
  return true
}

function isAnswerMap(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const entries = Object.entries(value)
  if (entries.length > 5) return false
  return entries.every(
    ([questionId, choice]) => QUESTION_ID.test(questionId) && typeof choice === 'string' && CHOICES.has(choice),
  )
}
