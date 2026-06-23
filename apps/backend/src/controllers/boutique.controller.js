import jwt from "jsonwebtoken";
import { Boutique, ExchangeRate, Permission, Utilisateur } from "../models/Utilisateur.js";

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
    const { nom, secteurActivite, tailleBusiness } = req.body;
    const cleanNom = String(nom || "").trim();

    if (!cleanNom || !secteurActivite || !tailleBusiness) {
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


const SUPPORTED_CURRENCIES = ["USD ($)", "CDF (FC)", "EUR (€)"];
const DEFAULT_EXCHANGE_RATES = [
  { source: "USD ($)", cible: "CDF (FC)", taux: 2300 },
  { source: "EUR (€)", cible: "CDF (FC)", taux: 2500 },
  { source: "EUR (€)", cible: "USD ($)", taux: 1.08 },
];

const buildRatePairs = (rates) => {
  const direct = new Map();
  rates.forEach((rate) => {
    if (!SUPPORTED_CURRENCIES.includes(rate.source) || !SUPPORTED_CURRENCIES.includes(rate.cible)) return;
    if (!Number.isFinite(Number(rate.taux)) || Number(rate.taux) <= 0) return;
    direct.set(`${rate.source}->${rate.cible}`, Number(rate.taux));
    direct.set(`${rate.cible}->${rate.source}`, 1 / Number(rate.taux));
  });

  return [...direct.entries()].map(([key, taux]) => {
    const [source, cible] = key.split("->");
    return { source, cible, taux: Math.round((taux + Number.EPSILON) * 1000000) / 1000000 };
  });
};

const getActiveBoutiqueForSettings = async (req, res) => {
  const boutiqueId = req.user?.boutiqueActive || req.user?.boutiqueId;
  if (!boutiqueId) {
    res.status(400).json({ success: false, message: "Boutique active introuvable." });
    return null;
  }

  const boutique = await Boutique.findOne({ _id: boutiqueId, isDeleted: false });
  if (!boutique) {
    res.status(404).json({ success: false, message: "Boutique introuvable." });
    return null;
  }

  return boutique;
};

export const getCurrencySettings = async (req, res) => {
  try {
    const boutique = await getActiveBoutiqueForSettings(req, res);
    if (!boutique) return;

    let rates = await ExchangeRate.find({ boutiqueId: boutique._id, isActive: true }).sort({ source: 1, cible: 1 });

    if (rates.length === 0) {
      rates = await ExchangeRate.insertMany(
        buildRatePairs(DEFAULT_EXCHANGE_RATES).map((rate) => ({ ...rate, boutiqueId: boutique._id }))
      );
    }

    return res.status(200).json({
      success: true,
      deviseReference: boutique.deviseParDefaut,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      rates,
    });
  } catch (error) {
    console.error("getCurrencySettings:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger les taux de change." });
  }
};

export const updateCurrencySettings = async (req, res) => {
  try {
    const boutique = await getActiveBoutiqueForSettings(req, res);
    if (!boutique) return;

    const deviseReference = String(req.body.deviseReference || boutique.deviseParDefaut);
    const rates = Array.isArray(req.body.rates) ? req.body.rates : [];

    if (!SUPPORTED_CURRENCIES.includes(deviseReference)) {
      return res.status(400).json({ success: false, message: "Devise de référence invalide." });
    }

    const normalizedRates = buildRatePairs(rates);
    if (normalizedRates.length === 0) {
      return res.status(400).json({ success: false, message: "Ajoutez au moins un taux de change valide." });
    }

    boutique.deviseParDefaut = deviseReference;
    await boutique.save();

    for (const rate of normalizedRates) {
      await ExchangeRate.findOneAndUpdate(
        { boutiqueId: boutique._id, source: rate.source, cible: rate.cible },
        { $set: { taux: rate.taux, isActive: true } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const savedRates = await ExchangeRate.find({ boutiqueId: boutique._id, isActive: true }).sort({ source: 1, cible: 1 });

    return res.status(200).json({
      success: true,
      message: "Devise et taux de change mis à jour.",
      deviseReference: boutique.deviseParDefaut,
      rates: savedRates,
    });
  } catch (error) {
    console.error("updateCurrencySettings:", error);
    return res.status(500).json({ success: false, message: "Impossible d'enregistrer les taux de change." });
  }
};


