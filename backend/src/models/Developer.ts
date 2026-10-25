import { Schema, model } from "mongoose";

const schema = new Schema({
  companyDeveloperId: { type: String, required: true, unique: true, trim: true, minlength: 1, maxlength: 128 },
  displayName: { type: String, trim: true, maxlength: 120, default: "" },
  status: { type: String, enum: ["active", "suspended"], default: "active", required: true },
  keyHash: { type: String, required: true, select: false },
  keyPrefix: { type: String, required: true }
}, { timestamps: true, versionKey: false });

export const Developer = model("Developer", schema);
