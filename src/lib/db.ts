import mongoose from 'mongoose';

const DB_PASSWORD = process.env.DB_PASSWORD;
if (!DB_PASSWORD) {
    throw new Error('Please define the DB_PASSWORD environment variable inside .env');
}

const MONGODB_URI = `mongodb+srv://hasan-dev:${DB_PASSWORD}@cluster0.xqrooob.mongodb.net/certify?retryWrites=true&w=majority&appName=Cluster0`;

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
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            return mongoose;
        });
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
