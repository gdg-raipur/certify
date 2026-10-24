"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, Github } from "lucide-react";
import { SITE, TOOLS } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
    return (
        <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight text-foreground", className)}>
            <span className="w-7 h-7 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shadow-sm">
                <BadgeCheck className="w-4 h-4" />
            </span>
            {SITE.name}
        </span>
    );
}

export function SiteHeader() {
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <div className="h-14 flex items-center gap-6">
                    <Link href="/" aria-label={`${SITE.name} home`}>
                        <Logo />
                    </Link>
                    <nav className="hidden md:flex items-center gap-1 flex-1">
                        {TOOLS.map((tool) => (
                            <NavLink key={tool.href} href={tool.href} active={pathname.startsWith(tool.href)}>
                                {tool.name}
                            </NavLink>
                        ))}
                    </nav>
                    <a
                        href={SITE.repo}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-border bg-surface text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                        <Github className="w-4 h-4" />
                        <span className="hidden sm:inline">Star on GitHub</span>
                    </a>
                </div>
                {/* Compact nav for small screens */}
                <nav className="md:hidden flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
                    {TOOLS.map((tool) => (
                        <NavLink key={tool.href} href={tool.href} active={pathname.startsWith(tool.href)}>
                            {tool.name}
                        </NavLink>
                    ))}
                </nav>
            </div>
        </header>
    );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className={cn(
                "px-3 h-8 inline-flex items-center rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
        >
            {children}
        </Link>
    );
}
