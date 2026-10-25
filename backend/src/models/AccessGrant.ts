import { Schema, model } from "mongoose";

const schema = new Schema({
  principalType: { type: String, enum: ["developer", "portal"], required: true },
  principalId: { type: Schema.Types.ObjectId, required: true, index: true },
  apiCode: { type: String, required: true, lowercase: true, trim: true },
  environment: { type: String, enum: ["development", "staging", "production"], required: true },
  status: { type: String, enum: ["active", "revoked"], default: "active", required: true },
  approvedBy: { type: String, required: true },
  approvedAt: { type: Date, required: true, default: Date.now },
  expiresAt: { type: Date, default: null },
  reason: { type: String, default: "", maxlength: 500 }
}, { timestamps: true, versionKey: false });

schema.index({ principalType: 1, principalId: 1, apiCode: 1, environment: 1 }, { unique: true });
export const AccessGrant = model("AccessGrant", schema);
