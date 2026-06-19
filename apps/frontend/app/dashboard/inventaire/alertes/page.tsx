"use client";

import { useMemo, useState } from "react";
import { AlertOctagon, AlertTriangle, BellRing, CheckCircle2, PackagePlus } from "lucide-react";
import { MetricCard, PageHeader, SearchInput, StatusBadge, primaryButton, products } from "../components/inventory-ui";

export default function AlertesStockPage() {
  const [search, setSearch] = useState("");
  const [resolved, setResolved] = useState<number[]>([]);
  const alerts = useMemo(() => products.filter((product) => product.status !== "Disponible" && !resolved.includes(product.id) && (product.name.toLowerCase().includes(search.toLowerCase()) || product.sku.toLowerCase().includes(search.toLowerCase()))), [search, resolved]);

  return (
    <div className="space-y-6 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800 overflow-x-hidden">
      <PageHeader title="Alertes de stock" subtitle="Identifiez les ruptures et préparez les réapprovisionnements prioritaires." />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><MetricCard label="Alertes actives" value="17" detail="Tous sites confondus" icon={BellRing} tone="amber" /><MetricCard label="Ruptures" value="5" detail="Action immédiate requise" icon={AlertOctagon} tone="rose" /><MetricCard label="Stock faible" value="12" detail="Sous le seuil minimum" icon={AlertTriangle} tone="amber" /></div>
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"><div className="p-4 border-b border-slate-100"><SearchInput value={search} onChange={setSearch} placeholder="Rechercher une alerte par produit ou SKU..." /></div><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">Produit</th><th className="px-5 py-4">Stock actuel</th><th className="px-5 py-4">Seuil minimum</th><th className="px-5 py-4">Niveau</th><th className="px-5 py-4">Recommandation</th><th className="px-5 py-4 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{alerts.map((product) => <tr key={product.id} className="hover:bg-slate-50/60"><td className="px-5 py-4"><p className="font-bold text-slate-900">{product.name}</p><p className="text-[10px] text-slate-400 mt-0.5">{product.sku} · {product.category}</p></td><td className="px-5 py-4"><span className={`text-lg font-black ${product.stock === 0 ? "text-rose-600" : "text-amber-600"}`}>{product.stock}</span></td><td className="px-5 py-4 font-bold text-slate-600">{product.threshold}</td><td className="px-5 py-4"><StatusBadge status={product.status} /></td><td className="px-5 py-4 text-slate-500">Commander au moins <strong className="text-slate-700">{Math.max(product.threshold * 2 - product.stock, product.threshold)}</strong> unités</td><td className="px-5 py-4 text-right"><button onClick={() => setResolved((current) => [...current, product.id])} className={primaryButton}><PackagePlus size={14} /> Réapprovisionner</button></td></tr>)}</tbody></table></div>{alerts.length === 0 && <div className="py-14 flex flex-col items-center text-center"><CheckCircle2 size={28} className="text-emerald-500" /><p className="text-sm font-bold text-slate-800 mt-3">Aucune alerte correspondante</p><p className="text-xs text-slate-400 mt-1">Le stock est sous contrôle pour cette recherche.</p></div>}</div>
    </div>
  );
}
