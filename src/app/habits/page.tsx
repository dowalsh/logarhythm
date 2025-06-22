import { auth } from "@clerk/nextjs/server"; // Server-side Clerk auth
import HabitList from "@/components/HabitList"; // Client-side habit list
import Link from "next/link"; // Next.js built-in routing

export default async function HabitsPage() {
  // Server-side authentication check (SSR safe)
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
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Habits</h1>

        {/* Button to navigate to create new habit */}
        <Link href="/habits/new">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded">
            + New Habit
          </button>
        </Link>
      </div>

      {/* Render the list of habits */}
      <HabitList />
    </div>
  );
}
