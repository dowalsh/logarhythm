import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, HabitScoringType } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth(); // <-- Correct: await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const habit = await prisma.habit.create({
      data: {
        userId,
        name: body.name,
        description: body.description,
        unit: body.unit,
        weight: body.weight,
        targetFrequency: body.targetFrequency,
        scoringType: body.scoringType as HabitScoringType,
      },
    });

    return NextResponse.json(habit, { status: 201 });
  } catch (error) {
    console.error("[HABIT_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth(); // <-- Correct: await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const habits = await prisma.habit.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(habits, { status: 200 });
  } catch (error) {
    console.error("[HABIT_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
