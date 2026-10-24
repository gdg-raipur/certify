import type { Metadata } from "next";
import { MassEmailer } from "@/components/mass-email/MassEmailer";

// Server actions invoked from this page (SMTP sends, certificate issuing) inherit this limit on Vercel.
export const maxDuration = 60;

export const metadata: Metadata = {
    title: "Mass Email",
    description: "Send personalized emails to everyone in a CSV using your own SMTP account.",
};

export default function MassEmailPage() {
    return <MassEmailer />;
}
