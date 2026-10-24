import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const controlBase =
    "w-full bg-surface text-foreground border border-border rounded-lg text-sm placeholder:text-muted-foreground/70 " +
    "transition-colors hover:border-border-strong focus:outline-none focus:border-accent focus:ring-4 focus:ring-ring " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
    { className, ...props },
    ref
) {
    return <input ref={ref} className={cn(controlBase, "h-10 px-3", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
    { className, ...props },
    ref
) {
    return <textarea ref={ref} className={cn(controlBase, "px-3 py-2.5 leading-relaxed resize-y", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
    { className, children, ...props },
    ref
) {
    return (
        <div className="relative">
            <select ref={ref} className={cn(controlBase, "h-10 pl-3 pr-9 appearance-none cursor-pointer", className)} {...props}>
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
    );
});

interface FieldProps {
    label: React.ReactNode;
    hint?: React.ReactNode;
    error?: React.ReactNode;
    className?: string;
    children: (id: string) => React.ReactNode;
}

/** Label + control + hint. Children receive the generated id to wire up the label. */
export function Field({ label, hint, error, className, children }: FieldProps) {
    const id = useId();
    return (
        <div className={cn("space-y-1.5", className)}>
            <label htmlFor={id} className="block text-sm font-medium text-foreground">
                {label}
            </label>
            {children(id)}
            {error ? (
                <p className="text-xs text-danger">{error}</p>
            ) : hint ? (
                <p className="text-xs text-muted-foreground">{hint}</p>
            ) : null}
        </div>
    );
}
