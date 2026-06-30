"use client";

import { BookOpen, CircleDollarSign, HelpCircle, PackageSearch, ReceiptText, RotateCcw, TrendingUp } from "lucide-react";

const definitions = [
  { title: "Marge brute", icon: TrendingUp, text: "Difference entre le chiffre d'affaires hors taxes et le cout d'achat des produits vendus.", formula: "Marge brute = CA HT - Cout sorti" },
  { title: "Cout sorti", icon: CircleDollarSign, text: "Valeur d'achat des produits qui sont sortis du stock pendant les ventes.", formula: "Cout sorti = Prix d'achat unitaire x quantite vendue" },
  { title: "TVA", icon: ReceiptText, text: "Taxe collectee sur les ventes. Dans votre cas, le taux courant est de 16%.", formula: "TVA = TTC - HT" },
  { title: "Stock faible", icon: PackageSearch, text: "Produit dont la quantite est inferieure ou egale au seuil configure.", formula: "Stock <= seuil produit ou seuil global" },
  { title: "Reapprovisionnement", icon: RotateCcw, text: "Operation qui ajoute une quantite au stock existant et garde une trace dans les mouvements.", formula: "Stock final = stock actuel + entree" },
  { title: "Avoir client", icon: HelpCircle, text: "Compensation accordee au client apres un retour, sans remboursement immediat en cash.", formula: "Avoir = montant valide du retour" },
];

export default function HelpDefinitionsPage() {
  return (
    <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen text-slate-800">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider mb-3">
          <BookOpen size={14} /> Aide metier
        </div>
        <h1 className="text-xl font-bold text-slate-900">Aide, formules et definitions</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">Les notions importantes utilisees dans Boutiqo, expliquees simplement.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {definitions.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                <Icon size={19} />
              </div>
              <h2 className="mt-4 text-sm font-black text-slate-900">{item.title}</h2>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">{item.text}</p>
              <div className="mt-4 p-3 rounded-xl bg-slate-950 text-white">
                <p className="text-[10px] uppercase tracking-wider text-white/50 font-black">Formule</p>
                <p className="mt-1 text-xs font-bold">{item.formula}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
