import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui";
import type { Delivery } from "@/lib/useSendQueue";

export function DeliveryBadge({ delivery, idleLabel = "Not sent" }: { delivery?: Delivery; idleLabel?: string }) {
    if (!delivery) return <Badge>{idleLabel}</Badge>;
    switch (delivery.state) {
        case "queued":
            return <Badge>Queued</Badge>;
        case "sending":
            return (
                <Badge tone="accent">
                    <Loader2 className="w-3 h-3 animate-spin" /> Sending
                </Badge>
            );
        case "sent":
            return <Badge tone="success">Sent</Badge>;
        case "unknown":
            return (
                <Badge tone="warning" title={delivery.error}>
                    Unconfirmed
                </Badge>
            );
        case "failed":
            return (
                <span className="inline-flex flex-col items-end gap-0.5">
                    <Badge tone="danger">Failed</Badge>
                    {delivery.error && <span className="text-xs text-danger max-w-[260px] text-right">{delivery.error}</span>}
                </span>
            );
    }
}
