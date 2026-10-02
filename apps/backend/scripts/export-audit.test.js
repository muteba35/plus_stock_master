import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import RevokedToken from "../src/models/RevokedToken.js";
import { Boutique, Utilisateur, Permission, Role, RolePermission } from "../src/models/Utilisateur.js";
import { protect, checkPermission } from "../src/middlewares/authMiddleware.js";
import { attachExportContext } from "../src/middlewares/exportContext.js";
import { checkExportPermission } from "../src/middlewares/exportPermission.js";
import { getEmployes, createEmploye } from "../src/controllers/employe.controller.js";
import { createRole, updateRole } from "../src/controllers/role.controller.js";

const A = "aaaaaaaaaaaaaaaaaaaaaaaa", B = "bbbbbbbbbbbbbbbbbbbbbbbb";
const response = () => ({ statusCode: 200, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } });
const query = value => ({ select() { return this; }, populate() { return this; }, sort() { return this; }, lean() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });

test("employee creation cannot assign an existing role with stronger permissions", async t => {
  t.mock.method(Boutique, "findOne", () => query({ _id: A }));
  t.mock.method(Role, "findOne", () => query({ _id: B, boutiqueId: A }));
  t.mock.method(RolePermission, "find", () => query([{ permissionId: { nom: "SUPPRIMER_BOUTIQUE" } }]));
  t.mock.method(Utilisateur, "findOne", () => assert.fail("must deny before accessing accounts"));
  const res = response();
  await createEmploye({ user: { id: "employee", boutiqueId: A, permissions: ["AJOUTER_EMPLOYE"] }, body: {
    prenom: "Test", nom: "Employee", email: "test@example.invalid", telephone: "123456789", roleId: B, departementId: A
  } }, res);
  assert.equal(res.statusCode, 403);
});

test("appearance mutation requires its permission, even with direct API access", () => {
  for (const user of [{ permissions: [] }, { permissions: ["MODIFIER_PERSONNALISATION"] }, { isOwner: true, permissions: [] }]) {
    const res = response(); let calls = 0;
    checkPermission("MODIFIER_PERSONNALISATION")({ user }, res, () => calls++);
    assert.equal(calls, user.isOwner || user.permissions.length ? 1 : 0);
    if (!calls) assert.equal(res.statusCode, 403);
  }
});

test("delegated role management cannot grant permissions the actor does not own", async t => {
  t.mock.method(Permission, "find", () => query([{ _id: B, nom: "SUPPRIMER_BOUTIQUE" }]));
  t.mock.method(Role, "findOne", () => query({ _id: B, boutiqueId: A, nom: "Test" }));
  t.mock.method(Role, "create", () => assert.fail("must not create privileged role"));
  t.mock.method(RolePermission, "deleteMany", () => assert.fail("must not change permissions"));
  const user = { id: "employee", boutiqueId: A, isOwner: false, permissions: ["CREER_ROLE", "MODIFIER_ROLE"] };
  for (const handler of [createRole, updateRole]) {
    const res = response();
    await handler({ user, params: { id: B }, body: { nom: "Test", permissions: [B] } }, res);
    assert.equal(res.statusCode, 403);
  }
});

test("employee list denies other owners and hides temporary credentials from read-only users", async t => {
  t.mock.method(Boutique, "exists", async f => f._id === A && f.userId === "owner-a");
  let reads = 0;
  t.mock.method(Utilisateur, "find", f => {
    reads++; assert.equal(f.boutiqueActive, A);
    return query([{ _id: "employee", mustChangePassword: true, temporaryAccessPassword: "test-secret" }]);
  });
  const forbidden = response();
  await getEmployes({ user: { id: "owner-a", isOwner: true, boutiqueId: A }, query: { boutiqueId: B } }, forbidden);
  assert.equal(forbidden.statusCode, 403); assert.equal(reads, 0);
  for (const [user, visible] of [
    [{ id: "owner-a", isOwner: true, boutiqueId: A }, true],
    [{ id: "employee", permissions: ["VOIR_EMPLOYES"], boutiqueId: A }, false],
    [{ id: "employee", permissions: ["RESET_PASSWORD_EMPLOYE"], boutiqueId: A }, true],
  ]) {
    const res = response(); await getEmployes({ user, query: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(Boolean(res.body.employes[0].temporaryAccess), visible);
  }
});

test("export branding is isolated in both directions and cannot be selected by an employee", async t => {
  const shops = [{ _id: A, userId: "owner-a", nom: "Shop A", appearance: { logo: "logo-a" } }, { _id: B, userId: "owner-b", nom: "Shop B", appearance: { logo: "logo-b" } }];
  t.mock.method(Boutique, "findOne", f => query(shops.find(s => s._id === f._id && (!f.userId || s.userId === f.userId))));
  for (const own of shops) for (const target of shops) {
    const res = response(); let calls = 0;
    await attachExportContext({ user: { id: own.userId, isOwner: true, boutiqueActive: own._id }, query: { export: "1", boutiqueId: target._id } }, res, () => calls++);
    assert.equal(calls, Number(own === target));
    if (own === target) {
      res.json({ success: true, data: [] });
      assert.equal(res.body.exportContext.name, own.nom);
      assert.equal(res.body.exportContext.logo, own.appearance.logo);
    } else assert.equal(res.statusCode, 403);
  }
  const res = response(); let calls = 0;
  await attachExportContext({ user: { id: "employee", isOwner: false, boutiqueActive: A }, query: { export: "1", boutiqueId: B } }, res, () => calls++);
  assert.equal(res.statusCode, 403); assert.equal(calls, 0);
});

test("export permission remains mandatory for a direct API request", () => {
  for (const [permissions, expected] of [[[], 403], [["VOIR_MES_VENTES"], 403], [["EXPORTER_HISTORIQUE_VENTES"], 200]]) {
    const res = response(); let calls = 0;
    checkExportPermission("EXPORTER_HISTORIQUE_VENTES")({ query: { export: "1" }, user: { isOwner: false, permissions } }, res, () => calls++);
    assert.equal(res.statusCode, expected); assert.equal(calls, Number(expected === 200));
  }
});

test("database context overrides forged owner claims and stale shop claims", async t => {
  t.mock.method(RevokedToken, "exists", async () => null);
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-only-export-audit-secret";
  t.after(() => { if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous; });
  const user = { _id: A, isActive: true, roleId: null, boutiqueActive: null };
  t.mock.method(Utilisateur, "findById", () => query(user));
  t.mock.method(Permission, "find", () => query([]));
  t.mock.method(Role, "exists", () => query(false));
  t.mock.method(RolePermission, "find", () => { assert.fail("must not read permissions from a foreign role"); });
  const token = jwt.sign({ id: A, boutiqueId: B, isOwner: true, permissions: ["EXPORTER_HISTORIQUE_VENTES"] }, process.env.JWT_SECRET);
  const req = { headers: { authorization: "Bearer " + token }, originalUrl: "/api/caisse/ventes" };
  const res = response(); let calls = 0;
  await protect(req, res, () => calls++);
  assert.equal(calls, 1); assert.equal(req.user.isOwner, false);
  assert.equal(req.user.boutiqueId, undefined); assert.deepEqual(req.user.permissions, []);
  const forbidden = response();
  checkPermission("EXPORTER_HISTORIQUE_VENTES")(req, forbidden, () => assert.fail("must deny"));
  assert.equal(forbidden.statusCode, 403);
  let onboarding = 0;
  checkPermission("CREER_BOUTIQUE")(req, response(), () => onboarding++);
  assert.equal(onboarding, 1);
  user.boutiqueActive = { _id: B, userId: A };
  await protect(req, response(), () => {});
  assert.equal(req.user.isOwner, true); assert.equal(req.user.boutiqueId, B);
  user.roleId = "foreign-role";
  user.boutiqueActive.userId = "another-owner";
  await protect(req, response(), () => {});
  assert.equal(req.user.isOwner, false); assert.deepEqual(req.user.permissions, []);
});
