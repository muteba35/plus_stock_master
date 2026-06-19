"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Edit2, FolderTree, Loader2, Plus, Trash2, XCircle } from "lucide-react";
import { InventoryModal, PageHeader, SearchInput, fieldClass, primaryButton, secondaryButton } from "../components/inventory-ui";

type Category = {
  _id: string;
  nom: string;
  description: string;
  couleur: string;
  productCount: number;
  stockValue: number;
  isActive: boolean;
  createdAt: string;
};

type CategoryForm = {
  nom: string;
  description: string;
  couleur: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6"];
const EMPTY_FORM: CategoryForm = { nom: "", description: "", couleur: COLORS[0] };

const getStoredAccess = () => {
  if (typeof window === "undefined") return { permissions: [] as string[], isOwner: false };
  try {
    const permissions = JSON.parse(localStorage.getItem("user_permissions") || "[]") as string[];
    const profile = JSON.parse(localStorage.getItem("user_profile") || "{}") as { role?: string };
    return { permissions, isOwner: profile.role === "Admin Général" };
  } catch {
    return { permissions: [] as string[], isOwner: false };
  }
};

export default function CategoriesInventairePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [{ permissions, isOwner }] = useState(getStoredAccess);

  const canCreate = isOwner || permissions.includes("CREER_CATEGORIE");
  const canEdit = isOwner || permissions.includes("MODIFIER_CATEGORIE");
  const canDelete = isOwner || permissions.includes("SUPPRIMER_CATEGORIE");

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 4000);
  }, []);

  const requestHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/inventaire/categories`, { headers: requestHeaders() });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Impossible de charger les catégories.");
      setCategories(data.data || []);
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return categories.filter((category) =>
      category.nom.toLowerCase().includes(query) ||
      (category.description || "").toLowerCase().includes(query)
    );
  }, [categories, search]);

  const openCreate = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (category: Category) => {
    setSelected(category);
    setForm({ nom: category.nom, description: category.description || "", couleur: category.couleur || COLORS[0] });
    setFormOpen(true);
  };

  const saveCategory = async () => {
    if (!form.nom.trim()) {
      showMessage("error", "Le nom de la catégorie est obligatoire.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        selected ? `${API_URL}/inventaire/categories/${selected._id}` : `${API_URL}/inventaire/categories`,
        {
          method: selected ? "PUT" : "POST",
          headers: requestHeaders(),
          body: JSON.stringify(form),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Enregistrement impossible.");
      setFormOpen(false);
      showMessage("success", data.message || "Catégorie enregistrée avec succès.");
      await fetchCategories();
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "Erreur de connexion au serveur.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/inventaire/categories/${selected._id}`, {
        method: "DELETE",
        headers: requestHeaders(),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Suppression impossible.");
      setDeleteOpen(false);
      setSelected(null);
      showMessage("success", data.message || "Catégorie supprimée.");
      await fetchCategories();
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "Erreur de connexion au serveur.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800 overflow-x-hidden">
      <PageHeader
        title="Catégories de produits"
        subtitle="Organisez votre catalogue en familles propres à la boutique active."
        action={canCreate ? <button onClick={openCreate} className={primaryButton}><Plus size={15} /> Nouvelle catégorie</button> : undefined}
      />

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"}`}>
          {message.type === "success" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}{message.text}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100"><SearchInput value={search} onChange={setSearch} placeholder="Rechercher une catégorie..." /></div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3 text-slate-400"><Loader2 size={24} className="animate-spin text-indigo-500" /><p className="text-xs font-medium">Chargement des catégories...</p></div>
          ) : (
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">Catégorie</th><th className="px-5 py-4">Description</th><th className="px-5 py-4">Produits</th><th className="px-5 py-4">Valeur du stock</th><th className="px-5 py-4">Statut</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((category) => (
                  <tr key={category._id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="w-2.5 h-9 rounded-full" style={{ backgroundColor: category.couleur }} /><span className="font-bold text-slate-900">{category.nom}</span></div></td>
                    <td className="px-5 py-4 text-slate-500 max-w-xs">{category.description || "Aucune description"}</td>
                    <td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md font-bold"><FolderTree size={12} /> {category.productCount || 0}</span></td>
                    <td className="px-5 py-4 font-bold">{(category.stockValue || 0).toLocaleString("fr-FR")} $</td>
                    <td className="px-5 py-4"><span className={`px-2 py-1 rounded-md text-[10px] font-bold ${category.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{category.isActive ? "Active" : "Inactive"}</span></td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-1">{canEdit && <button onClick={() => openEdit(category)} className="p-2 text-slate-400 hover:text-amber-600" title="Modifier"><Edit2 size={15} /></button>}{canDelete && <button onClick={() => { setSelected(category); setDeleteOpen(true); }} className="p-2 text-slate-400 hover:text-rose-600" title="Supprimer"><Trash2 size={15} /></button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && filtered.length === 0 && <div className="py-14 text-center"><FolderTree size={25} className="mx-auto text-slate-300" /><p className="text-sm font-bold text-slate-700 mt-3">Aucune catégorie trouvée</p><p className="text-xs text-slate-400 mt-1">Créez votre première catégorie ou modifiez la recherche.</p></div>}
        <div className="px-5 py-4 border-t border-slate-100 text-[11px] text-slate-400">{filtered.length} catégorie(s)</div>
      </div>

      <InventoryModal open={formOpen} onClose={() => !saving && setFormOpen(false)} title={selected ? "Modifier la catégorie" : "Nouvelle catégorie"} subtitle="Le nom doit être unique dans la boutique active." footer={<><button disabled={saving} onClick={() => setFormOpen(false)} className={secondaryButton}>Annuler</button><button disabled={saving} onClick={saveCategory} className={primaryButton}>{saving && <Loader2 size={14} className="animate-spin" />}{selected ? "Enregistrer" : "Créer la catégorie"}</button></>}>
        <div className="space-y-4">
          <label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Nom de la catégorie</span><input value={form.nom} onChange={(event) => setForm({ ...form, nom: event.target.value })} maxLength={100} className={fieldClass} placeholder="Ex: Consommables" /></label>
          <label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase text-slate-400">Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={500} rows={4} className={`${fieldClass} h-auto py-3 resize-none`} placeholder="Décrivez les produits regroupés ici..." /></label>
          <div className="space-y-2"><span className="text-[10px] font-bold uppercase text-slate-400">Couleur d’identification</span><div className="flex flex-wrap gap-2">{COLORS.map((color) => <button key={color} type="button" onClick={() => setForm({ ...form, couleur: color })} className={`w-8 h-8 rounded-lg border-2 transition-transform ${form.couleur === color ? "border-slate-800 scale-110" : "border-white shadow-sm"}`} style={{ backgroundColor: color }} title={`Couleur ${color}`} />)}</div></div>
        </div>
      </InventoryModal>

      <InventoryModal open={deleteOpen} onClose={() => !saving && setDeleteOpen(false)} title="Supprimer la catégorie" subtitle="Cette action est définitive." footer={<><button disabled={saving} onClick={() => setDeleteOpen(false)} className={secondaryButton}>Annuler</button><button disabled={saving} onClick={deleteCategory} className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl">{saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Supprimer</button></>}>
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100"><AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" /><p className="text-xs leading-relaxed text-amber-800">Voulez-vous vraiment supprimer la catégorie <strong>{selected?.nom}</strong> ? Une catégorie contenant des produits ne pourra pas être supprimée lorsque le catalogue sera connecté.</p></div>
      </InventoryModal>
    </div>
  );
}
