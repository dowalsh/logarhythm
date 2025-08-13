/*
  Warnings:

  - Made the column `weeklyLogId` on table `DailyLog` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "DailyLog" ALTER COLUMN "weeklyLogId" SET NOT NULL;
