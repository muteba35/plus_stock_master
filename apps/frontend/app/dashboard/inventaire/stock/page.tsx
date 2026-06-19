"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Filter, Plus } from "lucide-react";
import { InventoryModal, MetricCard, PageHeader, SearchInput, fieldClass, movements as initialMovements, primaryButton, secondaryButton } from "../components/inventory-ui";

export default function MouvementsStockPage() {
  const [items, setItems] = useState(initialMovements);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("Tous");
  const [modalOpen, setModalOpen] = useState(false);
  const filtered = useMemo(() => items.filter((item) => (item.product.toLowerCase().includes(search.toLowerCase()) || item.reference.toLowerCase().includes(search.toLowerCase())) && (type === "Tous" || item.type === type)), [items, search, type]);

  const addMovement = () => {
    setItems((current) => [{ id: Date.now(), reference: `MVT-${2400 + current.length + 1}`, product: "Produit sélectionné", type: "Ajustement", quantity: 1, date: "À l’instant", author: "Utilisateur actuel" }, ...current]);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800 overflow-x-hidden">
      <PageHeader title="Mouvements de stock" subtitle="Historique des entrées, sorties et corrections de quantité." action={<button onClick={() => setModalOpen(true)} className={primaryButton}><Plus size={15} /> Nouveau mouvement</button>} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><MetricCard label="Entrées ce mois" value="328" detail="+14% depuis mai" icon={ArrowDownLeft} tone="emerald" /><MetricCard label="Sorties ce mois" value="214" detail="Ventes et transferts" icon={ArrowUpRight} tone="rose" /><MetricCard label="Ajustements" value="16" detail="Écarts d’inventaire" icon={ArrowLeftRight} tone="amber" /></div>
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"><div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3"><SearchInput value={search} onChange={setSearch} placeholder="Rechercher un produit ou une référence..." /><div className="relative"><Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><select value={type} onChange={(event) => setType(event.target.value)} className="h-10 pl-9 pr-8 text-xs font-bold border border-slate-200 rounded-xl bg-white outline-none"><option>Tous</option><option>Entrée</option><option>Sortie</option><option>Ajustement</option></select></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">Référence</th><th className="px-5 py-4">Produit</th><th className="px-5 py-4">Opération</th><th className="px-5 py-4">Quantité</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Effectué par</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((movement) => <tr key={movement.id} className="hover:bg-slate-50/60"><td className="px-5 py-4 font-mono text-[11px] text-slate-500">{movement.reference}</td><td className="px-5 py-4 font-bold text-slate-900">{movement.product}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 font-bold ${movement.type === "Entrée" ? "text-emerald-600" : movement.type === "Sortie" ? "text-rose-600" : "text-amber-600"}`}>{movement.type === "Entrée" ? <ArrowDownLeft size={14} /> : movement.type === "Sortie" ? <ArrowUpRight size={14} /> : <ArrowLeftRight size={14} />}{movement.type}</span></td><td className="px-5 py-4 font-black">{movement.quantity > 0 ? "+" : ""}{movement.quantity}</td><td className="px-5 py-4 text-slate-500">{movement.date}</td><td className="px-5 py-4 text-slate-600">{movement.author}</td></tr>)}</tbody></table></div></div>
      <InventoryModal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau mouvement" subtitle="Enregistrez une variation manuelle du stock." footer={<><button onClick={() => setModalOpen(false)} className={secondaryButton}>Annuler</button><button onClick={addMovement} className={primaryButton}>Valider le mouvement</button></>}><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="space-y-1.5 sm:col-span-2"><span className="text-[10px] font-bold uppercase text-slate-400">Produit</span><select className={fieldClass}><option>MacBook Pro M2</option><option>Clavier mécanique</option><option>Casque Bluetooth</option></select></label><label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Type</span><select className={fieldClass}><option>Entrée</option><option>Sortie</option><option>Ajustement</option></select></label><label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Quantité</span><input type="number" min="1" className={fieldClass} placeholder="1" /></label><label className="space-y-1.5 sm:col-span-2"><span className="text-[10px] font-bold uppercase text-slate-400">Motif</span><input className={fieldClass} placeholder="Ex: Réception fournisseur" /></label></div></InventoryModal>
    </div>
  );
}
