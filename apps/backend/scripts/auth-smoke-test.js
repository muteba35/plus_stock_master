import "dotenv/config";
import crypto from "crypto";
import mongoose from "mongoose";
import { Boutique, Subscription, Utilisateur } from "../src/models/Utilisateur.js";

const apiUrl = process.env.AUTH_TEST_API_URL || "http://localhost:10002/api";
const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const email = `auth-smoke-${suffix}@example.test`;
const telephone = suffix.slice(-9).padStart(9, "7");
const password = "Test#1234";
const newPassword = "Updated#1234";
let userId;

const request = async (path, options = {}) => {
  const response = await fetch(`${apiUrl}${path}`, {
    redirect: "manual",
    ...options,
    headers: { "content-type": "application/json", ...options.headers },
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { response, data };
};

const expectStatus = (label, actual, expected) => {
  if (!expected.includes(actual)) throw new Error(`${label}: statut ${actual}, attendu ${expected.join("/")}`);
  console.log(`PASS ${label} (${actual})`);
};

const payload = {
  prenom: "Auth",
  nom: "Smoke",
  email,
  telephone,
  nomBoutique: `Boutique smoke ${suffix}`,
  secteurActivite: "Commerce Général",
  deviseParDefaut: "USD ($)",
  tailleBusiness: "1-2 employés",
  password,
  confirmPassword: password,
  acceptTerms: true,
};

try {
  await mongoose.connect(process.env.MONGO_URI);

  let result = await request("/auth/register", { method: "POST", body: JSON.stringify(payload) });
  expectStatus("inscription", result.response.status, [201]);

  let user = await Utilisateur.findOne({ email }).select("+activationToken +activationTokenExpires");
  if (!user?.activationToken || !user.boutiqueActive) throw new Error("inscription: utilisateur ou boutique active absent");
  userId = user._id;

  const firstBoutiqueId = user.boutiqueActive;
  await Boutique.deleteOne({ _id: firstBoutiqueId });
  user.boutiqueActive = undefined;
  await user.save();

  result = await request("/auth/register", { method: "POST", body: JSON.stringify(payload) });
  expectStatus("reprise inscription incomplète", result.response.status, [200]);
  if (!result.data?.resumed) throw new Error("reprise inscription: indicateur resumed absent");

  user = await Utilisateur.findOne({ email }).select("+activationToken +activationTokenExpires");
  result = await request(`/auth/verify-email/${user.activationToken}`);
  expectStatus("activation email", result.response.status, [302]);

  result = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: email.toUpperCase(), password }),
  });
  expectStatus("connexion mot de passe", result.response.status, [200, 503]);
  if (result.response.status === 503) {
    await Utilisateur.updateOne({ email }, { otpCode: "654321", otpExpires: new Date(Date.now() + 60_000) });
  } else if (!result.data?.requiresOTP) {
    throw new Error("connexion: OTP non demandé pour le propriétaire");
  }

  user = await Utilisateur.findOne({ email }).select("+otpCode +otpExpires");
  result = await request("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email: ` ${email.toUpperCase()} `, otp: user.otpCode }),
  });
  expectStatus("validation OTP", result.response.status, [200]);
  if (!result.data?.token) throw new Error("validation OTP: jeton JWT absent");

  const session = await request("/auth/me", {
    headers: { authorization: `Bearer ${result.data.token}` },
  });
  expectStatus("session protégée", session.response.status, [200]);

  const resetToken = crypto.randomBytes(32).toString("hex");
  await Utilisateur.updateOne({ email }, {
    resetPasswordToken: crypto.createHash("sha256").update(resetToken).digest("hex"),
    resetPasswordExpires: new Date(Date.now() + 60_000),
  });
  result = await request(`/auth/reset-password/${resetToken}`, {
    method: "POST",
    body: JSON.stringify({ password: newPassword, confirmPassword: newPassword }),
  });
  expectStatus("réinitialisation mot de passe", result.response.status, [200]);

  result = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: newPassword }),
  });
  expectStatus("connexion avec nouveau mot de passe", result.response.status, [200, 503]);
} finally {
  if (mongoose.connection.readyState === 1) {
    const user = userId ? await Utilisateur.findById(userId) : await Utilisateur.findOne({ email });
    if (user) {
      const boutiques = await Boutique.find({ userId: user._id }).select("_id").lean();
      const boutiqueIds = boutiques.map((boutique) => boutique._id);
      if (boutiqueIds.length) await Subscription.deleteMany({ boutiqueId: { $in: boutiqueIds } });
      await Boutique.deleteMany({ userId: user._id });
      await Utilisateur.deleteOne({ _id: user._id });
    }
    await mongoose.disconnect();
  }
}
