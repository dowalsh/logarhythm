import React from "react";

interface SegmentedProgressBarProps {
  current: number;
  max: number;
  filledClassName?: string;
  emptyClassName?: string;
  height?: string;
}

export default function SegmentedProgressBar({
  current,
  max,
  filledClassName = "bg-green-500",
  emptyClassName = "bg-gray-200 dark:bg-gray-700",
  height = "h-4",
}: SegmentedProgressBarProps) {
  return (
    <div className={`flex gap-1 ${height}`}>
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${
            i < current ? filledClassName : emptyClassName
          }`}
        />
      ))}
    </div>
  );
}
