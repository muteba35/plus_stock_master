import jwt from "jsonwebtoken";
import { AuditLog, Boutique, Categorie, Departement, ExchangeRate, Produit, Role, RolePermission, Utilisateur } from "../models/Utilisateur.js";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SENSITIVE_KEYS = new Set([
  "password",
  "temporaryAccessPassword",
  "passwordHistory",
  "activationToken",
  "activationTokenExpires",
  "otpCode",
  "otpExpires",
  "resetPasswordToken",
  "resetPasswordExpires",
  "firstLoginToken",
  "deletionCodeHash",
  "deletionCodeExpires",
]);

const moduleFromPath = (path = "") => {
  if (path.startsWith("/api/auth")) return "AUTHENTIFICATION";
  if (path.startsWith("/api/caisse")) return "CAISSE";
  if (path.startsWith("/api/inventaire")) return "INVENTAIRE";
  if (path.startsWith("/api/employes") || path.startsWith("/api/roles") || path.startsWith("/api/departements")) return "EQUIPE";
  if (path.startsWith("/api/boutiques") || path.startsWith("/api/notifications")) return "PARAMETRES";
  if (path.startsWith("/api/dashboard")) return "DASHBOARD";
  return "SYSTEME";
};

const actionFromRequest = (req) => {
  const path = req.originalUrl || req.path || "";
  if (path.includes("/login")) return "CONNEXION";
  if (path.includes("/update-password") || path.includes("/reset-password")) return "CHANGEMENT_MOT_DE_PASSE";
  if (path.includes("/settings/exchange-rates")) return "CHANGEMENT_DEVISE_TAUX";
  if (path.includes("/roles")) return req.method === "POST" ? "CREATION_ROLE" : req.method === "DELETE" ? "SUPPRESSION_ROLE" : "MODIFICATION_ROLE";
  if (path.includes("/departements")) return req.method === "POST" ? "CREATION_DEPARTEMENT" : req.method === "DELETE" ? "SUPPRESSION_DEPARTEMENT" : "MODIFICATION_DEPARTEMENT";
  if (path.includes("/employes")) return req.method === "POST" ? "CREATION_EMPLOYE" : req.method === "DELETE" ? "SUPPRESSION_EMPLOYE" : "MODIFICATION_EMPLOYE";
  if (path.includes("/boutiques")) return req.method === "POST" ? "CREATION_BOUTIQUE" : req.method === "DELETE" ? "SUPPRESSION_BOUTIQUE" : path.includes("/active") ? "CHANGEMENT_BOUTIQUE_ACTIVE" : "MODIFICATION_BOUTIQUE";
  if (path.includes("/notifications/preferences")) return "MODIFICATION_NOTIFICATIONS";
  if (path.includes("/caisse/retours")) return "RETOUR_CLIENT";
  if (path.includes("/caisse")) return "ACTION_CAISSE";
  if (path.includes("/inventaire/mouvements") || path.includes("/inventaire/stock")) return "MOUVEMENT_STOCK";
  if (path.includes("/inventaire/categories")) return req.method === "POST" ? "CREATION_CATEGORIE" : req.method === "DELETE" ? "SUPPRESSION_CATEGORIE" : "MODIFICATION_CATEGORIE";
  if (path.includes("/inventaire/produits")) return req.method === "POST" ? "CREATION_PRODUIT" : req.method === "DELETE" ? "SUPPRESSION_PRODUIT" : "MODIFICATION_PRODUIT";
  return req.method + "_APPLICATION";
};

const browserFromUserAgent = (userAgent = "") => {
  const value = userAgent.toLowerCase();
  if (value.includes("edg/")) return "Microsoft Edge";
  if (value.includes("chrome/")) return "Google Chrome";
  if (value.includes("firefox/")) return "Mozilla Firefox";
  if (value.includes("safari/")) return "Safari";
  if (value.includes("postman")) return "Postman";
  return userAgent ? "Navigateur inconnu" : "Non renseigne";
};

const severityFromStatus = (statusCode) => {
  if (statusCode >= 500) return "danger";
  if (statusCode >= 400) return "warning";
  return "success";
};

const getPathId = (path = "") => {
  const cleanPath = path.split("?")[0];
  const match = cleanPath.match(/\/([a-fA-F0-9]{24})(?:\/|$)/);
  return match ? match[1] : null;
};

const getTokenPayload = (req) => {
  const header = req.headers?.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.cookies?.stockmaster_token;
  if (!token) return null;
  try {
    return jwt.decode(token) || null;
  } catch {
    return null;
  }
};

const cleanValue = (value) => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(cleanValue);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const plain = typeof value.toObject === "function" ? value.toObject() : value;
    return Object.entries(plain).reduce((acc, [key, item]) => {
      if (key.startsWith("$") || key === "__v" || SENSITIVE_KEYS.has(key)) return acc;
      acc[key] = cleanValue(item);
      return acc;
    }, {});
  }
  return value;
};

const compactRole = async (role) => {
  if (!role) return null;
  const cleanRole = cleanValue(role);
  const links = await RolePermission.find({ roleId: role._id }).populate("permissionId", "nom module description").lean();
  cleanRole.permissions = links.map((link) => link.permissionId?.nom).filter(Boolean).sort();
  return cleanRole;
};

const compactExchangeRates = async (boutiqueId) => {
  if (!boutiqueId) return null;
  const rates = await ExchangeRate.find({ boutiqueId, isActive: true }).sort({ source: 1, cible: 1 }).lean();
  return cleanValue(rates.map((rate) => ({ source: rate.source, cible: rate.cible, taux: rate.taux, isReference: rate.isReference })));
};

const captureSnapshot = async (req) => {
  const path = req.originalUrl || req.path || "";
  const id = getPathId(path);
  const tokenPayload = getTokenPayload(req);

  try {
    if (path.includes("/boutiques/settings/exchange-rates")) {
      const boutiqueId = req.user?.boutiqueActive || req.user?.boutiqueId || tokenPayload?.boutiqueId;
      return await compactExchangeRates(boutiqueId);
    }
    if (path.includes("/api/boutiques") && id) return cleanValue(await Boutique.findById(id).lean());
    if (path.includes("/api/roles") && id) return compactRole(await Role.findById(id).lean());
    if (path.includes("/api/departements") && id) return cleanValue(await Departement.findById(id).lean());
    if (path.includes("/api/employes") && id) return cleanValue(await Utilisateur.findById(id).select("+isActive +isBlocked +isPermanentlyBlocked").lean());
    if (path.includes("/api/inventaire/produits") && id) return cleanValue(await Produit.findById(id).lean());
    if (path.includes("/api/inventaire/categories") && id) return cleanValue(await Categorie.findById(id).lean());
    return null;
  } catch (error) {
    return { auditSnapshotError: error.message };
  }
};

const responseSnapshot = (value) => {
  const cleaned = cleanValue(value);
  if (!cleaned || typeof cleaned !== "object") return cleaned || null;
  return cleaned.data || cleaned.boutique || cleaned.role || cleaned.produit || cleaned.categorie || cleaned.departement || cleaned.employe || cleaned.user || cleaned;
};

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
const valuesEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const diffValues = (before, after, prefix = "") => {
  if (!isObject(before) || !isObject(after)) return valuesEqual(before, after) ? [] : [prefix || "valeur"];
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const changes = [];
  for (const key of keys) {
    if (["updatedAt", "createdAt"].includes(key)) continue;
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    const left = before?.[key];
    const right = after?.[key];
    if (isObject(left) && isObject(right)) changes.push(...diffValues(left, right, fieldPath));
    else if (!valuesEqual(left, right)) changes.push(fieldPath);
  }
  return changes.slice(0, 80);
};

const extractTarget = (req, before, after, responseBody) => {
  const body = req.body || {};
  return body.nom || body.name || body.reference || body.email || after?.nom || after?.name || after?.reference || before?.nom || before?.name || before?.reference || responseBody?.reference || getPathId(req.originalUrl || "") || "";
};

export const auditLogger = (req, res, next) => {
  const shouldAudit = WRITE_METHODS.has(req.method) || req.originalUrl?.includes("/api/auth/login");
  if (!shouldAudit || req.originalUrl?.startsWith("/api/audit")) return next();

  const beforePromise = captureSnapshot(req);
  let responseBody = null;
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    responseBody = body;
    return originalJson(body);
  };

  res.on("finish", async () => {
    const user = req.user || {};
    const body = req.body || {};
    const before = await beforePromise;
    const after = res.statusCode < 400 ? await captureSnapshot(req) : null;
    const fallbackAfter = after || (res.statusCode < 400 ? responseSnapshot(responseBody) : null);
    const changedFields = before && fallbackAfter ? diffValues(before, fallbackAfter) : [];
    const userName = [user.prenom, user.nom].filter(Boolean).join(" ").trim() || body.email || "Utilisateur inconnu";
    const boutiqueId = user.boutiqueActive || user.boutiqueId || body.boutiqueId || getTokenPayload(req)?.boutiqueId || null;
    const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket?.remoteAddress || "";
    const userAgent = req.headers["user-agent"] || "";

    AuditLog.create({
      boutiqueId,
      userId: user._id || user.id || null,
      userName,
      userEmail: user.email || body.email || "",
      action: actionFromRequest(req),
      module: moduleFromPath(req.originalUrl || ""),
      method: req.method,
      path: req.originalUrl || req.path || "",
      statusCode: res.statusCode,
      ipAddress,
      browser: browserFromUserAgent(userAgent),
      userAgent,
      target: extractTarget(req, before, fallbackAfter, responseBody),
      description: res.statusCode >= 400 ? "Action refusee ou echouee" : changedFields.length ? `${changedFields.length} champ(s) modifie(s)` : "Action executee avec succes",
      severity: severityFromStatus(res.statusCode),
      previousValue: before,
      newValue: fallbackAfter,
      changedFields,
      metadata: {
        params: req.params || {},
        query: req.query || {},
        response: responseBody ? responseSnapshot(responseBody) : null,
      },
    }).catch((error) => console.error("auditLogger:", error.message));
  });

  return next();
};
