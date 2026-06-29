"use client";

import { BookOpenCheck, Calculator, FileText, Percent, ReceiptText, TrendingUp } from "lucide-react";
import { CashHeader } from "../../caisse/components/cashier-ui";
import { FinanceShell } from "../finance-shared";

const glossary = [
  { sigle: "HT", name: "Hors taxes", text: "Montant avant ajout de la TVA." },
  { sigle: "TTC", name: "Toutes taxes comprises", text: "Montant final payé par le client, TVA incluse." },
  { sigle: "CA", name: "Chiffre d'affaires", text: "Total des ventes réalisées sur une période." },
  { sigle: "TVA", name: "Taxe sur la valeur ajoutée", text: "Taxe collectée sur les ventes. Le taux standard configuré est 16%." },
  { sigle: "Marge", name: "Différence vente - coût", text: "Ce qui reste après comparaison entre prix de vente hors taxes et coût d'achat." },
  { sigle: "Net", name: "Montant conservé", text: "Montant restant après déduction des retours ou remboursements." },
];

const formulas = [
  { icon: ReceiptText, title: "Chiffre d'affaires TTC", formula: "CA TTC = somme des totaux TTC des ventes payées", example: "Si trois ventes font 100, 50 et 25, alors CA TTC = 175." },
  { icon: FileText, title: "Chiffre d'affaires HT", formula: "CA HT = somme des montants hors taxes des ventes", example: "C'est la base de calcul avant TVA." },
  { icon: Percent, title: "TVA collectée", formula: "TVA = CA TTC - CA HT", example: "Avec une TVA de 16%, le système enregistre la TVA au moment de la vente." },
  { icon: Calculator, title: "Coût sorti", formula: "Coût sorti = prix d'achat unitaire x quantité vendue", example: "Si 4 produits coûtent 10 à l'achat, coût sorti = 40." },
  { icon: TrendingUp, title: "Bénéfice brut", formula: "Bénéfice brut = CA HT - coût sorti", example: "Si CA HT = 150 et coût sorti = 100, bénéfice brut = 50." },
  { icon: TrendingUp, title: "Bénéfice final estimé", formula: "Bénéfice final estimé = bénéfice brut - retours remboursés", example: "Cette lecture permet de voir l'impact des retours clients." },
];

export default function FinanceFormulasPage() {
  return <FinanceShell>
    <CashHeader title="Formules" subtitle="Glossaire et méthodes de calcul utilisées dans la caisse, les rapports et les finances." />

    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {glossary.map((item) => (
        <div key={item.sigle} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-black text-xs">{item.sigle}</div>
            <div>
              <h2 className="text-sm font-black text-slate-900">{item.name}</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Définition</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">{item.text}</p>
        </div>
      ))}
    </section>

    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center"><BookOpenCheck size={18} /></div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">Formules opérationnelles</h2>
          <p className="text-[11px] text-slate-400 mt-1">Les calculs affichés dans les tableaux de bord et rapports.</p>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {formulas.map((item) => {
          const Icon = item.icon;
          return <div key={item.title} className="p-5 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 border border-slate-100 flex items-center justify-center"><Icon size={16} /></div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">{item.title}</h3>
            </div>
            <div>
              <p className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs font-bold text-indigo-700">{item.formula}</p>
              <p className="mt-2 text-xs text-slate-500">{item.example}</p>
            </div>
          </div>;
        })}
      </div>
    </section>
  </FinanceShell>;
}
