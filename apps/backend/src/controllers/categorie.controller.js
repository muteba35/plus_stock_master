import mongoose from "mongoose";
import { Boutique, Categorie } from "../models/Utilisateur.js";

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

const serializeCategorie = (categorie) => ({
  ...categorie.toObject(),
  productCount: 0,
  stockValue: 0,
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
    return res.status(200).json({
      success: true,
      results: categories.length,
      data: categories.map(serializeCategorie),
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
    return res.status(201).json({ success: true, message: "Categorie creee avec succes.", data: serializeCategorie(categorie) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "Cette categorie existe deja dans la boutique." });
    if (error?.name === "ValidationError") return res.status(400).json({ success: false, message: Object.values(error.errors)[0]?.message || "Donnees invalides." });
    console.error("createCategorie:", error);
    return res.status(500).json({ success: false, message: "Impossible de creer la categorie." });
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

    const categorie = await Categorie.findOneAndDelete({ _id: req.params.id, boutiqueId });
    if (!categorie) return res.status(404).json({ success: false, message: "Categorie introuvable ou acces refuse." });
    return res.status(200).json({ success: true, message: "Categorie supprimee avec succes." });
  } catch (error) {
    console.error("deleteCategorie:", error);
    return res.status(500).json({ success: false, message: "Impossible de supprimer la categorie." });
  }
};
