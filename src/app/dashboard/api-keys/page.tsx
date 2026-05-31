"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Copy, Trash2, Key, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

interface ApiKeyData {
  id: string
  name: string
  key: string
  lastUsed: string | null
  createdAt: string
  expiresAt: string | null
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyData[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKey, setNewKey] = useState<string | null>(null)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchKeys()
  }, [])

  async function fetchKeys() {
    try {
      const res = await fetch("/api/keys")
      if (res.ok) {
        const json = await res.json()
        setKeys(json.keys || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  async function createKey() {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the key")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      })
      if (res.ok) {
        const data = await res.json()
        setNewKey(data.key)
        setKeys([data.apiKey, ...keys])
        setNewKeyName("")
        toast.success("API key created")
      } else {
        toast.error("Failed to create key")
      }
    } catch {
      toast.error("Failed to create key")
    } finally {
      setCreating(false)
    }
  }

  async function deleteKey(id: string) {
    if (!confirm("Delete this API key? This cannot be undone.")) return
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" })
      if (res.ok) {
        setKeys(keys.filter((k) => k.id !== id))
        toast.success("API key deleted")
      }
    } catch {
      toast.error("Failed to delete key")
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key)
    toast.success("Copied to clipboard")
  }

  function maskKey(key: string) {
    return key.slice(0, 8) + "..." + key.slice(-4)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <Skeleton className="h-8 w-48 mb-8" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground mt-1">
            Manage keys for programmatic access to SkillHub
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button className="gap-1.5 bg-neon-blue hover:bg-neon-blue/90 text-white">
              <Plus className="size-3.5" />
              New Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {newKey ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Save this key now. You won't be able to see it again.
                  </p>
                  <div className="flex gap-2">
                    <Input value={newKey} readOnly className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={() => copyKey(newKey)}>
                      <Copy className="size-4" />
                    </Button>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setNewKey(null)
                      setDialogOpen(false)
                    }}
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Key Name</Label>
                    <Input
                      placeholder="e.g., Production Agent"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && createKey()}
                    />
                  </div>
                  <Button onClick={createKey} disabled={creating} className="w-full gap-1.5">
                    {creating ? "Creating..." : "Create Key"}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {keys.length > 0 ? (
        <div className="space-y-3">
          {keys.map((apiKey) => (
            <Card key={apiKey.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <Key className="size-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{apiKey.name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {showKeys[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {apiKey.lastUsed && (
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      Last used {new Date(apiKey.lastUsed).toLocaleDateString()}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setShowKeys({ ...showKeys, [apiKey.id]: !showKeys[apiKey.id] })}
                  >
                    {showKeys[apiKey.id] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => copyKey(apiKey.key)}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive"
                    onClick={() => deleteKey(apiKey.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Key className="size-8 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">No API keys yet</p>
            <p className="text-muted-foreground text-xs mt-1">
              Create a key to access the SkillHub API programmatically
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
