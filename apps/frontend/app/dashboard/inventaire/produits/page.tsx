"use client";

import { useMemo, useState } from "react";
import { Edit2, Eye, Filter, PackagePlus, Plus, Trash2 } from "lucide-react";
import { InventoryModal, PageHeader, SearchInput, StatusBadge, fieldClass, primaryButton, products as initialProducts, secondaryButton, type Product } from "../components/inventory-ui";

export default function ProduitsPage() {
  const [items, setItems] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Tous");
  const [modalOpen, setModalOpen] = useState(false);
  const filtered = useMemo(() => items.filter((item) => (item.name.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase())) && (status === "Tous" || item.status === status)), [items, search, status]);

  const addProduct = () => {
    setItems((current) => [...current, { id: Date.now(), name: "Nouveau produit", sku: `PRD-${current.length + 1}`, category: "Non classé", price: 0, stock: 0, threshold: 5, status: "Rupture" }]);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800 overflow-x-hidden">
      <PageHeader title="Gestion des produits" subtitle="Créez, recherchez et suivez tous les articles de votre catalogue." action={<button onClick={() => setModalOpen(true)} className={primaryButton}><Plus size={15} /> Nouveau produit</button>} />
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3"><SearchInput value={search} onChange={setSearch} placeholder="Rechercher par nom ou référence SKU..." /><div className="relative"><Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 pl-9 pr-8 text-xs font-bold border border-slate-200 rounded-xl bg-white outline-none"><option>Tous</option><option>Disponible</option><option>Stock faible</option><option>Rupture</option></select></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">Produit</th><th className="px-5 py-4">Catégorie</th><th className="px-5 py-4">Prix</th><th className="px-5 py-4">Stock</th><th className="px-5 py-4">Statut</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((product) => <tr key={product.id} className="hover:bg-slate-50/60"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><PackagePlus size={16} /></span><div><p className="font-bold text-slate-900">{product.name}</p><p className="text-[10px] text-slate-400 mt-0.5">{product.sku}</p></div></div></td><td className="px-5 py-4 text-slate-600">{product.category}</td><td className="px-5 py-4 font-bold">{product.price.toLocaleString("fr-FR")} $</td><td className="px-5 py-4"><span className="font-black">{product.stock}</span><span className="text-slate-400"> / seuil {product.threshold}</span></td><td className="px-5 py-4"><StatusBadge status={product.status} /></td><td className="px-5 py-4"><div className="flex justify-end gap-1"><button className="p-2 text-slate-400 hover:text-indigo-600" title="Consulter"><Eye size={15} /></button><button className="p-2 text-slate-400 hover:text-amber-600" title="Modifier"><Edit2 size={15} /></button><button onClick={() => setItems((current) => current.filter((item) => item.id !== product.id))} className="p-2 text-slate-400 hover:text-rose-600" title="Supprimer"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>
        <div className="px-5 py-4 border-t border-slate-100 text-[11px] text-slate-400 font-medium">{filtered.length} produit(s) affiché(s)</div>
      </div>
      <InventoryModal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau produit" subtitle="Ajoutez un article au catalogue de la boutique." footer={<><button onClick={() => setModalOpen(false)} className={secondaryButton}>Annuler</button><button onClick={addProduct} className={primaryButton}>Créer le produit</button></>}><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="space-y-1.5 sm:col-span-2"><span className="text-[10px] font-bold uppercase text-slate-400">Nom du produit</span><input className={fieldClass} placeholder="Ex: Imprimante thermique" /></label><label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Référence SKU</span><input className={fieldClass} placeholder="IMP-001" /></label><label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Catégorie</span><select className={fieldClass}><option>Électronique</option><option>Périphériques</option><option>Audio</option></select></label><label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Prix de vente</span><input type="number" className={fieldClass} placeholder="0.00" /></label><label className="space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Stock initial</span><input type="number" className={fieldClass} placeholder="0" /></label></div></InventoryModal>
    </div>
  );
}
