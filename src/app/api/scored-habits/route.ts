import { NextRequest, NextResponse } from "next/server";
import { HabitScoringType } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
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

    const body = await req.json();

    // Debug: Log the request body to see what's being sent
    console.log("ScoredHabit POST body:", JSON.stringify(body, null, 2));

    // Verify the scoring system belongs to the user
    const scoringSystem = await prisma.scoringSystem.findFirst({
      where: { id: body.scoringSystemId, userId: dbUser.id },
    });

    if (!scoringSystem) {
      return NextResponse.json(
        { error: "Scoring system not found" },
        { status: 404 }
      );
    }

    // Verify the habit belongs to the user
    const habit = await prisma.habit.findFirst({
      where: { id: body.habitId, userId: dbUser.id },
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
        targetFrequency: body.targetFrequency,
      },
      include: {
        habit: true,
        scoringSystem: true,
      },
    });

    // Debug: Log what was actually saved
    console.log("Created ScoredHabit:", JSON.stringify(scoredHabit, null, 2));

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

    const { searchParams } = new URL(req.url);
    const scoringSystemId = searchParams.get("scoringSystemId");

    if (scoringSystemId) {
      // Get scored habits for a specific scoring system
      const scoredHabits = await prisma.scoredHabit.findMany({
        where: {
          scoringSystemId,
          scoringSystem: { userId: dbUser.id },
        },
        include: {
          habit: true,
          scoringSystem: true,
        },
        orderBy: {
          weight: "desc",
        },
      });

      return NextResponse.json(scoredHabits, { status: 200 });
    } else {
      // Get all scored habits for the user
      const scoredHabits = await prisma.scoredHabit.findMany({
        where: {
          scoringSystem: { userId: dbUser.id },
        },
        include: {
          habit: true,
          scoringSystem: true,
        },
        orderBy: {
          weight: "desc",
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
