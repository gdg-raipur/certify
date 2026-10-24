import Link from "next/link";
import { SITE, TOOLS } from "@/lib/site";
import { Logo } from "./SiteHeader";

export function SiteFooter() {
    return (
        <footer className="border-t border-border mt-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-[1fr_auto_auto]">
                <div className="space-y-3 max-w-sm">
                    <Logo />
                    <p className="text-sm text-muted-foreground">
                        {SITE.tagline}. Free and open source under the MIT license.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Built by{" "}
                        <a href="https://gdg.community.dev/gdg-raipur/" target="_blank" rel="noreferrer" className="text-foreground hover:underline">
                            GDG Raipur
                        </a>{" "}
                        &middot; made with ❤️ by{" "}
                        <a href="https://linkedin.com/in/introvertcoder" target="_blank" rel="noreferrer" className="text-foreground hover:underline">
                            Hasan
                        </a>
                    </p>
                </div>
                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tools</p>
                    <ul className="space-y-2 text-sm">
                        {TOOLS.map((tool) => (
                            <li key={tool.href}>
                                <Link href={tool.href} className="text-foreground/80 hover:text-foreground">
                                    {tool.short}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project</p>
                    <ul className="space-y-2 text-sm">
                        <li>
                            <a href={SITE.repo} target="_blank" rel="noreferrer" className="text-foreground/80 hover:text-foreground">
                                Source code
                            </a>
                        </li>
                        <li>
                            <a href={`${SITE.repo}#self-hosting`} target="_blank" rel="noreferrer" className="text-foreground/80 hover:text-foreground">
                                Self-host
                            </a>
                        </li>
                        <li>
                            <a href={`${SITE.repo}/issues`} target="_blank" rel="noreferrer" className="text-foreground/80 hover:text-foreground">
                                Report an issue
                            </a>
                        </li>
                        <li>
                            <Link href="/dashboard" className="text-foreground/80 hover:text-foreground">
                                Instance admin
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
        </footer>
    );
}
