import { PrismaClient } from "@/lib/generated/prisma"
import { GoogleGenerativeAI } from "@google/generative-ai";
import { type NextRequest, NextResponse } from "next/server"

const prisma = new PrismaClient()

interface ReflectionRequest {
  text: string
  userId?: string
}

interface ReflectionResponse {
  response: string
  tone: "calm" | "excited" | "sad" | "neutral" | "angry" | "anxious" | "hopeful"
  userId: string
}

async function detectToneFromAI(text: string): Promise<"calm" | "excited" | "sad" | "neutral"  | "angry" | "anxious" | "hopeful"> {
  const AIKEY = process.env.AIKEY || process.env.GEMINI_API_KEY;
  if (!AIKEY) {
    console.warn("Gemini API key missing; defaulting tone to 'neutral'");
    return "neutral";
  }

  try {    
    const genAI = new GoogleGenerativeAI(AIKEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analyze the emotional tone of the following user message. Respond with one word only: "calm", "excited", "sad", "angry", "anxious", "hopeful" or "neutral".

User: "${text}"

Tone:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const tone = response.text().trim().toLowerCase();

    const validTones = ["calm", "excited", "sad", "neutral", "angry",  "anxious", "hopeful"];
    if (validTones.includes(tone)) {
      return tone as "calm" | "excited" | "sad" | "neutral"  | "angry" | "anxious" | "hopeful";
    }

    console.warn("Unrecognized tone from Gemini, defaulting to 'neutral':", tone);
    return "neutral";
  } catch (error) {
    console.error("Gemini tone detection failed:", error);
    return "neutral";
  }
}

async function generateAIResponse(text: string, tone: string, userHistory?: any[]): Promise<string> {
  const AIKEY = process.env.AIKEY || process.env.GEMINI_API_KEY;

  if (!AIKEY) {
    console.warn("AI API key not found, using fallback responses");
    return generateFallbackResponse(text, tone);
  }

  try {
    const contextHistory = userHistory?.slice(-3).map(h =>
      `User: ${h.userInput}\nAI: ${h.aiResponse}`
    ).join('\n') || '';

    const systemContext = `You are an empathetic AI therapist providing compassionate voice-based reflections. 
    Respond in a warm, supportive manner that matches the detected emotional tone: ${tone}.
    Keep responses concise (1-2 sentences) and conversational for voice output.
    Focus on validation, empathy, and gentle guidance.
    ${contextHistory ? 'Consider the conversation history to provide continuity.' : ''}`;

    const userPrompt = `${contextHistory ? `Previous conversation:\n${contextHistory}\n\n` : ''}Current user input: "${text}". 
    Their emotional tone appears to be: ${tone}.
    Provide a supportive, empathetic response that acknowledges their feelings.

    System context: ${systemContext}`;

    const genAI = new GoogleGenerativeAI(AIKEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    const aiResponse = response.text();

    if (!aiResponse || aiResponse.trim().length === 0) {
      throw new Error("Empty response from Gemini API");
    }

    return aiResponse.trim();
  } catch (error) {
    console.error("AI API error:", error);
    return generateFallbackResponse(text, tone);
  }
}

function generateFallbackResponse(text: string, tone: string): string {
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
  };

  const toneResponses = responses[tone as keyof typeof responses] || responses.neutral;
  return toneResponses[Math.floor(Math.random() * toneResponses.length)];
}

async function getOrCreateUser(userId?: string): Promise<string> {
  try {
    if (userId) {
      const existingUser = await prisma.user.findUnique({ where: { id: userId } });
      if (existingUser) return existingUser.id;
    }

    const newUser = await prisma.user.create({ data: {} });
    return newUser.id;
  } catch (error) {
    console.error('Database error creating/finding user:', error);
    throw new Error('Failed to manage user');
  }
}

async function getUserHistory(userId: string): Promise<any[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        histories: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
    return user?.histories || [];
  } catch (error) {
    console.error('Database error fetching history:', error);
    return [];
  }
}

async function saveReflectionToHistory(userId: string, text: string, tone: string, response: string) {
  try {
    await prisma.history.create({
      data: {
        userId,
        userInput: text,
        detectedTone: tone,
        aiResponse: response,
      },
    });
    console.log('Successfully saved reflection to history');
  } catch (error) {
    console.error('Database error saving history:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ReflectionRequest = await request.json();

    if (!body.text || body.text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const userId = await getOrCreateUser(body.userId);
    
    const userHistory = await getUserHistory(userId);
    
    const [tone, response] = await Promise.all([
      detectToneFromAI(body.text),
      (async () => {
        const history = await getUserHistory(userId);
        return generateAIResponse(body.text, await detectToneFromAI(body.text), history);
      })()
    ]);

    saveReflectionToHistory(userId, body.text, tone, response);

    const result: ReflectionResponse = {
      response,
      tone,
      userId,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing reflection:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const history = await getUserHistory(userId);
    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}