// scripts/migrate-date-fields.ts
import { prisma } from "../src/lib/prisma";
import { format, parseISO } from "date-fns";

function toDateStringSafe(val: any): string {
  // If already in 'YYYY-MM-DD' format, return as is
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return val;
  }
  // If string but not in correct format, try to parse
  if (typeof val === "string") {
    try {
      const d = parseISO(val);
      return format(d, "yyyy-MM-dd");
    } catch {
      // fallback: return original
      return val;
    }
  }
  // If Date object
  if (val instanceof Date) {
    return format(val, "yyyy-MM-dd");
  }
  // fallback: return as is
  return val;
}

async function migrateDailyLogDates() {
  const logs = await prisma.dailyLog.findMany();
  let updated = 0;
  for (const log of logs) {
    const dateString = toDateStringSafe(log.date);
    if (log.date !== dateString) {
      await prisma.dailyLog.update({
        where: { id: log.id },
        data: { date: dateString },
      });
      updated++;
    }
  }
  return updated;
}

async function migrateModifierWeekStarts() {
  const mods = await prisma.modifier.findMany();
  let updated = 0;
  for (const mod of mods) {
    const dateString = toDateStringSafe(mod.weekStart);
    if (mod.weekStart !== dateString) {
      await prisma.modifier.update({
        where: { id: mod.id },
        data: { weekStart: dateString },
      });
      updated++;
    }
  }
  return updated;
}

async function migrateWeeklyScoreWeekStarts() {
  const scores = await prisma.weeklyScore.findMany();
  let updated = 0;
  for (const score of scores) {
    const dateString = toDateStringSafe(score.weekStart);
    if (score.weekStart !== dateString) {
      await prisma.weeklyScore.update({
        where: { id: score.id },
        data: { weekStart: dateString },
      });
      updated++;
    }
  }
  return updated;
}

async function main() {
  const dailyLogCount = await migrateDailyLogDates();
  const modifierCount = await migrateModifierWeekStarts();
  const weeklyScoreCount = await migrateWeeklyScoreWeekStarts();
  console.log(`Migrated DailyLog.date for ${dailyLogCount} records.`);
  console.log(`Migrated Modifier.weekStart for ${modifierCount} records.`);
  console.log(
    `Migrated WeeklyScore.weekStart for ${weeklyScoreCount} records.`
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
