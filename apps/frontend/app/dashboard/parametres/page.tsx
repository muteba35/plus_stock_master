"use client";

import Link from "next/link";
import { Bell, Building2, ChevronRight, CreditCard, LockKeyhole, Settings2, ShieldCheck, Store, UserRoundCog } from "lucide-react";

const sections = [
  { title: "Ma boutique", text: "Informations de la boutique, statut, devise de référence et taux de change.", href: "/dashboard/parametres/boutique", icon: Store, tone: "indigo" },
  { title: "Profil", text: "Identité, coordonnées, photo de profil et sécurité personnelle.", href: "/dashboard/profil", icon: UserRoundCog, tone: "emerald" },
  { title: "Abonnement", text: "Plan actuel, échéance et état du paiement.", href: "/dashboard/parametres/abonnement", icon: CreditCard, tone: "amber" },
  { title: "Notifications", text: "Alertes de stock, expiration, caisse et finance.", href: "/dashboard/parametres/notifications", icon: Bell, tone: "rose" },
  { title: "Journal d\'audit", text: "Actions sensibles, IP, navigateur, utilisateur et resultat.", href: "/dashboard/parametres/audit", icon: ShieldCheck, tone: "amber" },
  { title: "Aide & definitions", text: "Formules, definitions metier et explications rapides.", href: "/dashboard/parametres/aide", icon: Settings2, tone: "emerald" },
];

const rules = [
  { title: "Sécurité", text: "Les accès restent pilotés par les rôles et permissions.", icon: ShieldCheck },
  { title: "Boutique active", text: "Les réglages affichés concernent toujours la boutique active.", icon: Building2 },
  { title: "Droits sensibles", text: "Les opérations critiques restent masquées sans permission.", icon: LockKeyhole },
];

const toneClass = (tone: string) => {
  if (tone === "emerald") return "bg-emerald-50 text-emerald-600 border-emerald-100";
  if (tone === "amber") return "bg-amber-50 text-amber-600 border-amber-100";
  if (tone === "rose") return "bg-rose-50 text-rose-600 border-rose-100";
  return "bg-indigo-50 text-indigo-600 border-indigo-100";
};

export default function GeneralSettingsPage() {
  return <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen text-slate-800">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Paramètres généraux</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">Point d’entrée rapide vers les réglages essentiels de Movoora.</p>
      </div>
      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-500 shadow-sm">
        <Settings2 size={15} className="text-indigo-500" />
        Centre de configuration
      </div>
    </div>

    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {sections.map((section) => {
        const Icon = section.icon;
        return <Link key={section.href} href={section.href} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:-translate-y-0.5 hover:shadow-md transition-all group">
          <div className="flex items-start justify-between gap-3">
            <div className={"w-11 h-11 rounded-xl border flex items-center justify-center " + toneClass(section.tone)}>
              <Icon size={19} />
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
          </div>
          <h2 className="mt-5 text-sm font-black text-slate-900">{section.title}</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{section.text}</p>
        </Link>;
      })}
    </section>

    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-900">Règles générales</h2>
        <p className="text-[11px] text-slate-400 mt-1">Résumé des principes appliqués aux paramètres.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        {rules.map((rule) => {
          const Icon = rule.icon;
          return <div key={rule.title} className="p-5">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center">
              <Icon size={18} />
            </div>
            <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-slate-800">{rule.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{rule.text}</p>
          </div>;
        })}
      </div>
    </section>
  </div>;
}


