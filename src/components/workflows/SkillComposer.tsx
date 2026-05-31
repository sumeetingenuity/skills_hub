"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Trash2,
  ArrowDown,
  GripVertical,
  Save,
  Play,
  Search,
} from "lucide-react"

interface SkillNode {
  id: string
  skillId: string
  skillName: string
  skillSlug: string
  order: number
}

interface AvailableSkill {
  id: string
  name: string
  slug: string
  category: string
  description: string
}

interface SkillComposerProps {
  initialName?: string
  initialDescription?: string
  initialSkills?: SkillNode[]
  onSave?: (data: { name: string; description: string; skillIds: string[] }) => void
  onExecute?: () => void
  isSaving?: boolean
}

export function SkillComposer({
  initialName = "",
  initialDescription = "",
  initialSkills = [],
  onSave,
  onExecute,
  isSaving = false,
}: SkillComposerProps) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [nodes, setNodes] = useState<SkillNode[]>(initialSkills)
  const [availableSkills, setAvailableSkills] = useState<AvailableSkill[]>([])
  const [search, setSearch] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/skills?limit=100")
      .then((r) => r.json())
      .then((data) => {
        if (data.skills) setAvailableSkills(data.skills)
      })
      .catch(() => {})
  }, [])

  const addSkill = useCallback((skill: AvailableSkill) => {
    setNodes((prev) => [
      ...prev,
      {
        id: `node-${Date.now()}`,
        skillId: skill.id,
        skillName: skill.name,
        skillSlug: skill.slug,
        order: prev.length,
      },
    ])
    setShowSearch(false)
    setSearch("")
  }, [])

  const removeSkill = useCallback((nodeId: string) => {
    setNodes((prev) =>
      prev
        .filter((n) => n.id !== nodeId)
        .map((n, i) => ({ ...n, order: i }))
    )
  }, [])

  const moveSkill = useCallback((fromIdx: number, toIdx: number) => {
    setNodes((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIdx, 1)
      updated.splice(toIdx, 0, moved)
      return updated.map((n, i) => ({ ...n, order: i }))
    })
    setDragIdx(null)
  }, [])

  const filteredSkills = availableSkills.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = () => {
    onSave?.({
      name,
      description,
      skillIds: nodes.map((n) => n.skillId),
    })
  }

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx !== null && dragIdx !== idx) {
      moveSkill(dragIdx, idx)
    }
  }

  const handleDragEnd = () => {
    setDragIdx(null)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Workflow Name</label>
          <Input
            placeholder="e.g. Research & Report Pipeline"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Description</label>
          <Textarea
            placeholder="Describe what this workflow does..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <div>
        <label className="mb-3 block text-sm font-medium">Pipeline</label>
        <div className="space-y-0">
          {nodes.map((node, idx) => (
            <div key={node.id}>
              <Card
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`group cursor-grab active:cursor-grabbing border-border/50 transition-colors hover:border-neon-blue/30 ${
                  dragIdx === idx ? "opacity-50" : ""
                }`}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{node.skillName}</p>
                    <p className="text-xs text-muted-foreground">
                      Step {idx + 1}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeSkill(node.id)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </CardContent>
              </Card>

              {idx < nodes.length - 1 && (
                <div className="flex justify-center py-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-px w-12 bg-border" />
                    <ArrowDown className="size-3" />
                    <div className="h-px w-12 bg-border" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {!showSearch ? (
          <Button
            variant="outline"
            className="mt-3 w-full gap-2 border-dashed"
            onClick={() => setShowSearch(true)}
          >
            <Plus className="size-4" />
            Add Skill
          </Button>
        ) : (
          <Card className="mt-3 border-neon-blue/20">
            <CardContent className="p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search skills..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredSkills.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No skills found
                  </p>
                ) : (
                  filteredSkills.map((skill) => (
                    <button
                      key={skill.id}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted transition-colors"
                      onClick={() => addSkill(skill)}
                    >
                      <Plus className="size-3 shrink-0 text-muted-foreground" />
                      <span className="flex-1">{skill.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {skill.category}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setShowSearch(false)}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {nodes.length >= 2 && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Pipeline Preview
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {nodes.map((node, idx) => (
                <div key={node.id} className="flex items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className="text-xs bg-neon-blue/10 text-neon-blue border-neon-blue/20"
                  >
                    {node.skillName}
                  </Badge>
                  {idx < nodes.length - 1 && (
                    <ArrowDown className="size-3 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={!name || nodes.length === 0 || isSaving}
          className="gap-2"
        >
          <Save className="size-4" />
          {isSaving ? "Saving..." : "Save Workflow"}
        </Button>
        {onExecute && (
          <Button
            variant="outline"
            onClick={onExecute}
            disabled={nodes.length === 0}
            className="gap-2"
          >
            <Play className="size-4" />
            Execute
          </Button>
        )}
      </div>
    </div>
  )
}
