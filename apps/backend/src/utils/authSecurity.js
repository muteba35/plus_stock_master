import crypto from "node:crypto";

export const hashChallenge = value => crypto.createHash("sha256").update(value).digest("hex");

export const createLoginChallenge = user => {
  const challenge = crypto.randomBytes(32).toString("hex");
  user.loginChallengeHash = hashChallenge(challenge);
  user.loginChallengeExpires = new Date(Date.now() + 10 * 60 * 1000);
  return challenge;
};

export const validLoginChallenge = (user, challenge) => {
  if (typeof challenge !== "string" || !/^[a-f0-9]{64}$/.test(challenge)) return false;
  if (!user.loginChallengeHash || !user.loginChallengeExpires || +user.loginChallengeExpires <= Date.now()) return false;
  return crypto.timingSafeEqual(Buffer.from(hashChallenge(challenge)), Buffer.from(user.loginChallengeHash));
};

export const sessionIsCurrent = (decoded, user) =>
  (decoded.sessionVersion || null) === (user.sessionVersion || null);

export function invalidatePasswordSessions() {
  if (this.isNew || !this.isModified("password")) return;
  this.sessionVersion = crypto.randomUUID();
  this.otpCode = undefined;
  this.otpExpires = undefined;
  this.loginChallengeHash = undefined;
  this.loginChallengeExpires = undefined;
}
