import type { Metadata } from "next";
import { Suspense } from "react";
import { Verifier } from "@/components/Verifier";

export const metadata: Metadata = {
    title: "Verify a certificate",
    description: "Check that a certificate issued with Certify is authentic.",
};

export default function VerifyPage() {
    return (
        <Suspense fallback={null}>
            <Verifier />
        </Suspense>
    );
}
