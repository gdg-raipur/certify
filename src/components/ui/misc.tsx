import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:opacity-50",
                checked ? "bg-accent" : "bg-border-strong"
            )}
        >
            <span
                className={cn(
                    "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
                    checked ? "translate-x-[22px]" : "translate-x-0.5"
                )}
            />
        </button>
    );
}

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const badgeTones: Record<Tone, string> = {
    neutral: "bg-muted text-muted-foreground",
    accent: "bg-accent-soft text-accent-text",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
};

export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
    return (
        <span
            className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", badgeTones[tone], className)}
            {...props}
        />
    );
}

const alertIcons = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    danger: AlertCircle,
};

const alertTones = {
    info: "bg-accent-soft text-accent-text",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
};

interface AlertProps {
    tone?: keyof typeof alertTones;
    title?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
}

export function Alert({ tone = "info", title, children, className }: AlertProps) {
    const Icon = alertIcons[tone];
    return (
        <div className={cn("flex gap-3 rounded-xl px-4 py-3 text-sm", alertTones[tone], className)}>
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="min-w-0 space-y-0.5">
                {title && <p className="font-medium">{title}</p>}
                {children && <div className="opacity-90 [&_a]:underline">{children}</div>}
            </div>
        </div>
    );
}

export function Progress({ value, className }: { value: number; className?: string }) {
    return (
        <div className={cn("h-2 w-full rounded-full bg-muted overflow-hidden", className)}>
            <div
                className="h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
            />
        </div>
    );
}

interface PageHeaderProps {
    icon?: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
}

export function PageHeader({ icon, title, description, action }: PageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between mb-8">
            <div className="flex items-start gap-4">
                {icon && (
                    <div className="w-12 h-12 shrink-0 rounded-xl bg-accent-soft text-accent-text flex items-center justify-center [&>svg]:w-6 [&>svg]:h-6">
                        {icon}
                    </div>
                )}
                <div>
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
                    {description && <p className="text-muted-foreground mt-1 max-w-2xl">{description}</p>}
                </div>
            </div>
            {action}
        </div>
    );
}

export function Kbd({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="inline-flex items-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground">
            {children}
        </kbd>
    );
}
