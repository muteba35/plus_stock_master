"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LandingContact from "./LandingContact";
import DemoScreen from "./DemoScreen";
import { Minus, Plus, RotateCcw, RefreshCw, Check, ArrowRight, Info, CircleHelp } from "lucide-react";
import { useLanguage } from "./LanguageRuntime";

type Plan = { code: string; name: string; priceMonthly: number; currency: string; durationDays?: number; limits: { boutiques: number; users: number; products: number }; features: string[] };
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const products = [ { id: 1, fr: "Cahier", en: "Notebook", price: 3, stock: 12 }, { id: 2, fr: "Stylo", en: "Pen", price: 1, stock: 20 }, { id: 3, fr: "Classeur", en: "Binder", price: 5, stock: 8 } ];

export function LandingDemo() { return <DemoScreen><InteractiveDemo /></DemoScreen>; }

function InteractiveDemo() {
  const { language } = useLanguage();
  const en = language === "en";
  const [cart, setCart] = useState<Record<number, number>>({});
  const [sold, setSold] = useState<Record<number, number>>({});
  const [receipt, setReceipt] = useState<number | null>(null);
  const total = products.reduce((sum, p) => sum + (cart[p.id] || 0) * p.price, 0);
  return <section data-no-translate className="scroll-mt-28 bg-white px-6 py-16 text-slate-900">
    <div className="mx-auto max-w-6xl"><h2 className="text-2xl font-bold">{en ? "Try the checkout" : "Essayez la caisse"}</h2><p className="mt-2 text-sm text-slate-600">{en ? "Fictional data. No account, payment or saved transaction. Demo prices exclude VAT." : "Données fictives. Aucun compte, paiement ou enregistrement réel. Prix de démonstration hors TVA."}</p>
    <div className="mt-6 grid gap-8 md:grid-cols-2"><div className="divide-y divide-slate-200">{products.map(p => { const qty = cart[p.id] || 0; const available = p.stock - (sold[p.id] || 0); return <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><h3 className="font-semibold">{en ? p.en : p.fr}</h3><p className="text-sm text-slate-500">{p.price} USD · {available} {en ? "in stock" : "en stock"}</p></div><div className="flex items-center gap-3"><button aria-label={`${en ? "Remove" : "Retirer"} ${en ? p.en : p.fr}`} disabled={!qty} onClick={() => setCart(c => ({ ...c, [p.id]: qty - 1 }))} className="grid h-10 w-10 place-items-center rounded border disabled:opacity-30"><Minus size={16}/></button><span className="w-6 text-center tabular-nums">{qty}</span><button aria-label={`${en ? "Add" : "Ajouter"} ${en ? p.en : p.fr}`} disabled={qty >= available} onClick={() => { setReceipt(null); setCart(c => ({ ...c, [p.id]: qty + 1 })); }} className="grid h-10 w-10 place-items-center rounded border disabled:opacity-30"><Plus size={16}/></button></div></div>; })}</div>
    <div className="border-t border-slate-200 py-4 md:border-l md:border-t-0 md:pl-8"><h3 className="font-semibold">{en ? "Demo basket" : "Panier de démonstration"}</h3><p className="my-5 text-3xl font-bold leading-tight tracking-normal tabular-nums">{total} USD</p><button disabled={!total} className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40" onClick={() => { setSold(s => Object.fromEntries(products.map(p => [p.id, (s[p.id] || 0) + (cart[p.id] || 0)]))); setReceipt(total); setCart({}); }}>{en ? "Simulate sale" : "Simuler la vente"}</button><button className="ml-3 inline-flex h-11 w-11 items-center justify-center rounded border" title={en ? "Reset demo" : "Réinitialiser la démo"} aria-label={en ? "Reset demo" : "Réinitialiser la démo"} onClick={() => { setCart({}); setSold({}); setReceipt(null); }}><RotateCcw size={18}/></button>{receipt !== null && <p role="status" className="mt-4 text-sm text-emerald-700">{en ? "Simulated sale" : "Vente simulée"} : {receipt} USD. {en ? "Demo stock updated." : "Stock fictif mis à jour."}</p>}</div></div></div>
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
  return <section id="pricing" data-no-translate className="scroll-mt-28 bg-slate-950 px-6 py-16 text-white"><div className="mx-auto max-w-6xl"><h2 className="text-3xl font-bold">{en ? "Plans for your business" : "Des offres pour votre activité"}</h2>
    {state === "loading" && <p role="status" className="mt-4">{en ? "Loading prices..." : "Chargement des tarifs..."}</p>}
    {state === "error" && <div role="alert" className="mt-4"><p>{en ? "Prices are temporarily unavailable." : "Les tarifs sont temporairement indisponibles."}</p><button className="mt-3 inline-flex items-center gap-2 rounded border px-4 py-2" onClick={() => { setState("loading"); setAttempt(v => v + 1); }}><RefreshCw size={16}/>{en ? "Retry" : "Réessayer"}</button></div>}
    {state === "ready" && <>{!enforced && <p className="mt-5 flex max-w-3xl items-start gap-3 border-l-2 border-blue-400 pl-4 text-sm leading-6 text-slate-300"><Info size={18} className="mt-1 shrink-0 text-blue-300"/><span>{en ? "Offers are being prepared. Prices and allowances below are indicative: plan restrictions are not yet active." : "Offres en préparation. Les tarifs et quotas ci-dessous sont indicatifs : les restrictions des abonnements ne sont pas encore actives."}</span></p>}<div className="mt-10 grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">{plans.map(p => <article key={p.code} className={`group relative flex min-w-0 flex-col rounded-lg border p-6 transition-[transform,box-shadow,border-color] duration-200 motion-safe:hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-950/40 ${p.code === "PRO" ? "border-blue-500 bg-blue-950/40" : "border-slate-700 bg-slate-900"}`}><h3 className="text-lg font-semibold">{p.code === "TRIAL" ? (en ? "Free trial" : "Essai gratuit") : p.name}</h3><p className="my-5 flex flex-wrap items-baseline gap-1 text-3xl font-bold tabular-nums">{new Intl.NumberFormat(locale, { style: "currency", currency: p.currency }).format(p.priceMonthly)}<span className="text-sm font-normal">{p.code === "TRIAL" ? ` / ${p.durationDays} ${en ? "days" : "jours"}` : en ? " / month" : " / mois"}</span></p><ul className="mb-8 space-y-3 border-t border-slate-700 pt-5 text-sm text-slate-300"><li>{p.limits.boutiques.toLocaleString(locale)} {en ? "shops" : "boutiques"}</li><li>{p.limits.users.toLocaleString(locale)} {en ? "users" : "utilisateurs"}</li><li>{p.limits.products.toLocaleString(locale)} {en ? "products" : "produits"}</li>{p.features.filter(f => labels[f]).map(f => <li key={f} className="flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-blue-400"/>{labels[f][en ? 1 : 0]}</li>)}</ul><Link href="/register" className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold transition-colors hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300">{en ? "Create an account" : "Créer un compte"}<ArrowRight size={16} className="shrink-0"/></Link></article>)}</div></>}
  </div></section>;
}

export function LandingHelp() {
  const { language } = useLanguage(); const en = language === "en";
  const questions = en ? [ ["Does the demo use my data?", "No. Its products and sales are fictional and stay in this page's memory."], ["How long is the trial?", "New shops have a 14-day trial period. Existing trial dates are unchanged. The catalogue above indicates whether plan restrictions are active."], ["How are accounts protected?", "Server-side permissions, hashed passwords, login attempt limits and session revocation help protect accounts. These measures are not a security certification."], ["Can I use my phone?", "You can access the application through your phone's browser with an internet connection."] ] : [ ["La démo utilise-t-elle mes données ?", "Non. Ses produits et ventes sont fictifs et restent uniquement en mémoire dans cette page."], ["Combien de temps dure l'essai ?", "Les nouvelles boutiques disposent d'une période d'essai de 14 jours. Les dates des essais existants restent inchangées. Le catalogue ci-dessus précise si les restrictions des offres sont actives."], ["Comment les comptes sont-ils protégés ?", "Permissions côté serveur, mots de passe hachés, limitation des tentatives et révocation des sessions contribuent à protéger les comptes. Ces mesures ne constituent pas une certification de sécurité."], ["Puis-je utiliser mon téléphone ?", "L'application est accessible depuis le navigateur de votre téléphone avec une connexion internet."] ];
  return <><section id="faq" data-no-translate className="bg-white px-6 py-16 text-slate-900 sm:py-24"><div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.3fr]"><div><div className="mb-6 inline-flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-200 bg-blue-50 text-blue-700"><CircleHelp size={23} strokeWidth={1.8} aria-hidden="true"/></span><span className="text-sm font-bold text-blue-700">FAQ</span></div><h2 className="mt-3 text-3xl font-bold">{en ? "A clearer start with Movoora." : "Comprendre Movoora, simplement."}</h2><p className="mt-5 max-w-md text-base leading-7 text-slate-600">{en ? "Trial, account access and everyday use: find answers to the questions that matter before opening your shop." : "Essai, accès au compte et utilisation au quotidien : retrouvez les réponses essentielles avant de créer votre boutique."}</p><a href="#contact" className="mt-6 inline-block text-sm font-semibold text-blue-700 underline">{en ? "Ask another question" : "Poser une autre question"}</a></div><div className="divide-y divide-slate-200 border-y border-slate-200">{questions.map(([q,a], index) => <details name="landing-faq" key={index} className="group px-3 py-5 transition-colors open:bg-blue-50/60 hover:bg-slate-50 sm:px-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-sm font-semibold sm:text-base [&::-webkit-details-marker]:hidden"><span>{q}</span><Plus size={18} className="shrink-0 text-blue-600 transition-transform group-open:rotate-45"/></summary><p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">{a}</p></details>)}</div></div></section><LandingContact/></>;
}
