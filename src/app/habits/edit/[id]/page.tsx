import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import HabitForm from "@/components/HabitForm";

export default async function EditHabitPage({
  params,
}: {
  params: { id: string };
}) {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-xl font-semibold mb-4">Please sign in</h1>
        <a href="/sign-in" className="text-blue-500 underline">
          Sign In
        </a>
      </div>
    );
  }

  const habit = await prisma.habit.findUnique({
    where: { id: params.id, userId },
  });

  if (!habit) {
    return <div className="text-center p-6">Habit not found.</div>;
  }

  // Normalize nullable fields: convert null -> undefined
  const normalizedHabit = {
    id: habit.id,
    name: habit.name,
    description: habit.description ?? undefined,
    unit: habit.unit ?? undefined,
    weight: habit.weight,
    targetFrequency: habit.targetFrequency,
    scoringType: habit.scoringType,
  };

  return (
    <div className="p-6">
      <HabitForm initialData={normalizedHabit} />
    </div>
  );
}
