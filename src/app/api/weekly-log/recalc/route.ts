// /app/api/weekly-log/recalc/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { updateWeeklyScore } from "@/lib/weeklyLogUtils";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    if (!email)
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );

    const { startDate } = await req.json(); // 'yyyy-MM-dd' Monday
    if (!startDate)
      return NextResponse.json(
        { error: "startDate required" },
        { status: 400 }
      );

    const dbUser = await prisma.user.findUnique({ where: { email } });
    if (!dbUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // find the weeklyLog row for this user+startDate
    const wl = await prisma.weeklyLog.findUnique({
      where: { userId_startDate: { userId: dbUser.id, startDate } },
      select: { id: true },
    });

    if (!wl) {
      // MVP: if there’s no weeklyLog yet, nothing to do (0 score). You can auto-create later if you want.
      return NextResponse.json({ ok: true, updated: false }, { status: 200 });
    }

    const score = await updateWeeklyScore(wl.id);
    return NextResponse.json(
      { ok: true, updated: true, score },
      { status: 200 }
    );
  } catch (e) {
    console.error("[WEEKLY_LOG_RECALC_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
