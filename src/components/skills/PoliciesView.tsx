"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Gauge, Ban, ListChecks, TriangleAlert } from "lucide-react";

interface RateLimitConfig {
  requests: number;
  period: string;
}

interface PolicyObject {
  rateLimit: RateLimitConfig;
  rateLimitWindow: string;
  restrictions: string[];
  executionConditions: string[];
}

interface PoliciesViewProps {
  policy: PolicyObject;
}

export function PoliciesView({ policy }: PoliciesViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="size-4" />
          Policies
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="flex items-center gap-2">
            <Gauge className="size-4 text-neon-blue" />
            <div>
              <p className="text-sm font-medium">Rate Limit</p>
              <p className="text-xs text-muted-foreground">
                {policy.rateLimit.requests} requests per {policy.rateLimit.period}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {policy.rateLimitWindow}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Ban className="size-3.5 text-muted-foreground" />
            Restrictions
          </div>
          {policy.restrictions.length > 0 ? (
            <ul className="space-y-1.5">
              {policy.restrictions.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-destructive/60 mt-1.5 shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-xs text-muted-foreground">No restrictions</span>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <ListChecks className="size-3.5 text-muted-foreground" />
            Execution Conditions
          </div>
          {policy.executionConditions.length > 0 ? (
            <ul className="space-y-1.5">
              {policy.executionConditions.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <TriangleAlert className="size-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-xs text-muted-foreground">No conditions</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
