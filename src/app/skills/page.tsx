"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Brain, Type, SlidersHorizontal, X, Shield, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SkillCard, type Skill } from "@/components/skills/SkillCard";

export default function SkillsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popularity");
  const [semantic, setSemantic] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search]);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      if (semantic && debouncedSearch) {
        const params = new URLSearchParams();
        params.set("q", debouncedSearch);
        if (category !== "all") params.set("category", category);
        params.set("limit", "50");
        const res = await fetch(`/api/skills/vector-search?${params.toString()}`);
        const json = await res.json();
        const list: Skill[] = json.skills ?? [];
        setSkills(list);
        setTotal(json.total ?? list.length);
      } else {
        // Use the discover endpoint for richer filtering
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("q", debouncedSearch);
        if (category !== "all") params.set("category", category);
        if (sortBy !== "popularity") params.set("sort", sortBy);
        if (verifiedOnly) params.set("verified", "true");
        params.set("limit", "50");
        const res = await fetch(`/api/skills/discover?${params.toString()}`);
        const json = await res.json();
        const list: Skill[] = json.skills ?? json.data ?? (Array.isArray(json) ? json : []);
        setSkills(list);
        setTotal(json.total ?? list.length);
      }
    } catch {
      setSkills([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, sortBy, semantic, verifiedOnly]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories");
        const json = await res.json();
        const list: string[] = json.categories ?? json.data ?? (Array.isArray(json) ? json : []);
        setCategories(list);
      } catch {
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    }
    fetchCategories();
  }, []);

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setSortBy("popularity");
    setVerifiedOnly(false);
  };

  const hasActiveFilters = category !== "all" || verifiedOnly || debouncedSearch;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="text-gradient">Capability Registry</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Discover, understand, and execute AI agent capabilities published on AMTP.
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={semantic ? "Search by meaning (semantic)..." : "Search capabilities by name, description, or tags..."}
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
              onClick={() => setSearch("")}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={semantic ? "default" : "outline"}
            className="cursor-pointer gap-1.5 select-none h-8 px-3"
            onClick={() => setSemantic(!semantic)}
          >
            {semantic ? <Brain className="size-3" /> : <Type className="size-3" />}
            {semantic ? "Semantic" : "Keyword"}
          </Badge>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="size-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="size-1.5 rounded-full bg-neon-blue" />
            )}
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 rounded-lg border border-border bg-card/50 p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v ?? "all")}
                disabled={categoriesLoading}
              >
                <SelectTrigger className="w-40" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!semantic && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Sort By</label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v ?? "popularity")}>
                  <SelectTrigger className="w-32" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popularity">Popular</SelectItem>
                    <SelectItem value="trust">Trust Score</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Verified</label>
              <div className="flex items-center gap-2 h-8">
                <Switch
                  checked={verifiedOnly}
                  onCheckedChange={setVerifiedOnly}
                  className="data-[state=checked]:bg-neon-blue"
                />
                <Shield className={`size-3.5 ${verifiedOnly ? "text-neon-blue" : "text-muted-foreground"}`} />
              </div>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-8 mt-4">
                Clear All
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? (
            "Searching..."
          ) : (
            <>
              <span className="font-medium text-foreground">{total}</span> capabilit{total !== 1 ? "ies" : "y"} found
            </>
          )}
          {semantic && debouncedSearch && (
            <Badge variant="outline" className="ml-2 text-xs gap-1">
              <Sparkles className="size-3" />
              semantic search
            </Badge>
          )}
        </p>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-10" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-14" />
                <Skeleton className="h-5 w-14" />
                <Skeleton className="h-5 w-14" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : skills.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {skills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      ) : (
        <div className="mt-16 text-center">
          <div className="mx-auto size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Search className="size-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No capabilities found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {debouncedSearch
              ? `No results for "${debouncedSearch}". Try adjusting your filters.`
              : "No capabilities match your current filters."}
          </p>
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
