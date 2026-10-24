import mongoose from 'mongoose';

/**
 * Resolves the MongoDB connection string for this instance.
 * Prefers MONGODB_URI; falls back to the legacy DB_PASSWORD-based cluster URI
 * so existing deployments keep working. Returns null when no database is configured.
 */
export function getMongoUri(): string | null {
    if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
    if (process.env.DB_PASSWORD) {
        return `mongodb+srv://hasan-dev:${process.env.DB_PASSWORD}@cluster0.xqrooob.mongodb.net/certify?retryWrites=true&w=majority&appName=Cluster0`;
    }
    return null;
}

export function isDbConfigured(): boolean {
    return getMongoUri() !== null;
}

interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

declare global {
    var mongoose: MongooseCache;
}

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    const uri = getMongoUri();
    if (!uri) {
        throw new Error('No database configured. Set MONGODB_URI to enable the certificate registry.');
    }

    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(uri, { bufferCommands: false });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default connectDB;
