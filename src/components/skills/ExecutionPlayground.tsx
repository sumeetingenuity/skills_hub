"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Terminal, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface ActionParam {
  name: string;
  type: "string" | "number" | "boolean" | "json" | "string[]";
  required: boolean;
  description?: string;
}

interface Action {
  actionId: string;
  name: string;
  description: string;
  parameters: ActionParam[];
}

interface ExecutionResult {
  id?: string;
  status: string;
  output: Record<string, unknown> | null;
  latency: number | null;
  logs: string | null;
}

interface ExecutionPlaygroundProps {
  skill: {
    id: string;
    name: string;
    actions: Action[];
  };
}

function generateDefaultParams(parameters: ActionParam[]): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const p of parameters) {
    switch (p.type) {
      case "string":
        params[p.name] = "";
        break;
      case "number":
        params[p.name] = 0;
        break;
      case "boolean":
        params[p.name] = false;
        break;
      case "json":
        params[p.name] = "{}";
        break;
      case "string[]":
        params[p.name] = "[]";
        break;
    }
  }
  return params;
}

function inferParamsFromDescription(desc: string): ActionParam[] {
  if (!desc) return [];
  const parts = desc.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.map((part) => {
    const isArray = part.endsWith("[]");
    const isRequired = !part.includes("?");
    const name = part.replace("[]", "").replace("?", "").trim();
    let type: ActionParam["type"] = "string";
    if (isArray) type = "string[]";
    else if (name.toLowerCase().includes("timeout") || name.toLowerCase().includes("count") || name.toLowerCase().includes("limit")) type = "number";
    return { name, type, required: isRequired };
  });
}

export function ExecutionPlayground({ skill }: ExecutionPlaygroundProps) {
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);

  const currentAction = skill.actions.find((a) => a.name === selectedAction);
  const actionParams = currentAction?.parameters?.length
    ? currentAction.parameters
    : currentAction
      ? inferParamsFromDescription(currentAction.description)
      : [];

  const handleActionChange = (value: string | null) => {
    if (!value) return;
    setSelectedAction(value);
    const action = skill.actions.find((a) => a.name === value);
    if (action) {
      const p = action.parameters?.length
        ? action.parameters
        : inferParamsFromDescription(action.description);
      setParams(generateDefaultParams(p));
    }
    setResult(null);
  };

  const updateParam = (name: string, value: unknown) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  };

  const execute = async () => {
    if (!currentAction) return;
    setExecuting(true);
    setResult(null);

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: skill.id,
          actionId: currentAction.actionId,
          input: params,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({
          status: "error",
          output: null,
          latency: null,
          logs: data.error || `Execution failed: ${res.statusText}`,
        });
        toast.error(data.error || "Execution failed");
        return;
      }

      setResult(data);
      toast.success("Execution completed successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setResult({
        status: "error",
        output: null,
        latency: null,
        logs: msg,
      });
      toast.error(msg);
    } finally {
      setExecuting(false);
    }
  };

  const isSuccess = result?.status === "COMPLETED" || result?.status === "success";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Terminal className="size-4" />
          Execution Playground
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Action</Label>
          <Select value={selectedAction} onValueChange={handleActionChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select an action to execute..." />
            </SelectTrigger>
            <SelectContent>
              {skill.actions.map((action) => (
                <SelectItem key={action.actionId} value={action.name}>
                  {action.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentAction && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{currentAction.description}</p>
          </div>
        )}

        {actionParams.length > 0 && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Parameters</Label>
            {actionParams.map((param) => (
              <div key={param.name} className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-muted-foreground">{param.name}</Label>
                  {param.required && (
                    <span className="text-[10px] text-destructive">*</span>
                  )}
                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                    {param.type}
                  </Badge>
                </div>
                {param.type === "boolean" ? (
                  <select
                    className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={String(params[param.name] ?? false)}
                    onChange={(e) => updateParam(param.name, e.target.value === "true")}
                  >
                    <option value="false">false</option>
                    <option value="true">true</option>
                  </select>
                ) : param.type === "number" ? (
                  <Input
                    type="number"
                    value={String(params[param.name] ?? 0)}
                    onChange={(e) => updateParam(param.name, Number(e.target.value))}
                  />
                ) : (
                  <Input
                    value={String(params[param.name] ?? "")}
                    onChange={(e) => updateParam(param.name, e.target.value)}
                    placeholder={param.description || `Enter ${param.name}...`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={execute}
          disabled={!selectedAction || executing}
          className="gap-1.5"
        >
          {executing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3.5" />
          )}
          {executing ? "Executing..." : "Execute"}
        </Button>

        {result && (
          <div className="space-y-3 rounded-lg border border-border bg-black/50 p-4">
            <div className="flex items-center gap-2">
              {isSuccess ? (
                <CheckCircle2 className="size-4 text-green-400" />
              ) : (
                <XCircle className="size-4 text-red-400" />
              )}
              <span className={`text-sm font-medium ${isSuccess ? "text-green-400" : "text-red-400"}`}>
                {isSuccess ? "Success" : "Error"}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {result.status}
              </span>
              {result.latency != null && result.latency > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {result.latency}ms
                </span>
              )}
            </div>
            {result.output && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Output</p>
                <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                  {JSON.stringify(result.output, null, 2)}
                </pre>
              </div>
            )}
            {result.logs && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Logs</p>
                <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
                  {result.logs}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
