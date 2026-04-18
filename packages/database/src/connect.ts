import mongoose from "mongoose";

type MongooseGlobal = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __helloaddMongoose: MongooseGlobal | undefined;
}

const g = globalThis as unknown as { __helloaddMongoose?: MongooseGlobal };

function getCache(): MongooseGlobal {
  if (!g.__helloaddMongoose) {
    g.__helloaddMongoose = { conn: null, promise: null };
  }
  return g.__helloaddMongoose;
}

/** Used when `MONGODB_URI` is unset — local MongoDB Community / Docker on default port. */
export const DEFAULT_LOCAL_MONGODB_URI = "mongodb://127.0.0.1:27017/helloadd";

/**
 * Cached connection for Next.js hot reload and serverless-style reuse.
 */
export async function connectMongo(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI?.trim() || DEFAULT_LOCAL_MONGODB_URI;

  const cached = getCache();
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
