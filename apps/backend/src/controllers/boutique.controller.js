import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { AuditLog, Boutique, Categorie, Departement, ExchangeRate, FinanceCharge, InventaireAudit, MouvementStock, Notification, NotificationPreference, Permission, Produit, RetourClient, Role, RolePermission, Utilisateur, Vente } from "../models/Utilisateur.js";
import { sendEmail } from "../utils/sendEmail.js";

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

const createSessionPayload = async (userId, boutiqueId, permissionsOverride = null) => {
  const permissions = Array.isArray(permissionsOverride) ? permissionsOverride : await getOwnerPermissions();
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

const deleteOwnerAccountData = async (ownerId, boutiqueId) => {
  const roleIds = await Role.find({ boutiqueId }).distinct("_id");
  const departementIds = await Departement.find({ boutiqueId }).distinct("_id");
  const produitIds = await Produit.find({ boutiqueId }).distinct("_id");

  await Promise.all([
    RolePermission.deleteMany({ roleId: { $in: roleIds } }),
    Role.deleteMany({ boutiqueId }),
    Departement.deleteMany({ boutiqueId }),
    Categorie.deleteMany({ boutiqueId }),
    Produit.deleteMany({ boutiqueId }),
    MouvementStock.deleteMany({ $or: [{ boutiqueId }, { produitId: { $in: produitIds } }] }),
    Vente.deleteMany({ boutiqueId }),
    RetourClient.deleteMany({ boutiqueId }),
    InventaireAudit.deleteMany({ boutiqueId }),
    ExchangeRate.deleteMany({ boutiqueId }),
    FinanceCharge.deleteMany({ boutiqueId }),
    Notification.deleteMany({ boutiqueId }),
    NotificationPreference.deleteMany({ boutiqueId }),
    AuditLog.deleteMany({ boutiqueId }),
    Boutique.deleteMany({ userId: ownerId }),
    Utilisateur.deleteMany({
      $or: [
        { _id: ownerId },
        { boutiqueActive: boutiqueId },
        { roleId: { $in: roleIds } },
        { departementId: { $in: departementIds } },
      ],
    }),
  ]);
};

const resolveBoutiqueContext = async (req, res) => {
  const user = await Utilisateur.findById(req.user.id).populate("boutiqueActive");

  if (!user) {
    res.status(404).json({ message: "Utilisateur introuvable." });
    return null;
  }

  let ownerId = user._id;
  let activeBoutiqueId = user.boutiqueActive?._id || user.boutiqueActive || req.user?.boutiqueActive || req.user?.boutiqueId;

  if (user.boutiqueActive?.userId) {
    ownerId = user.boutiqueActive.userId;
  } else if (activeBoutiqueId) {
    const activeBoutique = await Boutique.findOne({ _id: activeBoutiqueId, isDeleted: false }).select("userId");
    if (activeBoutique?.userId) {
      ownerId = activeBoutique.userId;
      activeBoutiqueId = activeBoutique._id;
    }
  }

  return {
    user,
    ownerId,
    activeBoutiqueId,
  };
};

export const getBoutiques = async (req, res) => {
  try {
    const context = await resolveBoutiqueContext(req, res);
    if (!context) return;

    const boutiques = await Boutique.find({
      userId: context.ownerId,
      isDeleted: false,
    }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      boutiques: boutiques.map((boutique) => normalizeBoutique(boutique, context.activeBoutiqueId)),
    });
  } catch (error) {
    console.error("Erreur getBoutiques:", error);
    return res.status(500).json({ message: "Erreur lors du chargement des boutiques." });
  }
};

export const createBoutique = async (req, res) => {
  try {
    const context = await resolveBoutiqueContext(req, res);
    if (!context) return;

    const { nom, secteurActivite, deviseParDefaut, tailleBusiness } = req.body;

    const cleanNom = String(nom || "").trim();
    if (!cleanNom || !secteurActivite || !deviseParDefaut || !tailleBusiness) {
      return res.status(400).json({ message: "Tous les champs de la boutique sont requis." });
    }

    const existingBoutique = await Boutique.findOne({
      userId: context.ownerId,
      nom: { $regex: `^${escapeRegex(cleanNom)}$`, $options: "i" },
      isDeleted: false,
    });

    if (existingBoutique) {
      return res.status(400).json({ message: "Vous avez deja une boutique avec ce nom." });
    }

    const boutique = await Boutique.create({
      nom: cleanNom,
      userId: context.ownerId,
      secteurActivite,
      deviseParDefaut,
      tailleBusiness,
    });

    context.user.boutiqueActive = boutique._id;
    await context.user.save();

    const { token, permissions } = await createSessionPayload(context.user._id, boutique._id, req.user?.permissions);

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
    const context = await resolveBoutiqueContext(req, res);
    if (!context) return;

    const { id } = req.params;
    const { nom, secteurActivite, tailleBusiness } = req.body;
    const cleanNom = String(nom || "").trim();

    if (!cleanNom || !secteurActivite || !tailleBusiness) {
      return res.status(400).json({ message: "Tous les champs de la boutique sont requis." });
    }

    const boutique = await Boutique.findOne({
      _id: id,
      userId: context.ownerId,
      isDeleted: false,
    });

    if (!boutique) {
      return res.status(404).json({ message: "Boutique introuvable pour ce compte." });
    }

    const duplicate = await Boutique.findOne({
      _id: { $ne: boutique._id },
      userId: context.ownerId,
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
      boutique: normalizeBoutique(boutique, context.activeBoutiqueId),
    });
  } catch (error) {
    console.error("Erreur updateBoutique:", error);
    return res.status(500).json({ message: "Erreur lors de la modification de la boutique." });
  }
};

export const requestBoutiqueDeletionCode = async (req, res) => {
  try {
    const context = await resolveBoutiqueContext(req, res);
    if (!context) return;

    const { id } = req.params;
    const boutique = await Boutique.findOne({ _id: id, userId: context.ownerId, isDeleted: false }).select("+deletionCodeHash +deletionCodeExpires");

    if (!boutique) {
      return res.status(404).json({ message: "Boutique introuvable pour ce compte." });
    }

    const owner = await Utilisateur.findById(context.ownerId).select("email nom prenom");
    if (!owner?.email) {
      return res.status(400).json({ message: "Adresse email du proprietaire introuvable." });
    }

    const code = String(crypto.randomInt(100000, 999999));
    boutique.deletionCodeHash = await bcrypt.hash(code, 10);
    boutique.deletionCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
    await boutique.save();

    await sendEmail({
      email: owner.email,
      subject: `Code de suppression boutique StockMaster : ${code}`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#172033">
          <div style="max-width:560px;margin:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">
            <div style="padding:22px 24px;background:#111827;color:#fff">
              <h1 style="margin:0;font-size:18px">Validation de suppression</h1>
              <p style="margin:6px 0 0;color:#cbd5e1;font-size:13px">Boutique concernee : ${boutique.nom}</p>
            </div>
            <div style="padding:24px">
              <p style="font-size:14px;line-height:1.6;margin:0 0 14px">Un utilisateur a demande la suppression de cette boutique. Pour confirmer l'action, saisissez le code ci-dessous dans StockMaster.</p>
              <div style="font-size:28px;font-weight:800;letter-spacing:6px;text-align:center;background:#fff1f2;color:#be123c;border:1px solid #fecdd3;border-radius:14px;padding:16px;margin:18px 0">${code}</div>
              <p style="font-size:12px;color:#64748b;line-height:1.6;margin:0">Ce code expire dans 15 minutes. Si vous n'etes pas a l'origine de cette demande, ignorez ce message et verifiez les acces de votre equipe.</p>
            </div>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true, message: "Code de confirmation envoye dans la messagerie du proprietaire." });
  } catch (error) {
    console.error("Erreur requestBoutiqueDeletionCode:", error);
    return res.status(500).json({ message: "Erreur lors de l'envoi du code de suppression." });
  }
};

export const deleteBoutique = async (req, res) => {
  try {
    const context = await resolveBoutiqueContext(req, res);
    if (!context) return;

    const { id } = req.params;
    const boutique = await Boutique.findOne({
      _id: id,
      userId: context.ownerId,
      isDeleted: false,
    }).select("+deletionCodeHash +deletionCodeExpires");

    if (!boutique) {
      return res.status(404).json({ message: "Boutique introuvable pour ce compte." });
    }

    const boutiquesCount = await Boutique.countDocuments({
      userId: context.ownerId,
      isDeleted: false,
    });
    const isLastBoutique = boutiquesCount <= 1;
    const isActiveBoutique = String(context.activeBoutiqueId || "") === boutique._id.toString();

    if (isActiveBoutique && !isLastBoutique) {
      return res.status(400).json({ message: "Impossible de supprimer la boutique active. Activez une autre boutique d'abord." });
    }

    if (isLastBoutique) {
      const code = String(req.body?.code || "").trim();
      if (!code) {
        return res.status(428).json({ requiresCode: true, message: "Un code envoye au proprietaire est requis pour supprimer la derniere boutique." });
      }

      const codeIsExpired = !boutique.deletionCodeExpires || boutique.deletionCodeExpires.getTime() < Date.now();
      const codeIsValid = boutique.deletionCodeHash && await bcrypt.compare(code, boutique.deletionCodeHash);

      if (codeIsExpired || !codeIsValid) {
        return res.status(403).json({ requiresCode: true, message: "Code de suppression invalide ou expire." });
      }
    }

    if (isLastBoutique) {
      await deleteOwnerAccountData(context.ownerId, boutique._id);
      return res.status(200).json({
        success: true,
        accountDeleted: true,
        clearedActive: true,
        message: "Derniere boutique supprimee. Le compte proprietaire et les donnees liees ont ete fermes.",
        id: boutique._id,
      });
    }

    boutique.isDeleted = true;
    boutique.deletionCodeHash = undefined;
    boutique.deletionCodeExpires = undefined;
    await boutique.save();

    return res.status(200).json({
      success: true,
      message: "Boutique supprimee avec succes.",
      id: boutique._id,
      clearedActive: false,
    });
  } catch (error) {
    console.error("Erreur deleteBoutique:", error);
    return res.status(500).json({ message: "Erreur lors de la suppression de la boutique." });
  }
};
export const setActiveBoutique = async (req, res) => {
  try {
    const context = await resolveBoutiqueContext(req, res);
    if (!context) return;

    const { id } = req.params;

    const boutique = await Boutique.findOne({
      _id: id,
      userId: context.ownerId,
      isDeleted: false,
    });

    if (!boutique) {
      return res.status(404).json({ message: "Boutique introuvable pour ce compte." });
    }

    context.user.boutiqueActive = boutique._id;
    await context.user.save();

    const { token, permissions } = await createSessionPayload(context.user._id, boutique._id, req.user?.permissions);

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
  const explicitRates = new Map();

  rates.forEach((rate) => {
    if (!SUPPORTED_CURRENCIES.includes(rate.source) || !SUPPORTED_CURRENCIES.includes(rate.cible)) return;
    if (rate.source === rate.cible) return;
    const taux = Number(rate.taux);
    if (!Number.isFinite(taux) || taux <= 0) return;
    explicitRates.set(`${rate.source}->${rate.cible}`, taux);
  });

  const normalizedRates = new Map(explicitRates);

  explicitRates.forEach((taux, key) => {
    const [source, cible] = key.split("->");
    const reverseKey = `${cible}->${source}`;

    if (!explicitRates.has(reverseKey)) {
      normalizedRates.set(reverseKey, 1 / taux);
    }
  });

  return [...normalizedRates.entries()].map(([key, taux]) => {
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
      return res.status(400).json({ success: false, message: "Devise de reference invalide." });
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
      message: "Devise et taux de change mis a jour.",
      deviseReference: boutique.deviseParDefaut,
      rates: savedRates,
    });
  } catch (error) {
    console.error("updateCurrencySettings:", error);
    return res.status(500).json({ success: false, message: "Impossible d'enregistrer les taux de change." });
  }
};



