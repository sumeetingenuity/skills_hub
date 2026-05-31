"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Shield, Key, Gauge, AlertTriangle, CheckCircle2 } from "lucide-react"

interface ContractAction {
  name: string
  description?: string
  parameters?: Record<string, unknown>
  riskLevel?: string
}

interface ContractPermission {
  roles?: string[]
  scopes?: string[]
  authRequirements?: string[]
  approvalRequired?: boolean
}

interface ContractPolicy {
  rateLimit?: number
  rateLimitWindow?: number
  restrictions?: unknown
}

interface CapabilityContractProps {
  actions?: ContractAction[]
  permissions?: ContractPermission[]
  policies?: ContractPolicy[]
  trustScore?: { score: number; verified: boolean } | null
}

export function CapabilityContract({ actions, permissions, policies, trustScore }: CapabilityContractProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="size-4 text-neon-blue" />
        <h3 className="text-sm font-semibold">Capability Contract</h3>
        {trustScore && (
          <Badge variant={trustScore.verified ? "default" : "secondary"} className="ml-auto text-xs">
            <CheckCircle2 className="size-3 mr-1" />
            Trust {trustScore.score}%
          </Badge>
        )}
      </div>

      {actions && actions.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</p>
            {actions.map((action, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{action.name}</span>
                  {action.riskLevel && (
                    <Badge variant="outline" className={`text-[10px] ${
                      action.riskLevel === "high" ? "text-destructive border-destructive/30" :
                      action.riskLevel === "medium" ? "text-yellow-500 border-yellow-500/30" :
                      "text-emerald-500 border-emerald-500/30"
                    }`}>
                      <AlertTriangle className="size-2.5 mr-0.5" />
                      {action.riskLevel}
                    </Badge>
                  )}
                </div>
                {action.description && (
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                )}
                {action.parameters && Object.keys(action.parameters).length > 0 && (
                  <pre className="text-[10px] text-muted-foreground bg-muted/50 rounded p-1.5 overflow-x-auto">
                    {JSON.stringify(action.parameters, null, 2)}
                  </pre>
                )}
                {i < actions.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {permissions && permissions.length > 0 && permissions.map((perm, i) => (
        <Card key={i}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Key className="size-3.5 text-neon-blue" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Permissions</p>
            </div>
            {perm.roles && perm.roles.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {perm.roles.map((r) => <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>)}
              </div>
            )}
            {perm.scopes && perm.scopes.length > 0 && (
              <div className="space-y-0.5">
                {perm.scopes.map((s) => (
                  <p key={s} className="text-xs text-muted-foreground font-mono">• {s}</p>
                ))}
              </div>
            )}
            {perm.approvalRequired && (
              <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 text-[10px]">
                Approval Required
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}

      {policies && policies.length > 0 && policies.map((pol, i) => (
        <Card key={i}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Gauge className="size-3.5 text-neon-blue" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Policies</p>
            </div>
            {pol.rateLimit && (
              <p className="text-xs text-muted-foreground">
                Rate Limit: {pol.rateLimit} requests per {pol.rateLimitWindow || 60}s
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
