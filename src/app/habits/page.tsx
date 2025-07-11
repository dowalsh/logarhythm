import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import HabitsPageContent from "@/components/HabitsPageContent";

export default async function HabitsPage() {
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

  return <HabitsPageContent />;
}
