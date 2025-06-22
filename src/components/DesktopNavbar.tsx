"use client";

import Link from "next/link";
import { useUser, UserButton, SignInButton } from "@clerk/nextjs";
import ModeToggle from "@/components/ModeToggle";
import { BarChart, ListIcon, Target, SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DesktopNavbar() {
  const { isSignedIn } = useUser();

  return (
    <div className="hidden md:flex items-center space-x-4">
      {/* Dark/Light Mode Toggle */}
      <ModeToggle />

      {/* Home Link */}
      <Button variant="ghost" className="flex items-center gap-2" asChild>
        <Link href="/">
          <BarChart className="w-4 h-4" />
          <span className="hidden lg:inline">Home</span>
        </Link>
      </Button>

      {/* Log Link */}
      <Button variant="ghost" className="flex items-center gap-2" asChild>
        <Link href="/log">
          <ListIcon className="w-4 h-4" />
          <span className="hidden lg:inline">Log</span>
        </Link>
      </Button>

      {/* Habits Link (now using Target icon) */}
      <Button variant="ghost" className="flex items-center gap-2" asChild>
        <Link href="/habits">
          <Target className="w-4 h-4" />
          <span className="hidden lg:inline">Habits</span>
        </Link>
      </Button>

      {/* Settings Link */}
      <Button variant="ghost" className="flex items-center gap-2" asChild>
        <Link href="/settings">
          <SettingsIcon className="w-4 h-4" />
          <span className="hidden lg:inline">Settings</span>
        </Link>
      </Button>

      {/* Auth Area */}
      {isSignedIn ? (
        <UserButton />
      ) : (
        <SignInButton mode="modal">
          <Button variant="default">Sign In</Button>
        </SignInButton>
      )}
    </div>
  );
}
