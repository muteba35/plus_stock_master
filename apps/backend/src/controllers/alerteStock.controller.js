import mongoose from "mongoose";
import { Boutique, MouvementStock, Produit } from "../models/Utilisateur.js";

const getBoutiqueId = (req) => {
  if (req.user?.isOwner && req.query?.boutiqueId) return req.query.boutiqueId;
  return req.user?.boutiqueActive || req.user?.boutiqueId;
};

const ensureBoutiqueAccess = async (req, boutiqueId) => {
  if (!req.user?.isOwner || !req.query?.boutiqueId) return true;
  return Boolean(await Boutique.exists({ _id: boutiqueId, userId: req.user.id, isDeleted: false }));
};

export const getAlertesStock = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId || !mongoose.isValidObjectId(boutiqueId)) {
      return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    }
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }

    const products = await Produit.find({
      boutiqueId,
      isDeleted: false,
      isActive: true,
      $expr: { $lte: ["$stock", "$seuilAlerte"] },
    })
      .populate("categorieId", "nom couleur")
      .select("nom sku stock seuilAlerte unite categorieId updatedAt")
      .sort({ stock: 1, nom: 1 });

    const alerts = products.map((product) => {
      const data = product.toObject();
      const severity = data.stock <= 0 ? "RUPTURE" : "FAIBLE";
      return {
        ...data,
        severity,
        suggestedQuantity: Math.max((data.seuilAlerte * 2) - data.stock, data.seuilAlerte || 1),
      };
    });

    return res.status(200).json({
      success: true,
      data: alerts,
      summary: {
        total: alerts.length,
        ruptures: alerts.filter((alert) => alert.severity === "RUPTURE").length,
        lowStock: alerts.filter((alert) => alert.severity === "FAIBLE").length,
      },
    });
  } catch (error) {
    console.error("getAlertesStock:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger les alertes de stock." });
  }
};

export const reapprovisionnerProduit = async (req, res) => {
  let quantity = 0;
  let productUpdated = false;
  try {
    const boutiqueId = getBoutiqueId(req);
    const produitId = req.params.productId;
    quantity = Number(req.body.quantite);
    if (!boutiqueId || !mongoose.isValidObjectId(produitId)) {
      return res.status(400).json({ success: false, message: "Produit ou boutique invalide." });
    }
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ success: false, message: "La quantite de reapprovisionnement doit etre superieure a zero." });
    }

    const productBefore = await Produit.findOneAndUpdate(
      { _id: produitId, boutiqueId, isDeleted: false, isActive: true },
      { $inc: { stock: quantity } },
      { returnDocument: "before" }
    );
    if (!productBefore) return res.status(404).json({ success: false, message: "Produit introuvable ou inactif." });
    productUpdated = true;

    const movement = await MouvementStock.create({
      produitId,
      boutiqueId,
      utilisateurId: req.user.id,
      type: "ENTREE",
      quantite: quantity,
      variation: quantity,
      stockAvant: productBefore.stock,
      stockApres: productBefore.stock + quantity,
      motif: "Reapprovisionnement depuis une alerte de stock",
      reference: String(req.body.reference || "").trim() || `REA-${Date.now().toString(36).toUpperCase()}`,
    });

    return res.status(201).json({
      success: true,
      message: "Produit reapprovisionne avec succes.",
      data: { movement, stock: productBefore.stock + quantity },
    });
  } catch (error) {
    if (productUpdated) {
      await Produit.updateOne({ _id: req.params.productId }, { $inc: { stock: -quantity } }).catch(() => undefined);
    }
    console.error("reapprovisionnerProduit:", error);
    return res.status(500).json({ success: false, message: "Impossible de reapprovisionner le produit." });
  }
};
