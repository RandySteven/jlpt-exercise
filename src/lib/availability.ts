import { API_BASE } from './api'

const PROBE_PATH = '/dummy'
const PROBE_TIMEOUT_MS = 4000
const UP_TTL_MS = 30_000

let upUntil = 0

export function resetServerProbe() {
  upUntil = 0
}

export async function isServerReachable() {
  if (Date.now() < upUntil) return true

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  try {
    const response = await fetch(`${API_BASE}${PROBE_PATH}`, { signal: controller.signal })
    const up = response.status < 500
    upUntil = up ? Date.now() + UP_TTL_MS : 0
    return up
  } catch {
    upUntil = 0
    return false
  } finally {
    clearTimeout(timer)
  }
}
