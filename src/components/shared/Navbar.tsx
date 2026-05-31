"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Code2, Menu, Plus, X, LayoutDashboard, Key, LogOut, BookOpen } from "lucide-react";
import { useState } from "react";
import { useUser, useClerk, SignInButton, SignUpButton } from "@clerk/nextjs";

const navLinks = [
  { href: "/skills", label: "Registry" },
  { href: "/workflows", label: "Workflows" },
  { href: "/docs", label: "Docs" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isSignedIn, isLoaded } = useUser();
  const { signOut } = useClerk();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <Code2 className="size-5 text-neon-blue" />
          <span className="text-gradient">AMTP</span>
          <span className="text-muted-foreground hidden sm:inline">SkillHub</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isLoaded && isSignedIn ? (
            <>
              <Link href="/skills/create">
                <Button size="sm" className="hidden sm:flex gap-1.5 bg-neon-blue hover:bg-neon-blue/90 text-white">
                  <Plus className="size-3.5" />
                  Publish
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger className="relative size-8 rounded-full outline-none focus:ring-2 focus:ring-neon-blue/50">
                  <Avatar className="size-8">
                    <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
                    <AvatarFallback className="bg-neon-blue/20 text-neon-blue text-xs">
                      {user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.fullName || "User"}</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.emailAddresses?.[0]?.emailAddress}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.location.href = "/dashboard"} className="gap-2 cursor-pointer">
                    <LayoutDashboard className="size-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = "/dashboard/skills"} className="gap-2 cursor-pointer">
                    <Code2 className="size-4" />
                    My Skills
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = "/dashboard/api-keys"} className="gap-2 cursor-pointer">
                    <Key className="size-4" />
                    API Keys
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = "/skills/create"} className="gap-2 cursor-pointer sm:hidden">
                    <Plus className="size-4" />
                    Publish Skill
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="gap-2 cursor-pointer text-destructive"
                    variant="destructive"
                  >
                    <LogOut className="size-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : isLoaded ? (
            <>
              <Link href="/sign-in">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm" className="bg-neon-blue hover:bg-neon-blue/90 text-white">
                  Get Started
                </Button>
              </Link>
            </>
          ) : null}

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/50 md:hidden">
          <div className="flex flex-col gap-1 p-4">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                  {link.label}
                </Button>
              </Link>
            ))}
            {isSignedIn && (
              <>
                <Link href="/skills/create" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-neon-blue">
                    <Plus className="size-3.5 mr-2" />
                    Publish Skill
                  </Button>
                </Link>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                    <LayoutDashboard className="size-3.5 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
