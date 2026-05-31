"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ExecutionPlayground } from "@/components/skills/ExecutionPlayground";
import { PermissionsView } from "@/components/skills/PermissionsView";
import { PoliciesView } from "@/components/skills/PoliciesView";
import { AnalyticsTab } from "@/components/skills/AnalyticsTab";
import { TrustScoreBadge } from "@/components/skills/TrustScoreBadge";
import { CapabilityContract } from "@/components/agent/CapabilityContract"
import { CompatibilityMatrix } from "@/components/agent/CompatibilityMatrix"
import { CapabilityGraph } from "@/components/graph/CapabilityGraph"
import {
  FileText,
  Terminal,
  Shield,
  BookOpen,
  BarChart3,
  GitBranch,
  Code2,
  User,
  Star,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ApiAction {
  actionId: string;
  name: string;
  description: string;
  riskLevel: string;
  endpoint?: string | null;
  method?: string;
  parameters: Array<{ name: string; type: string; required?: boolean; description?: string }> | Record<string, unknown>;
}

interface ApiPermission {
  roles: string[];
  scopes: string[];
  authRequirements: string[];
  approvalRequired: boolean;
}

interface ApiPolicy {
  rateLimit: number;
  rateLimitWindow: number;
  restrictions: Record<string, unknown>;
}

interface ApiSkill {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tags?: string[];
  version: number;
  source?: string;
  sourceUrl?: string;
  published: boolean;
  createdAt: string;
  author?: { name: string; avatarUrl: string } | null;
  trustScore?: { score: number; verified: boolean } | null;
  actions?: ApiAction[];
  permissions?: ApiPermission[];
  policies?: ApiPolicy[];
}

const tabs = [
  { value: "Overview", icon: FileText },
  { value: "Actions", icon: Terminal },
  { value: "Permissions", icon: Shield },
  { value: "Policies", icon: BookOpen },
  { value: "Analytics", icon: BarChart3 },
  { value: "Source", icon: GitBranch },
  { value: "Documentation", icon: Code2 },
];

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-full max-w-3xl" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="mb-8">
        <Skeleton className="h-10 w-full max-w-xl" />
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-16" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-3/6" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/6" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SkillDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [skill, setSkill] = useState<ApiSkill | null>(null);
  const [relatedSkills, setRelatedSkills] = useState<{ id: string; slug: string; name: string; category: string; trustScore: { score: number } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Overview");

  useEffect(() => {
    let cancelled = false;

    async function fetchSkill() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/skills/${slug}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Skill not found");
          throw new Error(`Failed to load skill`);
        }
        const json = await res.json();
        const data: ApiSkill = json.skill || json;
        if (!cancelled) setSkill(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "An unexpected error occurred");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSkill();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!skill) return;
    const currentCategory = skill.category;
    if (!currentCategory) return;
    let cancelled = false;

    async function fetchRelated() {
      try {
        const res = await fetch(`/api/skills?category=${encodeURIComponent(currentCategory)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            const mapped = (data.skills || []).map((s: any) => ({
              id: s.id,
              slug: s.slug,
              name: s.name,
              category: s.category,
              trustScore: s.trustScore || { score: 0 },
            }));
            setRelatedSkills(mapped);
          }
        }
      } catch {
        if (!cancelled) setRelatedSkills([]);
      }
    }

    fetchRelated();
    return () => { cancelled = true; };
  }, [skill]);

  if (loading) return <LoadingSkeleton />;

  if (error || !skill) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="size-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Skill not found</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {error || "The skill you are looking for does not exist or has been removed."}
              </p>
            </div>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-xs">{skill.category}</Badge>
          {skill.trustScore?.verified && (
            <Badge variant="outline" className="text-xs gap-1 border-neon-blue/30 text-neon-blue">
              <ShieldCheck className="size-3" />
              Verified
            </Badge>
          )}
          <Badge variant="ghost" className="text-xs">v{skill.version}</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{skill.name}</h1>
        <p className="mt-2 text-lg text-muted-foreground max-w-3xl">{skill.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="size-3.5" />
            {skill.author?.name ?? "Unknown"}
          </span>
          <span className="flex items-center gap-1">
            <Star className="size-3.5 fill-yellow-500 text-yellow-500" />
            <TrustScoreBadge score={skill.trustScore?.score ?? 0} verified={skill.trustScore?.verified ?? false} size="sm" />
          </span>
          <span className="flex items-center gap-1">
            <Code2 className="size-3.5" />
            {skill.source ?? "Unknown"}
          </span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8 flex-wrap h-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                <Icon className="size-3.5" />
                {tab.value}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="Overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{skill.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {skill.tags?.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          <ExecutionPlayground
            skill={{
              id: skill.id,
              name: skill.name,
              actions: (skill.actions ?? []).map((a) => ({
                actionId: a.actionId,
                name: a.name,
                description: a.description ?? "",
                parameters: (Array.isArray(a.parameters) ? a.parameters : []).map((p: any) => ({
                  name: p.name || "",
                  type: (p.type || "string") as "string" | "number" | "boolean" | "json" | "string[]",
                  required: p.required || false,
                  description: p.description || "",
                })),
              })),
            }}
          />
        </TabsContent>

        <TabsContent value="Actions" className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            This skill exposes {(skill.actions ?? []).length} action{(skill.actions ?? []).length !== 1 ? "s" : ""}.
          </p>
          {(skill.actions ?? []).map((action) => (
            <Card key={action.actionId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-mono">{action.name}</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">{action.riskLevel}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{action.description ?? ""}</p>
                {action.parameters && Object.keys(action.parameters).length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs font-medium text-foreground">Parameters:</span>
                    <pre className="mt-1 rounded-lg border border-border bg-muted p-3 text-xs font-mono overflow-x-auto">
                      {JSON.stringify(action.parameters, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="Permissions" className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            This skill declares {(skill.permissions ?? []).length} permission{(skill.permissions ?? []).length !== 1 ? "s" : ""}.
          </p>
          {(skill.permissions ?? []).map((permission, i) => (
            <PermissionsView key={i} permission={permission} />
          ))}
        </TabsContent>

        <TabsContent value="Policies" className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            {(skill.policies ?? []).length} polic{(skill.policies ?? []).length !== 1 ? "ies" : "y"} govern execution.
          </p>
          {(skill.policies ?? []).map((policy, i) => (
            <PoliciesView
              key={i}
              policy={{
                rateLimit: {
                  requests: policy.rateLimit ?? 0,
                  period: `${policy.rateLimitWindow ?? 60}s`,
                },
                rateLimitWindow: `${policy.rateLimitWindow ?? 60}s`,
                restrictions: policy.restrictions ? Object.keys(policy.restrictions).length > 0
                  ? Object.entries(policy.restrictions).map(([k, v]) => `${k}: ${String(v)}`)
                  : []
                  : [],
                executionConditions: [],
              }}
            />
          ))}
        </TabsContent>

        <TabsContent value="Analytics" className="space-y-6">
          <AnalyticsTab skillId={skill.id} />
        </TabsContent>

        <TabsContent value="Source" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <GitBranch className="size-4" />
                Repository
              </CardTitle>
            </CardHeader>
            <CardContent>
              {skill.sourceUrl && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Source code available at:
                  </p>
                  <a
                    href={skill.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-2 text-sm font-mono hover:bg-muted/80 transition-colors"
                  >
                    {skill.sourceUrl}
                    <ExternalLink className="size-3.5 shrink-0" />
                  </a>
                </>
              )}
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span>Source: {skill.source ?? "manual"}</span>
                <span>Version: v{skill.version}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">AMTP Manifest</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="rounded-lg border border-border bg-black/50 p-4 text-xs font-mono text-green-400 overflow-x-auto">{`{
  "amtp": "1.0",
  "name": "${skill.name}",
  "version": ${skill.version},
  "actions": ${(skill.actions ?? []).length},
  "permissions": ${(skill.permissions ?? []).length},
  "policies": ${(skill.policies ?? []).length},
  "source": "${skill.source ?? "manual"}"
}`}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="Documentation" className="space-y-6">
          <CapabilityContract
            actions={(skill.actions ?? []) as any}
            permissions={(skill.permissions ?? []) as any}
            policies={(skill.policies ?? []) as any}
            trustScore={skill.trustScore}
          />
          <Separator />
          <CompatibilityMatrix
            skillId={skill.id}
            actions={skill.actions ?? []}
          />
          <Separator />
          <CapabilityGraph skills={relatedSkills} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
