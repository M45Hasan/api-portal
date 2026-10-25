import { Schema, model } from "mongoose";

const schema = new Schema({
  actorType: { type: String, required: true, maxlength: 32 },
  actorId: { type: String, default: "", maxlength: 128 },
  action: { type: String, required: true, maxlength: 100 },
  targetType: { type: String, default: "", maxlength: 64 },
  targetId: { type: String, default: "", maxlength: 128 },
  apiCode: { type: String, default: "", maxlength: 64 },
  environment: { type: String, default: "", maxlength: 32 },
  outcome: { type: String, enum: ["success", "denied", "failure"], required: true },
  requestId: { type: String, default: "", maxlength: 128 },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true, versionKey: false });

schema.index({ createdAt: -1 });
schema.index({ actorId: 1, createdAt: -1 });
export const AuditEvent = model("AuditEvent", schema);
