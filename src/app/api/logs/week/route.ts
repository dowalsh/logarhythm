import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start and end dates are required" },
        { status: 400 }
      );
    }

    // Get the active scoring system
    const activeScoringSystem = await prisma.scoringSystem.findFirst({
      where: { userId: dbUser.id, isActive: true },
    });

    if (!activeScoringSystem) {
      return NextResponse.json({ logs: [] }, { status: 200 });
    }

    // Fetch all logs for the date range
    const logs = await prisma.dailyLog.findMany({
      where: {
        userId: dbUser.id,
        scoringSystemId: activeScoringSystem.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        habitLogs: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json({ logs }, { status: 200 });
  } catch (error) {
    console.error("[WEEKLY_LOGS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
