import { prisma } from "@/lib/prisma";
import { getStartOfWeek } from "@/lib/date";
import { parseISO, getDay } from "date-fns";

async function main() {
  // Step 1: Delete any WeeklyLogs that don’t start on Monday
  const allWeeklyLogs = await prisma.weeklyLog.findMany();

  for (const log of allWeeklyLogs) {
    const parsed = parseISO(log.startDate);
    if (getDay(parsed) !== 1) {
      await prisma.weeklyLog.delete({
        where: { id: log.id },
      });
      console.log(`❌ Deleted invalid WeeklyLog: ${log.id} (${log.startDate})`);
    }
  }

  // Step 2: Attach all DailyLogs to the correct WeeklyLog
  const logs = await prisma.dailyLog.findMany({
    where: { weeklyLogId: null },
    include: { user: true },
  });

  for (const log of logs) {
    const startDate = getStartOfWeek(log.date);

    const weeklyLog = await prisma.weeklyLog.upsert({
      where: {
        userId_startDate: {
          userId: log.userId,
          startDate,
        },
      },
      update: {},
      create: {
        userId: log.userId,
        startDate,
        scoringSystemId: log.scoringSystemId,
      },
    });

    await prisma.dailyLog.update({
      where: { id: log.id },
      data: { weeklyLogId: weeklyLog.id },
    });

    console.log(`✅ Linked DailyLog ${log.id} to WeeklyLog ${startDate}`);
  }

  console.log("🎉 Backfill complete.");
}

main().catch((err) => {
  console.error("❌ Backfill failed:", err);
});
