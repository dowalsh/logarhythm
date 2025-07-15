import { NextRequest, NextResponse } from "next/server";
// import { PrismaClient, HabitScoringType } from "@prisma/client";
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

    const { date, notes, logs, scoringSystemId } = await req.json();

    if (!date || !Array.isArray(logs)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    let activeScoringSystemId = scoringSystemId;
    if (!activeScoringSystemId) {
      const activeSystem = await prisma.scoringSystem.findFirst({
        where: { userId: dbUser.id, isActive: true },
      });
      if (!activeSystem) {
        return NextResponse.json(
          { error: "No active scoring system found" },
          { status: 400 }
        );
      }
      activeScoringSystemId = activeSystem.id;
    }

    // Use the date string directly
    const dateString = typeof date === "string" ? date.slice(0, 10) : "";

    await prisma.$transaction(async (tx) => {
      const dailyLog = await prisma.dailyLog.upsert({
        where: {
          userId_date: { userId: dbUser.id, date: dateString },
        },
        update: {
          notes: notes,
          scoringSystemId: activeScoringSystemId,
        },
        create: {
          userId: dbUser.id,
          scoringSystemId: activeScoringSystemId,
          date: dateString,
          notes: notes,
        },
      });
      // Step 2: Upsert HabitLogs for that day
      await Promise.all(
        logs.map((log: any) =>
          tx.habitLog.upsert({
            where: {
              dailyLogId_habitId: {
                dailyLogId: dailyLog.id,
                habitId: log.habitId,
              },
            },
            update: {
              value: log.value ?? null,
              completed: log.completed ?? null,
            },
            create: {
              dailyLogId: dailyLog.id,
              habitId: log.habitId,
              value: log.value ?? null,
              completed: log.completed ?? null,
            },
          })
        )
      );
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DAILYLOG_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return new NextResponse("Unauthorized", { status: 401 });

  // Get the current user from Clerk to find their email
  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser();

  if (!user || !user.emailAddresses[0]?.emailAddress) {
    return new NextResponse("User email not found", { status: 400 });
  }

  // Find the user in our database by email
  const dbUser = await prisma.user.findUnique({
    where: { email: user.emailAddresses[0].emailAddress },
  });

  if (!dbUser) {
    return new NextResponse("User not found in database", { status: 404 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const dateParam = searchParams.get("date");

    // Handle week range query
    if (startParam && endParam) {
      // Force conversion to 'YYYY-MM-DD' string (query params are always string or undefined)
      const startString = String(startParam).slice(0, 10);
      const endString = String(endParam).slice(0, 10);

      console.log(
        "[WEEK QUERY] userId:",
        dbUser.id,
        "start:",
        startString,
        "end:",
        endString
      );
      console.log(
        "[WEEK QUERY TYPES]",
        typeof startString,
        startString,
        typeof endString,
        endString
      );

      try {
        const logs = await prisma.dailyLog.findMany({
          where: {
            userId: dbUser.id,
            date: {
              gte: startString,
              lte: endString,
            },
          },
          include: {
            habitLogs: {
              include: {
                habit: true,
              },
            },
          },
          orderBy: { date: "asc" },
        });

        return NextResponse.json({ logs });
      } catch (err) {
        console.error("[WEEK QUERY ERROR]", err);
        return NextResponse.json(
          { error: "Week query failed", details: String(err) },
          { status: 500 }
        );
      }
    }

    if (dateParam) {
      // Use the date string directly
      const dateString =
        typeof dateParam === "string" ? dateParam.slice(0, 10) : "";

      const dailyLog = await prisma.dailyLog.findUnique({
        where: {
          userId_date: {
            userId: dbUser.id,
            date: dateString,
          },
        },
        include: {
          habitLogs: {
            include: {
              habit: true,
            },
          },
        },
      });

      if (!dailyLog) {
        return NextResponse.json({ log: null }, { status: 200 });
      }

      return NextResponse.json(dailyLog);
    } else {
      // Get all logs for the user
      const allLogs = await prisma.dailyLog.findMany({
        where: { userId: dbUser.id },
        include: {
          habitLogs: {
            include: {
              habit: true,
            },
          },
        },
        orderBy: { date: "desc" },
      });

      return NextResponse.json(allLogs);
    }
  } catch (err) {
    console.error("[LOG_GET_ERROR]", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
