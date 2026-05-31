"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Box } from "lucide-react"
import Link from "next/link"

interface GraphSkill {
  id: string
  name: string
  slug: string
  category: string
}

interface CapabilityGraphProps {
  skills: GraphSkill[]
}

export function CapabilityGraph({ skills }: CapabilityGraphProps) {
  if (skills.length < 2) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
          <Box className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Add more skills to visualize the capability graph
          </p>
        </CardContent>
      </Card>
    )
  }

  const grouped = skills.reduce<Record<string, GraphSkill[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Box className="size-4 text-neon-blue" />
        <h3 className="text-sm font-medium">Capability Graph</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Visualizing skill relationships and composition chains
      </p>
      <div className="space-y-6">
        {Object.entries(grouped).map(([category, cats], groupIdx) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIdx * 0.1 }}
            className="space-y-2"
          >
            <Badge variant="outline" className="text-xs">
              {category}
            </Badge>
            <div className="flex flex-wrap items-center gap-2">
              {cats.map((skill, idx) => (
                <div key={skill.id} className="flex items-center gap-2">
                  <Link href={`/skills/${skill.slug}`}>
                    <Card className="border-border/50 hover:border-neon-blue/30 transition-colors cursor-pointer">
                      <CardContent className="flex items-center gap-2 px-3 py-2">
                        <div className="size-2 rounded-full bg-neon-blue" />
                        <span className="text-sm font-medium">{skill.name}</span>
                      </CardContent>
                    </Card>
                  </Link>
                  {idx < cats.length - 1 && (
                    <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
