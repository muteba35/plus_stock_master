import jwt from "jsonwebtoken";
import { Boutique, Permission, Utilisateur } from "../models/Utilisateur.js";

const normalizeBoutique = (boutique, activeId) => ({
  id: boutique._id,
  nom: boutique.nom,
  secteurActivite: boutique.secteurActivite,
  deviseParDefaut: boutique.deviseParDefaut,
  tailleBusiness: boutique.tailleBusiness,
  plan: boutique.plan,
  statutPaiement: boutique.statutPaiement,
  trialExpiresAt: boutique.trialExpiresAt,
  isActive: boutique._id.toString() === String(activeId || ""),
  createdAt: boutique.createdAt,
});

const getOwnerPermissions = async () => {
  const permissions = await Permission.find({});
  return permissions.map((permission) => permission.nom);
};

const createSessionPayload = async (userId, boutiqueId) => {
  const permissions = await getOwnerPermissions();
  const token = jwt.sign(
    {
      id: userId,
      boutiqueId,
      permissions,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { token, permissions };
};

export const getBoutiques = async (req, res) => {
  try {
    const boutiques = await Boutique.find({
      userId: req.user.id,
      isDeleted: false,
    }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      boutiques: boutiques.map((boutique) => normalizeBoutique(boutique, req.user.boutiqueId)),
    });
  } catch (error) {
    console.error("Erreur getBoutiques:", error);
    return res.status(500).json({ message: "Erreur lors du chargement des boutiques." });
  }
};

export const createBoutique = async (req, res) => {
  try {
    const { nom, secteurActivite, deviseParDefaut, tailleBusiness } = req.body;

    const cleanNom = String(nom || "").trim();
    if (!cleanNom || !secteurActivite || !deviseParDefaut || !tailleBusiness) {
      return res.status(400).json({ message: "Tous les champs de la boutique sont requis." });
    }

    const existingBoutique = await Boutique.findOne({
      userId: req.user.id,
      nom: cleanNom,
      isDeleted: false,
    });

    if (existingBoutique) {
      return res.status(400).json({ message: "Vous avez deja une boutique avec ce nom." });
    }

    const boutique = await Boutique.create({
      nom: cleanNom,
      userId: req.user.id,
      secteurActivite,
      deviseParDefaut,
      tailleBusiness,
    });

    const user = await Utilisateur.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    user.boutiqueActive = boutique._id;
    await user.save();

    const { token, permissions } = await createSessionPayload(user._id, boutique._id);

    return res.status(201).json({
      success: true,
      message: "Boutique creee et activee avec succes.",
      boutique: normalizeBoutique(boutique, boutique._id),
      token,
      permissions,
    });
  } catch (error) {
    console.error("Erreur createBoutique:", error);
    return res.status(500).json({ message: "Erreur lors de la creation de la boutique." });
  }
};

export const setActiveBoutique = async (req, res) => {
  try {
    const { id } = req.params;

    const boutique = await Boutique.findOne({
      _id: id,
      userId: req.user.id,
      isDeleted: false,
    });

    if (!boutique) {
      return res.status(404).json({ message: "Boutique introuvable pour ce compte." });
    }

    const user = await Utilisateur.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    user.boutiqueActive = boutique._id;
    await user.save();

    const { token, permissions } = await createSessionPayload(user._id, boutique._id);

    return res.status(200).json({
      success: true,
      message: "Boutique active changee avec succes.",
      boutique: normalizeBoutique(boutique, boutique._id),
      token,
      permissions,
    });
  } catch (error) {
    console.error("Erreur setActiveBoutique:", error);
    return res.status(500).json({ message: "Erreur lors du changement de boutique active." });
  }
};
