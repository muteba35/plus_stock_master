import { Boutique, Subscription } from "../models/Utilisateur.js";
import { getPlanByCode, SUBSCRIPTION_PLANS } from "../config/subscriptionPlans.js";

const getActiveBoutiqueId = (req) => req.user?.boutiqueId || req.user?.boutiqueActive;

const refreshSubscriptionStatus = async (subscription) => {
  if (!subscription) return null;

  const now = Date.now();
  const periodEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).getTime() : null;
  const trialEnd = subscription.trialEndsAt ? new Date(subscription.trialEndsAt).getTime() : null;
  const shouldExpire = Boolean(
    subscription.status !== "expired" &&
    subscription.status !== "cancelled" &&
    ((periodEnd && periodEnd < now) || (subscription.status === "trialing" && trialEnd && trialEnd < now))
  );

  if (!shouldExpire) return subscription;

  subscription.status = "expired";
  await subscription.save();
  await Boutique.findByIdAndUpdate(subscription.boutiqueId, { statutPaiement: "En retard" });
  return refreshSubscriptionStatus(subscription);
};

const normalizeSubscription = (subscription) => {
  const plan = getPlanByCode(subscription?.planCode);
  const now = Date.now();
  const periodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).getTime() : null;
  const trialEnd = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt).getTime() : null;
  const isExpired = Boolean((periodEnd && periodEnd < now) || (subscription?.status === "trialing" && trialEnd && trialEnd < now));

  return {
    id: subscription?._id || null,
    planCode: plan.code,
    planName: plan.name,
    status: isExpired ? "expired" : (subscription?.status || "trialing"),
    paymentProvider: subscription?.paymentProvider || "mock",
    currentPeriodEnd: subscription?.currentPeriodEnd || null,
    trialEndsAt: subscription?.trialEndsAt || null,
    cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
    features: plan.features,
    limits: plan.limits,
    priceMonthly: plan.priceMonthly,
    currency: plan.currency,
    description: plan.description,
  };
};

export const ensureBoutiqueSubscription = async (boutiqueId) => {
  if (!boutiqueId) return null;

  let subscription = await Subscription.findOne({ boutiqueId });
  if (subscription) return refreshSubscriptionStatus(subscription);

  const boutique = await Boutique.findById(boutiqueId);
  if (!boutique) return null;

  const trialEnd = boutique.trialExpiresAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  subscription = await Subscription.create({
    boutiqueId,
    planCode: "TRIAL",
    status: "trialing",
    paymentProvider: "mock",
    trialEndsAt: trialEnd,
    currentPeriodEnd: trialEnd,
    metadata: { source: "auto-created" },
  });

  boutique.plan = "Free";
  boutique.statutPaiement = "Essai";
  boutique.trialExpiresAt = trialEnd;
  await boutique.save();

  return subscription;
};

export const getSubscriptionPlans = async (_req, res) => {
  return res.status(200).json({
    success: true,
    plans: SUBSCRIPTION_PLANS,
  });
};

export const getCurrentSubscription = async (req, res) => {
  try {
    const boutiqueId = getActiveBoutiqueId(req);
    const subscription = await ensureBoutiqueSubscription(boutiqueId);

    if (!subscription) {
      return res.status(404).json({ success: false, message: "Aucune boutique active trouvee pour l'abonnement." });
    }

    return res.status(200).json({
      success: true,
      subscription: normalizeSubscription(subscription),
      plans: SUBSCRIPTION_PLANS,
    });
  } catch (error) {
    console.error("getCurrentSubscription:", error);
    return res.status(500).json({ success: false, message: "Impossible de charger l'abonnement." });
  }
};

export const activateMockSubscription = async (req, res) => {
  try {
    const boutiqueId = getActiveBoutiqueId(req);
    const planCode = String(req.body?.planCode || "").toUpperCase();
    const plan = getPlanByCode(planCode);

    if (!boutiqueId) {
      return res.status(400).json({ success: false, message: "Aucune boutique active." });
    }

    if (!req.user?.isOwner) {
      return res.status(403).json({ success: false, message: "Seul le proprietaire peut changer l'abonnement." });
    }

    if (!["STARTER", "PRO", "BUSINESS", "TRIAL"].includes(plan.code)) {
      return res.status(400).json({ success: false, message: "Plan d'abonnement invalide." });
    }

    const periodEnd = plan.code === "TRIAL"
      ? new Date(Date.now() + (plan.durationDays || 14) * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await Subscription.findOneAndUpdate(
      { boutiqueId },
      {
        $set: {
          planCode: plan.code,
          status: plan.code === "TRIAL" ? "trialing" : "active",
          paymentProvider: "mock",
          currentPeriodEnd: periodEnd,
          trialEndsAt: plan.code === "TRIAL" ? periodEnd : null,
          cancelAtPeriodEnd: false,
          providerReference: `MOCK-${Date.now()}`,
          metadata: {
            activatedBy: req.user.id,
            mode: "test",
            note: "Activation test en attendant l'integration Labyrinthe/Lygos.",
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const mappedPlan = plan.code === "BUSINESS" ? "Premium" : plan.code === "PRO" ? "Premium" : plan.code === "STARTER" ? "Moyenne" : "Free";
    await Boutique.findByIdAndUpdate(boutiqueId, {
      plan: mappedPlan,
      statutPaiement: plan.code === "TRIAL" ? "Essai" : "A jour",
      trialExpiresAt: plan.code === "TRIAL" ? periodEnd : undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Abonnement active en mode test.",
      subscription: normalizeSubscription(subscription),
    });
  } catch (error) {
    console.error("activateMockSubscription:", error);
    return res.status(500).json({ success: false, message: "Impossible d'activer le plan test." });
  }
};
