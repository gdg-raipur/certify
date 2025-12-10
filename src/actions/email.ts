"use server";

import nodemailer from "nodemailer";

export interface SMTPConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    from?: string;
}

export async function sendCertificateEmail(
    recipientEmail: string,
    recipientName: string,
    subject: string,
    body: string,
    pdfBase64: string,
    filename: string,
    smtpConfig?: SMTPConfig
) {
    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
        return { success: false, error: "SMTP configuration is missing. Please provide your SMTP details." };
    }

    const port = Number(smtpConfig.port) || 587;
    const isSecure = port === 465;

    const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: port,
        secure: isSecure,
        auth: {
            user: smtpConfig.user,
            pass: smtpConfig.pass,
        },
    });

    try {
        const info = await transporter.sendMail({
            from: smtpConfig.from || `"Certify App" <${smtpConfig.user}>`,
            to: recipientEmail,
            subject: subject,
            text: body,
            attachments: [
                {
                    filename: filename,
                    content: pdfBase64,
                    encoding: "base64",
                },
            ],
        });

        console.log("Message sent to %s: %s", recipientEmail, info.messageId);
        return { success: true };
    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error: (error as Error).message };
    }
}
