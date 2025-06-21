import { auth } from "@clerk/nextjs/server";
import HabitForm from "@/components/HabitForm";
import HabitList from "@/components/HabitList";

export default async function HabitsPage() {
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

  return (
    <div className="p-6 space-y-10">
      <HabitForm />
      <HabitList />
    </div>
  );
}
