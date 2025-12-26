// POSTGRES DATABASE SCHEMA GENERATION


// import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// export const certificates = pgTable("certificates", {
//     id: text("id").primaryKey(), // We use the existing ID format (likely UUID or similar string)
//     name: text("name").notNull(),
//     verifyLink: text("verify_link").notNull(),
//     issuedAt: text("issued_at").notNull(), // Keeping as string to match existing JSON format, or can switch to timestamp
//     templateId: text("template_id"),
//     recipientEmail: text("recipient_email"),
//     issuer: text("issuer").notNull(),
//     createdAt: timestamp("created_at").defaultNow(),
// });
