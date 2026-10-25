import mongoose from "mongoose";
import { env } from "../config/env";

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log("MongoDB connected");
}
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
