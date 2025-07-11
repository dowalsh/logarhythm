/*
  Warnings:

  - You are about to drop the column `scoringType` on the `Habit` table. All the data in the column will be lost.
  - You are about to drop the column `targetFrequency` on the `Habit` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `Habit` table. All the data in the column will be lost.
  - Added the required column `scoringSystemId` to the `DailyLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DailyLog" ADD COLUMN     "scoringSystemId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Habit" DROP COLUMN "scoringType",
DROP COLUMN "targetFrequency",
DROP COLUMN "weight";

-- CreateTable
CREATE TABLE "ScoringSystem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoredHabit" (
    "id" TEXT NOT NULL,
    "scoringSystemId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "scoringType" "HabitScoringType" NOT NULL,
    "weight" INTEGER NOT NULL,

    CONSTRAINT "ScoredHabit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScoredHabit_scoringSystemId_habitId_key" ON "ScoredHabit"("scoringSystemId", "habitId");

-- AddForeignKey
ALTER TABLE "ScoringSystem" ADD CONSTRAINT "ScoringSystem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoredHabit" ADD CONSTRAINT "ScoredHabit_scoringSystemId_fkey" FOREIGN KEY ("scoringSystemId") REFERENCES "ScoringSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoredHabit" ADD CONSTRAINT "ScoredHabit_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_scoringSystemId_fkey" FOREIGN KEY ("scoringSystemId") REFERENCES "ScoringSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
