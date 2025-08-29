-- DropForeignKey
ALTER TABLE "HabitLog" DROP CONSTRAINT "HabitLog_dailyLogId_fkey";

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "DailyLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
