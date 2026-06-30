import mongoose from "mongoose";
import { Boutique, MouvementStock, Produit, RetourClient, Utilisateur, Vente } from "../models/Utilisateur.js";

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

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

const getDateRange = (query = {}) => {
  const period = String(query.period || "7").toLowerCase();
  const now = new Date();

  if (period === "today") {
    return { start: startOfDay(now), end: endOfDay(now), period: "today", label: "Aujourd'hui" };
  }

  if (period === "week" || period === "7") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    return { start, end: endOfDay(now), period: "7", label: "7 derniers jours" };
  }

  if (period === "month") {
    const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    return { start, end: endOfDay(now), period: "month", label: "Ce mois" };
  }

  if (period === "30") {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 29);
    return { start, end: endOfDay(now), period: "30", label: "30 derniers jours" };
  }

  if (period === "custom") {
    const start = query.startDate ? startOfDay(query.startDate) : null;
    const end = query.endDate ? endOfDay(query.endDate) : null;
    if (start && Number.isNaN(start.getTime())) return getDateRange({ period: "7" });
    if (end && Number.isNaN(end.getTime())) return getDateRange({ period: "7" });
    return { start, end, period: "custom", label: "Periode personnalisee" };
  }

  return getDateRange({ period: "7" });
};

const getPreviousRange = ({ start, end }) => {
  if (!start || !end) return {};
  const duration = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);
  return { start: previousStart, end: previousEnd };
};

const trendPercent = (current, previous) => {
  if (!previous) return current ? 100 : 0;
  return roundMoney(((current - previous) / Math.abs(previous)) * 100);
};

const createBucket = (date) => {
  const value = startOfDay(date);
  return {
    key: value.toISOString().slice(0, 10),
    name: value.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit" }),
    ventes: 0,
    benefices: 0,
  };
};

const buildDateBuckets = (range) => {
  if (!range.start || !range.end) return [];
  const buckets = [];
  const cursor = startOfDay(range.start);
  while (cursor <= range.end) {
    buckets.push(createBucket(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return buckets;
};

const buildBucketsFromSales = (sales) => {
  const days = [...new Set(
    sales
      .filter((sale) => sale.statut === "PAYEE")
      .map((sale) => new Date(sale.createdAt).toISOString().slice(0, 10))
  )].sort();
  return days.slice(-7).map((day) => createBucket(day));
};

const getSaleMargin = (sale) => {
  const taxable = Number(sale.taxableAmount || sale.sousTotalHT || 0);
  const cost = Number(sale.coutTotal || 0);
  return Number(sale.margeEstimee ?? (taxable - cost));
};

const getSaleTotal = (sale) => Number(sale.totalTTC || sale.taxableAmount || sale.sousTotalHT || 0);

const summarizeSales = (sales) => {
  return sales.reduce(
    (acc, sale) => {
      if (sale.statut !== "PAYEE") return acc;
      acc.ventes += 1;
      acc.caTTC += getSaleTotal(sale);
      acc.tva += Number(sale.tvaMontant || 0);
      acc.marge += getSaleMargin(sale);
      return acc;
    },
    { ventes: 0, caTTC: 0, tva: 0, marge: 0 }
  );
};

const serializeUserName = (user) => {
  const name = [user?.prenom, user?.nom].filter(Boolean).join(" ").trim();
  return name || "Utilisateur";
};

export const getDashboardOverview = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId || !mongoose.isValidObjectId(boutiqueId)) {
      return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    }

    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }

    const boutique = await Boutique.findById(boutiqueId).select("deviseParDefaut nom");
    const range = getDateRange(req.query);
    const previousRange = getPreviousRange(range);
    const dateFilter = {};
    if (range.start || range.end) {
      dateFilter.createdAt = {};
      if (range.start) dateFilter.createdAt.$gte = range.start;
      if (range.end) dateFilter.createdAt.$lte = range.end;
    }
    const previousDateFilter = {};
    if (previousRange.start || previousRange.end) {
      previousDateFilter.createdAt = {};
      if (previousRange.start) previousDateFilter.createdAt.$gte = previousRange.start;
      if (previousRange.end) previousDateFilter.createdAt.$lte = previousRange.end;
    }

    const objectBoutiqueId = new mongoose.Types.ObjectId(boutiqueId);
    const [sales, previousSales, chartFallbackSales, inventoryStatsResult, alertCount, priorityProducts, recentSales, activeUsers, movementsCount, returns] = await Promise.all([
      Vente.find({ boutiqueId, ...dateFilter }).select("+margeEstimee +coutTotal totalTTC tvaMontant taxableAmount sousTotalHT statut createdAt paiement utilisateurId deviseReference devise").populate("utilisateurId", "nom prenom").sort({ createdAt: 1 }).limit(2000),
      Vente.find({ boutiqueId, ...previousDateFilter }).select("+margeEstimee +coutTotal totalTTC tvaMontant taxableAmount sousTotalHT statut").limit(2000),
      Vente.find({ boutiqueId, statut: "PAYEE" }).select("+margeEstimee +coutTotal totalTTC tvaMontant taxableAmount sousTotalHT statut createdAt paiement utilisateurId deviseReference devise").sort({ createdAt: -1 }).limit(500),
      Produit.aggregate([
        { $match: { boutiqueId: objectBoutiqueId, isDeleted: false, isActive: true } },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalUnits: { $sum: "$stock" },
            stockValue: { $sum: { $multiply: ["$stock", "$prixAchat"] } },
          },
        },
      ]),
      Produit.countDocuments({ boutiqueId, isDeleted: false, isActive: true, $expr: { $lte: ["$stock", "$seuilAlerte"] } }),
      Produit.find({ boutiqueId, isDeleted: false, isActive: true, $expr: { $lte: ["$stock", "$seuilAlerte"] } })
        .select("nom stock seuilAlerte unite")
        .sort({ stock: 1, nom: 1 })
        .limit(6),
      Vente.find({ boutiqueId })
        .populate("utilisateurId", "nom prenom")
        .select("reference paiement totalTTC statut createdAt deviseReference devise utilisateurId")
        .sort({ createdAt: -1 })
        .limit(6),
      Utilisateur.find({ boutiqueActive: boutiqueId })
        .populate("roleId", "nom")
        .select("nom prenom email roleId isActive")
        .sort({ isActive: -1, prenom: 1, nom: 1 })
        .limit(6),
      MouvementStock.countDocuments({ boutiqueId, ...dateFilter }),
      RetourClient.find({ boutiqueId, ...dateFilter, statut: "VALIDE" }).select("montantTotalTTC"),
    ]);

    const paidSales = sales.filter((sale) => sale.statut === "PAYEE");
    const fallbackPaidSales = chartFallbackSales.filter((sale) => sale.statut === "PAYEE");
    const chartUsesFallback = paidSales.length === 0 && fallbackPaidSales.length > 0;
    const effectiveSales = chartUsesFallback ? fallbackPaidSales : sales;
    const currentSummary = summarizeSales(effectiveSales);
    const previousSummary = chartUsesFallback ? { ventes: 0, caTTC: 0, tva: 0, marge: 0 } : summarizeSales(previousSales);
    const inventoryStats = inventoryStatsResult[0] || { totalProducts: 0, totalUnits: 0, stockValue: 0 };
    const returnAmount = chartUsesFallback ? 0 : returns.reduce((sum, item) => sum + Number(item.montantTotalTTC || 0), 0);

    const chartSales = chartUsesFallback ? fallbackPaidSales : sales;
    const buckets = chartUsesFallback ? buildBucketsFromSales(chartFallbackSales) : buildDateBuckets(range);
    const bucketsByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    chartSales.forEach((sale) => {
      if (sale.statut !== "PAYEE") return;
      const key = new Date(sale.createdAt).toISOString().slice(0, 10);
      const bucket = bucketsByKey.get(key);
      if (!bucket) return;
      bucket.ventes += getSaleTotal(sale);
      bucket.benefices += getSaleMargin(sale);
    });

    const devise = boutique?.deviseParDefaut || effectiveSales.find((sale) => sale.deviseReference || sale.devise)?.deviseReference || "USD ($)";

    return res.status(200).json({
      success: true,
      devise,
      period: {
        period: range.period,
        label: chartUsesFallback ? "Dernieres ventes enregistrees" : range.label,
        startDate: range.start || null,
        endDate: range.end || null,
        chartFallback: chartUsesFallback,
      },
      metrics: {
        caTTC: roundMoney(currentSummary.caTTC),
        caTrend: trendPercent(currentSummary.caTTC, previousSummary.caTTC),
        ventes: currentSummary.ventes,
        ventesTrend: trendPercent(currentSummary.ventes, previousSummary.ventes),
        totalProducts: Number(inventoryStats.totalProducts || 0),
        totalUnits: roundMoney(inventoryStats.totalUnits || 0),
        stockValue: roundMoney(inventoryStats.stockValue || 0),
        alertCount,
        marge: roundMoney(currentSummary.marge),
        margeTrend: trendPercent(currentSummary.marge, previousSummary.marge),
        tauxMarge: currentSummary.caTTC > 0 ? roundMoney((currentSummary.marge / currentSummary.caTTC) * 100) : 0,
        tva: roundMoney(currentSummary.tva),
        retours: roundMoney(returnAmount),
        mouvements: movementsCount,
      },
      salesData: buckets.map((bucket) => ({
        name: bucket.name,
        ventes: roundMoney(bucket.ventes),
        benefices: roundMoney(bucket.benefices),
      })),
      topProducts: priorityProducts.map((product) => ({
        name: product.nom,
        stock: Number(product.stock || 0),
        threshold: Number(product.seuilAlerte || 0),
        unit: product.unite || "pcs",
      })),
      recentSales: recentSales.map((sale) => ({
        id: sale.reference,
        gerant: serializeUserName(sale.utilisateurId),
        methode: sale.paiement || "Non precise",
        montant: roundMoney(sale.totalTTC || 0),
        statut: sale.statut,
        date: sale.createdAt,
      })),
      activeUsers: activeUsers.map((user) => ({
        name: serializeUserName(user),
        role: user.roleId?.nom || "Proprietaire",
        status: user.isActive ? "online" : "offline",
        email: user.email,
      })),
    });
  } catch (error) {
    console.error("getDashboardOverview:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger la vue d'ensemble." });
  }
};
