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
  progressBarWidth?: number;
}

export default function HabitScoreRow({
  habitName,
  pointsPerCompletion,
  progressCurrent,
  progressMax,
  score,
  scoreMax,
  progressBarWidth,
}: HabitScoreRowProps) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center text-sm">
      <div className="col-span-4 flex items-center gap-2 min-w-0">
        <span className="font-medium text-xs sm:text-sm truncate">
          {habitName}
        </span>
      </div>
      <div className="col-span-3 text-center flex items-center justify-center gap-1">
        <span className="font-medium text-xs sm:text-sm">
          {pointsPerCompletion.toFixed(1)}
        </span>
        <Egg className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 flex-shrink-0" />
      </div>
      <div className="col-span-3 min-w-0">
        <div
          className="max-w-[80px] sm:max-w-[120px]"
          style={{ width: progressBarWidth ? `${progressBarWidth}px` : "10%" }}
        >
          <SegmentedProgressBar
            current={Number(progressCurrent.toFixed(1))}
            max={Number(progressMax.toFixed(1))}
          />
        </div>
      </div>
      <div className="col-span-2 text-right font-medium text-xs sm:text-sm truncate">
        {score.toFixed(1)}/{scoreMax.toFixed(1)}
      </div>
    </div>
  );
}
