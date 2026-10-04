import assert from "node:assert/strict";
import app from "../src/app.js";
import { Boutique } from "../src/models/Utilisateur.js";
import { SUBSCRIPTION_PLANS, getPlanByCode } from "../src/config/subscriptionPlans.js";

const route = app.router.stack.find(layer => layer.route?.path === "/api/public/plans");
assert.ok(route, "The catalogue must be public without exposing account data");
let result;
route.route.stack[0].handle({}, { json: data => { result = data; } });
assert.equal(result.enforcementActive, false);
assert.equal(result.plans.length, SUBSCRIPTION_PLANS.length);
for (const plan of result.plans) {
  assert.equal(plan.priceMonthly, getPlanByCode(plan.code).priceMonthly);
  assert.deepEqual(plan.limits, getPlanByCode(plan.code).limits);
  assert.deepEqual(Object.keys(plan).sort(), ["code", "name", "priceMonthly", "currency", "durationDays", "limits", "features"].sort());
}
const now = Date.now();
const shop = new Boutique();
const expected = getPlanByCode("TRIAL").durationDays * 86400000;
assert.ok(Math.abs(shop.trialExpiresAt.getTime() - now - expected) < 2000);
console.log("Public catalogue and new trial duration: OK (no database or payment)");
