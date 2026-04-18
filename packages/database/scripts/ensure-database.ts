/**
 * Ensures the MongoDB database named `helloadd` exists (same name as DEFAULT_LOCAL_MONGODB_URI).
 * MongoDB creates a database when the first collection is written; this creates a small metadata collection once.
 *
 * Usage (from monorepo root, with MONGODB_URI in .env or env):
 *   npm run db:ensure
 *
 * Your URI must use the helloadd database path, e.g.:
 *   mongodb://user:pass@host:27017/helloadd?authSource=admin
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectMongo, DEFAULT_LOCAL_MONGODB_URI } from "../src/connect";

const EXPECTED_DB_NAME = "helloadd";
const META_COLLECTION = "helloadd_meta";

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI?.trim() || DEFAULT_LOCAL_MONGODB_URI;
  if (!uri.includes(`/${EXPECTED_DB_NAME}`) && !uri.includes(`/${EXPECTED_DB_NAME}?`)) {
    console.warn(
      `[db:ensure] MONGODB_URI should include /${EXPECTED_DB_NAME} before ? (e.g. ...27017/${EXPECTED_DB_NAME}?authSource=admin).`,
    );
    console.warn(`[db:ensure] Current URI database path may differ — continuing after connect.`);
  }

  await connectMongo();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("No database handle after connect.");
  }

  const name = db.databaseName;
  if (name !== EXPECTED_DB_NAME) {
    console.warn(`[db:ensure] Connected to database "${name}" (expected "${EXPECTED_DB_NAME}"). Fix MONGODB_URI if this is wrong.`);
  }

  const cols = await db.listCollections({ name: META_COLLECTION }).toArray();
  if (cols.length === 0) {
    await db.createCollection(META_COLLECTION);
    await db.collection(META_COLLECTION).insertOne({
      note: "Hello Add database initialized",
      createdAt: new Date(),
    });
    console.log(`[db:ensure] Created database "${name}" and collection "${META_COLLECTION}".`);
  } else {
    console.log(`[db:ensure] Database "${name}" already exists (collection "${META_COLLECTION}" present).`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
