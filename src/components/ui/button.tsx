import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
    primary: "bg-accent text-accent-foreground hover:bg-accent-hover shadow-sm",
    secondary: "bg-surface text-foreground border border-border hover:bg-muted shadow-sm",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-muted",
    danger: "bg-danger-soft text-danger hover:brightness-95",
};

const sizes: Record<Size, string> = {
    sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
    md: "h-10 px-4 text-sm gap-2 rounded-lg",
    lg: "h-12 px-6 text-base gap-2 rounded-xl",
};

export function buttonClasses({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
    return cn(
        "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors select-none",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring",
        "disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
    );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant, size, loading, className, children, disabled, type = "button", ...props },
    ref
) {
    return (
        <button
            ref={ref}
            type={type}
            disabled={disabled || loading}
            className={buttonClasses({ variant, size, className })}
            {...props}
        >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {children}
        </button>
    );
});
