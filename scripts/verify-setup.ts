
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function verify() {
    const { getAllCertificates } = await import("../src/actions/certificates");

    console.log("Fetching certificates from DB...");
    const certs = await getAllCertificates();

    console.log(`Found ${certs.length} certificates.`);
    if (certs.length > 0) {
        console.log("First certificate:", certs[0]);
    } else {
        console.log("No certificates found.");
    }
}

verify();
