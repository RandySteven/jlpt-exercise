import type { Exam } from '../data/types'
import { readAttempt } from './attempt'
import { api } from './api'
import type { GenerateExerciseResponse } from './generated-exam'

export type ListedExercise = {
  id: number
  status: string
  redirect_url: string
  jlpt_level: string
  reference_id: string
  created_at: string
  updated_at: string
}

type ListEnvelope = {
  data?: {
    list_exercise_response?: {
      exercises?: ListedExercise[]
      total_item?: number
    }
  }
}

type DetailEnvelope = {
  data?: { get_exercise_detail_response?: GenerateExerciseResponse }
}

type SubmitEnvelope = {
  data?: { submit_exercise_response?: { id: number; status: string } }
}

export function listExercises(token: string) {
  return api<ListEnvelope>('/exercise/list', {
    method: 'POST',
    token,
    body: { page: 1, page_size: 20 },
  }).then((body) => body.data?.list_exercise_response?.exercises ?? [])
}

export function listedExerciseId(item: ListedExercise) {
  const match = /\/(\d+)\s*$/.exec(item.redirect_url ?? '')
  return match ? Number(match[1]) : item.id
}

export function getExercise(token: string, id: number) {
  return api<DetailEnvelope>(`/exercise/${id}`, { token }).then((body) => {
    const response = body.data?.get_exercise_detail_response
    if (!response?.status) throw new Error('Exercise detail is missing')
    return response
  })
}

export function submitExercise(token: string, id: number, exams: Exam[]) {
  return api<SubmitEnvelope>('/exercise/submit', {
    method: 'POST',
    token,
    body: { id, answer: answerMap(exams) },
  }).then((body) => body.data?.submit_exercise_response)
}

function answerMap(exams: Exam[]) {
  const answer: Record<string, Record<string, string>> = {}
  for (const exam of exams) {
    const attempt = readAttempt(exam.id)
    const section: Record<string, string> = {}
    exam.questions.forEach((question, index) => {
      const selected = attempt?.answers[question.id]
      const choice = question.choices.find((item) => item.key === selected)
      if (choice) section[String(index + 1)] = choice.text
    })
    answer[exam.section] = section
  }
  return answer
}
