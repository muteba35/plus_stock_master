"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowDownLeft, ArrowRight, ArrowUpRight, Boxes, CircleDollarSign, Loader2, PackageCheck, PackagePlus, Tags, XCircle } from "lucide-react";
import { MetricCard, PageHeader, primaryButton } from "./components/inventory-ui";

type Movement = {
  _id: string;
  reference: string;
  produitId: { nom: string; sku: string; unite: string } | null;
  utilisateurId: { nom: string; prenom: string } | null;
  type: "ENTREE" | "SORTIE" | "AJUSTEMENT";
  variation: number;
  createdAt: string;
};
type PriorityProduct = {
  _id: string;
  nom: string;
  sku: string;
  stock: number;
  seuilAlerte: number;
  unite: string;
  severity: "RUPTURE" | "FAIBLE";
};
type OverviewData = {
  metrics: { totalProducts: number; stockValue: number; movementsToday: number; categoriesActive: number; totalUnits: number; valuationType: "achat" | "vente" };
  health: { available: number; lowStock: number; outOfStock: number; alertCount: number };
  recentMovements: Movement[];
  priorityProducts: PriorityProduct[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const EMPTY_DATA: OverviewData = {
  metrics: { totalProducts: 0, stockValue: 0, movementsToday: 0, categoriesActive: 0, totalUnits: 0, valuationType: "vente" },
  health: { available: 0, lowStock: 0, outOfStock: 0, alertCount: 0 },
  recentMovements: [],
  priorityProducts: [],
};

const getStoredAccess = () => {
  if (typeof window === "undefined") return { permissions: [] as string[], isOwner: false };
  try {
    const permissions = JSON.parse(localStorage.getItem("user_permissions") || "[]") as string[];
    const profile = JSON.parse(localStorage.getItem("user_profile") || "{}") as { role?: string };
    return { permissions, isOwner: profile.role === "Admin Général" };
  } catch { return { permissions: [] as string[], isOwner: false }; }
};

export default function InventairePage() {
  const [data, setData] = useState<OverviewData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [{ permissions, isOwner }] = useState(getStoredAccess);

  const hasPermission = (permission: string) => isOwner || permissions.includes(permission);
  const canCreateProduct = hasPermission("AJOUTER_PRODUIT");
  const canViewProducts = hasPermission("VOIR_LISTE_PRODUITS");
  const canViewCategories = hasPermission("VOIR_CATEGORIES");
  const canViewMovements = hasPermission("VOIR_MOUVEMENTS_STOCK");
  const canViewAlerts = hasPermission("VOIR_ALERTES_STOCK");

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/inventaire`, { headers: { Authorization: token ? `Bearer ${token}` : "" } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Impossible de charger la vue globale.");
      setData(result.data || EMPTY_DATA);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erreur de connexion au serveur.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchOverview(); }, [fetchOverview]);

  const totalProducts = data.metrics.totalProducts;
  const healthRate = totalProducts > 0 ? Math.round((data.health.available / totalProducts) * 100) : 100;
  const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  const movementLabel = (type: Movement["type"]) => type === "ENTREE" ? "Entrée" : type === "SORTIE" ? "Sortie" : "Ajustement";

  if (loading) {
    return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400"><Loader2 size={28} className="animate-spin text-indigo-500" /><p className="text-xs font-medium">Calcul de la vue globale...</p></div>;
  }

  return (
    <div className="space-y-6 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800 overflow-x-hidden">
      <PageHeader title="Vue d’ensemble de l’inventaire" subtitle="Disponibilité, valorisation et activité de la boutique active." action={canCreateProduct ? <Link href="/dashboard/inventaire/produits" className={primaryButton}><PackagePlus size={15} /> Nouveau produit</Link> : undefined} />
      {error && <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-100 bg-rose-50 text-rose-700 text-xs font-semibold"><XCircle size={15} />{error}<button onClick={() => void fetchOverview()} className="ml-auto font-bold underline">Réessayer</button></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Produits actifs" value={String(data.metrics.totalProducts)} detail={`${data.metrics.categoriesActive} catégorie(s) active(s)`} icon={Boxes} />
        <MetricCard label="Valeur du stock" value={`${data.metrics.stockValue.toLocaleString("fr-FR")} $`} detail={`Valorisation au prix de ${data.metrics.valuationType}`} icon={CircleDollarSign} tone="emerald" />
        <MetricCard label="Alertes actives" value={String(data.health.alertCount)} detail={`${data.health.outOfStock} rupture(s)`} icon={AlertTriangle} tone="amber" />
        <MetricCard label="Mouvements du jour" value={String(data.metrics.movementsToday)} detail={`${data.metrics.totalUnits.toLocaleString("fr-FR")} unité(s) en stock`} icon={PackageCheck} tone="rose" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.75fr] gap-5">
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900">Mouvements récents</h2><p className="text-[11px] text-slate-400 mt-1">Dernières opérations de la boutique</p></div>{canViewMovements && <Link href="/dashboard/inventaire/stock" className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">Tout afficher <ArrowRight size={13} /></Link>}</div>
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr><th className="px-5 py-3">Produit</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Variation</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Auteur</th></tr></thead><tbody className="divide-y divide-slate-100">{data.recentMovements.map((movement) => <tr key={movement._id} className="hover:bg-slate-50/60"><td className="px-5 py-4"><p className="font-bold text-slate-800">{movement.produitId?.nom || "Produit archivé"}</p><p className="text-[10px] text-slate-400 mt-0.5">{movement.reference}</p></td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 font-bold ${movement.type === "ENTREE" ? "text-emerald-600" : movement.type === "SORTIE" ? "text-rose-600" : "text-amber-600"}`}>{movement.type === "ENTREE" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}{movementLabel(movement.type)}</span></td><td className={`px-5 py-4 font-black ${movement.variation > 0 ? "text-emerald-600" : movement.variation < 0 ? "text-rose-600" : "text-slate-500"}`}>{movement.variation > 0 ? "+" : ""}{movement.variation}</td><td className="px-5 py-4 text-slate-500">{formatDate(movement.createdAt)}</td><td className="px-5 py-4 text-slate-500">{movement.utilisateurId ? `${movement.utilisateurId.prenom} ${movement.utilisateurId.nom}` : "Système"}</td></tr>)}</tbody></table></div>
          {data.recentMovements.length === 0 && <div className="py-12 text-center text-xs text-slate-400">Aucun mouvement enregistré.</div>}
        </section>

        <div className="space-y-5">
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-900">Santé du stock</h2><p className="text-[11px] text-slate-400 mt-1">Produits au-dessus du seuil</p></div><span className="text-xl font-black text-emerald-600">{healthRate}%</span></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-5"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${healthRate}%` }} /></div><div className="grid grid-cols-3 gap-2 mt-5 text-center"><div><p className="text-sm font-black text-emerald-600">{data.health.available}</p><p className="text-[9px] text-slate-400 uppercase mt-1">Disponibles</p></div><div><p className="text-sm font-black text-amber-600">{data.health.lowStock}</p><p className="text-[9px] text-slate-400 uppercase mt-1">Faibles</p></div><div><p className="text-sm font-black text-rose-600">{data.health.outOfStock}</p><p className="text-[9px] text-slate-400 uppercase mt-1">Ruptures</p></div></div></section>
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5"><div className="flex items-center justify-between mb-4"><h2 className="text-sm font-bold text-slate-900">À surveiller</h2>{canViewAlerts && <Link href="/dashboard/inventaire/alertes" className="text-[11px] font-bold text-indigo-600">Voir les alertes</Link>}</div><div className="space-y-3">{data.priorityProducts.map((product) => <div key={product._id} className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold text-slate-800 truncate">{product.nom}</p><p className="text-[10px] text-slate-400">{product.stock} {product.unite} · seuil {product.seuilAlerte}</p></div><span className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap ${product.severity === "RUPTURE" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-700"}`}>{product.severity === "RUPTURE" ? "Rupture" : "Stock faible"}</span></div>)}{data.priorityProducts.length === 0 && <div className="py-5 text-center"><CheckCircleIcon /><p className="text-xs text-slate-400 mt-2">Aucun produit à surveiller.</p></div>}</div></section>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {canViewProducts && <QuickLink href="/dashboard/inventaire/produits" icon={PackagePlus} title="Gérer les produits" text="Créer et modifier le catalogue" />}
        {canViewCategories && <QuickLink href="/dashboard/inventaire/categories" icon={Tags} title="Organiser les catégories" text="Structurer les familles d’articles" />}
        {canViewMovements && <QuickLink href="/dashboard/inventaire/stock" icon={Boxes} title="Consulter les mouvements" text="Suivre les entrées et les sorties" />}
      </section>
    </div>
  );
}

function CheckCircleIcon() {
  return <PackageCheck size={24} className="mx-auto text-emerald-500" />;
}

function QuickLink({ href, icon: Icon, title, text }: { href: string; icon: typeof Boxes; title: string; text: string }) {
  return <Link href={href} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 hover:border-indigo-200 hover:shadow-sm transition-all"><span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Icon size={18} /></span><span className="min-w-0"><span className="block text-xs font-bold text-slate-800">{title}</span><span className="block text-[10px] text-slate-400 mt-1">{text}</span></span></Link>;
}
