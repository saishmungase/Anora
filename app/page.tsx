"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import VoiceOrb from "@/components/voice-orb"
import AudioVisualizer from "@/components/audio-visualizer"
import { useSpeechInput } from "@/utils/speech-input"
import { useSpeechOutput } from "@/utils/speech-output"

type Tone = "calm" | "excited" | "sad" | "neutral"

interface ReflectionResponse {
  response: string
  tone: Tone
  userId: string
}

interface HistoryItem {
  id: string
  userInput: string
  detectedTone: string
  aiResponse: string
  timestamp: string
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

// User ID management utilities
const USER_ID_KEY = 'voice_reflection_user_id'

const getUserId = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USER_ID_KEY)
}

const setUserId = (userId: string): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_ID_KEY, userId)
}

// Particle component to prevent hydration issues
const AnimatedParticles = ({ config, isClient }: { 
  config: typeof toneConfig.neutral, 
  isClient: boolean 
}) => {
  const [particles, setParticles] = useState<Array<{ x: number; y: number; id: number }>>([])

  useEffect(() => {
    if (!isClient) return

    const generateParticles = () => {
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
      }))
      setParticles(newParticles)
    }

    generateParticles()
    window.addEventListener('resize', generateParticles)
    
    return () => window.removeEventListener('resize', generateParticles)
  }, [isClient])

  if (!isClient) return null

  return (
    <div className="absolute inset-0">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute w-1 h-1 ${config.particles} rounded-full`}
          initial={{
            x: particle.x,
            y: particle.y,
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
  )
}

function VoiceReflectionApp() {
  const [currentTone, setCurrentTone] = useState<Tone>("neutral")
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [showTranscript, setShowTranscript] = useState(false)
  const [aiResponse, setAiResponse] = useState("")
  const [isClient, setIsClient] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserIdState] = useState<string | null>(null)
  const [userHistory, setUserHistory] = useState<HistoryItem[]>([])

  const { isListening, isRecording, startListening, stopListening, transcript: liveTranscript } = useSpeechInput()
  const { speak, isSpeaking } = useSpeechOutput()

  // Handle client-side mounting and user ID
  useEffect(() => {
    setIsClient(true)
    
    // Get existing user ID from localStorage
    const existingUserId = getUserId()
    if (existingUserId) {
      setUserIdState(existingUserId)
      // Optionally fetch user history
      fetchUserHistory(existingUserId)
    }
  }, [])

  // Fetch user history
  const fetchUserHistory = async (uid: string) => {
    try {
      const response = await fetch(`/api/reflect?userId=${uid}`)
      if (response.ok) {
        const data = await response.json()
        setUserHistory(data.history || [])
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    }
  }

  // Auto-start listening when component mounts
  useEffect(() => {
    if (!isClient) return
    
    const timer = setTimeout(() => {
      startListening()
    }, 1000)
    return () => clearTimeout(timer)
  }, [startListening, isClient])

  // Handle transcript updates
  useEffect(() => {
    if (liveTranscript && liveTranscript !== transcript) {
      setTranscript(liveTranscript)
      setShowTranscript(true)
      setError(null) // Clear any previous errors

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
    setError(null)

    try {
      const response = await fetch("/api/reflect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          text,
          userId: userId || undefined // Send existing userId or undefined to create new
        }),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const data: ReflectionResponse = await response.json()

      if (!data.response || !data.tone || !data.userId) {
        throw new Error("Invalid response from server")
      }

      // Update user ID if it's new or different
      if (!userId || userId !== data.userId) {
        setUserIdState(data.userId)
        setUserId(data.userId) // Save to localStorage
      }

      setCurrentTone(data.tone)
      setAiResponse(data.response)

      // Update local history
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(), // Temporary ID
        userInput: text,
        detectedTone: data.tone,
        aiResponse: data.response,
        timestamp: new Date().toISOString()
      }
      setUserHistory(prev => [newHistoryItem, ...prev.slice(0, 9)]) // Keep last 10

      // Speak the response
      try {
        await speak(data.response)
      } catch (speechError) {
        console.warn("Speech synthesis failed:", speechError)
        // Continue without speech
      }

      // Reset and start listening again
      setTimeout(() => {
        setTranscript("")
        if (isClient) {
          startListening()
        }
      }, 1000)
    } catch (error) {
      console.error("Error processing reflection:", error)
      setError("I'm having trouble processing your reflection right now.")
      
      // Fallback response
      const fallbackResponse = "I'm here to listen. Please continue sharing your thoughts."
      setAiResponse(fallbackResponse)
      
      try {
        await speak(fallbackResponse)
      } catch (speechError) {
        console.warn("Speech synthesis failed:", speechError)
      }
      
      setTimeout(() => {
        setTranscript("")
        setError(null)
        if (isClient) {
          startListening()
        }
      }, 3000)
    } finally {
      setIsProcessing(false)
    }
  }

  const config = toneConfig[currentTone]

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.background} relative overflow-hidden`}>
      {/* Animated particles - only render on client */}
      <AnimatedParticles config={config} isClient={isClient} />

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
          {isRecording && isClient && (
            <div className="absolute inset-0 flex items-center justify-center">
              <AudioVisualizer isActive={isRecording} tone={currentTone} />
            </div>
          )}
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 max-w-2xl text-center"
            >
              <p className="text-red-400 text-sm font-light">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

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
            {userId && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full" />
                <span className="text-white/30 text-xs">User: {userId.slice(-6)}</span>
              </motion.div>
            )}

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

            {!isClient && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                <span className="text-white/50 text-sm">Loading...</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* History indicator (optional) */}
        {userHistory.length > 0 && (
          <div className="absolute top-8 right-8">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-white/30 text-sm"
            >
              {userHistory.length} conversations
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

// Export with dynamic import to prevent SSR issues
export default dynamic(() => Promise.resolve(VoiceReflectionApp), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-800 to-indigo-900 flex items-center justify-center">
      <div className="text-white/50">Loading voice reflection...</div>
    </div>
  ),
})