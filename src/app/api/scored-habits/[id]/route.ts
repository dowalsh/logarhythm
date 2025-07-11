import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// DELETE - Remove habit from scoring system
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Verify the scored habit belongs to a scoring system owned by the user
    const scoredHabit = await prisma.scoredHabit.findFirst({
      where: {
        id,
        scoringSystem: { userId },
      },
      include: {
        scoringSystem: true,
      },
    });

    if (!scoredHabit) {
      return NextResponse.json(
        { error: "Scored habit not found" },
        { status: 404 }
      );
    }

    // Delete the scored habit
    await prisma.scoredHabit.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Habit removed from scoring system" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[SCORED_HABIT_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
