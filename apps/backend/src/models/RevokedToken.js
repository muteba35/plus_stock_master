import mongoose from "mongoose";

const schema = new mongoose.Schema({
  digest: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});

export default mongoose.models.RevokedToken || mongoose.model("RevokedToken", schema);
