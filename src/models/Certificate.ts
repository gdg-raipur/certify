import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICertificate extends Document {
    id: string; // Keeping the manually generated ID from the app logic
    name: string;
    verifyLink: string;
    issuedAt: string;
    templateId?: string;
    recipientEmail?: string;
    issuer: string;
    createdAt: Date;
}

// Prevent overwriting model if already compiled
export const CertificateSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    verifyLink: { type: String, required: true },
    issuedAt: { type: String, required: true },
    templateId: { type: String },
    recipientEmail: { type: String },
    issuer: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const Certificate: Model<ICertificate> = mongoose.models.Certificate || mongoose.model<ICertificate>('Certificate', CertificateSchema);

export default Certificate;
