"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Minus, Plus, RotateCcw, RefreshCw } from "lucide-react";
import { useLanguage } from "./LanguageRuntime";

type Plan = { code: string; name: string; priceMonthly: number; currency: string; durationDays?: number; limits: { boutiques: number; users: number; products: number }; features: string[] };
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const products = [ { id: 1, fr: "Cahier", en: "Notebook", price: 3, stock: 12 }, { id: 2, fr: "Stylo", en: "Pen", price: 1, stock: 20 }, { id: 3, fr: "Classeur", en: "Binder", price: 5, stock: 8 } ];

export function LandingDemo() {
  const { language } = useLanguage();
  const en = language === "en";
  const [cart, setCart] = useState<Record<number, number>>({});
  const [sold, setSold] = useState<Record<number, number>>({});
  const [receipt, setReceipt] = useState<number | null>(null);
  const total = products.reduce((sum, p) => sum + (cart[p.id] || 0) * p.price, 0);
  return <section id="demo" data-no-translate className="scroll-mt-28 bg-white px-6 py-16 text-slate-900">
    <div className="mx-auto max-w-6xl"><h2 className="text-2xl font-bold">{en ? "Try the checkout" : "Essayez la caisse"}</h2><p className="mt-2 text-sm text-slate-600">{en ? "Fictional data. No account, payment or saved transaction. Demo prices exclude VAT." : "Données fictives. Aucun compte, paiement ou enregistrement réel. Prix de démonstration hors TVA."}</p>
    <div className="mt-6 grid gap-8 md:grid-cols-2"><div className="divide-y divide-slate-200">{products.map(p => { const qty = cart[p.id] || 0; const available = p.stock - (sold[p.id] || 0); return <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><h3 className="font-semibold">{en ? p.en : p.fr}</h3><p className="text-sm text-slate-500">{p.price} USD · {available} {en ? "in stock" : "en stock"}</p></div><div className="flex items-center gap-3"><button aria-label={`${en ? "Remove" : "Retirer"} ${en ? p.en : p.fr}`} disabled={!qty} onClick={() => setCart(c => ({ ...c, [p.id]: qty - 1 }))} className="grid h-10 w-10 place-items-center rounded border disabled:opacity-30"><Minus size={16}/></button><span className="w-6 text-center tabular-nums">{qty}</span><button aria-label={`${en ? "Add" : "Ajouter"} ${en ? p.en : p.fr}`} disabled={qty >= available} onClick={() => { setReceipt(null); setCart(c => ({ ...c, [p.id]: qty + 1 })); }} className="grid h-10 w-10 place-items-center rounded border disabled:opacity-30"><Plus size={16}/></button></div></div>; })}</div>
    <div className="border-t border-slate-200 py-4 md:border-l md:border-t-0 md:pl-8"><h3 className="font-semibold">{en ? "Demo basket" : "Panier de démonstration"}</h3><p className="my-5 text-3xl font-bold tabular-nums">{total} USD</p><button disabled={!total} className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40" onClick={() => { setSold(s => Object.fromEntries(products.map(p => [p.id, (s[p.id] || 0) + (cart[p.id] || 0)]))); setReceipt(total); setCart({}); }}>{en ? "Simulate sale" : "Simuler la vente"}</button><button className="ml-3 inline-flex h-11 w-11 items-center justify-center rounded border" title={en ? "Reset demo" : "Réinitialiser la démo"} aria-label={en ? "Reset demo" : "Réinitialiser la démo"} onClick={() => { setCart({}); setSold({}); setReceipt(null); }}><RotateCcw size={18}/></button>{receipt !== null && <p role="status" className="mt-4 text-sm text-emerald-700">{en ? "Simulated sale" : "Vente simulée"} : {receipt} USD. {en ? "Demo stock updated." : "Stock fictif mis à jour."}</p>}</div></div></div>
  </section>;
}

export function LandingPlans() {
  const { language, locale } = useLanguage();
  const en = language === "en";
  const [plans, setPlans] = useState<Plan[]>([]);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [attempt, setAttempt] = useState(0);
  const [enforced, setEnforced] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/public/plans`, { signal: controller.signal, cache: "no-store" }).then(async r => {
      if (!r.ok) throw new Error();
      const data = await r.json();
      if (!Array.isArray(data.plans) || !data.plans.length) throw new Error();
      if (!controller.signal.aborted) { setPlans(data.plans); setEnforced(data.enforcementActive === true); setState("ready"); }
    }).catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, [attempt]);
  const labels: Record<string, [string, string]> = { CATEGORIES: ["Catégories", "Categories"], STOCK_MOVEMENTS: ["Mouvements de stock", "Stock movements"], CASH_REPORTS: ["Rapports caisse", "Checkout reports"], FINANCE: ["Finances", "Finance"], AUDIT_GLOBAL: ["Journal d'audit", "Audit log"], EXPORTS_FULL: ["Exports complets", "Full exports"], EXPORTS_LIMITED: ["Exports limités", "Limited exports"], CAISSE_LIMITED: ["Caisse simple", "Basic checkout"], EXCEL_IMPORTS: ["Imports Excel", "Excel imports"] };
  return <section id="pricing" data-no-translate className="scroll-mt-28 bg-slate-950 px-6 py-16 text-white"><div className="mx-auto max-w-6xl"><h2 className="text-2xl font-bold">{en ? "Subscription catalogue" : "Catalogue des abonnements"}</h2>
    {state === "loading" && <p role="status" className="mt-4">{en ? "Loading prices..." : "Chargement des tarifs..."}</p>}
    {state === "error" && <div role="alert" className="mt-4"><p>{en ? "Prices are temporarily unavailable." : "Les tarifs sont temporairement indisponibles."}</p><button className="mt-3 inline-flex items-center gap-2 rounded border px-4 py-2" onClick={() => { setState("loading"); setAttempt(v => v + 1); }}><RefreshCw size={16}/>{en ? "Retry" : "Réessayer"}</button></div>}
    {state === "ready" && <>{!enforced && <p className="mt-4 max-w-3xl text-sm text-amber-200">{en ? "Published catalogue: plan quotas and module restrictions are not currently enforced. These offers are not presented as active access restrictions." : "Catalogue prévu : les quotas et restrictions de modules ne sont actuellement pas appliqués. Ces offres ne constituent donc pas des restrictions d'accès actives."}</p>}<div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{plans.map(p => <article key={p.code} className="flex flex-col rounded-lg border border-white/20 p-5"><h3 className="font-bold">{p.code === "TRIAL" ? (en ? "Free trial" : "Essai gratuit") : p.name}</h3><p className="my-4 text-3xl font-bold">{new Intl.NumberFormat(locale, { style: "currency", currency: p.currency }).format(p.priceMonthly)}<span className="text-sm font-normal">{p.code === "TRIAL" ? ` / ${p.durationDays} ${en ? "days" : "jours"}` : en ? " / month" : " / mois"}</span></p><ul className="mb-6 space-y-2 text-sm text-slate-300"><li>{p.limits.boutiques.toLocaleString(locale)} {en ? "shops" : "boutiques"}</li><li>{p.limits.users.toLocaleString(locale)} {en ? "users" : "utilisateurs"}</li><li>{p.limits.products.toLocaleString(locale)} {en ? "products" : "produits"}</li>{p.features.filter(f => labels[f]).map(f => <li key={f}>{labels[f][en ? 1 : 0]}</li>)}</ul><Link href="/register" className="mt-auto rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold">{en ? "Create an account" : "Créer un compte"}</Link></article>)}</div></>}
  </div></section>;
}

export function LandingHelp() {
  const { language } = useLanguage(); const en = language === "en";
  const questions = en ? [ ["Does the demo use my data?", "No. Its products and sales are fictional and stay in this page's memory."], ["How long is the trial?", "New shops have a 14-day trial period. Existing trial dates are unchanged. The catalogue above indicates whether plan restrictions are active."], ["How are accounts protected?", "Server-side permissions, hashed passwords, login attempt limits and session revocation help protect accounts. These measures are not a security certification."], ["Can I use my phone?", "You can access the application through your phone's browser with an internet connection."] ] : [ ["La démo utilise-t-elle mes données ?", "Non. Ses produits et ventes sont fictifs et restent uniquement en mémoire dans cette page."], ["Combien de temps dure l'essai ?", "Les nouvelles boutiques disposent d'une période d'essai de 14 jours. Les dates des essais existants restent inchangées. Le catalogue ci-dessus précise si les restrictions des offres sont actives."], ["Comment les comptes sont-ils protégés ?", "Permissions côté serveur, mots de passe hachés, limitation des tentatives et révocation des sessions contribuent à protéger les comptes. Ces mesures ne constituent pas une certification de sécurité."], ["Puis-je utiliser mon téléphone ?", "L'application est accessible depuis le navigateur de votre téléphone avec une connexion internet."] ];
  return <section id="faq" data-no-translate className="bg-white px-6 py-16 text-slate-900"><div className="mx-auto max-w-4xl"><h2 className="mb-6 text-2xl font-bold">{en ? "Frequently asked questions" : "Questions fréquentes"}</h2>{questions.map(([q,a]) => <details key={q} className="border-b border-slate-200 py-4"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-3 text-sm leading-6 text-slate-600">{a}</p></details>)}<div id="contact" className="mt-10 scroll-mt-28"><h2 className="text-xl font-bold">Contact</h2><a href="tel:+243990835638" className="mt-3 inline-block text-blue-700 underline">+243 990 835 638</a><p className="mt-2 text-sm text-slate-500">{en ? "Never share your password or verification codes." : "Ne communiquez jamais votre mot de passe ni vos codes de vérification."}</p><div className="mt-5 flex flex-wrap gap-6"><Link href="/conditions" className="underline">{en ? "Terms of use" : "Conditions d'utilisation"}</Link><Link href="/confidentialite" className="underline">{en ? "Privacy" : "Confidentialité"}</Link></div></div></div></section>;
}
