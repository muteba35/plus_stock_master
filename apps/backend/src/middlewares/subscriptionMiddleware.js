import { Boutique, Produit, Subscription, Utilisateur } from "../models/Utilisateur.js";
import { getPlanByCode } from "../config/subscriptionPlans.js";
import { ensureBoutiqueSubscription } from "../controllers/subscription.controller.js";

const activeBoutiqueId = (req) => req.user?.boutiqueId || req.user?.boutiqueActive;

const expiredAllowedPaths = [
  "/api/subscriptions",
  "/api/auth/me",
  "/api/auth/profile",
  "/api/boutiques",
];

const isExpiredAllowed = (req) =>
  expiredAllowedPaths.some((path) => req.originalUrl === path || req.originalUrl.startsWith(path));

const subscriptionError = (res, { message, requiredPlan = null, limit = null, current = null, feature = null }) =>
  res.status(402).json({
    success: false,
    status: "subscription_required",
    message,
    requiredPlan,
    limit,
    current,
    feature,
  });

export const attachSubscription = async (req, res, next) => {
  try {
    const boutiqueId = activeBoutiqueId(req);
    if (!boutiqueId) return next();

    const subscription = await ensureBoutiqueSubscription(boutiqueId);
    if (!subscription) return next();

    const plan = getPlanByCode(subscription.planCode);
    req.subscription = {
      raw: subscription,
      plan,
      planCode: plan.code,
      status: subscription.status,
      limits: plan.limits,
      features: plan.features,
    };

    if (subscription.status === "expired" && !isExpiredAllowed(req)) {
      return subscriptionError(res, {
        message: "Votre période d'essai est terminée. Choisissez un abonnement pour continuer.",
        requiredPlan: "STARTER",
        feature: "ABONNEMENT_ACTIF",
      });
    }

    return next();
  } catch (error) {
    console.error("attachSubscription:", error);
    return res.status(500).json({ success: false, message: "Impossible de vérifier l'abonnement." });
  }
};

export const requireFeature = (feature, requiredPlan = "PRO") => (req, res, next) => {
  if (!req.subscription) return next();

  const required = getPlanByCode(String(requiredPlan || "PRO").toUpperCase());
  const currentLevel = Number(req.subscription.plan?.level ?? 0);
  const requiredLevel = Number(required?.level ?? 2);

  if (req.subscription.features.includes(feature) || currentLevel >= requiredLevel) return next();

  return subscriptionError(res, {
    message: `Cette fonctionnalité est disponible avec l'offre ${requiredPlan}.`,
    requiredPlan,
    feature,
  });
};

export const enforceBoutiqueLimit = async (req, res, next) => {
  try {
    if (!req.subscription || req.user?.isOwner === false) return next();

    const ownerId = req.user?.id || req.user?._id;
    const limit = Number(req.subscription.limits?.boutiques || 1);
    const current = await Boutique.countDocuments({ userId: ownerId, isDeleted: false });

    if (current >= limit) {
      return subscriptionError(res, {
        message: `Votre abonnement limite la création à ${limit} boutique(s). Passez à une offre supérieure pour ajouter une boutique.`,
        requiredPlan: limit <= 1 ? "PRO" : "BUSINESS",
        limit,
        current,
        feature: "MULTI_BOUTIQUE",
      });
    }

    return next();
  } catch (error) {
    console.error("enforceBoutiqueLimit:", error);
    return res.status(500).json({ success: false, message: "Impossible de vérifier la limite des boutiques." });
  }
};

export const enforceUserLimit = async (req, res, next) => {
  try {
    if (!req.subscription) return next();

    const boutiqueId = activeBoutiqueId(req);
    const boutique = await Boutique.findById(boutiqueId).select("userId");
    const ownerId = boutique?.userId || req.user?.id;
    const limit = Number(req.subscription.limits?.users || 2);
    const current = await Utilisateur.countDocuments({
      $or: [{ _id: ownerId }, { boutiqueActive: boutiqueId }],
      isActive: { $ne: false },
    });

    if (current >= limit) {
      return subscriptionError(res, {
        message: `Votre abonnement limite la boutique à ${limit} utilisateur(s). Passez à une offre supérieure pour ajouter un employé.`,
        requiredPlan: limit <= 2 ? "STARTER" : "PRO",
        limit,
        current,
        feature: "UTILISATEURS",
      });
    }

    return next();
  } catch (error) {
    console.error("enforceUserLimit:", error);
    return res.status(500).json({ success: false, message: "Impossible de vérifier la limite des utilisateurs." });
  }
};

export const enforceProductLimit = (incomingCount = 1) => async (req, res, next) => {
  try {
    if (!req.subscription) return next();

    const boutiqueId = activeBoutiqueId(req);
    const limit = Number(req.subscription.limits?.products || 50);
    const current = await Produit.countDocuments({ boutiqueId, isDeleted: false });
    const requested = typeof incomingCount === "function" ? Number(incomingCount(req) || 1) : Number(incomingCount || 1);

    if (current + requested > limit) {
      return subscriptionError(res, {
        message: `Votre abonnement limite la boutique à ${limit} produit(s). Passez à une offre supérieure pour ajouter plus de produits.`,
        requiredPlan: limit <= 50 ? "STARTER" : "PRO",
        limit,
        current,
        feature: "PRODUITS",
      });
    }

    return next();
  } catch (error) {
    console.error("enforceProductLimit:", error);
    return res.status(500).json({ success: false, message: "Impossible de vérifier la limite des produits." });
  }
};

