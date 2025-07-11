import { auth } from "@clerk/nextjs/server"; // Server-side Clerk auth
import HabitList from "@/components/HabitList"; // Client-side habit list
import ScoringSchemeBuilder from "@/components/ScoringSchemeBuilder"; // Scoring system management
import Link from "next/link"; // Next.js built-in routing
import { SignInButton } from "@clerk/nextjs"; // Clerk sign-in component
import { Button } from "@/components/ui/button"; // UI button component
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Tabs for organization

export default async function HabitsPage() {
  // Server-side authentication check (SSR safe)
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-xl font-semibold mb-4">Please sign in</h1>
        <SignInButton mode="modal">
          <Button variant="default">Sign In</Button>
        </SignInButton>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Habits & Scoring</h1>

        {/* Button to navigate to create new habit */}
        <Link href="/habits/new">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded">
            + New Habit
          </button>
        </Link>
      </div>

      {/* Tabs to organize content */}
      <Tabs defaultValue="scoring" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scoring">Scoring Schemes</TabsTrigger>
          <TabsTrigger value="habits">All Habits</TabsTrigger>
        </TabsList>

        <TabsContent value="scoring" className="space-y-4">
          <ScoringSchemeBuilder />
        </TabsContent>

        <TabsContent value="habits" className="space-y-4">
          <HabitList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
