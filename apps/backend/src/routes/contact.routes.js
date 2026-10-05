import express from "express";
import rateLimit from "express-rate-limit";
import { sendEmail } from "../utils/sendEmail.js";

const escapeHtml = value => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
export const createContactHandler = (deliver = sendEmail) => async (req, res) => {
  const body = req.body || {};
  if (typeof body.website === "string" && body.website) return res.status(200).json({ success: true });
  const fields = ["name", "email", "subject", "message"];
  if (fields.some(key => typeof body[key] !== "string")) return res.status(400).json({ success: false, code: "INVALID_CONTACT" });
  const [name, email, subject, message] = fields.map(key => body[key].trim());
  if (name.length < 2 || name.length > 100 || subject.length < 3 || subject.length > 120 || message.length < 10 || message.length > 4000 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[\r\n]/.test(name + email + subject) || body.consent !== true) {
    return res.status(400).json({ success: false, code: "INVALID_CONTACT" });
  }
  try {
    await deliver({
      email: "juniormuteba10@gmail.com",
      replyTo: email,
      subject: `Contact Movoora : ${subject}`,
      html: `<div style="font-family:Arial,sans-serif;color:#172033;max-width:600px;margin:auto"><h1 style="font-size:22px">Nouveau message de contact</h1><p><strong>Nom :</strong> ${escapeHtml(name)}</p><p><strong>Email :</strong> ${escapeHtml(email)}</p><h2 style="font-size:18px">${escapeHtml(subject)}</h2><p style="white-space:pre-wrap;line-height:1.7">${escapeHtml(message)}</p></div>`,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    const code = error.code === "EMAIL_TEST_RECIPIENT_RESTRICTED" ? error.code : "CONTACT_UNAVAILABLE";
    console.error("Contact delivery failed", { code, status: error.providerStatus || null });
    return res.status(503).json({ success: false, code });
  }
};
const router = express.Router();
router.post("/", rateLimit({ windowMs: 15 * 60 * 1000, limit: 3, standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, code: "RATE_LIMIT" } }), createContactHandler());
export default router;
