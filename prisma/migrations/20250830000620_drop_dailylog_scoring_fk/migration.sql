/*
  Warnings:

  - You are about to drop the column `scoringSystemId` on the `DailyLog` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "DailyLog" DROP CONSTRAINT "DailyLog_scoringSystemId_fkey";

-- DropForeignKey
ALTER TABLE "DailyLog" DROP CONSTRAINT "DailyLog_weeklyLogId_fkey";

-- DropForeignKey
ALTER TABLE "Modifier" DROP CONSTRAINT "Modifier_weeklyLogId_fkey";

-- AlterTable
ALTER TABLE "DailyLog" DROP COLUMN "scoringSystemId";

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_weeklyLogId_fkey" FOREIGN KEY ("weeklyLogId") REFERENCES "WeeklyLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modifier" ADD CONSTRAINT "Modifier_weeklyLogId_fkey" FOREIGN KEY ("weeklyLogId") REFERENCES "WeeklyLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
