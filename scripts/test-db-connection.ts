
// import postgres from 'postgres';
// import dotenv from 'dotenv';
// import path from 'path';

// // Force load .env.local
// dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// const url = process.env.DATABASE_URL;

// if (!url) {
//     console.error("❌ DATABASE_URL is not defined in .env.local");
//     process.exit(1);
// }

// console.log(`Connecting to: ${url.replace(/:([^:@]+)@/, ':****@')}`); // Hide password in log

// const sql = postgres(url, { max: 1 });

// async function testConnection() {
//     try {
//         const result = await sql`SELECT 1+1 AS result`;
//         console.log("✅ Connection successful!");
//         console.log("Test query result:", result[0].result);
//         await sql.end();
//     } catch (error: any) {
//         console.error("❌ Connection failed:");
//         console.error(error.message);
//         if (error.code) console.error("Error Code:", error.code);
//         await sql.end();
//         process.exit(1);
//     }
// }

// testConnection();
