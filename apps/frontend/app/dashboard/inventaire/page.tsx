"use client";

import Link from "next/link";
import { AlertTriangle, ArrowDownLeft, ArrowRight, ArrowUpRight, Boxes, CircleDollarSign, PackageCheck, PackagePlus, Tags } from "lucide-react";
import { MetricCard, PageHeader, StatusBadge, movements, products } from "./components/inventory-ui";

export default function InventairePage() {
  const totalValue = products.reduce((sum, product) => sum + product.price * product.stock, 0);
  const healthyProducts = products.filter((product) => product.status === "Disponible").length;
  const healthRate = Math.round((healthyProducts / products.length) * 100);

  return (
    <div className="space-y-6 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800 overflow-x-hidden">
      <PageHeader title="Vue d’ensemble de l’inventaire" subtitle="Suivez la disponibilité, la valeur et les derniers mouvements de votre stock." action={<Link href="/dashboard/inventaire/produits" className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"><PackagePlus size={15} /> Nouveau produit</Link>} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Produits actifs" value="1 245" detail="+18 ce mois" icon={Boxes} />
        <MetricCard label="Valeur du stock" value={`${totalValue.toLocaleString("fr-FR")} $`} detail="Valeur d’achat estimée" icon={CircleDollarSign} tone="emerald" />
        <MetricCard label="Stock faible" value="12" detail="5 articles prioritaires" icon={AlertTriangle} tone="amber" />
        <MetricCard label="Mouvements du jour" value="45" detail="28 entrées · 17 sorties" icon={PackageCheck} tone="rose" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.75fr] gap-5">
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900">Mouvements récents</h2><p className="text-[11px] text-slate-400 mt-1">Dernières opérations enregistrées</p></div><Link href="/dashboard/inventaire/stock" className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">Tout afficher <ArrowRight size={13} /></Link></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr><th className="px-5 py-3">Produit</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Quantité</th><th className="px-5 py-3">Date</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{movements.slice(0, 4).map((movement) => <tr key={movement.id} className="hover:bg-slate-50/60"><td className="px-5 py-4"><p className="font-bold text-slate-800">{movement.product}</p><p className="text-[10px] text-slate-400 mt-0.5">{movement.reference}</p></td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 font-bold ${movement.type === "Entrée" ? "text-emerald-600" : movement.type === "Sortie" ? "text-rose-600" : "text-amber-600"}`}>{movement.type === "Entrée" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}{movement.type}</span></td><td className="px-5 py-4 font-black text-slate-700">{movement.quantity > 0 ? "+" : ""}{movement.quantity}</td><td className="px-5 py-4 text-slate-500">{movement.date}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <div className="space-y-5">
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-900">Santé du stock</h2><p className="text-[11px] text-slate-400 mt-1">Articles disponibles</p></div><span className="text-xl font-black text-emerald-600">{healthRate}%</span></div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-5"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${healthRate}%` }} /></div>
            <div className="grid grid-cols-3 gap-2 mt-5 text-center"><div><p className="text-sm font-black text-emerald-600">1 228</p><p className="text-[9px] text-slate-400 uppercase mt-1">Disponibles</p></div><div><p className="text-sm font-black text-amber-600">12</p><p className="text-[9px] text-slate-400 uppercase mt-1">Faibles</p></div><div><p className="text-sm font-black text-rose-600">5</p><p className="text-[9px] text-slate-400 uppercase mt-1">Ruptures</p></div></div>
          </section>
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5"><div className="flex items-center justify-between mb-4"><h2 className="text-sm font-bold text-slate-900">À surveiller</h2><Link href="/dashboard/inventaire/alertes" className="text-[11px] font-bold text-indigo-600">Voir les alertes</Link></div><div className="space-y-3">{products.filter((product) => product.status !== "Disponible").map((product) => <div key={product.id} className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-slate-800 truncate">{product.name}</p><p className="text-[10px] text-slate-400">{product.stock} unité(s) · seuil {product.threshold}</p></div><StatusBadge status={product.status} /></div>)}</div></section>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[{ href: "/dashboard/inventaire/produits", icon: PackagePlus, title: "Gérer les produits", text: "Créer et modifier le catalogue" }, { href: "/dashboard/inventaire/categories", icon: Tags, title: "Organiser les catégories", text: "Structurer les familles d’articles" }, { href: "/dashboard/inventaire/stock", icon: Boxes, title: "Ajuster le stock", text: "Enregistrer une entrée ou une sortie" }].map((item) => <Link key={item.href} href={item.href} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 hover:border-indigo-200 hover:shadow-sm transition-all"><span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><item.icon size={18} /></span><span className="min-w-0"><span className="block text-xs font-bold text-slate-800">{item.title}</span><span className="block text-[10px] text-slate-400 mt-1">{item.text}</span></span></Link>)}
      </section>
    </div>
  );
}
