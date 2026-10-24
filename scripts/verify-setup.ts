// Quick sanity check for a self-hosted instance: npx tsx scripts/verify-setup.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
    const { getMongoUri } = await import("../src/lib/db");
    const secret = process.env.CERTIFY_SECRET;

    console.log(`Signed verification (CERTIFY_SECRET): ${secret && secret.length >= 16 ? "enabled" : "disabled"}`);
    console.log(`Certificate registry (MONGODB_URI):   ${getMongoUri() ? "configured" : "not configured"}`);
    console.log(`Admin dashboard (ADMIN_*):            ${process.env.ADMIN_ORG_ID && process.env.ADMIN_PASSWORD ? "enabled" : "disabled"}`);

    if (getMongoUri()) {
        const { default: connectDB } = await import("../src/lib/db");
        const conn = await connectDB();
        const count = await conn.connection.collection("certificates").countDocuments();
        console.log(`Connected to MongoDB. ${count} certificates in the registry.`);
        await conn.disconnect();
    }
}

main().catch((e) => {
    console.error("Setup check failed:", e.message);
    process.exit(1);
});
