"use client";

import { Badge } from "@/components/ui/badge";

interface Props {
  scoringType: string;
}

export function ScoringTypeBadge({ scoringType }: Props) {
  let label = scoringType;
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";

  switch (scoringType) {
    case "LINEAR_POSITIVE_CAPPED":
      label = "Positive Capped";
      variant = "default";
      break;
    case "LINEAR_NEGATIVE_CAPPED":
      label = "Negative Capped";
      variant = "destructive";
      break;
    case "THRESHOLD_TARGET":
      label = "Threshold";
      variant = "secondary";
      break;
    case "ONE_OFF_BONUS":
      label = "Bonus";
      variant = "outline";
      break;
  }

  return <Badge variant={variant}>{label}</Badge>;
}
