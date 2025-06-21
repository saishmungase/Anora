"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { useSpeechInput } from "@/utils/speech-input"
import { useSpeechOutput } from "@/utils/speech-output"

interface MoodData {
  date: string
  detectedTone: string
  timestamp: string
  userInput: string
  aiResponse: string
}

interface ChartData {
  date: string
  moodScore: number
  tone: string
  emoji: string
}

interface ToneCount {
  tone: string
  count: number
  emoji: string
  color: string
}

const toneMapping = {
  sad: { score: 1, emoji: "😔", color: "#6B7280" },
  anxious: { score: 2, emoji: "😰", color: "#F59E0B" },
  neutral: { score: 3, emoji: "😐", color: "#9CA3AF" },
  calm: { score: 4, emoji: "🧘‍♂️", color: "#3B82F6" },
  hopeful: { score: 5, emoji: "🌱", color: "#10B981" },
  excited: { score: 6, emoji: "😄", color: "#F97316" },
  angry: { score: 2, emoji: "😠", color: "#EF4444" },
}

const USER_ID_KEY = 'voice_reflection_user_id'

const getUserId = (): string | null => {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(USER_ID_KEY)
  } catch {
    return null
  }
}

export default function MoodTracker() {
  const router = useRouter()
  const [moodData, setMoodData] = useState<MoodData[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [toneDistribution, setToneDistribution] = useState<ToneCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  const { isListening, startListening, stopListening, transcript } = useSpeechInput()
  const { speak } = useSpeechOutput()

  useEffect(() => {
    setIsClient(true)
    const existingUserId = getUserId()
    if (existingUserId) {
      setUserId(existingUserId)
      fetchMoodData(existingUserId)
    } else {
      setError("No user ID found. Please use the voice reflection app first.")
      setLoading(false)
    }
  }, [])

  const checkNavigationCommands = useCallback(
    (text: string) => {
      const lowerText = text.toLowerCase().trim()

      if (lowerText.includes("back to anora") || lowerText.includes("go back") || lowerText.includes("home")) {
        router.push("/")
        return true
      }

      return false
    },
    [router],
  )

  useEffect(() => {
    if (!isClient) return

    const timer = setTimeout(() => {
      if (!isListening) {
        startListening()
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [isClient, isListening, startListening])

  useEffect(() => {
    if (transcript && transcript.length > 5) {
      checkNavigationCommands(transcript)
    }
  }, [transcript, checkNavigationCommands])

  const fetchMoodData = async (uid: string) => {
    try {
      setLoading(true)
      const response = await fetch("/api/board", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: uid }),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch mood data: ${response.status}`)
      }

      const data = await response.json()
      console.log(data)
      setMoodData(data.moods || [])

      processChartData(data.moods || [])
    } catch (error) {
      console.error("Error fetching mood data:", error)
      setError(error instanceof Error ? error.message : "Failed to load mood data")
    } finally {
      setLoading(false)
    }
  }

  const processChartData = (moods: MoodData[]) => {
    const chartPoints = moods
      .map((mood) => {
        console.log(mood.detectedTone)
        const toneKey = (mood.detectedTone || "neutral").toLowerCase() as keyof typeof toneMapping;
        const toneInfo = toneMapping[toneKey] || toneMapping.neutral;

        return {
          date: new Date(mood.timestamp).toLocaleDateString(),
          moodScore: toneInfo.score,
          tone: mood.detectedTone,
          emoji: toneInfo.emoji,
        }
      })
      .reverse() 

    setChartData(chartPoints)

    const toneCounts: { [key: string]: number } = {}
    moods.forEach((mood) => {
      toneCounts[mood.detectedTone] = (toneCounts[mood.detectedTone] || 0) + 1
    })

    const pieData = Object.entries(toneCounts).map(([tone, count]) => {
      const toneInfo = toneMapping[tone as keyof typeof toneMapping] || toneMapping.neutral
      return {
        tone,
        count,
        emoji: toneInfo.emoji,
        color: toneInfo.color,
      }
    })

    setToneDistribution(pieData)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm">
          <p className="font-medium">{label}</p>
          <p className="flex items-center gap-2">
            <span className="text-2xl">{data.emoji}</span>
            <span className="capitalize">{data.tone}</span>
          </p>
        </div>
      )
    }
    return null
  }

  const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, emoji }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize="20">
        {emoji}
      </text>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white text-xl">
          📊 Loading your mood journey...
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-white max-w-md"
        >
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-light mb-4">Oops!</h2>
          <p className="text-white/70 mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-white/10 text-white rounded-lg backdrop-blur-sm hover:bg-white/20 transition-all"
          >
            Back to Anora
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/10 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1200),
              y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800),
              opacity: 0,
            }}
            animate={{
              x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1200),
              y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800),
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 20 + 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-4xl font-light text-white mb-2">📊 Mood Tracker</h1>
          <p className="text-white/60">Your emotional journey with Anora</p>
          {userId && <p className="text-white/40 text-sm mt-2">User ID: {userId.slice(-8)}</p>}
        </motion.div>

        {moodData.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-white/60 mt-20">
            <div className="text-6xl mb-4">🌱</div>
            <p className="text-xl">No mood data yet</p>
            <p className="text-white/40 mt-2">Start using Anora to track your emotional journey</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
            {/* Mood Timeline Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6"
            >
              <h2 className="text-2xl font-light text-white mb-4 flex items-center gap-2">📈 Mood Timeline</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" fontSize={12} />
                    <YAxis
                      domain={[1, 6]}
                      stroke="rgba(255,255,255,0.6)"
                      fontSize={12}
                      tickFormatter={(value) => {
                        const toneEntry = Object.entries(toneMapping).find(([_, info]) => info.score === value)
                        return toneEntry ? toneEntry[1].emoji : value.toString()
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="moodScore"
                      stroke="#8B5CF6"
                      strokeWidth={3}
                      dot={{ fill: "#8B5CF6", strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8, fill: "#A855F7" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Mood Distribution */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6"
            >
              <h2 className="text-2xl font-light text-white mb-4 flex items-center gap-2">🎭 Mood Distribution</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={toneDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={<CustomPieLabel />}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {toneDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) => [
                        `${value} times`,
                        `${props.payload.emoji} ${props.payload.tone}`,
                      ]}
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.8)",
                        border: "none",
                        borderRadius: "8px",
                        color: "white",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Recent Moods */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 bg-white/10 backdrop-blur-sm rounded-xl p-6"
            >
              <h2 className="text-2xl font-light text-white mb-4 flex items-center gap-2">📝 Recent Reflections</h2>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {moodData.slice(0, 5).map((mood, index) => {
                  const toneInfo = toneMapping[mood.detectedTone as keyof typeof toneMapping] || toneMapping.neutral
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white/5 rounded-lg p-4 border border-white/10"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{toneInfo.emoji}</span>
                        <span className="text-white/80 capitalize font-medium">{mood.detectedTone}</span>
                        <span className="text-white/40 text-sm ml-auto">
                          {new Date(mood.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-white/60 text-sm line-clamp-2">{mood.userInput}</p>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        )}

        {/* Voice Command Hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <div className="bg-black/20 backdrop-blur-sm rounded-full px-6 py-3 text-white/60 text-sm">
            💬 Say "back to Anora" to return home
          </div>
        </motion.div>

        {/* Listening Indicator */}
        {isListening && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="fixed top-8 right-8 bg-green-500/20 backdrop-blur-sm rounded-full px-4 py-2 text-green-300 text-sm flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Listening for commands...
          </motion.div>
        )}

        {/* Manual Back Button */}
        <button
          onClick={() => router.push("/")}
          className="fixed top-8 left-8 px-4 py-2 bg-white/10 text-white/70 rounded-lg backdrop-blur-sm hover:bg-white/20 transition-all text-sm"
        >
          ← Back to Anora
        </button>
      </div>
    </div>
  )
}
