import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import HabitForm from "@/components/HabitForm";

interface PageProps {
  params: Promise<{ id: string }>; // ✅ Async params required in Next.js 15
}

export default async function Page({ params }: PageProps) {
  // ✅ Await params before accessing `id`
  const { id } = await params;

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

  // ✅ Scoped habit lookup
  const habit = await prisma.habit.findFirst({
    where: { id, userId },
  });

  if (!habit) {
    return <div className="text-center p-6">Habit not found.</div>;
  }

  // ✅ Normalize optional fields
  const normalizedHabit = {
    id: habit.id,
    name: habit.name,
    description: habit.description ?? undefined,
    unit: habit.unit ?? undefined,
    habitType: habit.habitType,
  };

  return (
    <div className="p-6">
      <HabitForm initialData={normalizedHabit} />
    </div>
  );
}
