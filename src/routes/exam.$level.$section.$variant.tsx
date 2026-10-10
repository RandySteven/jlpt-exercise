import { createFileRoute, notFound } from '@tanstack/react-router'
import { getExam } from '../data'
import { ExamRunner } from '../components/ExamRunner'

export const Route = createFileRoute('/exam/$level/$section/$variant')({
  beforeLoad: ({ params }) => {
    if (!getExam(params.level, params.section, params.variant)) throw notFound()
  },
  component: ExamPage,
})

function ExamPage() {
  const { level, section, variant } = Route.useParams()
  const exam = getExam(level, section, variant)
  if (!exam) return null
  return <ExamRunner key={exam.id} exam={exam} />
}
