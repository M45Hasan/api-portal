import { Schema, model } from "mongoose";

const schema = new Schema({
  code: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9][a-z0-9_-]{0,63}$/ },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: "", maxlength: 500 },
  enabled: { type: Boolean, default: true, required: true },
  mode: { type: String, enum: ["mock", "hha"], default: "mock", required: true },
  risk: { type: String, enum: ["low", "medium", "high"], default: "medium", required: true }
}, { timestamps: true, versionKey: false });

export const ApiDefinition = model("ApiDefinition", schema);
