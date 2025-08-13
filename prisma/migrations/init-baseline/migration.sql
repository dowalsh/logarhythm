-- CreateEnum
CREATE TYPE "HabitScoringType" AS ENUM ('LINEAR_POSITIVE_CAPPED', 'LINEAR_NEGATIVE_CAPPED', 'THRESHOLD_TARGET', 'ONE_OFF_BONUS');

-- CreateEnum
CREATE TYPE "HabitType" AS ENUM ('BOOLEAN', 'NUMERIC');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "habitType" "HabitType" NOT NULL DEFAULT 'BOOLEAN',

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

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
    "targetFrequency" INTEGER,

    CONSTRAINT "ScoredHabit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scoringSystemId" TEXT NOT NULL,
    "weeklyLogId" TEXT NOT NULL,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitLog" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "completed" BOOLEAN,

    CONSTRAINT "HabitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modifier" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weeklyLogId" TEXT NOT NULL,

    CONSTRAINT "Modifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "scoringSystemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Week_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitScore" DOUBLE PRECISION NOT NULL,
    "modifierSum" DOUBLE PRECISION NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weeklyLogId" TEXT NOT NULL,

    CONSTRAINT "WeeklyScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ScoredHabit_scoringSystemId_habitId_key" ON "ScoredHabit"("scoringSystemId", "habitId");

-- CreateIndex
CREATE INDEX "DailyLog_weeklyLogId_idx" ON "DailyLog"("weeklyLogId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLog_userId_date_key" ON "DailyLog"("userId", "date");

-- CreateIndex
CREATE INDEX "HabitLog_habitId_idx" ON "HabitLog"("habitId");

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_dailyLogId_habitId_key" ON "HabitLog"("dailyLogId", "habitId");

-- CreateIndex
CREATE INDEX "Modifier_weeklyLogId_idx" ON "Modifier"("weeklyLogId");

-- CreateIndex
CREATE INDEX "Week_startDate_idx" ON "WeeklyLog"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "Week_userId_startDate_key" ON "WeeklyLog"("userId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyScore_weeklyLogId_key" ON "WeeklyScore"("weeklyLogId");

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringSystem" ADD CONSTRAINT "ScoringSystem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoredHabit" ADD CONSTRAINT "ScoredHabit_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoredHabit" ADD CONSTRAINT "ScoredHabit_scoringSystemId_fkey" FOREIGN KEY ("scoringSystemId") REFERENCES "ScoringSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_scoringSystemId_fkey" FOREIGN KEY ("scoringSystemId") REFERENCES "ScoringSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_weeklyLogId_fkey" FOREIGN KEY ("weeklyLogId") REFERENCES "WeeklyLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "DailyLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modifier" ADD CONSTRAINT "Modifier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modifier" ADD CONSTRAINT "Modifier_weeklyLogId_fkey" FOREIGN KEY ("weeklyLogId") REFERENCES "WeeklyLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyLog" ADD CONSTRAINT "Week_scoringSystemId_fkey" FOREIGN KEY ("scoringSystemId") REFERENCES "ScoringSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyLog" ADD CONSTRAINT "Week_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyScore" ADD CONSTRAINT "WeeklyScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyScore" ADD CONSTRAINT "WeeklyScore_weeklyLogId_fkey" FOREIGN KEY ("weeklyLogId") REFERENCES "WeeklyLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

