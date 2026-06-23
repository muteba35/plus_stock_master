import mongoose from "mongoose";
import { Boutique, Categorie, Produit } from "../models/Utilisateur.js";
import { logInventoryAction } from "../utils/inventoryAudit.js";

const getBoutiqueId = (req) => {
  if (req.user?.isOwner && req.query?.boutiqueId) return req.query.boutiqueId;
  return req.user?.boutiqueActive || req.user?.boutiqueId;
};

const ensureBoutiqueAccess = async (req, boutiqueId) => {
  if (!req.user?.isOwner || !req.query?.boutiqueId) return true;
  return Boolean(await Boutique.exists({
    _id: boutiqueId,
    userId: req.user.id,
    isDeleted: false,
  }));
};

const serializeCategorie = (categorie, stats = {}) => ({
  ...categorie.toObject(),
  productCount: stats.productCount || 0,
  stockValues: stats.stockValues || [],
  saleValues: stats.saleValues || [],
});

export const getCategories = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId) {
      return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    }
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }

    const categories = await Categorie.find({ boutiqueId }).sort({ createdAt: -1 });
    const productStats = await Produit.aggregate([
      { $match: { boutiqueId: new mongoose.Types.ObjectId(boutiqueId), isDeleted: false } },
      { $group: {
        _id: {
          categorieId: "$categorieId",
          devise: { $ifNull: ["$devise", "USD ($)"] },
        },
        productCount: { $sum: 1 },
        stockValue: { $sum: { $multiply: ["$stock", "$prixAchat"] } },
        saleValue: { $sum: { $multiply: ["$stock", "$prixVente"] } },
      } },
    ]);
    const statsByCategory = new Map();
    productStats.forEach((stats) => {
      const categoryId = stats._id.categorieId.toString();
      const current = statsByCategory.get(categoryId) || { productCount: 0, stockValues: [], saleValues: [] };
      current.productCount += stats.productCount;
      current.stockValues.push({ devise: stats._id.devise, value: stats.stockValue });
      current.saleValues.push({ devise: stats._id.devise, value: stats.saleValue });
      statsByCategory.set(categoryId, current);
    });
    return res.status(200).json({
      success: true,
      results: categories.length,
      data: categories.map((category) => serializeCategorie(category, statsByCategory.get(category._id.toString()))),
    });
  } catch (error) {
    console.error("getCategories:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger les categories." });
  }
};

export const createCategorie = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const nom = String(req.body.nom || "").trim();
    const description = String(req.body.description || "").trim();
    const couleur = String(req.body.couleur || "#6366f1").trim();

    if (!boutiqueId) return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }
    if (!nom) return res.status(400).json({ success: false, message: "Le nom de la categorie est obligatoire." });

    const duplicate = await Categorie.findOne({ boutiqueId, nom }).collation({ locale: "fr", strength: 2 });
    if (duplicate) return res.status(409).json({ success: false, message: "Cette categorie existe deja dans la boutique." });

    const categorie = await Categorie.create({ nom, description, couleur, boutiqueId });
    await logInventoryAction({ boutiqueId, utilisateurId: req.user.id, action: "CATEGORIE_CREEE", entityType: "CATEGORIE", entityId: categorie._id, label: `Catégorie créée : ${categorie.nom}`, details: { nom: categorie.nom } });
    return res.status(201).json({ success: true, message: "Categorie creee avec succes.", data: serializeCategorie(categorie) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "Cette categorie existe deja dans la boutique." });
    if (error?.name === "ValidationError") return res.status(400).json({ success: false, message: Object.values(error.errors)[0]?.message || "Donnees invalides." });
    console.error("createCategorie:", error);
    return res.status(500).json({ success: false, message: "Impossible de creer la categorie." });
  }
};

export const importCategories = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    const rows = Array.isArray(req.body.categories) ? req.body.categories : [];

    if (!boutiqueId) return res.status(400).json({ success: false, message: "Boutique active introuvable." });
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }
    if (rows.length === 0) return res.status(400).json({ success: false, message: "Le fichier ne contient aucune categorie." });
    if (rows.length > 500) return res.status(400).json({ success: false, message: "Un import est limite a 500 categories." });

    const invalidRows = [];
    const seenNames = new Set();
    const normalizedRows = [];

    rows.forEach((row, index) => {
      const nom = String(row?.nom || "").trim();
      const description = String(row?.description || "").trim();
      const couleur = String(row?.couleur || "#6366f1").trim();
      const normalizedName = nom.toLocaleLowerCase("fr");

      if (!nom) {
        invalidRows.push({ line: index + 2, reason: "Nom manquant" });
      } else if (nom.length > 100) {
        invalidRows.push({ line: index + 2, reason: "Nom trop long" });
      } else if (description.length > 500) {
        invalidRows.push({ line: index + 2, reason: "Description trop longue" });
      } else if (!/^#[0-9A-Fa-f]{6}$/.test(couleur)) {
        invalidRows.push({ line: index + 2, reason: "Couleur invalide" });
      } else if (seenNames.has(normalizedName)) {
        invalidRows.push({ line: index + 2, reason: "Doublon dans le fichier" });
      } else {
        seenNames.add(normalizedName);
        normalizedRows.push({ nom, description, couleur, boutiqueId });
      }
    });

    const existing = await Categorie.find({
      boutiqueId,
      nom: { $in: normalizedRows.map((row) => row.nom) },
    }).collation({ locale: "fr", strength: 2 });
    const existingNames = new Set(existing.map((category) => category.nom.toLocaleLowerCase("fr")));
    const newRows = normalizedRows.filter((row) => !existingNames.has(row.nom.toLocaleLowerCase("fr")));

    let inserted = [];
    if (newRows.length > 0) inserted = await Categorie.insertMany(newRows, { ordered: false });
    if (inserted.length > 0) {
      await logInventoryAction({ boutiqueId, utilisateurId: req.user.id, action: "CATEGORIES_IMPORTEES", entityType: "CATEGORIE", label: `${inserted.length} catégorie(s) importée(s)`, details: { count: inserted.length } });
    }

    return res.status(201).json({
      success: true,
      message: `${inserted.length} categorie(s) importee(s) avec succes.`,
      data: {
        imported: inserted.length,
        skippedExisting: normalizedRows.length - newRows.length,
        invalid: invalidRows,
      },
    });
  } catch (error) {
    console.error("importCategories:", error);
    return res.status(500).json({ success: false, message: "Impossible d'importer les categories." });
  }
};

export const updateCategorie = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId || !mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Categorie ou boutique invalide." });
    }
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }

    const categorie = await Categorie.findOne({ _id: req.params.id, boutiqueId });
    if (!categorie) return res.status(404).json({ success: false, message: "Categorie introuvable." });

    if (req.body.nom !== undefined) {
      const nom = String(req.body.nom).trim();
      if (!nom) return res.status(400).json({ success: false, message: "Le nom de la categorie est obligatoire." });
      const duplicate = await Categorie.findOne({ boutiqueId, nom, _id: { $ne: categorie._id } }).collation({ locale: "fr", strength: 2 });
      if (duplicate) return res.status(409).json({ success: false, message: "Une autre categorie porte deja ce nom." });
      categorie.nom = nom;
    }
    if (req.body.description !== undefined) categorie.description = String(req.body.description).trim();
    if (req.body.couleur !== undefined) categorie.couleur = String(req.body.couleur).trim();
    if (req.body.isActive !== undefined) categorie.isActive = Boolean(req.body.isActive);

    await categorie.save();
    await logInventoryAction({ boutiqueId, utilisateurId: req.user.id, action: "CATEGORIE_MODIFIEE", entityType: "CATEGORIE", entityId: categorie._id, label: `Catégorie modifiée : ${categorie.nom}`, details: { nom: categorie.nom } });
    return res.status(200).json({ success: true, message: "Categorie mise a jour avec succes.", data: serializeCategorie(categorie) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "Une autre categorie porte deja ce nom." });
    if (error?.name === "ValidationError") return res.status(400).json({ success: false, message: Object.values(error.errors)[0]?.message || "Donnees invalides." });
    console.error("updateCategorie:", error);
    return res.status(500).json({ success: false, message: "Impossible de modifier la categorie." });
  }
};

export const deleteCategorie = async (req, res) => {
  try {
    const boutiqueId = getBoutiqueId(req);
    if (!boutiqueId || !mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Categorie ou boutique invalide." });
    }
    if (!(await ensureBoutiqueAccess(req, boutiqueId))) {
      return res.status(403).json({ success: false, message: "Cette boutique n'appartient pas a votre compte." });
    }

    const hasProducts = await Produit.exists({ categorieId: req.params.id, boutiqueId, isDeleted: false });
    if (hasProducts) {
      return res.status(409).json({ success: false, message: "Cette categorie contient encore des produits." });
    }

    const categorie = await Categorie.findOneAndDelete({ _id: req.params.id, boutiqueId });
    if (!categorie) return res.status(404).json({ success: false, message: "Categorie introuvable ou acces refuse." });
    await logInventoryAction({ boutiqueId, utilisateurId: req.user.id, action: "CATEGORIE_SUPPRIMEE", entityType: "CATEGORIE", entityId: categorie._id, label: `Catégorie supprimée : ${categorie.nom}`, details: { nom: categorie.nom } });
    return res.status(200).json({ success: true, message: "Categorie supprimee avec succes." });
  } catch (error) {
    console.error("deleteCategorie:", error);
    return res.status(500).json({ success: false, message: "Impossible de supprimer la categorie." });
  }
};

