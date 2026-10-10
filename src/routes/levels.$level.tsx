import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { useEffect } from 'react'
import { examsFor } from '../data'
import {
  LEVEL_INFO,
  PASS_SCORE,
  SECTIONS,
  TIME_LIMIT_SEC,
  isLevel,
} from '../data/types'
import { formatDuration } from '../lib/time'

export const Route = createFileRoute('/levels/$level')({
  beforeLoad: ({ params }) => {
    if (!isLevel(params.level)) throw notFound()
  },
  component: LevelPage,
})

function LevelPage() {
  const { level: levelParam } = Route.useParams()
  if (!isLevel(levelParam)) return null
  const level = levelParam

  useEffect(() => {
    document.title = `${level} · JLPT 演習課題`
  }, [level])

  return (
    <div className="level-page">
      <header className="page-head">
        <p className="eyebrow">
          <Link to="/">級の一覧</Link>
          <span aria-hidden="true"> / </span>
          {level}
        </p>
        <h1>{level}</h1>
        <p className="lede">{LEVEL_INFO[level].summary}</p>
        <dl className="stat-row compact">
          <div>
            <dt>制限時間</dt>
            <dd>{formatDuration(TIME_LIMIT_SEC[level])}</dd>
          </div>
          <div>
            <dt>合格点</dt>
            <dd>{PASS_SCORE} / 100</dd>
          </div>
          <div>
            <dt>問題数</dt>
            <dd>5問</dd>
          </div>
        </dl>
      </header>

      <div className="section-stack">
        {SECTIONS.map((section) => (
          <section key={section.id} className="section-block" aria-labelledby={`${section.id}-title`}>
            <div className="section-copy">
              <h2 id={`${section.id}-title`}>{section.ja}</h2>
              <p>{section.en}</p>
              <p>{section.description}</p>
            </div>
            <div className="variant-list">
              {examsFor(level, section.id).map((exam) => (
                <Link
                  key={exam.id}
                  to="/exam/$level/$section/$variant"
                  params={{
                    level,
                    section: section.id,
                    variant: String(exam.variant),
                  }}
                  className="variant-link"
                >
                  <span className="variant-round">第{exam.variant}回</span>
                  <span className="variant-theme">{exam.theme}</span>
                  <span className="variant-go">受ける</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
