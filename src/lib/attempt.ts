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

function isAttempt(value: unknown): value is Attempt {
  if (!value || typeof value !== 'object') return false
  const attempt = value as Partial<Attempt>
  return (
    !!attempt.answers &&
    typeof attempt.answers === 'object' &&
    typeof attempt.deadline === 'number' &&
    (attempt.phase === 'running' || attempt.phase === 'result')
  )
}
