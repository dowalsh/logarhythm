"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, Cell } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

// Data type for weekly scores
export type WeeklyScore = {
  week: string; // e.g., "2024-07-01"
  totalScore: number;
};

interface WeeklyScoreAreaChartProps {
  data: WeeklyScore[];
}

const chartConfig: ChartConfig = {
  totalScore: {
    label: "Total Score",
    color: "var(--chart-1)",
  },
};

export function WeeklyScoreChart({ data }: WeeklyScoreAreaChartProps) {
  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Weekly Total Score</CardTitle>
          <CardDescription>
            Visualizes your total score for each week
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                // Format as e.g. "Jul 1"
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  indicator="dot"
                />
              }
            />

            <Bar dataKey="totalScore">
              {data.map((entry, index) => {
                // ratio: 0 (red) → 1 (green)
                const ratio = Math.min(1, entry.totalScore / 100);

                // simple linear gradient between red (low) and green (high)
                const r = Math.round(255 * (1 - ratio));
                const g = Math.round(200 * ratio);
                const b = 0;

                return (
                  <Cell key={`cell-${index}`} fill={`rgb(${r},${g},${b})`} />
                );
              })}
              radius={[6, 6, 0, 0]}
            </Bar>

            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
