import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, HabitScoringType } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const habit = await prisma.habit.findUnique({
      where: { id: params.id },
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

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const habit = await prisma.habit.findUnique({
      where: { id: params.id },
    });

    if (!habit || habit.userId !== userId) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const updatedHabit = await prisma.habit.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        unit: body.unit,
        weight: body.weight,
        targetFrequency: body.targetFrequency,
        scoringType: body.scoringType as HabitScoringType,
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const habit = await prisma.habit.findUnique({
      where: { id: params.id },
    });

    if (!habit || habit.userId !== userId) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    await prisma.habit.delete({
      where: { id: params.id },
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
