/*
  Warnings:

  - You are about to drop the column `weekStart` on the `Modifier` table. All the data in the column will be lost.
  - You are about to drop the column `weekStart` on the `WeeklyScore` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[weeklyLogId]` on the table `WeeklyScore` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `weeklyLogId` to the `DailyLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weeklyLogId` to the `Modifier` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weeklyLogId` to the `WeeklyScore` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "WeeklyScore_userId_weekStart_key";

-- AlterTable
ALTER TABLE "DailyLog" ADD COLUMN "weeklyLogId" TEXT;

-- AlterTable
ALTER TABLE "Modifier" DROP COLUMN "weekStart",
ADD COLUMN     "weeklyLogId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WeeklyScore" DROP COLUMN "weekStart",
ADD COLUMN     "weeklyLogId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Week" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "scoringSystemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Week_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Week_startDate_idx" ON "Week"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "Week_userId_startDate_key" ON "Week"("userId", "startDate");

-- CreateIndex
CREATE INDEX "DailyLog_weeklyLogId_idx" ON "DailyLog"("weeklyLogId");

-- CreateIndex
CREATE INDEX "HabitLog_habitId_idx" ON "HabitLog"("habitId");

-- CreateIndex
CREATE INDEX "Modifier_weeklyLogId_idx" ON "Modifier"("weeklyLogId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyScore_weeklyLogId_key" ON "WeeklyScore"("weeklyLogId");

-- AddForeignKey
ALTER TABLE "Week" ADD CONSTRAINT "Week_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Week" ADD CONSTRAINT "Week_scoringSystemId_fkey" FOREIGN KEY ("scoringSystemId") REFERENCES "ScoringSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_weeklyLogId_fkey" FOREIGN KEY ("weeklyLogId") REFERENCES "Week"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modifier" ADD CONSTRAINT "Modifier_weeklyLogId_fkey" FOREIGN KEY ("weeklyLogId") REFERENCES "Week"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyScore" ADD CONSTRAINT "WeeklyScore_weeklyLogId_fkey" FOREIGN KEY ("weeklyLogId") REFERENCES "Week"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
