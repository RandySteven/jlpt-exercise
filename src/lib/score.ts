import type { ChoiceKey, Exam, Grade } from '../data/types'

export function gradeExam(exam: Exam, answers: Record<string, string>): Grade {
  const details = exam.questions.map((question) => {
    const raw = answers[question.id]
    const selected = isChoice(raw) ? raw : null
    const correct = selected === question.answer
    return {
      id: question.id,
      selected,
      correct,
      points: correct ? exam.pointsPerQuestion : 0,
    }
  })

  const score = details.reduce((sum, item) => sum + item.points, 0)
  const correctCount = details.filter((item) => item.correct).length

  return {
    score,
    total: exam.questions.length * exam.pointsPerQuestion,
    passScore: exam.passScore,
    passed: score >= exam.passScore,
    correctCount,
    questionCount: exam.questions.length,
    details,
  }
}

function isChoice(value: string | undefined): value is ChoiceKey {
  return value === '1' || value === '2' || value === '3' || value === '4'
}
