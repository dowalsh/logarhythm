import { NextRequest, NextResponse } from "next/server";
// import { PrismaClient, HabitScoringType } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date, notes, logs, scoringSystemId } = await req.json();

    if (!date || !Array.isArray(logs) || !scoringSystemId) {
      return new NextResponse("Invalid payload", { status: 400 });
    }

    const parsedDate = new Date(date);

    await prisma.$transaction(async (tx) => {
      const dailyLog = await prisma.dailyLog.upsert({
        where: {
          userId_date: { userId, date: parsedDate },
        },
        update: { notes, scoringSystemId },
        create: {
          userId,
          scoringSystemId,
          date: parsedDate,
          notes,
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
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    if (dateParam) {
      // Get a specific day's log
      const parsedDate = new Date(dateParam);

      const dailyLog = await prisma.dailyLog.findUnique({
        where: {
          userId_date: {
            userId,
            date: parsedDate,
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
        return new NextResponse("Not found", { status: 404 });
      }

      return NextResponse.json(dailyLog);
    } else {
      // Get all logs for the user
      const allLogs = await prisma.dailyLog.findMany({
        where: { userId },
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
