import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("bg-surface border border-border rounded-2xl shadow-sm", className)} {...props} />;
}

interface CardHeaderProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}

export function CardHeader({ title, description, icon, action, className }: CardHeaderProps) {
    return (
        <div className={cn("flex items-start gap-3 px-5 pt-5", className)}>
            {icon && (
                <div className="w-9 h-9 shrink-0 rounded-lg bg-accent-soft text-accent-text flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px]">
                    {icon}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground leading-tight">{title}</h3>
                {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("p-5", className)} {...props} />;
}
