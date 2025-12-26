
import { saveCertificates, getCertificate, getAllCertificates } from '@/actions/certificates';
import fs from 'fs/promises';
import path from 'path';

// Mock DB/Storage path for test might be tricky if it uses process.cwd()
// But running from root should work.

async function testStorage() {
    console.log("Starting storage test...");

    // Clear data.json for fresh start
    await fs.writeFile('data.json', '[]');
    console.log("Cleared data.json");

    // Test Save
    const testCert = {
        id: "test-id-1",
        name: "Test User",
        verifyLink: "http://example.com/verify/1",
        issuedAt: new Date().toISOString(),
        issuer: "Test Issuer",
        recipientEmail: "test@example.com",
        templateId: "temp-1"
    };

    console.log("Saving certificate...");
    const saveResult = await saveCertificates([testCert]);
    console.log("Save result:", saveResult);

    if (!saveResult.success || saveResult.count !== 1) {
        console.error("Save failed!");
        process.exit(1);
    }

    // Test Get
    console.log("Getting certificate...");
    const fetchedCert = await getCertificate("test-id-1");
    console.log("Fetched certificate:", fetchedCert);

    if (!fetchedCert || fetchedCert.name !== "Test User") {
        console.error("Get failed! Certificate mismatch.");
        process.exit(1);
    }

    // Test GetAll
    console.log("Getting all certificates...");
    const allCerts = await getAllCertificates();
    console.log("All certificates:", allCerts);

    if (allCerts.length !== 1) {
        console.error("GetAll failed! Count mismatch.");
        process.exit(1);
    }

    console.log("Storage test passed successfully!");
}

testStorage().catch(err => {
    console.error("Test failed with error:", err);
    process.exit(1);
});
