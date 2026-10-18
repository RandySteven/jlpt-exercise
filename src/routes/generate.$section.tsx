import { Link, createFileRoute } from '@tanstack/react-router'
import { ExamRunner } from '../components/ExamRunner'
import { useLocale } from '../i18n/locale'
import { useAuth } from '../lib/auth'
import { examsFromGenerated, exerciseReady, isGeneratedSection, readGeneration } from '../lib/generated-exam'

export const Route = createFileRoute('/generate/$section')({
  component: GeneratedSectionPage,
})

function GeneratedSectionPage() {
  const { section } = Route.useParams()
  const { t } = useLocale()
  const { user } = useAuth()
  const stored = user ? readGeneration(user.email) : null
  const exams =
    stored?.response && exerciseReady(stored.response) ? safeExams(stored.response) : null
  const exam = exams?.find((item) => item.section === section) ?? null

  if (!user) {
    return (
      <section className="sheet narrow">
        <h1>{t.generateTitle}</h1>
        <p className="lede">{t.generateSignIn}</p>
        <Link to="/sign-in" className="btn primary">
          {t.signIn}
        </Link>
      </section>
    )
  }

  if (!isGeneratedSection(section) || !exam) {
    return (
      <section className="sheet narrow">
        <h1>{t.generateMissingTitle}</h1>
        <p className="lede">{t.generateMissingBody}</p>
        <Link to="/generate" className="btn primary">
          {t.generateBack}
        </Link>
      </section>
    )
  }

  return <ExamRunner key={exam.id} exam={exam} exitTo="generate" />
}

function safeExams(response: NonNullable<ReturnType<typeof readGeneration>>['response']) {
  if (!response) return null
  try {
    return examsFromGenerated(response)
  } catch {
    return null
  }
}
