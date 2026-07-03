"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, LockKeyhole, ShieldCheck, Sparkles, Store, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { planOrder, type PlanCode } from "../../../../src/lib/subscriptionPlans";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";

interface Plan {
  code: PlanCode;
  name: string;
  priceMonthly: number;
  currency: string;
  description: string;
  limits: { boutiques: number; users: number; products: number };
  features: string[];
  unavailable: string[];
}

interface Subscription {
  planCode: PlanCode;
  planName: string;
  status: string;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
}

const formatLimit = (value: number, label: string) => value >= 999 ? `${label} illimites` : `${value} ${label}`;

export default function AbonnementPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const headers = useCallback(() => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" };
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 4000);
  };

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/subscriptions/current`, { headers: headers() });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Impossible de charger les abonnements.");
      setPlans(data.plans || []);
      setSubscription(data.subscription);
      localStorage.setItem("subscription_state", JSON.stringify(data.subscription));
      window.dispatchEvent(new Event("userProfileUpdated"));
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Erreur abonnement.");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    void fetchSubscription();
  }, [fetchSubscription]);

  const currentLevel = useMemo(() => planOrder[subscription?.planCode || "TRIAL"], [subscription]);

  const activatePlan = async (planCode: PlanCode) => {
    try {
      setUpgrading(planCode);
      const response = await fetch(`${API_URL}/subscriptions/activate-test`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ planCode }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Activation impossible.");
      setSubscription(data.subscription);
      localStorage.removeItem("labyrinthe_pending_payment");
      localStorage.setItem("subscription_state", JSON.stringify(data.subscription));
      window.dispatchEvent(new Event("userProfileUpdated"));
      showToast("success", "Plan active en mode test. Le paiement sera branche ensuite.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Erreur activation.");
    } finally {
      setUpgrading(null);
    }
  };

  return (
    <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen text-slate-800 relative">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="fixed top-6 right-6 z-[120]">
            <div className={`px-4 py-3 rounded-xl border text-xs font-bold shadow-sm ${toast.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"}`}>
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Abonnements Movoora</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">Plans, limites et modules premium de la boutique active.</p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm text-xs font-black text-slate-600">
          <Sparkles size={16} className="text-indigo-600" />
          Activation test active
        </div>
      </div>

      <section className="bg-slate-950 rounded-3xl border border-slate-800 p-6 text-white overflow-hidden relative">
        <div className="absolute right-0 top-0 w-72 h-72 bg-indigo-600/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300">Plan actuel</p>
            <h2 className="text-3xl font-black mt-2">{subscription?.planName || "Essai gratuit"}</h2>
            <p className="text-xs text-slate-400 mt-2">Statut : {subscription?.status || "trialing"}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 min-w-[260px]">
            <div className="bg-white/8 border border-white/10 rounded-2xl p-3">
              <Store size={16} className="text-indigo-300" />
              <p className="text-[10px] font-bold text-slate-400 mt-2">Boutiques</p>
              <p className="text-sm font-black">{plans.find((p) => p.code === subscription?.planCode)?.limits.boutiques || 1}</p>
            </div>
            <div className="bg-white/8 border border-white/10 rounded-2xl p-3">
              <Users size={16} className="text-indigo-300" />
              <p className="text-[10px] font-bold text-slate-400 mt-2">Utilisateurs</p>
              <p className="text-sm font-black">{plans.find((p) => p.code === subscription?.planCode)?.limits.users || 2}</p>
            </div>
            <div className="bg-white/8 border border-white/10 rounded-2xl p-3">
              <ShieldCheck size={16} className="text-indigo-300" />
              <p className="text-[10px] font-bold text-slate-400 mt-2">Produits</p>
              <p className="text-sm font-black">{plans.find((p) => p.code === subscription?.planCode)?.limits.products || 50}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-indigo-50 rounded-2xl border border-indigo-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-xs font-black text-indigo-700 uppercase tracking-wider">Mode paiement temporaire</p>
          <p className="text-[11px] text-indigo-600 mt-1 font-semibold">En attendant Labyrinthe, un clic active directement le plan choisi pour faciliter les tests.</p>
        </div>
        <span className="px-3 py-2 rounded-xl bg-white text-indigo-700 text-[10px] font-black border border-indigo-100">TEST INTERNE</span>
      </section>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 flex items-center justify-center text-slate-400 gap-3 text-xs font-bold">
          <Loader2 size={18} className="animate-spin text-indigo-600" />
          Chargement des offres...
        </div>
      ) : (
        <section className="grid grid-cols-1 xl:grid-cols-4 md:grid-cols-2 gap-4">
          {plans.map((plan) => {
            const active = subscription?.planCode === plan.code;
            const upgrade = planOrder[plan.code] > currentLevel;
            return (
              <motion.article key={plan.code} whileHover={{ y: -4 }} className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col ${active ? "border-indigo-300 ring-4 ring-indigo-50" : "border-slate-200/80"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black text-slate-950">{plan.name}</h2>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{plan.description}</p>
                  </div>
                  {active ? <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[9px] font-black">ACTIF</span> : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-[9px] font-black uppercase"><LockKeyhole size={11} /> Upgrade</span>}
                </div>

                <div className="mt-5">
                  <span className="text-3xl font-black text-slate-950">{plan.priceMonthly === 0 ? "0" : plan.priceMonthly}</span>
                  <span className="text-xs font-bold text-slate-400"> {plan.currency}/mois</span>
                </div>

                <div className="grid grid-cols-1 gap-2 mt-5 text-[11px] font-bold text-slate-600">
                  <span className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">{formatLimit(plan.limits.boutiques, "boutiques")}</span>
                  <span className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">{formatLimit(plan.limits.users, "utilisateurs")}</span>
                  <span className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">{formatLimit(plan.limits.products, "produits")}</span>
                </div>

                <div className="mt-5 space-y-2 flex-1">
                  {plan.features.slice(0, 7).map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                      <Check size={12} className="text-emerald-500" />
                      {feature.replaceAll("_", " ").toLowerCase()}
                    </div>
                  ))}
                  {plan.features.length > 7 && <p className="text-[10px] font-black text-indigo-600">+{plan.features.length - 7} autres avantages</p>}
                </div>

                <button
                  type="button"
                  disabled={active || upgrading === plan.code}
                  onClick={() => activatePlan(plan.code)}
                  className={`mt-6 w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${active ? "bg-slate-100 text-slate-400 cursor-not-allowed" : upgrade ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-slate-950 text-white hover:bg-slate-800"}`}
                >
                  {upgrading === plan.code ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {active ? "Plan actuel" : "Activer ce plan"}
                </button>
              </motion.article>
            );
          })}
        </section>
      )}
    </div>
  );
}
