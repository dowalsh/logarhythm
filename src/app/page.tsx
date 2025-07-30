"use client";

import useSWR from "swr";
import {
  WeeklyScoreAreaChart,
  WeeklyScore,
} from "@/components/WeeklyScoreAreaChart";
import { fetcher } from "@/lib/swr";
import { useUser, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { isSignedIn } = useUser();

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h1 className="text-xl font-semibold mb-4">
          Please sign in to view your dashboard
        </h1>
        <SignInButton mode="modal">
          <Button variant="default">Sign In</Button>
        </SignInButton>
      </div>
    );
  }

  const { data, error, isLoading } = useSWR<{ data: WeeklyScore[] }>(
    "/api/weekly-scores",
    fetcher
  );

  if (error) return <div>Error loading data</div>;
  if (isLoading) return <div>Loading...</div>;

  const chartData: WeeklyScore[] = data?.data ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
      <div className="lg:col-span-6">
        <WeeklyScoreAreaChart data={chartData} />
      </div>
      <div className="hidden lg:block lg:col-span-4 sticky top-20"></div>
    </div>
  );
}
