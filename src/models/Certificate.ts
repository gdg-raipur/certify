import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICertificate extends Document {
    id: string; // Keeping the manually generated ID from the app logic
    name: string;
    verifyLink: string;
    issuedAt: string;
    event?: string;
    templateId?: string;
    recipientEmail?: string; // Only present on legacy records; new records don't store emails
    issuer: string;
    createdAt: Date;
}

export const CertificateSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    verifyLink: { type: String, required: true },
    issuedAt: { type: String, required: true },
    event: { type: String },
    templateId: { type: String },
    recipientEmail: { type: String },
    issuer: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

// Prevent overwriting model if already compiled
const Certificate: Model<ICertificate> = mongoose.models.Certificate || mongoose.model<ICertificate>('Certificate', CertificateSchema);

export default Certificate;
