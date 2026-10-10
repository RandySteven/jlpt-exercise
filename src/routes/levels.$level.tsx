import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { useEffect } from 'react'
import { examsFor } from '../data'
import { PASS_SCORE, SECTION_IDS, TIME_LIMIT_SEC, isLevel } from '../data/types'
import { useLocale } from '../i18n/locale'

export const Route = createFileRoute('/levels/$level')({
  beforeLoad: ({ params }) => {
    if (!isLevel(params.level)) throw notFound()
  },
  component: LevelPage,
})

function LevelPage() {
  const { level: levelParam } = Route.useParams()
  const { t, themeName } = useLocale()
  const level = isLevel(levelParam) ? levelParam : null

  useEffect(() => {
    if (!level) return
    document.title = t.levelTitle(level)
  }, [level, t])

  if (!level) return null

  return (
    <div className="level-page">
      <header className="page-head">
        <p className="eyebrow">
          <Link to="/">{t.levelList}</Link>
          <span aria-hidden="true"> / </span>
          {level}
        </p>
        <h1>{level}</h1>
        <p className="lede">{t.summaries[level]}</p>
        <dl className="stat-row compact">
          <div>
            <dt>{t.timeLimit}</dt>
            <dd>{t.minutes(TIME_LIMIT_SEC[level] / 60)}</dd>
          </div>
          <div>
            <dt>{t.passScore}</dt>
            <dd>{PASS_SCORE} / 100</dd>
          </div>
          <div>
            <dt>{t.questionCount}</dt>
            <dd>{t.fiveQuestions}</dd>
          </div>
        </dl>
      </header>

      <div className="section-stack">
        {SECTION_IDS.map((section) => (
          <section key={section} className="section-block" aria-labelledby={`${section}-title`}>
            <div className="section-copy">
              <h2 id={`${section}-title`}>{t.sections[section]}</h2>
              <p>{t.sectionJa[section]}</p>
              <p>{t.sectionDesc[section]}</p>
            </div>
            <div className="variant-list">
              {examsFor(level, section).map((exam) => (
                <Link
                  key={exam.id}
                  to="/exam/$level/$section/$variant"
                  params={{
                    level,
                    section,
                    variant: String(exam.variant),
                  }}
                  className="variant-link"
                >
                  <span className="variant-round">{t.round(exam.variant)}</span>
                  <span className="variant-theme">{themeName(exam.theme)}</span>
                  <span className="variant-go">{t.take}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
