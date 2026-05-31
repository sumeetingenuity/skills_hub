import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Play, CheckCircle2, Zap } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export interface Skill {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  version?: number;
  published?: boolean;
  author: { id?: string; name: string | null; avatarUrl: string | null };
  trustScore: { score: number; verified?: boolean; totalExecutions?: number; totalReviews?: number } | null;
  _count: { actions?: number; executions?: number };
  iconUrl?: string | null;
}

export function SkillCard({ skill }: { skill: Skill }) {
  const isVerified = skill.trustScore?.verified;
  const trustScore = skill.trustScore?.score ?? 0;
  const executions = skill._count?.executions ?? skill.trustScore?.totalExecutions ?? 0;

  return (
    <Link href={`/skills/${skill.slug}`}>
      <Card className="h-full transition-all duration-300 hover:border-neon-blue/30 hover:shadow-[0_0_20px_rgba(0,212,255,0.05)] cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-[10px] font-medium">
              {skill.category.replace(/_/g, " ")}
            </Badge>
            <div className="flex items-center gap-1.5">
              {isVerified && (
                <CheckCircle2 className="size-3.5 text-neon-blue" />
              )}
              {skill.version && (
                <span className="text-[10px] text-muted-foreground font-mono">v{skill.version}</span>
              )}
            </div>
          </div>
          <CardTitle className="mt-2 text-base group-hover:text-neon-blue transition-colors">
            {skill.name}
          </CardTitle>
          <CardDescription className="line-clamp-2 text-xs">
            {skill.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {skill.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {skill.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                  {tag}
                </Badge>
              ))}
              {skill.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground leading-4">
                  +{skill.tags.length - 3}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
            <div className="flex items-center gap-1" title="Trust Score">
              <ShieldCheck className={`size-3.5 ${trustScore >= 80 ? "text-neon-blue" : trustScore >= 50 ? "text-amber-500" : "text-muted-foreground"}`} />
              <span className="font-medium">{Math.round(trustScore)}</span>
            </div>
            <div className="flex items-center gap-1" title="Executions">
              <Zap className="size-3" />
              <span>{formatNumber(executions)}</span>
            </div>
            {skill._count?.actions !== undefined && (
              <div className="flex items-center gap-1" title="Actions">
                <Play className="size-3" />
                <span>{skill._count.actions}</span>
              </div>
            )}
            <span className="truncate max-w-[80px]">{skill.author?.name ?? "Unknown"}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
