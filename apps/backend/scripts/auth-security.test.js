import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { Utilisateur, Permission, RolePermission } from "../src/models/Utilisateur.js";
import { createLoginChallenge, invalidatePasswordSessions, sessionIsCurrent } from "../src/utils/authSecurity.js";

process.env.JWT_SECRET = "isolated-auth-regression-test-secret";
process.env.EMAIL_USER = "test@example.invalid";
process.env.EMAIL_PASS = "not-a-real-password";
delete process.env.RESEND_API_KEY;

const { login, resendOTP, verifyOTP, resetPassword, updatePassword } = await import("../src/controllers/auth.controller.js");
const { protect } = await import("../src/middlewares/authMiddleware.js");
const { sendEmail } = await import("../src/utils/sendEmail.js");

const response = () => ({
  statusCode: 200,
  status(value) { this.statusCode = value; return this; },
  json(value) { this.body = value; return this; },
});
const query = user => ({
  select() { return this; },
  populate() { return Promise.resolve(user); },
  then(resolve, reject) { return Promise.resolve(user).then(resolve, reject); },
});

test("authentication regression checks without database or email delivery", async t => {
  let user;
  let mails = 0;
  let smtpOptions;
  t.mock.method(nodemailer, "createTransport", options => {
    smtpOptions = options;
    return { sendMail: async () => { mails++; return {}; } };
  });
  t.mock.method(Utilisateur, "findOne", () => query(user));
  t.mock.method(Utilisateur, "findById", () => query(user));
  t.mock.method(Permission, "find", async () => []);
  t.mock.method(RolePermission, "find", () => ({
    populate: async () => [{ permissionId: { nom: "CONNEXION_SANS_OTP" } }],
  }));
  t.mock.method(Utilisateur, "updateOne", async filter => {
    if (!user.loginChallengeHash || filter.loginChallengeHash !== user.loginChallengeHash || filter.otpCode !== user.otpCode) return { modifiedCount: 0 };
    user.loginChallengeHash = undefined;
    user.loginChallengeExpires = undefined;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.loginAttempts = 0;
    return { modifiedCount: 1 };
  });
  const fresh = async () => {
    const originalHash = await bcrypt.hash("Original#1234", 4);
    let storedHash = originalHash;
    user = {
      _id: "test-user", email: "test@example.invalid", prenom: "Test", nom: "Account",
      isActive: true, password: originalHash, roleId: null,
      boutiqueActive: { _id: "test-shop", userId: "test-user" },
      loginAttempts: 0, isNew: false,
      isModified: field => field === "password" && user.password !== storedHash,
      async save() { invalidatePasswordSessions.call(this); storedHash = this.password; },
      async populate() { return this; },
    };
    return user;
  };
  await t.test("resend and verify reject email-only requests", async () => {
    await fresh();
    user.otpCode = "123456"; user.otpExpires = new Date(Date.now() + 180000);
    const before = mails;
    for (const handler of [resendOTP, verifyOTP]) {
      const res = response();
      await handler({ body: { email: user.email, otp: "123456" } }, res);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.token, undefined);
    }
    assert.equal(mails, before);
  });
  await t.test("wrong password cannot create a challenge", async () => {
    await fresh();
    const res = response();
    await login({ body: { email: user.email, password: "wrong" } }, res);
    assert.equal(res.statusCode, 401);
    assert.equal(user.loginChallengeHash, undefined);
  });
  await t.test("a challenge belonging to another account is rejected", async () => {
    await fresh();
    const otherChallenge = createLoginChallenge(user);
    await fresh();
    createLoginChallenge(user);
    user.otpCode = "123456"; user.otpExpires = new Date(Date.now() + 180000);
    const res = response();
    await verifyOTP({ body: { email: user.email, otp: "123456", loginChallenge: otherChallenge } }, res);
    assert.equal(res.statusCode, 401);
  });
  await t.test("employee login without OTP still issues a current session", async () => {
    await fresh();
    user.roleId = "employee-role";
    user.boutiqueActive.userId = "owner";
    user.sessionVersion = "previous-password-change";
    createLoginChallenge(user);
    const res = response();
    await login({ body: { email: user.email, password: "Original#1234" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.requiresOTP, false);
    assert.equal(user.loginChallengeHash, undefined);
    assert(sessionIsCurrent(jwt.verify(res.body.token, process.env.JWT_SECRET), user));
  });
  await t.test("correct password creates a bounded challenge and allows a resend", async () => {
    await fresh();
    const res = response();
    await login({ body: { email: user.email, password: "Original#1234" } }, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.body.loginChallenge, /^[a-f0-9]{64}$/);
    assert.notEqual(user.loginChallengeHash, res.body.loginChallenge);
    user.otpExpires = new Date(Date.now() + 120000);
    const resent = response();
    await resendOTP({ body: { email: user.email, loginChallenge: res.body.loginChallenge } }, resent);
    assert.equal(resent.statusCode, 200);
  });
  await t.test("expired and wrong challenges are rejected", async () => {
    for (const expired of [false, true]) {
      await fresh();
      const challenge = createLoginChallenge(user);
      user.otpCode = "123456"; user.otpExpires = new Date(Date.now() + 180000);
      if (expired) user.loginChallengeExpires = new Date(0);
      const res = response();
      await verifyOTP({ body: { email: user.email, otp: "123456", loginChallenge: expired ? challenge : "a".repeat(64) } }, res);
      assert.equal(res.statusCode, 401);
    }
  });
  await t.test("three wrong codes invalidate the challenge", async () => {
    await fresh();
    const challenge = createLoginChallenge(user);
    user.otpCode = "123456"; user.otpExpires = new Date(Date.now() + 180000);
    for (const expected of [400, 400, 429]) {
      const res = response();
      await verifyOTP({ body: { email: user.email, otp: "654321", loginChallenge: challenge } }, res);
      assert.equal(res.statusCode, expected);
    }
    assert.equal(user.loginChallengeHash, undefined);
  });
  await t.test("valid OTP issues a session once and preserves first-login requirement", async () => {
    await fresh();
    user.mustChangePassword = true;
    const challenge = createLoginChallenge(user);
    user.otpCode = "123456"; user.otpExpires = new Date(Date.now() + 180000);
    const req = { body: { email: user.email, otp: "123456", loginChallenge: challenge } };
    const res = response();
    await verifyOTP(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.mustChangePassword, true);
    assert(sessionIsCurrent(jwt.verify(res.body.token, process.env.JWT_SECRET), user));
    const replay = response();
    await verifyOTP(req, replay);
    assert.equal(replay.statusCode, 401);
  });
  await t.test("password reset revokes previous JWT and pending OTP", async () => {
    await fresh();
    createLoginChallenge(user);
    user.otpCode = "123456";
    const oldToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    const res = response();
    await resetPassword({ params: { token: "test-reset-token" }, body: { password: "Changed#5678", confirmPassword: "Changed#5678" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(user.loginChallengeHash, undefined);
    assert.equal(user.otpCode, undefined);
    const denied = response();
    await protect({ headers: { authorization: "Bearer " + oldToken } }, denied, () => assert.fail("Old token accepted"));
    assert.equal(denied.statusCode, 401);
  });
  await t.test("profile password change returns a replacement token and rejects the old one", async () => {
    await fresh();
    const oldToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    const res = response();
    await updatePassword({ user: { id: user._id }, body: { currentPassword: "Original#1234", newPassword: "Changed#5678", confirmPassword: "Changed#5678" } }, res);
    assert.equal(res.statusCode, 200);
    assert(sessionIsCurrent(jwt.verify(res.body.token, process.env.JWT_SECRET), user));
    assert(!sessionIsCurrent(jwt.verify(oldToken, process.env.JWT_SECRET), user));
    let accepted = false;
    await protect({ headers: { authorization: "Bearer " + res.body.token }, originalUrl: "/api/auth/me" }, response(), () => { accepted = true; });
    assert(accepted);
  });
  await t.test("model save hook is registered for employee resets too", () => {
    const hooks = Utilisateur.schema.s.hooks._pres.get("save");
    assert(hooks.some(hook => hook.fn === invalidatePasswordSessions));
  });
  await t.test("SMTP certificate verification is enabled for Gmail and custom SMTP", async () => {
    for (const host of ["smtp.gmail.com", "smtp.example.invalid"]) {
      process.env.EMAIL_HOST = host;
      await sendEmail({ email: "test@example.invalid", message: "test" });
      assert.equal(smtpOptions.tls.rejectUnauthorized, true);
    }
  });
});
