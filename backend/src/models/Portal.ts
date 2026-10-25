import { Schema, model } from "mongoose";

const schema = new Schema({
  portalCode: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 64 },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  environment: { type: String, enum: ["development", "staging", "production"], required: true },
  status: { type: String, enum: ["active", "suspended"], default: "active", required: true },
  keyHash: { type: String, required: true, select: false },
  keyPrefix: { type: String, required: true }
}, { timestamps: true, versionKey: false });

export const Portal = model("Portal", schema);
