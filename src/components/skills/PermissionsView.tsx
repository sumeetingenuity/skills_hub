"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, ShieldX, Globe, Lock, KeyRound } from "lucide-react";

interface PermissionObject {
  roles: string[];
  scopes: string[];
  authRequirements: string[];
  approvalRequired: boolean;
}

interface PermissionsViewProps {
  permission: PermissionObject;
}

export function PermissionsView({ permission }: PermissionsViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="size-4" />
          Permissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Globe className="size-3.5 text-muted-foreground" />
            Roles
          </div>
          <div className="flex flex-wrap gap-1.5">
            {permission.roles.length > 0 ? (
              permission.roles.map((role) => (
                <Badge key={role} variant="secondary" className="text-xs">
                  {role}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No roles defined</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Lock className="size-3.5 text-muted-foreground" />
            Scopes
          </div>
          {permission.scopes.length > 0 ? (
            <ul className="space-y-1">
              {permission.scopes.map((scope) => (
                <li key={scope} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="size-1 rounded-full bg-muted-foreground/40" />
                  <code className="text-xs font-mono">{scope}</code>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-xs text-muted-foreground">No scopes defined</span>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <KeyRound className="size-3.5 text-muted-foreground" />
            Auth Requirements
          </div>
          {permission.authRequirements.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {permission.authRequirements.map((req) => (
                <Badge key={req} variant="outline" className="text-xs">
                  {req}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No auth requirements</span>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="flex items-center gap-2">
            {permission.approvalRequired ? (
              <ShieldX className="size-4 text-amber-400" />
            ) : (
              <ShieldCheck className="size-4 text-green-400" />
            )}
            <span className="text-sm">Approval Required</span>
          </div>
          <Badge variant={permission.approvalRequired ? "destructive" : "secondary"} className="text-[10px]">
            {permission.approvalRequired ? "Yes" : "No"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
