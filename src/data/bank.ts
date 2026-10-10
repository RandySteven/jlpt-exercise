import {
  PASS_SCORE,
  POINTS_PER_QUESTION,
  TIME_LIMIT_SEC,
  type ChoiceKey,
  type Draft,
  type Exam,
  type LevelId,
  type SectionId,
  type Variant,
} from './types'

const CHOICE_KEYS: ChoiceKey[] = ['1', '2', '3', '4']

export function q(
  prompt: string,
  c1: string,
  c2: string,
  c3: string,
  c4: string,
  answer: 1 | 2 | 3 | 4,
  explanation: string,
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
