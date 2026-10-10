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

const NOVELTY_VOICE = /^(Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/
let speakGeneration = 0

function synth() {
  return window.speechSynthesis
}

function japaneseVoice() {
  const voices = synth().getVoices().filter((item) => item.lang.toLowerCase().startsWith('ja'))
  return voices.find((item) => item.name === 'Kyoko')
    ?? voices.find((item) => !NOVELTY_VOICE.test(item.name))
    ?? voices[0]
}

export function stopSpeaking() {
  speakGeneration += 1
  if (!canSpeak()) return
  const engine = synth()
  engine.cancel()
  if (engine.paused) engine.resume()
  engine.cancel()
}

export function pauseSpeaking() {
  if (!canSpeak()) return
  const engine = synth()
  engine.pause()
  if (!engine.paused) engine.pause()
}

export function resumeSpeaking() {
  if (!canSpeak()) return
  const engine = synth()
  engine.resume()
  if (engine.paused) {
    engine.pause()
    engine.resume()
  }
}

export function speakJapanese(text: string, rate: number, volume: number) {
  stopSpeaking()
  const generation = speakGeneration

  return new Promise<void>((resolve, reject) => {
    if (!canSpeak()) {
      reject(new Error('unsupported'))
      return
    }

    window.setTimeout(() => {
      if (generation !== speakGeneration) {
        resolve()
        return
      }
      if (!canSpeak()) {
        reject(new Error('unsupported'))
        return
      }
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ja-JP'
      utterance.rate = rate
      utterance.volume = Math.min(1, Math.max(0, volume))
      const voice = japaneseVoice()
      if (voice) utterance.voice = voice
      utterance.onend = () => resolve()
      utterance.onerror = (event) => {
        if (event.error === 'interrupted' || event.error === 'canceled') {
          resolve()
          return
        }
        reject(new Error(event.error))
      }
      synth().speak(utterance)
    }, 0)
  })
}
