import { n1Exams } from './n1'
import { n2Exams } from './n2'
import { n3Exams } from './n3'
import { n4Exams } from './n4'
import { n5Exams } from './n5'
import {
  LEVELS,
  SECTION_IDS,
  type Exam,
  type LevelId,
  type SectionId,
} from './types'

export const EXAMS: Exam[] = [
  ...n5Exams,
  ...n4Exams,
  ...n3Exams,
  ...n2Exams,
  ...n1Exams,
]

validateBank(EXAMS)

export function getExam(level: string, section: string, variant: string) {
  const variantNumber = Number(variant)
  return EXAMS.find(
    (exam) =>
      exam.level === level &&
      exam.section === section &&
      exam.variant === variantNumber,
  )
}

export function examsFor(level: LevelId, section: SectionId) {
  return EXAMS.filter((exam) => exam.level === level && exam.section === section).sort(
    (left, right) => left.variant - right.variant,
  )
}

function validateBank(exams: Exam[]) {
  const problems: string[] = []
  const expected = LEVELS.length * SECTION_IDS.length * 5
  if (exams.length !== expected) {
    problems.push(`Expected ${expected} exams, received ${exams.length}`)
  }

  const ids = new Set<string>()
  for (const level of LEVELS) {
    for (const section of SECTION_IDS) {
      const variants = exams.filter((exam) => exam.level === level && exam.section === section)
      if (variants.length !== 5) problems.push(`${level} ${section} should have 5 variants`)
    }
  }

  for (const exam of exams) {
    if (ids.has(exam.id)) problems.push(`Duplicate exam ${exam.id}`)
    ids.add(exam.id)
    if (exam.questions.length !== 5) problems.push(`${exam.id} needs 5 questions`)
    if (exam.passScore !== 60) problems.push(`${exam.id} pass score must be 60`)
    const answers = new Set(exam.questions.map((question) => question.answer))
    if (answers.size < 2) problems.push(`${exam.id} answer key does not vary`)
    for (const question of exam.questions) {
      if (!question.choices.some((choice) => choice.key === question.answer)) {
        problems.push(`${question.id} answer is missing from choices`)
      }
      if (exam.section === 'listening' && !question.script?.trim()) {
        problems.push(`${question.id} is missing a listening script`)
      }
    }
  }

  if (problems.length > 0) throw new Error(problems.join('\n'))
}
