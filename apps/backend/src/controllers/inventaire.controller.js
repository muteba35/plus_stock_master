import mongoose from "mongoose";
import { Boutique, Categorie, MouvementStock, Produit } from "../models/Utilisateur.js";

const getBoutiqueId = (req) => {
  if (req.user?.isOwner && req.query?.boutiqueId) return req.query.boutiqueId;
  return req.user?.boutiqueActive || req.user?.boutiqueId;
};

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const ensureBoutiqueAccess = async (req, boutiqueId) => {
  if (!req.user?.isOwner || !req.query?.boutiqueId) return true;
  return Boolean(await Boutique.exists({ _id: boutiqueId, userId: req.user.id, isDeleted: false }));
};

export const getVueGlobaleInventaire = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId || !mongoose.isValidObjectId(boutiqueId)) {
      return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    }
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }

    const objectBoutiqueId = new mongoose.Types.ObjectId(boutiqueId);
    const canViewPurchasePrice = req.user?.isOwner || req.user?.permissions?.includes("VOIR_PRIX_ACHAT");
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [productStatsResult, valuationByCurrency, movementsToday, categoriesActive, recentMovements, priorityProducts] = await Promise.all([
      Produit.aggregate([
        { $match: { boutiqueId: objectBoutiqueId, isDeleted: false, isActive: true } },
        { $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          stockValue: { $sum: { $multiply: ["$stock", canViewPurchasePrice ? "$prixAchat" : "$prixVente"] } },
          available: { $sum: { $cond: [{ $gt: ["$stock", "$seuilAlerte"] }, 1, 0] } },
          lowStock: { $sum: { $cond: [{ $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$seuilAlerte"] }] }, 1, 0] } },
          outOfStock: { $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] } },
          totalUnits: { $sum: "$stock" },
        } },
      ]),
      Produit.aggregate([
        { $match: { boutiqueId: objectBoutiqueId, isDeleted: false, isActive: true } },
        { $group: {
          _id: { $ifNull: ["$devise", "USD ($)"] },
          value: { $sum: { $multiply: ["$stock", canViewPurchasePrice ? "$prixAchat" : "$prixVente"] } },
        } },
        { $sort: { _id: 1 } },
      ]),
      MouvementStock.countDocuments({ boutiqueId, createdAt: { $gte: startOfDay } }),
      Categorie.countDocuments({ boutiqueId, isActive: true }),
      MouvementStock.find({ boutiqueId })
        .populate("produitId", "nom sku unite")
        .populate("utilisateurId", "nom prenom")
        .sort({ createdAt: -1 })
        .limit(5),
      Produit.find({ boutiqueId, isDeleted: false, isActive: true, $expr: { $lte: ["$stock", "$seuilAlerte"] } })
        .populate("categorieId", "nom couleur")
        .select("nom sku stock seuilAlerte unite categorieId")
        .sort({ stock: 1, nom: 1 })
        .limit(5),
    ]);

    const stats = productStatsResult[0] || { totalProducts: 0, stockValue: 0, available: 0, lowStock: 0, outOfStock: 0, totalUnits: 0 };
    return res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalProducts: stats.totalProducts,
          stockValues: valuationByCurrency.map((item) => ({ devise: item._id, value: item.value })),
          movementsToday,
          categoriesActive,
          totalUnits: stats.totalUnits,
          valuationType: canViewPurchasePrice ? "achat" : "vente",
        },
        health: {
          available: stats.available,
          lowStock: stats.lowStock,
          outOfStock: stats.outOfStock,
          alertCount: stats.lowStock + stats.outOfStock,
        },
        recentMovements,
        priorityProducts: priorityProducts.map((product) => ({
          ...product.toObject(),
          severity: product.stock <= 0 ? "RUPTURE" : "FAIBLE",
        })),
      },
    });
  } catch (error) {
    console.error("getVueGlobaleInventaire:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger la vue globale de l'inventaire." });
  }
};

export const getProjectionProduits = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId || !mongoose.isValidObjectId(boutiqueId)) {
      return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    }
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }

    const products = await Produit.find({ boutiqueId, isDeleted: false, isActive: true })
      .select("+prixAchat nom sku categorieId prixVente devise stock unite")
      .populate("categorieId", "nom couleur")
      .sort({ nom: 1 });

    const categoriesMap = new Map();
    const productRows = products.map((product) => {
      const quantiteActuelle = Number(product.stock || 0);
      const prixAchatUnitaire = Number(product.prixAchat || 0);
      const prixVenteUnitaire = Number(product.prixVente || 0);
      const margeUnitaire = prixVenteUnitaire - prixAchatUnitaire;
      const margeTotale = margeUnitaire * quantiteActuelle;
      const categoryName = product.categorieId?.nom || "Non classé";
      const devise = product.devise || "USD ($)";

      const category = categoriesMap.get(categoryName) || {
        produit: categoryName,
        sku: "",
        categorie: categoryName,
        devise,
        quantiteActuelle: 0,
        totalPrixAchat: 0,
        totalPrixVente: 0,
        margeTotale: 0,
        produits: 0,
      };
      category.quantiteActuelle += quantiteActuelle;
      category.totalPrixAchat += prixAchatUnitaire * quantiteActuelle;
      category.totalPrixVente += prixVenteUnitaire * quantiteActuelle;
      category.margeTotale += margeTotale;
      category.produits += 1;
      categoriesMap.set(categoryName, category);

      return {
        produit: product.nom,
        sku: product.sku,
        categorie: categoryName,
        devise,
        unite: product.unite || "Pièce",
        quantiteActuelle: roundMoney(quantiteActuelle),
        prixAchatUnitaire: roundMoney(prixAchatUnitaire),
        prixVenteUnitaire: roundMoney(prixVenteUnitaire),
        margeUnitaire: roundMoney(margeUnitaire),
        margeTotale: roundMoney(margeTotale),
        tauxMarge: prixVenteUnitaire > 0 ? roundMoney((margeUnitaire / prixVenteUnitaire) * 100) : 0,
      };
    });

    const categoryRows = [...categoriesMap.values()].map((item) => {
      const prixAchatUnitaire = item.quantiteActuelle > 0 ? item.totalPrixAchat / item.quantiteActuelle : 0;
      const prixVenteUnitaire = item.quantiteActuelle > 0 ? item.totalPrixVente / item.quantiteActuelle : 0;
      const margeUnitaire = prixVenteUnitaire - prixAchatUnitaire;
      return {
        produit: item.produit,
        sku: "",
        categorie: item.categorie,
        devise: item.devise,
        unite: "unités",
        quantiteActuelle: roundMoney(item.quantiteActuelle),
        prixAchatUnitaire: roundMoney(prixAchatUnitaire),
        prixVenteUnitaire: roundMoney(prixVenteUnitaire),
        margeUnitaire: roundMoney(margeUnitaire),
        margeTotale: roundMoney(item.margeTotale),
        tauxMarge: prixVenteUnitaire > 0 ? roundMoney((margeUnitaire / prixVenteUnitaire) * 100) : 0,
        produits: item.produits,
      };
    });

    const totalQuantity = productRows.reduce((sum, row) => sum + Number(row.quantiteActuelle || 0), 0);
    const totalMargin = productRows.reduce((sum, row) => sum + Number(row.margeTotale || 0), 0);
    const totalSalesValue = productRows.reduce((sum, row) => sum + Number(row.prixVenteUnitaire || 0) * Number(row.quantiteActuelle || 0), 0);
    const devise = productRows[0]?.devise || "USD ($)";

    return res.status(200).json({
      success: true,
      devise,
      metrics: {
        produitsAnalyses: productRows.length,
        categoriesAnalysees: categoryRows.length,
        quantiteActuelle: roundMoney(totalQuantity),
        margeTotale: roundMoney(totalMargin),
        margeUnitaireMoyenne: totalQuantity > 0 ? roundMoney(totalMargin / totalQuantity) : 0,
        tauxMargeMoyen: totalSalesValue > 0 ? roundMoney((totalMargin / totalSalesValue) * 100) : 0,
      },
      products: productRows.sort((a, b) => b.margeTotale - a.margeTotale),
      categories: categoryRows.sort((a, b) => b.margeTotale - a.margeTotale),
    });
  } catch (error) {
    console.error("getProjectionProduits:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger la projection produits." });
  }
};
