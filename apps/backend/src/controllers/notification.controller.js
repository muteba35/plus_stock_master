import mongoose from "mongoose";
import { Boutique, Categorie, InventaireAudit, MouvementStock, Produit, RetourClient, Vente } from "../models/Utilisateur.js";
import { expireProductsIfNeeded } from "./produit.controller.js";

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

const serializeProduct = (product) => ({
  id: product._id.toString(),
  name: product.nom,
  sku: product.sku,
  stock: Number(product.stock || 0),
  threshold: Number(product.seuilAlerte || 0),
  dateExpiration: product.dateExpiration,
});

const notification = ({ id, title, message, type = "info", category = "systeme", href = "/dashboard", createdAt = new Date(), meta = {} }) => ({
  id,
  title,
  message,
  type,
  category,
  href,
  createdAt,
  meta,
});

const movementLabel = (type) => {
  if (type === "ENTREE") return "Entrée de stock";
  if (type === "SORTIE") return "Sortie de stock";
  if (type === "AJUSTEMENT") return "Ajustement d'inventaire";
  return "Mouvement de stock";
};

const movementTypeTone = (type) => {
  if (type === "SORTIE") return "warning";
  if (type === "AJUSTEMENT") return "info";
  return "success";
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

    await expireProductsIfNeeded(boutiqueId, req.user?.id);

    const now = new Date();
    const today = startOfDay(now);
    const yesterday = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const soon = endOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
    const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));

    const [
      expiredProducts,
      expiringSoon,
      lowStockProducts,
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
      Produit.find({ boutiqueId, isDeleted: false, isActive: true, $expr: { $lte: ["$stock", "$seuilAlerte"] } }).select("nom sku stock seuilAlerte dateExpiration").sort({ stock: 1, nom: 1 }).limit(8),
      RetourClient.find({ boutiqueId, statut: "VALIDE", createdAt: { $gte: yesterday } }).select("reference clientNom montantTotalTTC createdAt").sort({ createdAt: -1 }).limit(8),
      Vente.find({ boutiqueId, statut: "PAYEE", createdAt: { $gte: monthStart } }).select("+margeEstimee totalTTC tvaMontant").limit(2000),
      Vente.find({ boutiqueId, createdAt: { $gte: yesterday } }).populate("utilisateurId", "nom prenom").select("reference clientNom totalTTC statut paiement createdAt utilisateurId").sort({ createdAt: -1 }).limit(10),
      MouvementStock.find({ boutiqueId, createdAt: { $gte: yesterday } }).populate("produitId", "nom sku").populate("utilisateurId", "nom prenom").sort({ createdAt: -1 }).limit(12),
      InventaireAudit.find({ boutiqueId, createdAt: { $gte: yesterday } }).populate("utilisateurId", "nom prenom").sort({ createdAt: -1 }).limit(10),
      Produit.find({ boutiqueId, isDeleted: false, createdAt: { $gte: yesterday } }).select("nom sku createdAt stock").sort({ createdAt: -1 }).limit(6),
      Categorie.find({ boutiqueId, createdAt: { $gte: yesterday } }).select("nom createdAt").sort({ createdAt: -1 }).limit(6),
    ]);

    const items = [];

    expiredProducts.forEach((product) => {
      const data = serializeProduct(product);
      items.push(notification({
        id: "expired-" + data.id,
        title: "Produit expiré",
        message: data.name + " a été retiré automatiquement du stock.",
        type: "danger",
        category: "expiration",
        href: "/dashboard/inventaire/produits",
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
        createdAt: product.dateExpiration || now,
        meta: { ...data, daysLeft },
      }));
    });

    lowStockProducts.forEach((product) => {
      const data = serializeProduct(product);
      items.push(notification({
        id: "stock-" + data.id,
        title: data.stock <= 0 ? "Rupture de stock" : "Stock faible",
        message: data.name + " est à " + data.stock + " unité(s), seuil " + data.threshold + ".",
        type: data.stock <= 0 ? "danger" : "warning",
        category: "stock",
        href: "/dashboard/inventaire/alertes",
        meta: data,
      }));
    });

    recentMovements.forEach((movement) => {
      const productName = movement.produitId?.nom || "Produit archive";
      const author = userName(movement.utilisateurId);
      items.push(notification({
        id: "movement-" + movement._id.toString(),
        title: movementLabel(movement.type),
        message: productName + " : " + (movement.variation > 0 ? "+" : "") + movement.variation + " unité(s) par " + author + ".",
        type: movementTypeTone(movement.type),
        category: "mouvement",
        href: "/dashboard/inventaire/stock",
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
        createdAt: entry.createdAt,
        meta: { entityType: entry.entityType, entityId: entry.entityId },
      }));
    });

    recentSales.forEach((sale) => {
      const statusLabel = sale.statut === "PAYEE" ? "payée" : sale.statut === "ANNULEE" ? "annulée" : "remboursée";
      items.push(notification({
        id: "sale-" + sale._id.toString(),
        title: "Vente " + statusLabel,
        message: sale.reference + " - " + (sale.clientNom || "Client comptoir") + " par " + userName(sale.utilisateurId) + ".",
        type: sale.statut === "PAYEE" ? "success" : "warning",
        category: "vente",
        href: "/dashboard/caisse/ventes",
        createdAt: sale.createdAt,
        meta: { totalTTC: sale.totalTTC, paiement: sale.paiement },
      }));
    });

    recentReturns.forEach((item) => {
      items.push(notification({
        id: "return-" + item._id.toString(),
        title: "Retour client validé",
        message: item.reference + " - " + (item.clientNom || "Client comptoir") + ".",
        type: "info",
        category: "caisse",
        href: "/dashboard/caisse/retours",
        createdAt: item.createdAt,
        meta: { amount: item.montantTotalTTC },
      }));
    });

    recentProducts.forEach((product) => {
      items.push(notification({
        id: "product-created-" + product._id.toString(),
        title: "Nouveau produit",
        message: product.nom + " a été ajouté au catalogue avec " + Number(product.stock || 0) + " unité(s).",
        type: "success",
        category: "catalogue",
        href: "/dashboard/inventaire/produits",
        createdAt: product.createdAt,
        meta: { sku: product.sku },
      }));
    });

    recentCategories.forEach((category) => {
      items.push(notification({
        id: "category-created-" + category._id.toString(),
        title: "Nouvelle catégorie",
        message: category.nom + " a été créée dans le catalogue.",
        type: "success",
        category: "catalogue",
        href: "/dashboard/inventaire/categories",
        createdAt: category.createdAt,
      }));
    });

    const monthMargin = monthlySales.reduce((sum, sale) => sum + Number(sale.margeEstimee || 0), 0);
    if (monthMargin < 0) {
      items.push(notification({
        id: "finance-negative-margin",
        title: "Perte brute détectée",
        message: "La marge brute du mois est négative. Vérifiez les prix et les coûts sortis.",
        type: "danger",
        category: "finance",
        href: "/dashboard/finances",
      }));
    }

    const unique = new Map();
    items.forEach((item) => unique.set(item.id, item));
    const sorted = [...unique.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.status(200).json({
      success: true,
      count: sorted.length,
      unreadCount: sorted.length,
      notifications: sorted.slice(0, 80),
      summary: {
        danger: sorted.filter((item) => item.type === "danger").length,
        warning: sorted.filter((item) => item.type === "warning").length,
        success: sorted.filter((item) => item.type === "success").length,
        info: sorted.filter((item) => item.type === "info").length,
      },
    });
  } catch (error) {
    console.error("getNotifications:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger les notifications." });
  }
};
