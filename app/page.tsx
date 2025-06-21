"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import VoiceOrb from "@/components/voice-orb"
import AudioVisualizer from "@/components/audio-visualizer"
import { useSpeechInput } from "@/utils/speech-input"
import { useSpeechOutput } from "@/utils/speech-output"
import { useRouter } from "next/navigation"

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
  createdAt: string
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
  angry: {
    background: "from-red-900 via-yellow-900 to-black",
    orbColor: "from-red-500 to-yellow-600",
    particles: "bg-red-400/20",
  },
  anxious: {
    background: "from-yellow-900 via-gray-800 to-red-800",
    orbColor: "from-yellow-400 to-red-500",
    particles: "bg-yellow-400/20",
  },
  hopeful: {
    background: "from-green-900 via-blue-900 to-teal-900",
    orbColor: "from-green-400 to-blue-400",
    particles: "bg-green-400/20",
  }
}

const USER_ID_KEY = 'voice_reflection_user_id'

const getUserId = (): string | null => {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(USER_ID_KEY)
  } catch {
    return null
  }
}

const setUserId = (userId: string): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(USER_ID_KEY, userId)
  } catch (error) {
    console.warn('Failed to save user ID to localStorage:', error)
  }
}

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
        x: Math.random() * (window.innerWidth || 1200),
        y: Math.random() * (window.innerHeight || 800),
      }))
      setParticles(newParticles)
    }

    generateParticles()
    const handleResize = () => generateParticles()
    window.addEventListener('resize', handleResize)
    
    return () => window.removeEventListener('resize', handleResize)
  }, [isClient])

  if (!isClient) return null

  return (
    <div className="absolute inset-0 pointer-events-none">
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
            x: Math.random() * (window.innerWidth || 1200),
            y: Math.random() * (window.innerHeight || 800),
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
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
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState("")

  const { isListening, isRecording, startListening, stopListening, transcript: liveTranscript } = useSpeechInput()
  const { speak, isSpeaking, stopSpeaking } = useSpeechOutput()
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
    const existingUserId = getUserId()
    if (existingUserId) {
      setUserIdState(existingUserId)
      fetchUserHistory(existingUserId)
    }
  }, [])

  const fetchUserHistory = useCallback(async (uid: string) => {
    try {
      const response = await fetch(`/api/reflect?userId=${encodeURIComponent(uid)}`)
      if (response.ok) {
        const data = await response.json()
        setUserHistory(data.history || [])
      } else {
        console.warn('Failed to fetch user history:', response.status)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    }
  }, [])

  useEffect(() => {
    if (!isClient) return
    
    const timer = setTimeout(() => {
      if (!isListening && !isProcessing) {
        startListening()
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [isClient, isListening, isProcessing, startListening])

  useEffect(() => {
    if (liveTranscript && liveTranscript !== transcript && liveTranscript.length > 0) {
      setTranscript(liveTranscript)
      setShowTranscript(true)
      setError(null)

      const timer = setTimeout(() => {
        setShowTranscript(false)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [liveTranscript, transcript])

  useEffect(() => {
    if (!isRecording && transcript && transcript.length > 10 && transcript !== lastProcessedTranscript) {
      processReflection(transcript)
    }
  }, [isRecording, transcript, lastProcessedTranscript])

  const processReflection = useCallback(async (text: string) => {
  if (isProcessing || !text.trim()) return

  if (text.toLowerCase().includes("open mood tracker") || text.toLowerCase().includes("mood tracker")) {
    router.push('/moodtracker')
    return
  }

  setIsProcessing(true)
  setError(null)
  setLastProcessedTranscript(text)

  try {
    const requestBody = { 
      text: text.trim(),
      userId: userId || undefined
    }

    console.log('Sending reflection request:', requestBody)

    const response = await fetch("/api/reflect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Server error: ${response.status} - ${errorData.error || 'Unknown error'}`)
    }

    const data: ReflectionResponse = await response.json()
    console.log('Received reflection response:', data)

    if (!data.response || !data.tone || !data.userId) {
      throw new Error("Invalid response from server")
    }

    if (!userId || userId !== data.userId) {
      setUserIdState(data.userId)
      setUserId(data.userId)
    }

    setCurrentTone(data.tone)
    setAiResponse(data.response)

    const newHistoryItem: HistoryItem = {
      id: Date.now().toString(),
      userInput: text,
      detectedTone: data.tone,
      aiResponse: data.response,
      createdAt: new Date().toISOString()
    }
    setUserHistory(prev => [newHistoryItem, ...prev.slice(0, 9)])

    try {
      await stopSpeaking()
      await speak(data.response)
    } catch (speechError) {
      console.warn("Speech synthesis failed:", speechError)
    }

    setTimeout(() => {
      setTranscript("")
      setShowTranscript(false)
      if (isClient && !isListening) {
        startListening()
      }
    }, 2000)

  } catch (error) {
    console.error("Error processing reflection:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    setError(`I'm having trouble processing your reflection: ${errorMessage}`)
    
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
      setShowTranscript(false)
      if (isClient && !isListening) {
        startListening()
      }
    }, 3000)
  } finally {
    setIsProcessing(false)
  }
}, [userId, isProcessing, isClient, isListening, speak, stopSpeaking, startListening, router])

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
              <p className="text-red-400 text-sm font-light bg-red-900/20 px-4 py-2 rounded-lg">
                {error}
              </p>
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
              <p className="text-white/70 text-lg font-light leading-relaxed bg-black/20 px-6 py-4 rounded-lg backdrop-blur-sm">
                {transcript}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Response Display */}
        <AnimatePresence>
          {aiResponse && !showTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-12 max-w-2xl text-center"
            >
              <p className="text-white/80 text-lg font-light leading-relaxed bg-white/10 px-6 py-4 rounded-lg backdrop-blur-sm">
                {aiResponse}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center space-x-4 bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm">
            {userId && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full" />
                <span className="text-white/50 text-xs">ID: {userId.slice(-6)}</span>
              </motion.div>
            )}

            {isListening && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-white/70 text-sm">Listening...</span>
              </motion.div>
            )}

            {isRecording && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                <span className="text-white/70 text-sm">Recording...</span>
              </motion.div>
            )}

            {isProcessing && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <span className="text-white/70 text-sm">Reflecting...</span>
              </motion.div>
            )}

            {isSpeaking && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-white/70 text-sm">Speaking...</span>
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

        {/* History indicator */}
        {userHistory.length > 0 && (
          <div className="absolute top-8 right-8">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-white/40 text-sm bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm"
            >
              {userHistory.length} conversations
            </motion.div>
          </div>
        )}

        {/* Manual controls (optional) */}
        <div className="absolute top-8 left-8 flex flex-col space-y-2">
          <button
            onClick={() => isListening ? stopListening() : startListening()}
            className="px-4 py-2 bg-white/10 text-white/70 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-all text-sm"
          >
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </button>
          
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg backdrop-blur-sm hover:bg-red-500/30 transition-all text-sm"
            >
              Stop Speaking
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default dynamic(() => Promise.resolve(VoiceReflectionApp), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-800 to-indigo-900 flex items-center justify-center">
      <div className="text-white/50 text-lg">Loading voice reflection...</div>
    </div>
  ),
})