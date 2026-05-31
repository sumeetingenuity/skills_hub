"use client";

import { Shield, ShieldCheck, ShieldAlert } from "lucide-react";

interface TrustScoreBadgeProps {
  score: number;
  verified: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: { container: "size-8", text: "text-[10px]", icon: "size-3" },
  md: { container: "size-12", text: "text-xs", icon: "size-4" },
  lg: { container: "size-16", text: "text-sm", icon: "size-5" },
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "stroke-green-400";
  if (score >= 60) return "stroke-yellow-400";
  return "stroke-red-400";
}

export function TrustScoreBadge({ score, verified, size = "md" }: TrustScoreBadgeProps) {
  const cfg = sizeConfig[size];
  const radius = size === "sm" ? 14 : size === "md" ? 22 : 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const viewBox = size === "sm" ? 32 : size === "md" ? 48 : 64;

  const Icon = verified ? ShieldCheck : score >= 60 ? Shield : ShieldAlert;

  return (
    <div className="inline-flex items-center gap-2">
      <div className={`relative ${cfg.container} flex items-center justify-center`}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${viewBox} ${viewBox}`}
          className="absolute inset-0 -rotate-90"
        >
          <circle
            cx={viewBox / 2}
            cy={viewBox / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={size === "sm" ? 3 : size === "md" ? 4 : 5}
          />
          <circle
            cx={viewBox / 2}
            cy={viewBox / 2}
            r={radius}
            fill="none"
            strokeWidth={size === "sm" ? 3 : size === "md" ? 4 : 5}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={getScoreBg(score)}
          />
        </svg>
        <div className={`relative z-10 ${getScoreColor(score)}`}>
          <Icon className={cfg.icon} />
        </div>
      </div>
      <div className="flex flex-col">
        <span className={`font-semibold ${getScoreColor(score)} ${cfg.text}`}>
          {score}%
        </span>
        {verified && (
          <span className="text-[10px] text-neon-blue flex items-center gap-0.5">
            <ShieldCheck className="size-2.5" />
            Verified
          </span>
        )}
      </div>
    </div>
  );
}
