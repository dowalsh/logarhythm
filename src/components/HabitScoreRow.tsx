import SegmentedProgressBar from "@/components/SegmentedProgressBar";
import React from "react";
import { Egg } from "lucide-react";

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
      <div className="col-span-3 text-center flex items-center justify-center gap-1">
        <span className="font-medium">{pointsPerCompletion.toFixed(1)}</span>
        <Egg className="w-4 h-4 text-yellow-500" />
      </div>
      <div className="col-span-3">
        <div style={{ width: `${((5 * scoreMax) / 100) * 100}%` }}>
          <SegmentedProgressBar
            current={Number(progressCurrent.toFixed(1))}
            max={Number(progressMax.toFixed(1))}
          />
        </div>
      </div>
      <div className="col-span-2 text-right font-medium">
        {score.toFixed(1)}/{scoreMax.toFixed(1)}
      </div>
    </div>
  );
}
