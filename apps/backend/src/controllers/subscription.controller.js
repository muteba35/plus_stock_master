import axios from "axios";
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
    pendingPayment: subscription?.metadata?.pendingLabyrinthe || null,
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


const normalizePhone = (phone) => String(phone || "").replace(/\s+/g, "").trim();
const cleanEnvValue = (value) => String(value || "").trim().replace(/^["']|["']$/g, "");
const normalizeLabyrintheUrl = (value, fallbackPath) => {
  const cleaned = cleanEnvValue(value).replace(/\/+$/g, "");
  const baseUrl = "https://payment.labyrinthe-rdc.com/api/beta";

  if (!cleaned) return `${baseUrl}/${fallbackPath}`;
  if (cleaned.endsWith("/api/beta")) return `${cleaned}/${fallbackPath}`;
  return cleaned;
};
const getLabyrintheToken = () => {
  const rawToken = process.env.LABYRINTHE_TOKEN || process.env.LABYRINTHE_API_TOKEN || "";
  return cleanEnvValue(rawToken).replace(/\\\//g, "/");
};
const labyrintheMobileUrl = () => normalizeLabyrintheUrl(process.env.LABYRINTHE_API_URL, "mobile");
const labyrintheGetTransactionUrl = () => normalizeLabyrintheUrl(process.env.LABYRINTHE_GET_TRANSACTION_URL, "get-transaction");
const mappedBoutiquePlan = (planCode) => planCode === "STARTER" ? "Moyenne" : "Premium";
const extractLabyrintheTransaction = (providerData) => {
  const root = providerData?.data || providerData || {};
  const list = root.array || providerData?.array || [];
  const first = Array.isArray(list?.[0]) ? list[0][0] : list?.[0];
  return first || null;
};

export const initiateLabyrinthePayment = async (req, res) => {
  try {
    const boutiqueId = getActiveBoutiqueId(req);
    const planCode = String(req.body?.planCode || "").toUpperCase();
    const phone = normalizePhone(req.body?.phone);
    const plan = getPlanByCode(planCode);
    if (!boutiqueId) return res.status(400).json({ success: false, message: "Aucune boutique active." });
    if (!req.user?.isOwner) return res.status(403).json({ success: false, message: "Seul le proprietaire peut payer l'abonnement." });
    if (!["STARTER", "PRO", "BUSINESS"].includes(plan.code)) return res.status(400).json({ success: false, message: "Plan payant invalide." });
    if (!phone) return res.status(400).json({ success: false, message: "Le numero de telephone est requis pour Labyrinthe." });

    const token = getLabyrintheToken();
    if (!token) return res.status(500).json({ success: false, message: "Token Labyrinthe manquant dans les variables d'environnement." });

    const reference = "MVO-" + String(boutiqueId).slice(-6) + "-" + plan.code + "-" + Date.now();
    const payload = new URLSearchParams({ token, reference, phone });
    const labyrintheResponse = await axios.post(labyrintheMobileUrl(), payload.toString(), {
      timeout: 30000,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const providerData = labyrintheResponse.data || {};
    const firstResult = Array.isArray(providerData.array) ? providerData.array[0] : null;
    const providerSuccess = providerData.success === true && (!firstResult || firstResult.success !== false);
    if (!providerSuccess) {
      return res.status(400).json({
        success: false,
        message: firstResult?.message || providerData.message || providerData.error || "Labyrinthe a refuse la transaction.",
        provider: providerData,
      });
    }

    const orderNumber = firstResult?.data?.orderNumber || firstResult?.orderNumber || "";
    if (!orderNumber) {
      return res.status(400).json({ success: false, message: "Labyrinthe n'a pas renvoye de numero de transaction.", provider: providerData });
    }

    const subscription = await ensureBoutiqueSubscription(boutiqueId);
    subscription.paymentProvider = "labyrinthe";
    subscription.providerReference = orderNumber;
    subscription.metadata = {
      ...(subscription.metadata || {}),
      pendingLabyrinthe: {
        targetPlanCode: plan.code,
        phone,
        reference,
        orderNumber,
        providerResponse: providerData,
        createdAt: new Date(),
      },
    };
    await subscription.save();

    return res.status(200).json({
      success: true,
      message: firstResult?.message || "Transaction envoyee. Veuillez valider le push message puis verifier le paiement.",
      reference,
      orderNumber,
      pendingPayment: subscription.metadata.pendingLabyrinthe,
      provider: providerData,
      subscription: normalizeSubscription(subscription),
    });
  } catch (error) {
    const providerStatus = error?.response?.status || null;
    const providerData = error?.response?.data || null;
    const providerMessage =
      providerData?.message ||
      providerData?.error ||
      providerData?.detail ||
      (typeof providerData === "string" ? providerData : "") ||
      (providerStatus === 404 && String(providerData?.message || "").includes("api/beta")
        ? "Endpoint Labyrinthe introuvable. Verifiez LABYRINTHE_API_URL : il doit finir par /api/beta/mobile."
        : "") ||
      (providerStatus === 403
        ? "Labyrinthe refuse la demande. Verifiez que le token est correct et que votre compte Labyrinthe est autorise a utiliser l'API beta mobile."
        : "") ||
      error.message;

    console.error("initiateLabyrinthePayment:", { status: providerStatus, data: providerData, message: error.message });

    return res.status(providerStatus && providerStatus >= 400 && providerStatus < 500 ? 400 : 500).json({
      success: false,
      message: providerMessage || "Impossible de lancer le paiement Labyrinthe.",
      providerStatus,
      providerData: process.env.NODE_ENV === "production" ? undefined : providerData,
    });
  }
};

export const verifyLabyrinthePayment = async (req, res) => {
  try {
    const boutiqueId = getActiveBoutiqueId(req);
    if (!boutiqueId) return res.status(400).json({ success: false, message: "Aucune boutique active." });
    if (!req.user?.isOwner) return res.status(403).json({ success: false, message: "Seul le proprietaire peut verifier l'abonnement." });

    const subscription = await ensureBoutiqueSubscription(boutiqueId);
    const pending = subscription?.metadata?.pendingLabyrinthe || null;
    const orderNumber = String(req.body?.orderNumber || pending?.orderNumber || "").trim();
    if (!orderNumber) return res.status(400).json({ success: false, message: "Aucune transaction Labyrinthe en attente." });

    const token = getLabyrintheToken();
    if (!token) return res.status(500).json({ success: false, message: "Token Labyrinthe manquant dans les variables d'environnement." });

    const payload = new URLSearchParams({ token, orderNumber });
    const labyrintheResponse = await axios.post(labyrintheGetTransactionUrl(), payload.toString(), {
      timeout: 30000,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const providerData = labyrintheResponse.data || {};
    const transaction = extractLabyrintheTransaction(providerData);
    const status = Number(transaction?.status);
    const paid = status === 1 || String(transaction?.status || "").toLowerCase() === "success" || String(transaction?.status || "").toLowerCase() === "paid";

    if (!paid) {
      subscription.metadata = {
        ...(subscription.metadata || {}),
        pendingLabyrinthe: {
          ...(pending || {}),
          orderNumber,
          lastVerification: providerData,
          checkedAt: new Date(),
        },
      };
      await subscription.save();
      return res.status(202).json({
        success: false,
        pending: true,
        message: "Paiement non confirme par Labyrinthe. Validez le push message puis reessayez.",
        orderNumber,
        provider: providerData,
        subscription: normalizeSubscription(subscription),
      });
    }

    const targetPlanCode = pending?.targetPlanCode || String(req.body?.planCode || "PRO").toUpperCase();
    const plan = getPlanByCode(targetPlanCode);
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    subscription.planCode = plan.code;
    subscription.status = "active";
    subscription.paymentProvider = "labyrinthe";
    subscription.currentPeriodEnd = periodEnd;
    subscription.trialEndsAt = null;
    subscription.cancelAtPeriodEnd = false;
    subscription.providerReference = orderNumber;
    subscription.metadata = {
      ...(subscription.metadata || {}),
      pendingLabyrinthe: null,
      lastLabyrinthePayment: {
        orderNumber,
        planCode: plan.code,
        verifiedAt: new Date(),
        providerResponse: providerData,
      },
    };
    await subscription.save();

    await Boutique.findByIdAndUpdate(boutiqueId, {
      plan: mappedBoutiquePlan(plan.code),
      statutPaiement: "A jour",
      trialExpiresAt: undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Paiement confirme. Abonnement active.",
      orderNumber,
      provider: providerData,
      subscription: normalizeSubscription(subscription),
    });
  } catch (error) {
    const providerStatus = error?.response?.status || null;
    const providerData = error?.response?.data || null;
    console.error("verifyLabyrinthePayment:", { status: providerStatus, data: providerData, message: error.message });
    return res.status(providerStatus && providerStatus >= 400 && providerStatus < 500 ? 400 : 500).json({
      success: false,
      message: providerData?.message || providerData?.error || error.message || "Impossible de verifier le paiement Labyrinthe.",
      providerStatus,
      providerData: process.env.NODE_ENV === "production" ? undefined : providerData,
    });
  }
};
