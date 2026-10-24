import { PASS_SCORE, TIME_LIMIT_SEC, isLevel, isSection, type ChoiceKey, type Exam, type ExplanationText, type LevelId, type SectionId } from '../data/types'
import { api } from './api'

const STORAGE_KEY = 'jlpt-generation'
const CHOICE_KEYS: ChoiceKey[] = ['1', '2', '3', '4']
const SECTION_THEME: Record<SectionId, string> = {
  grammar: '文法',
  listening: '聴解',
  language: '言語知識',
}

export type GenerateExerciseResponse = {
  id: number
  status: string
  jlpt_level: string
  exercise?: unknown
  created_at: string
  updated_at: string
}

export type StoredGeneration = {
  email: string
  idempotencyKey: string
  level: number
  response?: GenerateExerciseResponse
}

type GeneratedQuestion = {
  question?: string
  answers?: string[]
  correct_answer?: number
  explanation?: ExplanationText | string
  script?: string
}

type GeneratedSection = {
  theme?: string
  questions?: GeneratedQuestion[]
}

type GeneratedFile = {
  title?: string
  content?: Partial<Record<SectionId, GeneratedSection>>
}

type GenerateEnvelope = {
  data?: {
    generate_exercise_response?: GenerateExerciseResponse
  }
}

export function exerciseReady(response: GenerateExerciseResponse) {
  return response.status === 'GENERATED' && hasExercise(response.exercise)
}

export function readGeneration(email: string): StoredGeneration | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredGeneration
    if (parsed.email !== email || typeof parsed.idempotencyKey !== 'string' || typeof parsed.level !== 'number') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeGeneration(value: StoredGeneration) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

export function requestExercise(token: string, level: number, idempotencyKey: string) {
  return api<GenerateEnvelope>('/exercise/generate', {
    method: 'POST',
    token,
    body: {
      idempotency_key: idempotencyKey,
      jlpt_n_level: level,
    },
  }).then((body) => {
    const response = body.data?.generate_exercise_response
    if (!response?.status) throw new Error('Exercise response is missing')
    return response
  })
}

export function examsFromGenerated(response: GenerateExerciseResponse): Exam[] {
  const file = parseExercise(response.exercise)
  const level = levelIdFrom(response.jlpt_level)
  const exams = (['grammar', 'listening', 'language'] as const).flatMap((section) => {
    const block = file.content?.[section]
    const questions = (block?.questions ?? [])
      .map((item, index) => toQuestion(response.id, section, index, item))
      .filter((item): item is Exam['questions'][number] => item !== null)
    if (questions.length === 0) return []
    return [toExam(response.id, level, section, block?.theme?.trim() || SECTION_THEME[section], questions)]
  })
  if (exams.length === 0) throw new Error('The generated exercise has no usable questions')
  return exams
}

function hasExercise(value: unknown) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 && trimmed !== 'null'
  }
  return Boolean(value) && typeof value === 'object'
}

function parseExercise(value: unknown): GeneratedFile {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value
  if (!parsed || typeof parsed !== 'object') throw new Error('Exercise payload is empty')
  return parsed as GeneratedFile
}

function levelIdFrom(value: string): LevelId {
  const raw = value.startsWith('N') ? value : `N${value}`
  if (!isLevel(raw)) throw new Error(`Unknown JLPT level: ${value}`)
  return raw
}

function toQuestion(
  exerciseId: number,
  section: SectionId,
  index: number,
  item: GeneratedQuestion,
): Exam['questions'][number] | null {
  const answers = item.answers ?? []
  const [first, second, third, fourth] = answers
  if (
    answers.length !== 4 ||
    !item.question?.trim() ||
    first === undefined ||
    second === undefined ||
    third === undefined ||
    fourth === undefined ||
    item.correct_answer !== 1 &&
      item.correct_answer !== 2 &&
      item.correct_answer !== 3 &&
      item.correct_answer !== 4
  ) {
    return null
  }
  return {
    id: `generated-${exerciseId}-${section}-${index + 1}`,
    prompt: item.question,
    choices: [first, second, third, fourth].map((text, choiceIndex) => ({
      key: CHOICE_KEYS[choiceIndex],
      text,
    })),
    answer: CHOICE_KEYS[item.correct_answer - 1],
    explanation: explanationText(item.explanation),
    script: item.script?.trim() || undefined,
  }
}

function explanationText(value: GeneratedQuestion['explanation']): ExplanationText {
  if (typeof value === 'string' && value.trim()) return { en: value.trim(), id: value.trim() }
  if (value && typeof value === 'object') {
    const en = value.en?.trim() ?? ''
    const id = value.id?.trim() ?? ''
    if (en || id) return { en: en || id, id: id || en }
  }
  return { en: '—', id: '—' }
}

function toExam(exerciseId: number, level: LevelId, section: SectionId, theme: string, questions: Exam['questions']): Exam {
  const pointsPerQuestion = 100 % questions.length === 0 ? 100 / questions.length : 1
  return {
    id: `generated-${exerciseId}-${section}`,
    level,
    section,
    variant: 1,
    theme,
    timeLimitSec: Math.max(60, Math.round((TIME_LIMIT_SEC[level] / 5) * questions.length)),
    pointsPerQuestion,
    passScore: pointsPerQuestion === 1 ? Math.round(questions.length * (PASS_SCORE / 100)) : PASS_SCORE,
    questions,
  }
}

export function isGeneratedSection(value: string): value is SectionId {
  return isSection(value)
}
