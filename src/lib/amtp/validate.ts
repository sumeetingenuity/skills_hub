import type { Action, ActionParameter, Permission, Policy } from "@amtp/protocol"

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

const VALID_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]
const VALID_PARAM_TYPES = [
  "string", "number", "integer", "boolean", "email",
  "url", "date", "datetime", "phone", "enum", "object", "array", "file",
]
const VALID_RISK_LEVELS = ["low", "medium", "high", "critical"]
const VALID_OPERATORS = ["eq", "neq", "in", "gt", "lt", "contains", "exists"]

export function validateManifest(manifest: {
  name?: string
  description?: string
  version?: string
  protocol?: string
  actions?: Action[]
  permissions?: Permission[]
  policies?: Policy[]
}): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  if (!manifest.name || typeof manifest.name !== "string") {
    errors.push({ field: "name", message: "Name is required" })
  }

  if (!manifest.description) {
    warnings.push({ field: "description", message: "Description is recommended" })
  }

  if (!manifest.version) {
    warnings.push({ field: "version", message: "Version is recommended (e.g., 1.0.0)" })
  }

  if (!manifest.protocol) {
    warnings.push({ field: "protocol", message: "Protocol version is recommended (e.g., amtp-2025-01)" })
  }

  if (!manifest.actions || manifest.actions.length === 0) {
    errors.push({ field: "actions", message: "At least one action is required" })
  } else {
    for (const action of manifest.actions) {
      errors.push(...validateAction(action))
    }
  }

  if (manifest.permissions) {
    for (const perm of manifest.permissions) {
      errors.push(...validatePermission(perm))
    }
  }

  if (manifest.policies) {
    for (const policy of manifest.policies) {
      errors.push(...validatePolicy(policy))
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function validateAction(action: Action): ValidationError[] {
  const errors: ValidationError[] = []
  const prefix = `actions[${action.id}]`

  if (!action.id) {
    errors.push({ field: `${prefix}.id`, message: "Action ID is required" })
  }

  if (action.method && !VALID_METHODS.includes(action.method)) {
    errors.push({
      field: `${prefix}.method`,
      message: `Invalid method: ${action.method}. Valid: ${VALID_METHODS.join(", ")}`,
    })
  }

  if (action.parameters) {
    for (const param of action.parameters) {
      errors.push(...validateParameter(param, `${prefix}.parameters[${param.name}]`))
    }
  }

  return errors
}

export function validateParameter(
  param: ActionParameter,
  prefix: string
): ValidationError[] {
  const errors: ValidationError[] = []

  if (!param.name) {
    errors.push({ field: `${prefix}`, message: "Parameter name is required" })
  }

  if (param.type && !VALID_PARAM_TYPES.includes(param.type)) {
    errors.push({
      field: `${prefix}.type`,
      message: `Invalid type: ${param.type}. Valid: ${VALID_PARAM_TYPES.join(", ")}`,
    })
  }

  return errors
}

export function validatePermission(
  permission: Permission
): ValidationError[] {
  const errors: ValidationError[] = []
  const prefix = `permissions[${permission.id}]`

  if (!permission.id) {
    errors.push({ field: `${prefix}.id`, message: "Permission ID is required" })
  }

  if (!permission.resource) {
    errors.push({ field: `${prefix}.resource`, message: "Resource pattern is required" })
  }

  if (!permission.actions || permission.actions.length === 0) {
    errors.push({ field: `${prefix}.actions`, message: "At least one action is required" })
  }

  return errors
}

export function validatePolicy(policy: Policy): ValidationError[] {
  const errors: ValidationError[] = []
  const prefix = `policies[${policy.id}]`

  if (!policy.id) {
    errors.push({ field: `${prefix}.id`, message: "Policy ID is required" })
  }

  if (!policy.permissions || policy.permissions.length === 0) {
    errors.push({ field: `${prefix}.permissions`, message: "At least one permission is required" })
  }

  if (policy.conditions) {
    for (let i = 0; i < policy.conditions.length; i++) {
      const cond = policy.conditions[i]
      if (!VALID_OPERATORS.includes(cond.operator)) {
        errors.push({
          field: `${prefix}.conditions[${i}].operator`,
          message: `Invalid operator: ${cond.operator}. Valid: ${VALID_OPERATORS.join(", ")}`,
        })
      }
    }
  }

  return errors
}

export function generateAmtpMarkdown(manifest: {
  name: string
  description: string
  version?: string
  protocol?: string
  category?: string
  author?: string
  actions: Action[]
  permissions?: Permission[]
  policies?: Policy[]
}): string {
  const lines: string[] = []

  lines.push(`# ${manifest.name}`)
  lines.push("")
  lines.push(manifest.description)
  lines.push("")

  if (manifest.version) lines.push(`**Version**: ${manifest.version}`)
  if (manifest.protocol) lines.push(`**Protocol**: ${manifest.protocol}`)
  if (manifest.category) lines.push(`**Category**: ${manifest.category}`)
  if (manifest.author) lines.push(`**Author**: ${manifest.author}`)
  lines.push("")

  lines.push("```amtp-meta")
  lines.push(
    JSON.stringify(
      {
        pageId: manifest.name.toLowerCase().replace(/\s+/g, "-"),
        pageType: "skill",
        version: manifest.version || "1.0",
      },
      null,
      2
    )
  )
  lines.push("```")
  lines.push("")

  if (manifest.actions.length > 0) {
    lines.push("## Actions")
    lines.push("")

    for (const action of manifest.actions) {
      if (action.label) {
        lines.push(`[${action.label.toUpperCase()}] — ${action.description || action.id}`)
      }
    }
    lines.push("")

    lines.push("```amtp-action")
    lines.push(JSON.stringify(manifest.actions, null, 2))
    lines.push("```")
    lines.push("")
  }

  if (manifest.permissions && manifest.permissions.length > 0) {
    lines.push("## Permissions")
    lines.push("")
    lines.push("```amtp-permissions")
    lines.push(JSON.stringify(manifest.permissions, null, 2))
    lines.push("```")
    lines.push("")
  }

  if (manifest.policies && manifest.policies.length > 0) {
    lines.push("## Policies")
    lines.push("")
    lines.push("```amtp-policy")
    lines.push(JSON.stringify(manifest.policies, null, 2))
    lines.push("```")
    lines.push("")
  }

  return lines.join("\n")
}
