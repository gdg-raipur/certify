"use server";

import nodemailer from "nodemailer";

export async function sendCertificateEmail(
    recipientEmail: string,
    recipientName: string,
    subject: string,
    body: string,
    pdfBase64: string,
    filename: string
) {
    // Validate required environment variables
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error("Missing SMTP configuration");
        return { success: false, error: "Server SMTP configuration is missing." };
    }

    const port = Number(process.env.SMTP_PORT) || 587;
    const isSecure = port === 465;

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: port,
        secure: isSecure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Certify App" <no-reply@example.com>',
            to: recipientEmail,
            subject: subject,
            text: body, // plaintext body
            // html: body, // could add html support later
            attachments: [
                {
                    filename: filename,
                    content: pdfBase64,
                    encoding: "base64",
                },
            ],
        });

        console.log("Message sent: %s", info.messageId);
        return { success: true };
    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error: (error as Error).message };
    }
}
