import test from "node:test";
import assert from "node:assert/strict";
import { protect } from "../src/middlewares/authMiddleware.js";

const modules = ["alerteStock", "audit", "auth", "boutique", "caisse", "dashboard", "departement", "employe", "finance", "inventaire", "mouvementStock", "notification", "produit", "role", "subscription", "categorie"];
const publicAuth = new Set(["/register", "/login", "/logout", "/verify-email/:token", "/resend-verification", "/verify-otp", "/resend-otp", "/forgot-password", "/resend-forgot-password", "/reset-password/:token"]);

for (const module of modules) {
  test(`${module}: every registered private endpoint inherits authentication`, async () => {
    const { default: router } = await import(`../src/routes/${module}.routes.js`);
    let inherited = false;
    for (const layer of router.stack) {
      if (!layer.route) { if (layer.handle === protect) inherited = true; continue; }
      const route = layer.route;
      if (module === "auth" && publicAuth.has(route.path)) continue;
      assert.ok(inherited || route.stack.some(item => item.handle === protect), `${module} ${route.path}: authentication missing`);
      const res = { status(code) { assert.equal(code, 401); return this; }, json() {} };
      await protect({ headers: {} }, res, () => assert.fail("unauthenticated request accepted"));
    }
  });
}
