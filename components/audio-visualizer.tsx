"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

type Tone = "calm" | "excited" | "sad" | "neutral"

interface AudioVisualizerProps {
  isActive: boolean
  tone: Tone
}

const toneColors = {
  calm: "bg-blue-400",
  excited: "bg-orange-400",
  sad: "bg-gray-400",
  neutral: "bg-indigo-400",
}

export default function AudioVisualizer({ isActive, tone }: AudioVisualizerProps) {
  const [bars, setBars] = useState<number[]>([])

  useEffect(() => {
    if (!isActive) {
      setBars([])
      return
    }

    const interval = setInterval(() => {
      const newBars = Array.from({ length: 12 }, () => Math.random() * 100 + 20)
      setBars(newBars)
    }, 100)

    return () => clearInterval(interval)
  }, [isActive])

  if (!isActive) return null

  const barColor = toneColors[tone]

  return (
    <div className="flex items-center justify-center space-x-1">
      {bars.map((height, index) => (
        <motion.div
          key={index}
          className={`w-1 ${barColor} rounded-full opacity-70`}
          animate={{
            height: `${height}px`,
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            height: { duration: 0.1 },
            opacity: { duration: 0.5, repeat: Number.POSITIVE_INFINITY },
          }}
          style={{ minHeight: "20px" }}
        />
      ))}
    </div>
  )
}
