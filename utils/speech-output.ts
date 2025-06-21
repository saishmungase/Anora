"use client"

import { useState, useCallback } from "react"

export function useSpeechOutput() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const speak = useCallback(async (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Speech synthesis not available"))
        return
      }

      if (!window.speechSynthesis) {
        setError("Speech synthesis not supported in this browser")
        reject(new Error("Speech synthesis not supported"))
        return
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)

      // Configure voice settings
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 0.8

      // Try to use a more natural voice
      const voices = window.speechSynthesis.getVoices()
      const preferredVoice = voices.find(
        (voice) => voice.name.includes("Google") || voice.name.includes("Microsoft") || voice.lang.startsWith("en"),
      )
      if (preferredVoice) {
        utterance.voice = preferredVoice
      }

      utterance.onstart = () => {
        setIsSpeaking(true)
        setError(null)
      }

      utterance.onend = () => {
        setIsSpeaking(false)
        resolve()
      }

      utterance.onerror = (event) => {
        setIsSpeaking(false)
        setError(`Speech synthesis error: ${event.error}`)
        reject(new Error(event.error))
      }

      window.speechSynthesis.speak(utterance)
    })
  }, [])

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])

  return {
    speak,
    stopSpeaking,
    isSpeaking,
    error,
  }
}
