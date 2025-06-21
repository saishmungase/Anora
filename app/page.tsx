"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import VoiceOrb from "@/components/voice-orb"
import AudioVisualizer from "@/components/audio-visualizer"
import { useSpeechInput } from "@/utils/speech-input"
import { useSpeechOutput } from "@/utils/speech-output"

type Tone = "calm" | "excited" | "sad" | "neutral"

interface ReflectionResponse {
  response: string
  tone: Tone
}

const toneConfig = {
  calm: {
    background: "from-indigo-900 via-purple-900 to-blue-900",
    orbColor: "from-blue-400 to-purple-500",
    particles: "bg-blue-400/20",
  },
  excited: {
    background: "from-orange-900 via-pink-900 to-red-900",
    orbColor: "from-orange-400 to-pink-500",
    particles: "bg-orange-400/20",
  },
  sad: {
    background: "from-gray-900 via-slate-800 to-blue-900",
    orbColor: "from-gray-400 to-blue-400",
    particles: "bg-gray-400/20",
  },
  neutral: {
    background: "from-slate-900 via-gray-800 to-indigo-900",
    orbColor: "from-gray-400 to-indigo-400",
    particles: "bg-gray-400/20",
  },
}

export default function VoiceReflectionApp() {
  const [currentTone, setCurrentTone] = useState<Tone>("neutral")
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [showTranscript, setShowTranscript] = useState(false)
  const [aiResponse, setAiResponse] = useState("")

  const { isListening, isRecording, startListening, stopListening, transcript: liveTranscript } = useSpeechInput()

  const { speak, isSpeaking } = useSpeechOutput()

  // Auto-start listening when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      startListening()
    }, 1000)
    return () => clearTimeout(timer)
  }, [startListening])

  // Handle transcript updates
  useEffect(() => {
    if (liveTranscript && liveTranscript !== transcript) {
      setTranscript(liveTranscript)
      setShowTranscript(true)

      // Hide transcript after 3 seconds
      const timer = setTimeout(() => {
        setShowTranscript(false)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [liveTranscript, transcript])

  // Process reflection when user stops speaking
  useEffect(() => {
    if (!isRecording && transcript && transcript.length > 10) {
      processReflection(transcript)
    }
  }, [isRecording, transcript])

  const processReflection = async (text: string) => {
    if (isProcessing) return

    setIsProcessing(true)

    try {
      const response = await fetch("/api/reflect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) throw new Error("Failed to process reflection")

      const data: ReflectionResponse = await response.json()

      setCurrentTone(data.tone)
      setAiResponse(data.response)

      // Speak the response
      await speak(data.response)

      // Reset and start listening again
      setTimeout(() => {
        setTranscript("")
        startListening()
      }, 1000)
    } catch (error) {
      console.error("Error processing reflection:", error)
      // Fallback response
      setAiResponse("I'm here to listen. Please continue sharing your thoughts.")
      await speak("I'm here to listen. Please continue sharing your thoughts.")
      setTimeout(() => {
        setTranscript("")
        startListening()
      }, 1000)
    } finally {
      setIsProcessing(false)
    }
  }

  const config = toneConfig[currentTone]

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.background} relative overflow-hidden`}>
      {/* Animated particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-1 h-1 ${config.particles} rounded-full`}
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0,
            }}
            animate={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Fog overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-radial from-transparent via-black/10 to-black/30"
        animate={{
          opacity: currentTone === "sad" ? 0.8 : 0.3,
        }}
        transition={{ duration: 2 }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8">
        {/* Voice Orb */}
        <div className="relative">
          <VoiceOrb
            isListening={isListening}
            isRecording={isRecording}
            isSpeaking={isSpeaking}
            isProcessing={isProcessing}
            tone={currentTone}
          />

          {/* Audio Visualizer */}
          {isRecording && (
            <div className="absolute inset-0 flex items-center justify-center">
              <AudioVisualizer isActive={isRecording} tone={currentTone} />
            </div>
          )}
        </div>

        {/* Transcript Display */}
        <AnimatePresence>
          {showTranscript && transcript && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-12 max-w-2xl text-center"
            >
              <p className="text-white/70 text-lg font-light leading-relaxed">{transcript}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center space-x-4">
            {isListening && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-white/50 text-sm">Listening...</span>
              </motion.div>
            )}

            {isProcessing && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <span className="text-white/50 text-sm">Reflecting...</span>
              </motion.div>
            )}

            {isSpeaking && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-white/50 text-sm">Speaking...</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
