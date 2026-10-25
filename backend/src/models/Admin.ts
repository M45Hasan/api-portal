import { Schema, model } from "mongoose";

const schema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["admin", "security-admin", "read-only"], default: "admin", required: true },
  status: { type: String, enum: ["active", "suspended"], default: "active", required: true }
}, { timestamps: true, versionKey: false });

export const Admin = model("Admin", schema);
