import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import sharp from "sharp";
import { Boutique, Utilisateur, Vente, RetourClient } from "../src/models/Utilisateur.js";
import { checkPermission } from "../src/middlewares/authMiddleware.js";
import { checkExportPermission } from "../src/middlewares/exportPermission.js";
import { normalizeLogo, isValidLogo } from "../src/utils/appearanceValidation.js";
import { getBoutiqueAppearance, updateBoutiqueAppearance } from "../src/controllers/boutique.controller.js";
import { getVentes, getFactures, getRetours } from "../src/controllers/caisse.controller.js";

const response = () => ({ statusCode: 200, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } });
const query = (value) => ({ select() { return this; }, populate() { return this; }, sort() { return this; }, limit() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });

test("exports keep RBAC and owner access independent of role label", () => {
  for (const permission of ["EXPORTER_HISTORIQUE_VENTES", "EXPORTER_FACTURES", "EXPORTER_RETOURS_CLIENTS", "EXPORTER_MOUVEMENTS_STOCK"]) {
    for (const [user, allowed] of [[{ isOwner: true, permissions: [] }, true], [{ isOwner: false, permissions: [permission] }, true], [{ isOwner: false, permissions: ["VOIR_MES_VENTES"], role: "Admin Général" }, false]]) {
      let calls = 0; const res = response();
      checkExportPermission(permission)({ user, query: { export: "1" } }, res, () => calls++);
      assert.equal(calls, Number(allowed));
      if (!allowed) assert.equal(res.statusCode, 403);
    }
  }
});

test("list/export queries retain active shop and own-operation scope", async t => {
  const filters = [];
  t.mock.method(Vente, "find", filter => { filters.push(filter); return query([]); });
  t.mock.method(RetourClient, "find", filter => { filters.push(filter); return query([]); });
  t.mock.method(Boutique, "exists", async () => false);
  for (const handler of [getVentes, getFactures, getRetours]) {
    filters.length = 0;
    const res = response();
    await handler({ user: { id: "employee", boutiqueActive: "shop-a", permissions: [] }, query: { export: "1", boutiqueId: "shop-b" } }, res);
    assert.equal(res.statusCode, 200);
    if (handler !== getRetours) assert.equal(res.body.scope, "own");
    for (const filter of filters) { assert.equal(filter.boutiqueId, "shop-a"); assert.equal(filter.utilisateurId, "employee"); }
    const denied = response();
    await handler({ user: { id: "owner", isOwner: true, boutiqueActive: "shop-a" }, query: { export: "1", boutiqueId: "other-owner-shop" } }, denied);
    assert.equal(denied.statusCode, 403);
    const owner = response();
    await handler({ user: { id: "owner", isOwner: true, boutiqueActive: "shop-a" }, query: { export: "1" } }, owner);
    if (handler !== getRetours) assert.equal(owner.body.scope, "all");
    assert.equal(filters.at(-1).utilisateurId, undefined);
  }
});

test("appearance is persisted for the active shop only and validates values", async t => {
  let saves = 0;
  const shop = { _id: "shop-a", userId: "owner", nom: "Shop A", appearance: {}, async save() { saves++; } };
  t.mock.method(Utilisateur, "findById", () => query({ _id: "employee", boutiqueActive: shop }));
  t.mock.method(Boutique, "findOne", filter => query(filter._id === "shop-a" ? shop : null));
  const user = { id: "employee", boutiqueActive: "shop-a", permissions: ["MODIFIER_PERSONNALISATION"] };
  const res = response();
  await updateBoutiqueAppearance({ user, params: { id: "shop-a" }, body: { theme: "dark", primaryColor: "#123abc", fontFamily: "Roboto" } }, res);
  assert.equal(res.statusCode, 200); assert.equal(saves, 1); assert.equal(shop.appearance.primaryColor, "#123ABC");
  const loaded = response(); await getBoutiqueAppearance({ user }, loaded);
  assert.equal(loaded.body.boutique.appearance.theme, "dark");
  const denied = response(); await updateBoutiqueAppearance({ user, params: { id: "shop-b" }, body: { theme: "light" } }, denied);
  assert.equal(denied.statusCode, 403); assert.equal(saves, 1);
  for (const body of [{ primaryColor: "red;display:none" }, { primaryColor: ["#123456"] }, { theme: "malicious" }, { css: "body{}" }, { logo: "data:image/svg+xml;base64,PHN2Zz4=" }]) {
    const invalid = response(); await updateBoutiqueAppearance({ user, params: { id: "shop-a" }, body }, invalid);
    assert.equal(invalid.statusCode, 400);
  }
  let calls = 0; const forbidden = response();
  checkPermission("MODIFIER_PERSONNALISATION")({ user: { isOwner: false, permissions: ["MODIFIER_BOUTIQUE"] } }, forbidden, () => calls++);
  assert.equal(calls, 0); assert.equal(forbidden.statusCode, 403);
});

test("logos are decoded, normalized and bounded; invalid or executable files rejected", async () => {
  const image = await sharp({ create: { width: 8, height: 8, channels: 4, background: "blue" } }).png().toBuffer();
  const normalized = await normalizeLogo(`data:image/png;base64,${image.toString("base64")}`);
  assert.match(normalized, /^data:image\/webp;base64,/);
  assert.equal(await normalizeLogo(""), "");
  for (const value of ["data:image/png;base64," + Buffer.from("<script>alert(1)</script>").toString("base64"), "data:image/svg+xml;base64,PHN2Zz4=", "data:image/png;base64," + "A".repeat(800000)]) {
    assert.equal(isValidLogo(value), false); await assert.rejects(normalizeLogo(value));
  }
  const corrupt = Buffer.alloc(40); image.copy(corrupt, 0, 0, 24);
  await assert.rejects(normalizeLogo(`data:image/png;base64,${corrupt.toString("base64")}`));
});

test("functional routes keep authorization but no subscription gates", () => {
  for (const file of ["boutique", "caisse", "categorie", "departement", "employe", "finance", "mouvementStock", "produit", "role"]) {
    const source = fs.readFileSync(new URL(`../src/routes/${file}.routes.js`, import.meta.url), "utf8");
    assert.match(source, /protect/); assert.doesNotMatch(source, /attachSubscription|requireFeature|enforce\w+Limit/);
  }
  assert.match(fs.readFileSync(new URL("../src/routes/subscription.routes.js", import.meta.url), "utf8"), /initiateLabyrinthePayment/);
});
