-- CreateEnum
CREATE TYPE "HabitType" AS ENUM ('BOOLEAN', 'NUMERIC');

-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "habitType" "HabitType" NOT NULL DEFAULT 'BOOLEAN';
