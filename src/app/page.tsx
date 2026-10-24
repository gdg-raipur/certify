import Link from "next/link";
import { ArrowRight, FileSpreadsheet, KeyRound, Lock, Send, Server, Sparkles } from "lucide-react";
import { buttonClasses } from "@/components/ui";
import { SITE, TOOLS } from "@/lib/site";
import { cn } from "@/lib/utils";

const STEPS = [
    {
        icon: KeyRound,
        title: "Bring your keys",
        body: "Paste the SMTP details of the inbox you already use: Gmail, Outlook, Zoho or any provider. No account to create.",
    },
    {
        icon: FileSpreadsheet,
        title: "Upload a CSV",
        body: "Export your attendee list from any registration tool. Every column becomes a {{placeholder}} you can use.",
    },
    {
        icon: Send,
        title: "Send it",
        body: "Preview every message, send a test to yourself, then send the whole batch with live progress and retries.",
    },
];

const PRINCIPLES = [
    {
        icon: Lock,
        title: "Your credentials aren't stored",
        body: "SMTP passwords are used only to send your messages and are never saved on our servers. Choose whether your browser remembers them.",
    },
    {
        icon: Sparkles,
        title: "Generated in your browser",
        body: "CSV files are parsed and certificate PDFs are rendered on your own device. Your attendee list is never uploaded in bulk.",
    },
    {
        icon: Server,
        title: "Self-host in minutes",
        body: "One Next.js app, one optional secret. Deploy it to Vercel or run it with Docker for your community or company.",
    },
];

export default function Home() {
    return (
        <main>
            {/* Hero */}
            <section className="relative overflow-hidden border-b border-border">
                <div className="absolute inset-0 bg-dots opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
                <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-24 text-center">
                    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                        Free &middot; Open source &middot; No login
                    </span>
                    <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight text-foreground text-balance max-w-3xl mx-auto">
                        Everything your event needs to reach attendees
                    </h1>
                    <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
                        Bulk-generate verifiable certificates, send personalized mass emails and make QR codes, all from one CSV.
                        Bring your own keys and get going.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/create-certificates" className={buttonClasses({ size: "lg" })}>
                            Create certificates
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link href="/mass-email" className={buttonClasses({ size: "lg", variant: "secondary" })}>
                            Send a mass email
                        </Link>
                    </div>
                </div>
            </section>

            {/* Tools */}
            <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
                <div className="grid gap-4 sm:grid-cols-2">
                    {TOOLS.map((tool) => (
                        <Link
                            key={tool.href}
                            href={tool.href}
                            className={cn(
                                "group relative bg-surface border border-border rounded-2xl p-6 shadow-sm transition-all",
                                "hover:border-border-strong hover:shadow-md hover:-translate-y-0.5"
                            )}
                        >
                            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", tool.tint)}>
                                <tool.icon className="w-5 h-5" />
                            </div>
                            <h2 className="mt-5 text-lg font-semibold text-foreground flex items-center gap-2">
                                {tool.name}
                                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                            </h2>
                            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{tool.description}</p>
                        </Link>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section className="border-y border-border bg-surface">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
                    <div className="max-w-2xl">
                        <p className="text-sm font-medium text-accent-text">How it works</p>
                        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Three steps from spreadsheet to inbox</h2>
                    </div>
                    <ol className="mt-10 grid gap-8 sm:grid-cols-3">
                        {STEPS.map((step, i) => (
                            <li key={step.title} className="relative">
                                <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-accent-soft text-accent-text text-sm font-semibold flex items-center justify-center">
                                        {i + 1}
                                    </span>
                                    <step.icon className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <h3 className="mt-4 font-semibold text-foreground">{step.title}</h3>
                                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* Principles + self host */}
            <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20 grid gap-10 lg:grid-cols-[1fr_1.1fr] items-start">
                <div className="space-y-6">
                    {PRINCIPLES.map((p) => (
                        <div key={p.title} className="flex gap-4">
                            <div className="w-10 h-10 shrink-0 rounded-xl bg-muted text-foreground flex items-center justify-center">
                                <p.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">{p.title}</h3>
                                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{p.body}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div id="self-hosting" className="rounded-2xl border border-border bg-zinc-950 text-zinc-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-1.5 px-4 h-10 border-b border-white/10">
                        <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                        <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                        <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                        <span className="ml-3 text-xs text-zinc-400 font-mono">self-host</span>
                    </div>
                    <pre className="p-5 text-[13px] leading-relaxed font-mono overflow-x-auto">
                        <code>
                            <span className="text-zinc-500"># clone and run locally</span>
                            {"\n"}git clone {SITE.repo}.git
                            {"\n"}cd certify && npm install
                            {"\n\n"}
                            <span className="text-zinc-500"># optional: enable certificate verification</span>
                            {"\n"}echo &quot;CERTIFY_SECRET=$(openssl rand -hex 32)&quot; &gt; .env.local
                            {"\n\n"}npm run dev
                        </code>
                    </pre>
                    <div className="px-5 pb-5">
                        <a href={SITE.repo} target="_blank" rel="noreferrer" className="text-sm text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1.5">
                            Read the setup guide <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                    </div>
                </div>
            </section>
        </main>
    );
}
