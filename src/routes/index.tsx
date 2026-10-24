import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { LEVELS, PASS_SCORE, SECTION_IDS, TIME_LIMIT_SEC } from '../data/types'
import { SakuraBranch } from '../components/SakuraArt'
import { useLocale } from '../i18n/locale'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { t } = useLocale()
  const { user } = useAuth()

  useEffect(() => {
    document.title = t.pageTitle
  }, [t.pageTitle])

  return (
    <div className="home">
      <section className="hero">
        <div>
          <p className="eyebrow">{t.homeEyebrow}</p>
          <h1>
            {t.homeTitle1}
            <br />
            {t.homeTitle2}
          </h1>
          <p className="lede">{t.homeLead(PASS_SCORE)}</p>
        </div>
        <SakuraBranch />
        <dl className="stat-row">
          <div>
            <dt>{t.statLevels}</dt>
            <dd>5</dd>
          </div>
          <div>
            <dt>{t.statSubjects}</dt>
            <dd>3</dd>
          </div>
          <div>
            <dt>{t.statRounds}</dt>
            <dd>5</dd>
          </div>
          <div>
            <dt>{t.statPass}</dt>
            <dd>{PASS_SCORE}</dd>
          </div>
        </dl>
      </section>

      {user ? (
        <section className="sheet generate-banner">
          <div>
            <p className="eyebrow">{t.generateEyebrow}</p>
            <h2>{t.generateTitle}</h2>
            <p className="lede">{t.generateLead}</p>
          </div>
          <div className="action-row">
            <Link to="/subscribe" className="btn ghost">
              {t.subscribeStart}
            </Link>
            <Link to="/generate" className="btn primary">
              {t.generateStart}
            </Link>
          </div>
        </section>
      ) : null}

      <section className="level-grid" aria-label={t.chooseLevel}>
        {LEVELS.map((level) => (
          <Link key={level} to="/levels/$level" params={{ level }} className="level-card">
            <span className="level-kicker">Level</span>
            <span className="level-id">{level}</span>
            <span className="level-summary">{t.summaries[level]}</span>
            <span className="level-meta">
              {SECTION_IDS.map((section) => t.sections[section]).join(' · ')}
              <br />
              {t.roundsEach(t.minutes(TIME_LIMIT_SEC[level] / 60))}
            </span>
          </Link>
        ))}
      </section>
    </div>
  )
}
