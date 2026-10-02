import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import RevokedToken from "../models/RevokedToken.js";

export const tokenDigest = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Idempotent, including first-login sessions. Only the presented JWT is revoked.
export async function logout(req, res) {
  const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : "";
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (!Number.isFinite(decoded.exp)) return res.status(401).json({ message: "Session invalide." });
    req.user = { id: decoded.id };
  } catch {
    return res.status(401).json({ message: "Session invalide ou expiree." });
  }
  try {
    await RevokedToken.updateOne({ digest: tokenDigest(token) }, { $setOnInsert: { expiresAt: new Date(decoded.exp * 1000) } }, { upsert: true });
    return res.status(200).json({ success: true });
  } catch {
    return res.status(503).json({ success: false, message: "Deconnexion serveur indisponible. Reessayez." });
  }
}
