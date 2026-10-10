import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const repo = 'RandySteven/jlpt-exercise-data'
const ref = 'master'
const levels = ['n1', 'n2', 'n3', 'n4', 'n5']
const root = join(import.meta.dirname, '..')

function localPath(level) {
  return join(root, 'src/json', level, 'data.json')
}

function cached() {
  return levels.every((level) => existsSync(localPath(level)))
}

function fetchLevel(level) {
  const remotePath = `src/json/${level}/data.json`
  try {
    return execFileSync(
      'gh',
      [
        'api',
        '-H',
        'Accept: application/vnd.github.raw',
        `repos/${repo}/contents/${remotePath}?ref=${ref}`,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
  } catch (error) {
    const stderr = error.stderr?.toString?.() ?? ''
    const detail = stderr.trim() || error.message
    throw new Error(
      `Could not read ${repo}@${ref} ${remotePath}.\n${detail}\n` +
        'Locally, run `gh auth login` with access to that private repo.\n' +
        'On GitHub Actions, set DATA_REPO_TOKEN to a PAT with contents:read on that repo.',
    )
  }
}

try {
  for (const level of levels) {
    const raw = fetchLevel(level)
    const parsed = JSON.parse(raw)
    if (!parsed?.title || !parsed?.content) {
      throw new Error(`${level}/data.json is missing title or content`)
    }
    const path = localPath(level)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, raw.endsWith('\n') ? raw : `${raw}\n`)
  }
  console.log(`Synced exam JSON from ${repo}@${ref}`)
} catch (error) {
  if (!cached()) throw error
  console.warn(`${error instanceof Error ? error.message : error}\nUsing exam JSON already on disk.`)
}
