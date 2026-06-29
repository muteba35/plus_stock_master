import mongoose from "mongoose";
import {
  Boutique,
  Categorie,
  InventaireAudit,
  MouvementStock,
  Notification,
  NotificationPreference,
  Produit,
  RetourClient,
  Vente,
} from "../models/Utilisateur.js";
import { expireProductsIfNeeded } from "./produit.controller.js";

const DEFAULT_PREFERENCES = {
  stockThresholdGlobal: 5,
  expirationWarningDays: 7,
  receiveCashAlerts: true,
  showEmployeeAlerts: true,
  onlyOwnerSensitiveAlerts: true,
};

const PRIORITY_WEIGHT = { critique: 3, important: 2, information: 1 };

const getBoutiqueId = (req) => {
  if (req.user?.isOwner && req.query?.boutiqueId) return req.query.boutiqueId;
  return req.user?.boutiqueActive || req.user?.boutiqueId;
};

const ensureBoutiqueAccess = async (req, boutiqueId) => {
  if (!req.user?.isOwner || !req.query?.boutiqueId) return true;
  return Boolean(await Boutique.exists({ _id: boutiqueId, userId: req.user.id, isDeleted: false }));
};

const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const userName = (user) => {
  if (!user || typeof user !== "object") return "Systeme";
  return [user.prenom, user.nom].filter(Boolean).join(" ").trim() || "Utilisateur";
};

const priorityFromType = (type) => {
  if (type === "danger") return "critique";
  if (type === "warning") return "important";
  return "information";
};

const serializeProduct = (product) => ({
  id: product._id.toString(),
  name: product.nom,
  sku: product.sku,
  stock: Number(product.stock || 0),
  threshold: Number(product.seuilAlerte || 0),
  dateExpiration: product.dateExpiration,
});

const notification = ({
  id,
  title,
  message,
  type = "info",
  priority,
  category = "systeme",
  href = "/dashboard",
  actionLabel = "Voir",
  actionHref,
  createdAt = new Date(),
  meta = {},
}) => ({
  sourceKey: id,
  title,
  message,
  type,
  priority: priority || priorityFromType(type),
  category,
  href,
  actionLabel,
  actionHref: actionHref || href,
  createdAt,
  meta,
});

const movementLabel = (type) => {
  if (type === "ENTREE") return "Entree de stock";
  if (type === "SORTIE") return "Sortie de stock";
  if (type === "AJUSTEMENT") return "Ajustement d'inventaire";
  return "Mouvement de stock";
};

const movementTypeTone = (type) => {
  if (type === "SORTIE") return "warning";
  if (type === "AJUSTEMENT") return "info";
  return "success";
};

const canSeeCategory = (req, category) => {
  if (req.user?.isOwner) return true;
  const permissions = req.user?.permissions || [];
  const hasAny = (...items) => items.some((permission) => permissions.includes(permission));

  if (["stock", "expiration"].includes(category)) return hasAny("VOIR_ALERTES_STOCK", "VOIR_LISTE_PRODUITS", "VOIR_NOTIFICATIONS_STOCK");
  if (["mouvement", "journal", "catalogue"].includes(category)) return hasAny("VOIR_MOUVEMENTS_STOCK", "VOIR_MES_OPERATIONS_INVENTAIRE", "VOIR_NOTIFICATIONS_STOCK");
  if (["vente", "caisse"].includes(category)) return hasAny("VOIR_HISTORIQUE_VENTES", "VOIR_MES_VENTES", "VOIR_RETOURS_CLIENTS", "VOIR_MES_RETOURS_CLIENTS", "VOIR_NOTIFICATIONS_CAISSE");
  if (category === "finance") return hasAny("VOIR_CHIFFRE_AFFAIRE", "VOIR_BENEFICES", "VOIR_NOTIFICATIONS_FINANCE");
  if (category === "securite") return hasAny("GERER_NOTIFICATIONS");
  return hasAny("VOIR_NOTIFICATIONS");
};

const getOrCreatePreferences = async (boutiqueId) => {
  const preferences = await NotificationPreference.findOneAndUpdate(
    { boutiqueId },
    { $setOnInsert: { boutiqueId, ...DEFAULT_PREFERENCES } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return preferences;
};

const syncGeneratedNotifications = async (boutiqueId, userId, items) => {
  if (!items.length) return;

  await Notification.bulkWrite(
    items.map((item) => ({
      updateOne: {
        filter: { boutiqueId, sourceKey: item.sourceKey },
        update: {
          $set: {
            title: item.title,
            message: item.message,
            type: item.type,
            priority: item.priority,
            category: item.category,
            href: item.href,
            actionLabel: item.actionLabel,
            actionHref: item.actionHref,
            meta: item.meta || {},
          },
          $setOnInsert: {
            boutiqueId,
            sourceKey: item.sourceKey,
            createdBy: userId || null,
            createdAt: item.createdAt || new Date(),
            readBy: [],
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );
};

const serializeNotification = (notificationDoc, userId) => {
  const readBy = notificationDoc.readBy || [];
  const read = readBy.some((id) => id?.toString() === userId?.toString());
  return {
    id: notificationDoc._id.toString(),
    sourceKey: notificationDoc.sourceKey,
    title: notificationDoc.title,
    message: notificationDoc.message,
    type: notificationDoc.type,
    priority: notificationDoc.priority,
    category: notificationDoc.category,
    href: notificationDoc.href,
    actionLabel: notificationDoc.actionLabel || "Voir",
    actionHref: notificationDoc.actionHref || notificationDoc.href,
    createdAt: notificationDoc.createdAt,
    updatedAt: notificationDoc.updatedAt,
    read,
    meta: notificationDoc.meta || {},
  };
};

const buildGeneratedNotifications = async (req, boutiqueId, preferences) => {
  await expireProductsIfNeeded(boutiqueId, req.user?.id);

  const now = new Date();
  const today = startOfDay(now);
  const yesterday = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const soon = endOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + Number(preferences.expirationWarningDays || 7)));
  const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));

  const [
    expiredProducts,
    expiringSoon,
    stockCandidates,
    recentReturns,
    monthlySales,
    recentSales,
    recentMovements,
    recentAudit,
    recentProducts,
    recentCategories,
  ] = await Promise.all([
    Produit.find({ boutiqueId, isDeleted: false, isExpired: true }).select("nom sku stock seuilAlerte dateExpiration expiredAt").sort({ expiredAt: -1 }).limit(8),
    Produit.find({ boutiqueId, isDeleted: false, isExpired: { $ne: true }, dateExpiration: { $gte: today, $lte: soon } }).select("nom sku stock seuilAlerte dateExpiration").sort({ dateExpiration: 1 }).limit(8),
    Produit.find({ boutiqueId, isDeleted: false, isActive: true }).select("nom sku stock seuilAlerte dateExpiration").sort({ stock: 1, nom: 1 }).limit(200),
    RetourClient.find({ boutiqueId, statut: "VALIDE", createdAt: { $gte: yesterday } }).select("reference clientNom montantTotalTTC createdAt").sort({ createdAt: -1 }).limit(8),
    Vente.find({ boutiqueId, statut: "PAYEE", createdAt: { $gte: monthStart } }).select("+margeEstimee totalTTC tvaMontant").limit(2000),
    Vente.find({ boutiqueId, createdAt: { $gte: yesterday } }).populate("utilisateurId", "nom prenom").select("reference clientNom totalTTC statut paiement createdAt utilisateurId").sort({ createdAt: -1 }).limit(10),
    MouvementStock.find({ boutiqueId, createdAt: { $gte: yesterday } }).populate("produitId", "nom sku").populate("utilisateurId", "nom prenom").sort({ createdAt: -1 }).limit(12),
    InventaireAudit.find({ boutiqueId, createdAt: { $gte: yesterday } }).populate("utilisateurId", "nom prenom").sort({ createdAt: -1 }).limit(10),
    Produit.find({ boutiqueId, isDeleted: false, createdAt: { $gte: yesterday } }).select("nom sku createdAt stock").sort({ createdAt: -1 }).limit(6),
    Categorie.find({ boutiqueId, createdAt: { $gte: yesterday } }).select("nom createdAt").sort({ createdAt: -1 }).limit(6),
  ]);

  const items = [];
  const globalThreshold = Number(preferences.stockThresholdGlobal || 0);
  const lowStockProducts = stockCandidates
    .filter((product) => Number(product.stock || 0) <= Math.max(Number(product.seuilAlerte || 0), globalThreshold))
    .slice(0, 8);

  expiredProducts.forEach((product) => {
    const data = serializeProduct(product);
    items.push(notification({
      id: "expired-" + data.id,
      title: "Produit expire",
      message: data.name + " a ete retire automatiquement du stock.",
      type: "danger",
      category: "expiration",
      href: "/dashboard/inventaire/produits",
      actionLabel: "Voir produit",
      actionHref: "/dashboard/inventaire/produits",
      createdAt: product.expiredAt || product.dateExpiration || now,
      meta: data,
    }));
  });

  expiringSoon.forEach((product) => {
    const data = serializeProduct(product);
    const daysLeft = Math.max(0, Math.ceil((new Date(product.dateExpiration).getTime() - today.getTime()) / 86400000));
    items.push(notification({
      id: "expiring-" + data.id,
      title: "Expiration proche",
      message: data.name + " expire dans " + daysLeft + " jour(s).",
      type: "warning",
      category: "expiration",
      href: "/dashboard/inventaire/produits",
      actionLabel: "Voir produit",
      actionHref: "/dashboard/inventaire/produits",
      createdAt: product.dateExpiration || now,
      meta: { ...data, daysLeft },
    }));
  });

  lowStockProducts.forEach((product) => {
    const data = serializeProduct(product);
    items.push(notification({
      id: "stock-" + data.id,
      title: data.stock <= 0 ? "Rupture de stock" : "Stock faible",
      message: data.name + " est a " + data.stock + " unite(s), seuil " + Math.max(data.threshold, globalThreshold) + ".",
      type: data.stock <= 0 ? "danger" : "warning",
      category: "stock",
      href: "/dashboard/inventaire/alertes",
      actionLabel: "Creer reapprovisionnement",
      actionHref: "/dashboard/inventaire/stock",
      meta: data,
    }));
  });

  if (preferences.receiveCashAlerts) {
    recentSales.forEach((sale) => {
      const statusLabel = sale.statut === "PAYEE" ? "payee" : sale.statut === "ANNULEE" ? "annulee" : "remboursee";
      items.push(notification({
        id: "sale-" + sale._id.toString(),
        title: "Vente " + statusLabel,
        message: sale.reference + " - " + (sale.clientNom || "Client comptoir") + " par " + userName(sale.utilisateurId) + ".",
        type: sale.statut === "PAYEE" ? "success" : "warning",
        category: "vente",
        href: "/dashboard/caisse/ventes",
        actionLabel: "Voir vente",
        actionHref: "/dashboard/caisse/ventes",
        createdAt: sale.createdAt,
        meta: { totalTTC: sale.totalTTC, paiement: sale.paiement },
      }));
    });

    recentReturns.forEach((item) => {
      items.push(notification({
        id: "return-" + item._id.toString(),
        title: "Retour client valide",
        message: item.reference + " - " + (item.clientNom || "Client comptoir") + ".",
        type: "info",
        category: "caisse",
        href: "/dashboard/caisse/retours",
        actionLabel: "Voir retour client",
        actionHref: "/dashboard/caisse/retours",
        createdAt: item.createdAt,
        meta: { amount: item.montantTotalTTC },
      }));
    });
  }

  recentMovements.forEach((movement) => {
    const productName = movement.produitId?.nom || "Produit archive";
    const author = userName(movement.utilisateurId);
    items.push(notification({
      id: "movement-" + movement._id.toString(),
      title: movementLabel(movement.type),
      message: productName + " : " + (movement.variation > 0 ? "+" : "") + movement.variation + " unite(s) par " + author + ".",
      type: movementTypeTone(movement.type),
      category: "mouvement",
      href: "/dashboard/inventaire/stock",
      actionLabel: "Voir mouvement",
      actionHref: "/dashboard/inventaire/stock",
      createdAt: movement.createdAt,
      meta: { reference: movement.reference, type: movement.type, variation: movement.variation },
    }));
  });

  recentAudit.forEach((entry) => {
    items.push(notification({
      id: "audit-" + entry._id.toString(),
      title: entry.action.replaceAll("_", " "),
      message: entry.label + " par " + userName(entry.utilisateurId) + ".",
      type: entry.action.includes("SUPPRESSION") || entry.action.includes("EXPIRE") ? "warning" : "info",
      category: "journal",
      href: "/dashboard/inventaire/stock",
      actionLabel: "Voir journal",
      actionHref: "/dashboard/inventaire/stock",
      createdAt: entry.createdAt,
      meta: { entityType: entry.entityType, entityId: entry.entityId },
    }));
  });

  recentProducts.forEach((product) => {
    items.push(notification({
      id: "product-created-" + product._id.toString(),
      title: "Nouveau produit",
      message: product.nom + " a ete ajoute au catalogue avec " + Number(product.stock || 0) + " unite(s).",
      type: "success",
      category: "catalogue",
      href: "/dashboard/inventaire/produits",
      actionLabel: "Voir produit",
      actionHref: "/dashboard/inventaire/produits",
      createdAt: product.createdAt,
      meta: { sku: product.sku },
    }));
  });

  recentCategories.forEach((category) => {
    items.push(notification({
      id: "category-created-" + category._id.toString(),
      title: "Nouvelle categorie",
      message: category.nom + " a ete creee dans le catalogue.",
      type: "success",
      category: "catalogue",
      href: "/dashboard/inventaire/categories",
      actionLabel: "Voir categorie",
      actionHref: "/dashboard/inventaire/categories",
      createdAt: category.createdAt,
    }));
  });

  const monthMargin = monthlySales.reduce((sum, sale) => sum + Number(sale.margeEstimee || 0), 0);
  if (monthMargin < 0) {
    items.push(notification({
      id: "finance-negative-margin",
      title: "Perte brute detectee",
      message: "La marge brute du mois est negative. Verifiez les prix et les couts sortis.",
      type: "danger",
      category: "finance",
      href: "/dashboard/finances",
      actionLabel: "Voir finances",
      actionHref: "/dashboard/finances",
    }));
  }

  return items.filter((item) => canSeeCategory(req, item.category));
};

export const getNotifications = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId || !mongoose.isValidObjectId(boutiqueId)) {
      return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    }
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }

    const preferences = await getOrCreatePreferences(boutiqueId);
    const generatedItems = await buildGeneratedNotifications(req, boutiqueId, preferences);
    await syncGeneratedNotifications(boutiqueId, req.user?._id || req.user?.id, generatedItems);

    const docs = await Notification.find({ boutiqueId })
      .sort({ priority: -1, updatedAt: -1, createdAt: -1 })
      .limit(200);

    const serialized = docs
      .map((item) => serializeNotification(item, req.user?._id || req.user?.id))
      .filter((item) => canSeeCategory(req, item.category))
      .sort((a, b) => {
        const priorityDiff = (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    return res.status(200).json({
      success: true,
      count: serialized.length,
      unreadCount: serialized.filter((item) => !item.read).length,
      notifications: serialized.slice(0, 120),
      preferences,
      summary: {
        danger: serialized.filter((item) => item.type === "danger").length,
        warning: serialized.filter((item) => item.type === "warning").length,
        success: serialized.filter((item) => item.type === "success").length,
        info: serialized.filter((item) => item.type === "info").length,
      },
    });
  } catch (error) {
    console.error("getNotifications:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger les notifications." });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(boutiqueId)) {
      return res.status(400).json({ success: false, message: "Notification invalide." });
    }
    const notificationDoc = await Notification.findOneAndUpdate(
      { _id: id, boutiqueId },
      { $addToSet: { readBy: req.user._id || req.user.id } },
      { new: true }
    );
    if (!notificationDoc) return res.status(404).json({ success: false, message: "Notification introuvable." });
    return res.status(200).json({ success: true, notification: serializeNotification(notificationDoc, req.user._id || req.user.id) });
  } catch (error) {
    console.error("markNotificationRead:", error);
    return res.status(500).json({ success: false, message: "Impossible de marquer la notification comme lue." });
  }
};

export const markNotificationUnread = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(boutiqueId)) {
      return res.status(400).json({ success: false, message: "Notification invalide." });
    }
    const notificationDoc = await Notification.findOneAndUpdate(
      { _id: id, boutiqueId },
      { $pull: { readBy: req.user._id || req.user.id } },
      { new: true }
    );
    if (!notificationDoc) return res.status(404).json({ success: false, message: "Notification introuvable." });
    return res.status(200).json({ success: true, notification: serializeNotification(notificationDoc, req.user._id || req.user.id) });
  } catch (error) {
    console.error("markNotificationUnread:", error);
    return res.status(500).json({ success: false, message: "Impossible de marquer la notification comme non lue." });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!mongoose.isValidObjectId(boutiqueId)) {
      return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    }
    await Notification.updateMany({ boutiqueId }, { $addToSet: { readBy: req.user._id || req.user.id } });
    return res.status(200).json({ success: true, message: "Toutes les notifications ont ete marquees comme lues." });
  } catch (error) {
    console.error("markAllNotificationsRead:", error);
    return res.status(500).json({ success: false, message: "Impossible de marquer les notifications comme lues." });
  }
};

export const getNotificationPreferences = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId || !mongoose.isValidObjectId(boutiqueId)) {
      return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    }
    const preferences = await getOrCreatePreferences(boutiqueId);
    return res.status(200).json({ success: true, preferences });
  } catch (error) {
    console.error("getNotificationPreferences:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger les preferences." });
  }
};

export const updateNotificationPreferences = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId || !mongoose.isValidObjectId(boutiqueId)) {
      return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    }

    const payload = {
      stockThresholdGlobal: Math.max(0, Number(req.body.stockThresholdGlobal ?? DEFAULT_PREFERENCES.stockThresholdGlobal)),
      expirationWarningDays: Math.min(365, Math.max(1, Number(req.body.expirationWarningDays ?? DEFAULT_PREFERENCES.expirationWarningDays))),
      receiveCashAlerts: Boolean(req.body.receiveCashAlerts),
      showEmployeeAlerts: Boolean(req.body.showEmployeeAlerts),
      onlyOwnerSensitiveAlerts: Boolean(req.body.onlyOwnerSensitiveAlerts),
    };

    const preferences = await NotificationPreference.findOneAndUpdate(
      { boutiqueId },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ success: true, message: "Preferences de notifications mises a jour.", preferences });
  } catch (error) {
    console.error("updateNotificationPreferences:", error);
    return res.status(500).json({ success: false, message: "Impossible de modifier les preferences." });
  }
};
