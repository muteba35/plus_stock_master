import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import RevokedToken from "../src/models/RevokedToken.js";
import { logout, tokenDigest } from "../src/controllers/logout.controller.js";
import { protect } from "../src/middlewares/authMiddleware.js";
import { getDateRange, getDashboardOverview } from "../src/controllers/dashboard.controller.js";
import { Boutique, Vente, Produit, Utilisateur, MouvementStock, RetourClient } from "../src/models/Utilisateur.js";
import { expirationIsFuture } from "../src/utils/productDates.js";
import { createProduit } from "../src/controllers/produit.controller.js";

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test("logout persists only a digest and the revoked JWT is rejected", async t => {
  const old = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "session-regression-only";
  t.after(() => { if (old === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = old; });
  const revoked = new Set();
  t.mock.method(RevokedToken, "updateOne", async (filter, update) => {
    assert.equal(filter.digest.length, 64);
    assert.ok(update.$setOnInsert.expiresAt > new Date());
    revoked.add(filter.digest);
  });
  t.mock.method(RevokedToken, "exists", async filter => revoked.has(filter.digest));
  const token = jwt.sign({ id: "owner", sessionVersion: "test" }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const other = jwt.sign({ id: "owner", sessionVersion: "test", jti: "other-session" }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const req = { headers: { authorization: `Bearer ${token}` } };
  for (let i = 0; i < 2; i++) { const res = response(); await logout(req, res); assert.equal(res.statusCode, 200); }
  assert.equal(revoked.has(tokenDigest(other)), false);
  const denied = response();
  await protect(req, denied, () => assert.fail("revoked JWT accepted"));
  assert.equal(denied.statusCode, 401);
  const invalid = response(); await logout({ headers: { authorization: "Bearer invalid" } }, invalid);
  assert.equal(invalid.statusCode, 401);
});

test("logout does not report success when revocation cannot be saved", async t => {
  const old = process.env.JWT_SECRET; process.env.JWT_SECRET = "test-only";
  t.after(() => { if (old === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = old; });
  t.mock.method(RevokedToken, "updateOne", async () => { throw new Error("offline"); });
  const token = jwt.sign({ id: "test" }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const res = response(); await logout({ headers: { authorization: `Bearer ${token}` } }, res);
  assert.equal(res.statusCode, 503);
});

test("custom calendar validates bounds and keeps full UTC days", () => {
  for (const [startDate, endDate] of [["", ""], ["2026-02-30", "2026-03-01"], ["2026-03-02", "2026-03-01"]]) {
    assert.equal(getDateRange({ period: "custom", startDate, endDate }), null);
  }
  const range = getDateRange({ period: "custom", startDate: "2026-03-01", endDate: "2026-03-02" });
  assert.equal(range.start.toISOString(), "2026-03-01T00:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-03-02T23:59:59.999Z");
});

test("expiration rejects yesterday and today but accepts tomorrow or an optional empty date", () => {
  const now = new Date("2026-10-02T12:30:00Z");
  assert.equal(expirationIsFuture(new Date("2026-10-01"), now), false);
  assert.equal(expirationIsFuture(new Date("2026-10-02T23:59:59Z"), now), false);
  assert.equal(expirationIsFuture(new Date("2026-10-03"), now), true);
  assert.equal(expirationIsFuture(null, now), true);
});

test("direct product creation rejects an expiry of today before inserting data", async t => {
  t.mock.method(Boutique, "findOne", () => ({ select: async () => ({ deviseParDefaut: "CDF (FC)" }) }));
  t.mock.method(Produit, "create", () => assert.fail("expired product inserted"));
  const res = response();
  await createProduit({ user: { boutiqueId: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body: { nom: "Test", sku: "TEST", dateExpiration: new Date().toISOString().slice(0, 10) } }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /apres aujourd/);
});

test("dashboard never replaces an empty selected period with sales from another period", async t => {
  const fixtures = [];
  const query = value => ({ select() { return this; }, populate() { return this; }, sort() { return this; }, limit() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
  t.mock.method(Boutique, "findById", () => query({ deviseParDefaut: "CDF (FC)" }));
  t.mock.method(Vente, "find", filter => { assert.ok(filter.createdAt?.$gte); assert.ok(filter.createdAt?.$lte); return query(fixtures.filter(sale => sale.createdAt >= filter.createdAt.$gte && sale.createdAt <= filter.createdAt.$lte)); });
  t.mock.method(Produit, "aggregate", async () => []);
  t.mock.method(Produit, "find", () => query([]));
  t.mock.method(Produit, "countDocuments", async () => 0);
  t.mock.method(Utilisateur, "find", () => query([]));
  t.mock.method(MouvementStock, "countDocuments", async () => 0);
  t.mock.method(RetourClient, "find", () => query([]));
  const res = response();
  await getDashboardOverview({ user: { boutiqueId: "aaaaaaaaaaaaaaaaaaaaaaaa" }, query: { period: "custom", startDate: "2026-03-01", endDate: "2026-03-02" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.metrics.caTTC, 0);
  assert.equal(res.body.period.chartFallback, false);
  assert.equal(res.body.salesData.length, 2);
  assert.ok(res.body.salesData.every(row => row.ventes === 0 && row.benefices === 0));
  fixtures.push({ createdAt: new Date("2026-03-01T23:59:59.999Z"), statut: "PAYEE", totalTTC: 116, margeEstimee: 40 });
  const paid = response();
  await getDashboardOverview({ user: { boutiqueId: "aaaaaaaaaaaaaaaaaaaaaaaa" }, query: { period: "custom", startDate: "2026-03-01", endDate: "2026-03-02" } }, paid);
  assert.equal(paid.body.metrics.caTTC, 116);
  assert.equal(paid.body.salesData[0].ventes, 116);
  assert.equal(paid.body.salesData[0].benefices, 40);
  assert.equal(paid.body.salesData[1].ventes, 0);
  const later = response();
  await getDashboardOverview({ user: { boutiqueId: "aaaaaaaaaaaaaaaaaaaaaaaa" }, query: { period: "custom", startDate: "2026-03-03", endDate: "2026-03-04" } }, later);
  assert.equal(later.body.metrics.caTTC, 0);
});
