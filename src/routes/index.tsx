import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { LEVELS, LEVEL_INFO, PASS_SCORE, SECTIONS, TIME_LIMIT_SEC } from '../data/types'
import { formatDuration } from '../lib/time'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  useEffect(() => {
    document.title = 'JLPT 演習課題'
  }, [])

  return (
    <div className="home">
      <section className="hero">
        <p className="eyebrow">JLPT exercise</p>
        <h1>
          N5からN1まで、
          <br />
          制限時間で解く。
        </h1>
        <p className="lede">
          文法、聴解、言語知識。各級に5回分の問題があります。100点満点で、合格点は{PASS_SCORE}点です。
        </p>
        <dl className="stat-row">
          <div>
            <dt>級</dt>
            <dd>5</dd>
          </div>
          <div>
            <dt>科目</dt>
            <dd>3</dd>
          </div>
          <div>
            <dt>各級の回</dt>
            <dd>5</dd>
          </div>
          <div>
            <dt>合格点</dt>
            <dd>{PASS_SCORE}</dd>
          </div>
        </dl>
      </section>

      <section className="level-grid" aria-label="級を選ぶ">
        {LEVELS.map((level) => (
          <Link
            key={level}
            to="/levels/$level"
            params={{ level }}
            className="level-card"
          >
            <span className="level-kicker">Level</span>
            <span className="level-id">{level}</span>
            <span className="level-summary">{LEVEL_INFO[level].summary}</span>
            <span className="level-meta">
              {SECTIONS.map((section) => section.ja).join(' · ')}
              <br />
              各5回 · {formatDuration(TIME_LIMIT_SEC[level])}
            </span>
          </Link>
        ))}
      </section>
    </div>
  )
}
