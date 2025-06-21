"use client"

import { motion } from "framer-motion"

type Tone = "calm" | "excited" | "sad" | "neutral"

interface VoiceOrbProps {
  isListening: boolean
  isRecording: boolean
  isSpeaking: boolean
  isProcessing: boolean
  tone: Tone
}

const toneColors = {
  calm: "from-blue-400 to-purple-500",
  excited: "from-orange-400 to-pink-500",
  sad: "from-gray-400 to-blue-400",
  neutral: "from-gray-400 to-indigo-400",
}

export default function VoiceOrb({ isListening, isRecording, isSpeaking, isProcessing, tone }: VoiceOrbProps) {
  const getOrbState = () => {
    if (isSpeaking) return "speaking"
    if (isProcessing) return "processing"
    if (isRecording) return "recording"
    if (isListening) return "listening"
    return "idle"
  }

  const orbState = getOrbState()
  const colorGradient = toneColors[tone]

  const getAnimationProps = () => {
    switch (orbState) {
      case "speaking":
        return {
          scale: [1, 1.3, 1],
          opacity: [0.8, 1, 0.8],
          transition: {
            duration: 0.6,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          },
        }
      case "processing":
        return {
          scale: [1, 1.1, 1],
          rotate: [0, 360],
          transition: {
            scale: { duration: 2, repeat: Number.POSITIVE_INFINITY },
            rotate: { duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
          },
        }
      case "recording":
        return {
          scale: [1, 1.2, 1],
          opacity: [0.6, 1, 0.6],
          transition: {
            duration: 1,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          },
        }
      case "listening":
        return {
          scale: [1, 1.05, 1],
          opacity: [0.7, 0.9, 0.7],
          transition: {
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          },
        }
      default:
        return {
          scale: 1,
          opacity: 0.6,
          transition: { duration: 1 },
        }
    }
  }

  return (
    <div className="relative">
      {/* Outer glow rings */}
      {(isRecording || isSpeaking) && (
        <>
          <motion.div
            className={`absolute inset-0 w-80 h-80 rounded-full bg-gradient-to-r ${colorGradient} opacity-20 blur-xl`}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.2, 0.1, 0.2],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className={`absolute inset-4 w-72 h-72 rounded-full bg-gradient-to-r ${colorGradient} opacity-15 blur-lg`}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.15, 0.05, 0.15],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: 0.3,
            }}
          />
        </>
      )}

      {/* Main orb */}
      <motion.div
        className={`w-64 h-64 rounded-full bg-gradient-to-r ${colorGradient} shadow-2xl relative overflow-hidden`}
        animate={getAnimationProps()}
      >
        {/* Inner glow */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-r from-white/20 to-transparent" />

        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)`,
          }}
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 4,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />

        {/* Pulse rings for speaking */}
        {isSpeaking && (
          <>
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border-2 border-white/30"
                initial={{ scale: 0, opacity: 1 }}
                animate={{
                  scale: [0, 2],
                  opacity: [1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.4,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}
      </motion.div>

      {/* Processing indicator */}
      {isProcessing && (
        <motion.div
          className="absolute -inset-4 rounded-full border-2 border-dashed border-white/30"
          animate={{ rotate: 360 }}
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
      )}
    </div>
  )
}
