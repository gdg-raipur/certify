"use server";

export async function login(orgId: string, pass: string) {
    // In a real app, Org ID might also be an env var or DB check.
    // The user's specific request "yes do so, and can we keep password as enviroment variable" implies preserving the logic but moving the secret.

    // Let's stick to the latest user edit for OrgID but use Env Var for password.

    const validOrgId = "GDGRAIPUR_Auth";
    const envPassword = process.env.ADMIN_PASSWORD;

    if (!envPassword) {
        console.error("ADMIN_PASSWORD is not set in environment variables.");
        return false;
    }

    if (orgId === validOrgId && pass === envPassword) {
        return true;
    }

    return false;
}
