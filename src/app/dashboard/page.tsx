import type { Metadata } from "next";
import { AdminDashboard } from "@/components/AdminDashboard";

export const metadata: Metadata = {
    title: "Instance admin",
    robots: { index: false },
};

export default function DashboardPage() {
    return <AdminDashboard />;
}
