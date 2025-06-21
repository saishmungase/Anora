import { type NextRequest, NextResponse } from "next/server"

interface ReflectionRequest {
  text: string
}

interface ReflectionResponse {
  response: string
  tone: "calm" | "excited" | "sad" | "neutral"
}

// Simple emotion detection based on keywords
function detectTone(text: string): "calm" | "excited" | "sad" | "neutral" {
  const lowerText = text.toLowerCase()

  const sadKeywords = [
    "sad",
    "depressed",
    "down",
    "upset",
    "hurt",
    "pain",
    "lonely",
    "lost",
    "hopeless",
    "tired",
    "exhausted",
    "overwhelmed",
  ]
  const excitedKeywords = [
    "excited",
    "happy",
    "amazing",
    "great",
    "awesome",
    "fantastic",
    "wonderful",
    "thrilled",
    "energetic",
    "motivated",
  ]
  const calmKeywords = ["peaceful", "calm", "relaxed", "content", "grateful", "mindful", "centered", "balanced"]

  const sadScore = sadKeywords.filter((word) => lowerText.includes(word)).length
  const excitedScore = excitedKeywords.filter((word) => lowerText.includes(word)).length
  const calmScore = calmKeywords.filter((word) => lowerText.includes(word)).length

  if (sadScore > excitedScore && sadScore > calmScore) return "sad"
  if (excitedScore > sadScore && excitedScore > calmScore) return "excited"
  if (calmScore > 0) return "calm"

  return "neutral"
}

// Generate empathetic responses based on tone
function generateResponse(text: string, tone: string): string {
  const responses = {
    calm: [
      "That sounds like a peaceful moment. Take a deep breath and let that feeling settle in.",
      "I can sense the tranquility in your words. Sometimes these quiet moments are exactly what we need.",
      "There's wisdom in finding calm. Let yourself rest in this feeling for a moment.",
      "Your sense of peace is beautiful. Allow yourself to fully experience this serenity.",
    ],
    excited: [
      "I can feel your energy! That excitement is contagious. Tell me more about what's lighting you up.",
      "Your enthusiasm is wonderful to hear. These moments of joy are precious - savor them.",
      "That spark in your voice is amazing. Let that positive energy flow through you.",
      "I love hearing the excitement in your thoughts. These are the moments that make life bright.",
    ],
    sad: [
      "I hear the weight in your words, and I want you to know that it's okay to feel this way.",
      "Your feelings are valid, and you don't have to carry this alone. Take it one breath at a time.",
      "Sometimes we need to sit with difficult emotions. I'm here with you in this moment.",
      "It takes courage to acknowledge pain. Be gentle with yourself as you move through this.",
    ],
    neutral: [
      "I'm listening to every word. Sometimes just being heard is exactly what we need.",
      "Thank you for sharing your thoughts with me. Your reflections matter.",
      "I'm here to hold space for whatever you're experiencing right now.",
      "Your voice and your thoughts are important. Keep sharing what's on your mind.",
    ],
  }

  const toneResponses = responses[tone as keyof typeof responses] || responses.neutral
  return toneResponses[Math.floor(Math.random() * toneResponses.length)]
}

export async function POST(request: NextRequest) {
  try {
    const body: ReflectionRequest = await request.json()

    if (!body.text || body.text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    const tone = detectTone(body.text)
    const response = generateResponse(body.text, tone)

    const result: ReflectionResponse = {
      response,
      tone,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error processing reflection:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
