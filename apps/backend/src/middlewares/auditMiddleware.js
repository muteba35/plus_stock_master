import { AuditLog } from "../models/Utilisateur.js";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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
  if (path.includes("/roles")) return req.method === "POST" ? "CREATION_ROLE" : req.method === "DELETE" ? "SUPPRESSION_ROLE" : "MODIFICATION_ROLE";
  if (path.includes("/departements")) return req.method === "POST" ? "CREATION_DEPARTEMENT" : req.method === "DELETE" ? "SUPPRESSION_DEPARTEMENT" : "MODIFICATION_DEPARTEMENT";
  if (path.includes("/employes")) return req.method === "POST" ? "CREATION_EMPLOYE" : req.method === "DELETE" ? "SUPPRESSION_EMPLOYE" : "MODIFICATION_EMPLOYE";
  if (path.includes("/boutiques")) return req.method === "POST" ? "CREATION_BOUTIQUE" : req.method === "DELETE" ? "SUPPRESSION_BOUTIQUE" : "MODIFICATION_BOUTIQUE";
  if (path.includes("/notifications/preferences")) return "MODIFICATION_NOTIFICATIONS";
  if (path.includes("/caisse/retours")) return "RETOUR_CLIENT";
  if (path.includes("/caisse")) return "ACTION_CAISSE";
  if (path.includes("/inventaire/stock")) return "MOUVEMENT_STOCK";
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

export const auditLogger = (req, res, next) => {
  const shouldAudit = WRITE_METHODS.has(req.method) || req.originalUrl?.includes("/api/auth/login");
  if (!shouldAudit || req.originalUrl?.startsWith("/api/audit")) return next();

  res.on("finish", () => {
    const user = req.user || {};
    const body = req.body || {};
    const userName = [user.prenom, user.nom].filter(Boolean).join(" ").trim() || body.email || "Utilisateur inconnu";
    const boutiqueId = user.boutiqueActive || user.boutiqueId || body.boutiqueId || null;
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
      target: body.nom || body.name || body.reference || body.email || req.params?.id || "",
      description: res.statusCode >= 400 ? "Action refusee ou echouee" : "Action executee avec succes",
      severity: severityFromStatus(res.statusCode),
      metadata: {
        params: req.params || {},
        query: req.query || {},
      },
    }).catch((error) => console.error("auditLogger:", error.message));
  });

  return next();
};
