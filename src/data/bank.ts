import {
  PASS_SCORE,
  POINTS_PER_QUESTION,
  TIME_LIMIT_SEC,
  type ChoiceKey,
  type Draft,
  type Exam,
  type ExplanationText,
  type LevelId,
  type SectionId,
  type Variant,
} from './types'

const CHOICE_KEYS: ChoiceKey[] = ['1', '2', '3', '4']

export function explanationFor(explanation: ExplanationText, locale: keyof ExplanationText) {
  return explanation[locale]
}

export function q(
  prompt: string,
  c1: string,
  c2: string,
  c3: string,
  c4: string,
  answer: 1 | 2 | 3 | 4,
  explanation: ExplanationText,
  script?: string,
): Draft {
  return {
    prompt,
    choices: [c1, c2, c3, c4],
    answer,
    explanation,
    script,
  }
}

export interface LevelQuestionJson {
  question: string
  answers: readonly string[]
  correct_answer: number
  explanation: ExplanationText
  hint?: string
  script?: string
}

export interface LevelSectionJson {
  theme: string
  questions: readonly LevelQuestionJson[]
}

export interface LevelFile {
  title: string
  content: Partial<Record<`variant_${Variant}`, Partial<Record<SectionId, LevelSectionJson>>>>
}

const FILE_SECTIONS: SectionId[] = ['grammar', 'language', 'listening']
const FILE_VARIANTS: Variant[] = [1, 2, 3, 4, 5]

export function examsFromLevelJson(level: LevelId, file: LevelFile): Exam[] {
  return FILE_SECTIONS.flatMap((section) =>
    FILE_VARIANTS.map((variant) => {
      const block = file.content[`variant_${variant}`]?.[section]
      if (!block) throw new Error(`${level} ${section} variant ${variant} is missing`)
      const drafts = block.questions.map((item) => toDraft(level, section, variant, item))
      if (drafts.length !== 5) {
        throw new Error(`${level} ${section} variant ${variant} needs 5 questions`)
      }
      const [first, second, third, fourth, fifth] = drafts
      return makeExam(level, section, variant, block.theme, [first, second, third, fourth, fifth])
    }),
  )
}

function toDraft(level: LevelId, section: SectionId, variant: Variant, item: LevelQuestionJson): Draft {
  const [c1, c2, c3, c4] = item.answers
  if (item.answers.length !== 4 || c1 === undefined || c2 === undefined || c3 === undefined || c4 === undefined) {
    throw new Error(`${level} ${section} variant ${variant} has a question without 4 answers`)
  }
  if (item.correct_answer !== 1 && item.correct_answer !== 2 && item.correct_answer !== 3 && item.correct_answer !== 4) {
    throw new Error(`${level} ${section} variant ${variant} has a correct_answer outside 1-4`)
  }
  const where = `${level} ${section} variant ${variant}`
  return q(item.question, c1, c2, c3, c4, item.correct_answer, resolveExplanation(item.explanation, where), item.script)
}

function resolveExplanation(explanation: ExplanationText, where: string): ExplanationText {
  if (!explanation?.en?.trim() || !explanation?.id?.trim()) {
    throw new Error(`${where} explanation needs English and Indonesian text`)
  }
  return { en: explanation.en, id: explanation.id }
}

export function makeExam(
  level: LevelId,
  section: SectionId,
  variant: Variant,
  theme: string,
  drafts: readonly [Draft, Draft, Draft, Draft, Draft],
): Exam {
  return {
    id: `${level}-${section}-${variant}`,
    level,
    section,
    variant,
    theme,
    timeLimitSec: TIME_LIMIT_SEC[level],
    pointsPerQuestion: POINTS_PER_QUESTION,
    passScore: PASS_SCORE,
    questions: drafts.map((draft, index) => ({
      id: `${level}-${section}-${variant}-${index + 1}`,
      prompt: draft.prompt,
      choices: draft.choices.map((text, choiceIndex) => ({
        key: CHOICE_KEYS[choiceIndex],
        text,
      })),
      answer: CHOICE_KEYS[draft.answer - 1],
      explanation: draft.explanation,
      script: draft.script,
    })),
  }
}
