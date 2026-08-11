import mongoose from "mongoose";

/**
 * Serverless (Vercel) จะสร้าง instance ใหม่บ่อยมาก ถ้าเปิด connection ใหม่ทุกครั้ง
 * MongoDB Atlas free tier (M0) จะชน connection limit เร็วมาก
 * จึง cache ทั้ง connection และ promise ไว้บน globalThis ให้ข้ามรอบ hot-reload/invocation ได้
 */

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as { _mongoose?: MongooseCache };

const cache: MongooseCache = globalForMongoose._mongoose ?? {
  conn: null,
  promise: null,
};
globalForMongoose._mongoose = cache;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("ยังไม่ได้ตั้งค่า MONGODB_URI (ดูวิธีตั้งค่าใน README)");
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || "billkp",
      // M0 มี connection จำกัด — จำกัด pool ฝั่งเราไว้ให้เล็ก
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // ถ้าต่อไม่ติด ต้องล้าง promise ทิ้ง ไม่งั้น request ถัดไปจะ await promise ที่ reject ค้างตลอด
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}
