import SegmentedProgressBar from "@/components/SegmentedProgressBar";
import React from "react";

interface HabitScoreRowProps {
  habitName: string;
  pointsPerCompletion: number;
  progressCurrent: number;
  progressMax: number;
  score: number;
  scoreMax: number;
}

export default function HabitScoreRow({
  habitName,
  pointsPerCompletion,
  progressCurrent,
  progressMax,
  score,
  scoreMax,
}: HabitScoreRowProps) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center text-sm">
      <div className="col-span-4 flex items-center gap-2">
        <span className="font-medium truncate">{habitName}</span>
      </div>
      <div className="col-span-3 text-center">
        {pointsPerCompletion.toFixed(1)} pts per completion
      </div>
      <div className="col-span-3">
        <SegmentedProgressBar current={progressCurrent} max={progressMax} />
      </div>
      <div className="col-span-2 text-right font-medium">
        {score}/{scoreMax}
      </div>
    </div>
  );
}
