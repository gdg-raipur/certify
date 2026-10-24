import type { Metadata } from "next";
import { CertificateWizard } from "@/components/certificates/CertificateWizard";

// Server actions invoked from this page (SMTP sends, certificate issuing) inherit this limit on Vercel.
export const maxDuration = 60;

export const metadata: Metadata = {
    title: "Certificates",
    description: "Bulk-generate personalized PDF certificates with verification QR codes, then download or email them.",
};

export default function CreateCertificatesPage() {
    return <CertificateWizard />;
}
