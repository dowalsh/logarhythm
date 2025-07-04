// src/app/api/habits/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { HabitScoringType, HabitType } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Type-safe route context
type HabitContext = { params: { id: string } };

// GET habit by ID
export async function GET(req: NextRequest, context: HabitContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = context.params;

    const habit = await prisma.habit.findUnique({
      where: { id },
    });

    if (!habit || habit.userId !== userId) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json(habit, { status: 200 });
  } catch (error) {
    console.error("[HABIT_GET_BY_ID_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// UPDATE habit by ID
export async function PUT(req: NextRequest, context: HabitContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id } = context.params;

    const habit = await prisma.habit.findUnique({
      where: { id },
    });

    if (!habit || habit.userId !== userId) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const updatedHabit = await prisma.habit.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        unit: body.unit,
        weight: body.weight,
        targetFrequency: body.targetFrequency,
        scoringType: body.scoringType as HabitScoringType,
        habitType: body.habitType as HabitType,
      },
    });

    return NextResponse.json(updatedHabit, { status: 200 });
  } catch (error) {
    console.error("[HABIT_UPDATE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE habit by ID
export async function DELETE(req: NextRequest, context: HabitContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = context.params;

    const habit = await prisma.habit.findUnique({
      where: { id },
    });

    if (!habit || habit.userId !== userId) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    await prisma.habit.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Habit deleted" }, { status: 200 });
  } catch (error) {
    console.error("[HABIT_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
