import { NextRequest, NextResponse } from "next/server";
import { HabitScoringType } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Verify the scoring system belongs to the user
    const scoringSystem = await prisma.scoringSystem.findFirst({
      where: { id: body.scoringSystemId, userId },
    });

    if (!scoringSystem) {
      return NextResponse.json(
        { error: "Scoring system not found" },
        { status: 404 }
      );
    }

    // Verify the habit belongs to the user
    const habit = await prisma.habit.findFirst({
      where: { id: body.habitId, userId },
    });

    if (!habit) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    const scoredHabit = await prisma.scoredHabit.create({
      data: {
        scoringSystemId: body.scoringSystemId,
        habitId: body.habitId,
        scoringType: body.scoringType as HabitScoringType,
        weight: body.weight,
      },
      include: {
        habit: true,
        scoringSystem: true,
      },
    });

    return NextResponse.json(scoredHabit, { status: 201 });
  } catch (error) {
    console.error("[SCORED_HABIT_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scoringSystemId = searchParams.get("scoringSystemId");

    if (scoringSystemId) {
      // Get scored habits for a specific scoring system
      const scoredHabits = await prisma.scoredHabit.findMany({
        where: {
          scoringSystemId,
          scoringSystem: { userId },
        },
        include: {
          habit: true,
          scoringSystem: true,
        },
      });

      return NextResponse.json(scoredHabits, { status: 200 });
    } else {
      // Get all scored habits for the user
      const scoredHabits = await prisma.scoredHabit.findMany({
        where: {
          scoringSystem: { userId },
        },
        include: {
          habit: true,
          scoringSystem: true,
        },
      });

      return NextResponse.json(scoredHabits, { status: 200 });
    }
  } catch (error) {
    console.error("[SCORED_HABIT_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
