import mongoose from "mongoose";
import { Boutique, InventaireAudit, MouvementStock, Produit } from "../models/Utilisateur.js";
import { logInventoryAction } from "../utils/inventoryAudit.js";

const getBoutiqueId = (req) => {
  if (req.user?.isOwner && req.query?.boutiqueId) return req.query.boutiqueId;
  return req.user?.boutiqueActive || req.user?.boutiqueId;
};

const ensureBoutiqueAccess = async (req, boutiqueId) => {
  if (!req.user?.isOwner || !req.query?.boutiqueId) return true;
  return Boolean(await Boutique.exists({ _id: boutiqueId, userId: req.user.id, isDeleted: false }));
};

const movementReference = () => `MVT-${Date.now().toString(36).toUpperCase()}`;

export const getMouvements = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId) return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }

    const canViewAllOperations =
      req.user?.isOwner || req.user?.permissions?.includes("VOIR_MOUVEMENTS_STOCK");
    const operationFilter = canViewAllOperations
      ? { boutiqueId }
      : { boutiqueId, utilisateurId: req.user.id };

    const movements = await MouvementStock.find(operationFilter)
      .populate("produitId", "nom sku unite")
      .populate("utilisateurId", "nom prenom")
      .sort({ createdAt: -1 })
      .limit(500);
    const products = await Produit.find({ boutiqueId, isDeleted: false, isActive: true })
      .select("nom sku stock unite")
      .sort({ nom: 1 });
    const journal = await InventaireAudit.find(operationFilter)
      .populate("utilisateurId", "nom prenom")
      .sort({ createdAt: -1 })
      .limit(500);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const [summary = {}] = await MouvementStock.aggregate([
      { $match: {
        boutiqueId: new mongoose.Types.ObjectId(boutiqueId),
        ...(!canViewAllOperations ? { utilisateurId: new mongoose.Types.ObjectId(req.user.id) } : {}),
        createdAt: { $gte: startOfMonth },
      } },
      { $group: {
        _id: null,
        entries: { $sum: { $cond: [{ $eq: ["$type", "ENTREE"] }, "$quantite", 0] } },
        exits: { $sum: { $cond: [{ $eq: ["$type", "SORTIE"] }, "$quantite", 0] } },
        adjustments: { $sum: { $cond: [{ $eq: ["$type", "AJUSTEMENT"] }, 1, 0] } },
      } },
    ]);

    return res.status(200).json({
      success: true,
      data: movements,
      products,
      journal,
      scope: canViewAllOperations ? "all" : "own",
      summary: { entries: summary.entries || 0, exits: summary.exits || 0, adjustments: summary.adjustments || 0 },
    });
  } catch (error) {
    console.error("getMouvements:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger les mouvements de stock." });
  }
};

export const createMouvement = async (req, res) => {
  let rollback = null;
  try {
    const boutiqueId = getBoutiqueId(req);
    const type = String(req.body.type || "").toUpperCase();
    const quantite = Number(req.body.quantite);
    const motif = String(req.body.motif || "").trim();
    const produitId = req.body.produitId;

    if (!boutiqueId || !mongoose.isValidObjectId(produitId)) {
      return res.status(400).json({ success: false, message: "Produit ou boutique invalide." });
    }
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }
    if (!["ENTREE", "SORTIE", "AJUSTEMENT"].includes(type)) {
      return res.status(400).json({ success: false, message: "Type de mouvement invalide." });
    }
    if (!Number.isFinite(quantite) || quantite < 0 || (type !== "AJUSTEMENT" && quantite === 0)) {
      return res.status(400).json({ success: false, message: "La quantite indiquee est invalide." });
    }
    if (!motif) return res.status(400).json({ success: false, message: "Le motif du mouvement est obligatoire." });

    const filter = { _id: produitId, boutiqueId, isDeleted: false, isActive: true };
    let productBefore;
    let stockBefore;
    let stockAfter;
    let variation;

    if (type === "ENTREE") {
      productBefore = await Produit.findOneAndUpdate(filter, { $inc: { stock: quantite } }, { returnDocument: "before" });
      if (!productBefore) return res.status(404).json({ success: false, message: "Produit introuvable ou inactif." });
      stockBefore = productBefore.stock;
      stockAfter = stockBefore + quantite;
      variation = quantite;
      rollback = () => Produit.updateOne({ _id: produitId }, { $inc: { stock: -quantite } });
    } else if (type === "SORTIE") {
      productBefore = await Produit.findOneAndUpdate({ ...filter, stock: { $gte: quantite } }, { $inc: { stock: -quantite } }, { returnDocument: "before" });
      if (!productBefore) {
        const exists = await Produit.exists(filter);
        return res.status(exists ? 409 : 404).json({ success: false, message: exists ? "Stock insuffisant pour effectuer cette sortie." : "Produit introuvable ou inactif." });
      }
      stockBefore = productBefore.stock;
      stockAfter = stockBefore - quantite;
      variation = -quantite;
      rollback = () => Produit.updateOne({ _id: produitId }, { $inc: { stock: quantite } });
    } else {
      productBefore = await Produit.findOneAndUpdate(filter, { $set: { stock: quantite } }, { returnDocument: "before" });
      if (!productBefore) return res.status(404).json({ success: false, message: "Produit introuvable ou inactif." });
      stockBefore = productBefore.stock;
      stockAfter = quantite;
      variation = quantite - stockBefore;
      if (variation === 0) {
        rollback = null;
        return res.status(400).json({ success: false, message: "Le stock compte est identique au stock actuel. Aucun ajustement necessaire." });
      }
      rollback = () => Produit.updateOne({ _id: produitId }, { $set: { stock: stockBefore } });
    }

    const movement = await MouvementStock.create({
      produitId,
      boutiqueId,
      utilisateurId: req.user.id,
      type,
      quantite: type === "AJUSTEMENT" ? Math.abs(variation) : quantite,
      variation,
      stockAvant: stockBefore,
      stockApres: stockAfter,
      motif,
      reference: String(req.body.reference || "").trim() || movementReference(),
    });
    rollback = null;
    await movement.populate("produitId", "nom sku unite");
    await movement.populate("utilisateurId", "nom prenom");
    await logInventoryAction({ boutiqueId, utilisateurId: req.user.id, action: `MOUVEMENT_${type}`, entityType: "MOUVEMENT_STOCK", entityId: movement._id, label: `${type === "ENTREE" ? "Entrée" : type === "SORTIE" ? "Sortie" : "Ajustement"} de stock : ${movement.produitId?.nom || "Produit"}`, details: { variation, stockAvant: stockBefore, stockApres: stockAfter, reference: movement.reference } });

    return res.status(201).json({ success: true, message: "Mouvement enregistre avec succes.", data: movement });
  } catch (error) {
    if (rollback) await rollback().catch(() => undefined);
    console.error("createMouvement:", error);
    if (error?.name === "ValidationError") return res.status(400).json({ success: false, message: Object.values(error.errors)[0]?.message || "Donnees invalides." });
    return res.status(500).json({ success: false, message: "Impossible d'enregistrer le mouvement." });
  }
};
