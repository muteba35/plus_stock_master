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

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const assertOwnerAccount = async (req, res) => {
  const user = await Utilisateur.findById(req.user.id).populate("boutiqueActive");

  if (!user) {
    res.status(404).json({ message: "Utilisateur introuvable." });
    return null;
  }

  const isOwner = !user.roleId && (
    !user.boutiqueActive || user.boutiqueActive.userId?.toString() === user._id.toString()
  );
  if (!isOwner) {
    res.status(403).json({ message: "Seul le proprietaire du compte peut gerer les boutiques." });
    return null;
  }

  return user;
};

export const getBoutiques = async (req, res) => {
  try {
    const user = await assertOwnerAccount(req, res);
    if (!user) return;

    const boutiques = await Boutique.find({
      userId: user._id,
      isDeleted: false,
    }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      boutiques: boutiques.map((boutique) => normalizeBoutique(boutique, user.boutiqueActive?._id)),
    });
  } catch (error) {
    console.error("Erreur getBoutiques:", error);
    return res.status(500).json({ message: "Erreur lors du chargement des boutiques." });
  }
};

export const createBoutique = async (req, res) => {
  try {
    const user = await assertOwnerAccount(req, res);
    if (!user) return;

    const { nom, secteurActivite, deviseParDefaut, tailleBusiness } = req.body;

    const cleanNom = String(nom || "").trim();
    if (!cleanNom || !secteurActivite || !deviseParDefaut || !tailleBusiness) {
      return res.status(400).json({ message: "Tous les champs de la boutique sont requis." });
    }

    const existingBoutique = await Boutique.findOne({
      userId: user._id,
      nom: { $regex: `^${escapeRegex(cleanNom)}$`, $options: "i" },
      isDeleted: false,
    });

    if (existingBoutique) {
      return res.status(400).json({ message: "Vous avez deja une boutique avec ce nom." });
    }

    const boutique = await Boutique.create({
      nom: cleanNom,
      userId: user._id,
      secteurActivite,
      deviseParDefaut,
      tailleBusiness,
    });

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

export const updateBoutique = async (req, res) => {
  try {
    const user = await assertOwnerAccount(req, res);
    if (!user) return;

    const { id } = req.params;
    const { nom, secteurActivite, deviseParDefaut, tailleBusiness } = req.body;
    const cleanNom = String(nom || "").trim();

    if (!cleanNom || !secteurActivite || !deviseParDefaut || !tailleBusiness) {
      return res.status(400).json({ message: "Tous les champs de la boutique sont requis." });
    }

    const boutique = await Boutique.findOne({
      _id: id,
      userId: user._id,
      isDeleted: false,
    });

    if (!boutique) {
      return res.status(404).json({ message: "Boutique introuvable pour ce compte." });
    }

    const duplicate = await Boutique.findOne({
      _id: { $ne: boutique._id },
      userId: user._id,
      nom: { $regex: `^${escapeRegex(cleanNom)}$`, $options: "i" },
      isDeleted: false,
    });

    if (duplicate) {
      return res.status(400).json({ message: "Une autre boutique porte deja ce nom." });
    }

    boutique.nom = cleanNom;
    boutique.secteurActivite = secteurActivite;
    boutique.deviseParDefaut = deviseParDefaut;
    boutique.tailleBusiness = tailleBusiness;

    await boutique.save();

    return res.status(200).json({
      success: true,
      message: "Boutique mise a jour avec succes.",
      boutique: normalizeBoutique(boutique, user.boutiqueActive?._id),
    });
  } catch (error) {
    console.error("Erreur updateBoutique:", error);
    return res.status(500).json({ message: "Erreur lors de la modification de la boutique." });
  }
};

export const deleteBoutique = async (req, res) => {
  try {
    const user = await assertOwnerAccount(req, res);
    if (!user) return;

    const { id } = req.params;
    const boutique = await Boutique.findOne({
      _id: id,
      userId: user._id,
      isDeleted: false,
    });

    if (!boutique) {
      return res.status(404).json({ message: "Boutique introuvable pour ce compte." });
    }

    const activeId = user.boutiqueActive?._id || user.boutiqueActive;
    if (String(activeId || "") === boutique._id.toString()) {
      return res.status(400).json({ message: "Impossible de supprimer la boutique active. Activez une autre boutique d'abord." });
    }

    const boutiquesCount = await Boutique.countDocuments({
      userId: user._id,
      isDeleted: false,
    });

    if (boutiquesCount <= 1) {
      return res.status(400).json({ message: "Impossible de supprimer votre derniere boutique." });
    }

    boutique.isDeleted = true;
    await boutique.save();

    return res.status(200).json({
      success: true,
      message: "Boutique supprimee avec succes.",
      id: boutique._id,
    });
  } catch (error) {
    console.error("Erreur deleteBoutique:", error);
    return res.status(500).json({ message: "Erreur lors de la suppression de la boutique." });
  }
};

export const setActiveBoutique = async (req, res) => {
  try {
    const user = await assertOwnerAccount(req, res);
    if (!user) return;

    const { id } = req.params;

    const boutique = await Boutique.findOne({
      _id: id,
      userId: user._id,
      isDeleted: false,
    });

    if (!boutique) {
      return res.status(404).json({ message: "Boutique introuvable pour ce compte." });
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
