import type { LevelId } from '../data/types'

const RATE: Record<LevelId, number> = {
  N5: 0.84,
  N4: 0.9,
  N3: 0.95,
  N2: 1,
  N1: 1.02,
}

export function speechRate(level: LevelId) {
  return RATE[level]
}

export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function stopSpeaking() {
  if (!canSpeak()) return
  window.speechSynthesis.cancel()
}

export function speakJapanese(text: string, rate: number) {
  stopSpeaking()

  return new Promise<void>((resolve, reject) => {
    if (!canSpeak()) {
      reject(new Error('unsupported'))
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ja-JP'
    utterance.rate = rate
    const voice = window.speechSynthesis
      .getVoices()
      .find((item) => item.lang.toLowerCase().startsWith('ja'))
    if (voice) utterance.voice = voice

    utterance.onend = () => resolve()
    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') {
        resolve()
        return
      }
      reject(new Error(event.error))
    }

    window.speechSynthesis.speak(utterance)
  })
}
