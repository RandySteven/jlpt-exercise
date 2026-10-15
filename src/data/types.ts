export const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const
export type LevelId = (typeof LEVELS)[number]

export const SECTION_IDS = ['grammar', 'listening', 'language'] as const
export type SectionId = (typeof SECTION_IDS)[number]

export type ChoiceKey = '1' | '2' | '3' | '4'
export type Variant = 1 | 2 | 3 | 4 | 5

export interface ExplanationText {
  en: string
  id: string
}

export interface Draft {
  prompt: string
  choices: [string, string, string, string]
  answer: 1 | 2 | 3 | 4
  explanation: ExplanationText
  script?: string
}

export interface Question {
  id: string
  prompt: string
  choices: { key: ChoiceKey; text: string }[]
  answer: ChoiceKey
  explanation: ExplanationText
  script?: string
}

export interface Exam {
  id: string
  level: LevelId
  section: SectionId
  variant: Variant
  theme: string
  timeLimitSec: number
  pointsPerQuestion: number
  passScore: number
  questions: Question[]
}

export interface GradedQuestion {
  id: string
  selected: ChoiceKey | null
  correct: boolean
  points: number
}

export interface Grade {
  score: number
  total: number
  passScore: number
  passed: boolean
  correctCount: number
  questionCount: number
  details: GradedQuestion[]
}

export const PASS_SCORE = 60
export const POINTS_PER_QUESTION = 20

export const TIME_LIMIT_SEC: Record<LevelId, number> = {
  N5: 8 * 60,
  N4: 9 * 60,
  N3: 10 * 60,
  N2: 11 * 60,
  N1: 12 * 60,
}

export const LEVEL_INFO: Record<LevelId, { summary: string }> = {
  N5: { summary: '基本の文型と、身近なことば。' },
  N4: { summary: 'て形、経験、授受など初級の仕上げ。' },
  N3: { summary: '理由、様子、受身・使役など中級の入口。' },
  N2: { summary: '硬めの文型と、まとまった話の聞き取り。' },
  N1: { summary: '書きことばと、微妙な意味の違い。' },
}

export const SECTIONS: {
  id: SectionId
  ja: string
  en: string
  description: string
}[] = [
  {
    id: 'grammar',
    ja: '文法',
    en: 'Grammar',
    description: '文の形を見て、入る表現を選びます。',
  },
  {
    id: 'listening',
    ja: '聴解',
    en: 'Listening',
    description: '短い音声を聞いて、内容を選びます。',
  },
  {
    id: 'language',
    ja: '言語知識',
    en: 'Language Knowledge',
    description: '漢字、語彙、意味を確認します。',
  },
]

export function sectionById(id: SectionId) {
  const section = SECTIONS.find((item) => item.id === id)
  if (!section) throw new Error(`Unknown section: ${id}`)
  return section
}

export function isLevel(value: string): value is LevelId {
  return (LEVELS as readonly string[]).includes(value)
}

export function isSection(value: string): value is SectionId {
  return (SECTION_IDS as readonly string[]).includes(value)
}
