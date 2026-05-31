import Link from "next/link";
import { Code2 } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Registry", href: "/skills" },
    { label: "Workflows", href: "/workflows" },
    { label: "Import", href: "/import" },
    { label: "Publish", href: "/skills/create" },
  ],
  Protocol: [
    { label: "Documentation", href: "#" },
    { label: "AMTP Spec", href: "#" },
    { label: "npm Package", href: "#" },
    { label: "Reference Impl.", href: "#" },
  ],
  Developers: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "API Keys", href: "/dashboard/api-keys" },
    { label: "SDK", href: "#" },
    { label: "Examples", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 font-semibold text-base mb-3">
              <Code2 className="size-4 text-neon-blue" />
              <span className="text-gradient">AMTP</span>
              <span className="text-muted-foreground">SkillHub</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Capability Layer for AI Agents. Discover, publish, execute and compose skills using the AMTP protocol.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {category}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} AMTP Protocol. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Built with Next.js + AMTP</span>
            <span className="size-1 rounded-full bg-border" />
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
