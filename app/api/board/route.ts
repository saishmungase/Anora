import { PrismaClient } from "@/lib/generated/prisma";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.userId;

    if (!id) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const response = await prisma.history.findMany({
      where: {
        userId: id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ moods: response }, { status: 200 });
  } catch (e) {
    console.error("Error fetching mood data:", e);
    return NextResponse.json(
      { error: "Failed to fetch mood data" },
      { status: 500 }
    );
  }
}
