import { NextRequest, NextResponse } from "next/server";
import { HabitScoringType } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// PUT - Update scored habit
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the current user from Clerk to find their email
    const { currentUser } = await import("@clerk/nextjs/server");
    const user = await currentUser();

    if (!user || !user.emailAddresses[0]?.emailAddress) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Find the user in our database by email
    const dbUser = await prisma.user.findUnique({
      where: { email: user.emailAddresses[0].emailAddress },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();

    // Verify the scored habit belongs to a scoring system owned by the user
    const existingScoredHabit = await prisma.scoredHabit.findFirst({
      where: {
        id,
        scoringSystem: { userId: dbUser.id },
      },
      include: {
        scoringSystem: true,
      },
    });

    if (!existingScoredHabit) {
      return NextResponse.json(
        { error: "Scored habit not found" },
        { status: 404 }
      );
    }

    // Update the scored habit
    const updatedScoredHabit = await prisma.scoredHabit.update({
      where: { id },
      data: {
        scoringType: body.scoringType as HabitScoringType,
        weight: body.weight,
        targetFrequency: body.targetFrequency,
      },
      include: {
        habit: true,
        scoringSystem: true,
      },
    });

    return NextResponse.json(updatedScoredHabit, { status: 200 });
  } catch (error) {
    console.error("[SCORED_HABIT_PUT_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove habit from scoring system
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the current user from Clerk to find their email
    const { currentUser } = await import("@clerk/nextjs/server");
    const user = await currentUser();

    if (!user || !user.emailAddresses[0]?.emailAddress) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Find the user in our database by email
    const dbUser = await prisma.user.findUnique({
      where: { email: user.emailAddresses[0].emailAddress },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    const { id } = await context.params;

    // Verify the scored habit belongs to a scoring system owned by the user
    const scoredHabit = await prisma.scoredHabit.findFirst({
      where: {
        id,
        scoringSystem: { userId: dbUser.id },
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
