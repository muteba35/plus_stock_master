"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, Download, FileText, Layers3, Loader2, PackageSearch, RefreshCw, TrendingUp } from "lucide-react";
import { formatMoney } from "../components/currency";
import { InventoryModal, InventoryPagination, MetricCard, PageHeader, SearchInput, secondaryButton } from "../components/inventory-ui";
import { exportXlsxWorkbook } from "../../components/export-xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const PAGE_SIZE = 10;
const TVA_RATE = 0.16;

type ProjectionRow = {
  produit: string;
  sku?: string;
  categorie: string;
  devise: string;
  unite?: string;
  quantiteActuelle: number;
  prixAchatUnitaire: number;
  prixVenteUnitaire: number;
  margeUnitaire: number;
  margeTotale: number;
  tauxMarge: number;
  produits?: number;
};

type ProjectionData = {
  success: boolean;
  devise: string;
  metrics: {
    produitsAnalyses: number;
    categoriesAnalysees: number;
    quantiteActuelle: number;
    margeTotale: number;
    margeUnitaireMoyenne: number;
    tauxMargeMoyen: number;
  };
  products: ProjectionRow[];
  categories: ProjectionRow[];
};

const emptyData: ProjectionData = {
  success: true,
  devise: "USD ($)",
  metrics: { produitsAnalyses: 0, categoriesAnalysees: 0, quantiteActuelle: 0, margeTotale: 0, margeUnitaireMoyenne: 0, tauxMargeMoyen: 0 },
  products: [],
  categories: [],
};

const getStoredAccess = () => {
  if (typeof window === "undefined") return { permissions: [] as string[], isOwner: false };
  try {
    const permissions = JSON.parse(localStorage.getItem("user_permissions") || "[]") as string[];
    const profile = JSON.parse(localStorage.getItem("user_profile") || "{}") as { role?: string };
    return { permissions, isOwner: String(profile.role || "").toLowerCase().includes("admin") };
  } catch {
    return { permissions: [] as string[], isOwner: false };
  }
};

const csvValue = (value: string | number | undefined) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
const escapeHtml = (value: string | number | undefined) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] || char));
const roundMoney = (value: number) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const margeUnitaireApresTva = (row: ProjectionRow) => roundMoney((Number(row.prixVenteUnitaire || 0) * (1 + TVA_RATE)) - Number(row.prixAchatUnitaire || 0));
const margeTotaleApresTva = (row: ProjectionRow) => roundMoney(margeUnitaireApresTva(row) * Number(row.quantiteActuelle || 0));

export default function InventoryProjectionPage() {
  const [data, setData] = useState<ProjectionData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"products" | "categories">("products");
  const [page, setPage] = useState(1);
  const [infoModal, setInfoModal] = useState<{ title: string; body: string; formula: string } | null>(null);
  const [{ permissions, isOwner }] = useState(getStoredAccess);
  const canExport = isOwner || permissions.includes("EXPORTER_PROJECTION_PRODUITS");

  const fetchProjection = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const response = await fetch(API_URL + "/inventaire/projection", { headers: { Authorization: token ? "Bearer " + token : "" } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Impossible de charger la projection produits.");
      setData({ ...emptyData, ...result, metrics: { ...emptyData.metrics, ...result.metrics } });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchProjection(); }, [fetchProjection]);

  const sourceRows = tab === "products" ? data.products : data.categories;
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sourceRows;
    return sourceRows.filter((row) => [row.produit, row.sku, row.categorie].join(" ").toLowerCase().includes(query));
  }, [search, sourceRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportExcel = () => {
    exportXlsxWorkbook("projection-produits.xlsx", [
      {
        name: "Produits",
        columns: ["Produit", "SKU", "Categorie", "Stock actuel", "Prix achat", "Prix vente HT", "Marge unitaire HT", "Marge totale HT", "Marge unitaire apres TVA", "Marge totale apres TVA", "Taux marge"],
        rows: data.products.map((row) => [row.produit, row.sku || "", row.categorie, row.quantiteActuelle, row.prixAchatUnitaire, row.prixVenteUnitaire, row.margeUnitaire, row.margeTotale, margeUnitaireApresTva(row), margeTotaleApresTva(row), row.tauxMarge]),
      },
      {
        name: "Categories",
        columns: ["Categorie", "Stock actuel", "Marge totale", "Taux marge"],
        rows: data.categories.map((row) => [row.categorie || row.produit, row.quantiteActuelle, row.margeTotale, row.tauxMarge]),
      },
    ]);
  };

  const exportPdf = () => {
    const popup = window.open("", "_blank", "width=1100,height=760");
    if (!popup) return;
    const rows = filteredRows.slice(0, 80).map((row) => "<tr><td>" + escapeHtml(row.produit) + "</td><td>" + escapeHtml(row.categorie) + "</td><td>" + escapeHtml(row.quantiteActuelle) + "</td><td>" + escapeHtml(formatMoney(row.prixAchatUnitaire, data.devise)) + "</td><td>" + escapeHtml(formatMoney(row.prixVenteUnitaire, data.devise)) + "</td><td>" + escapeHtml(formatMoney(row.margeUnitaire, data.devise)) + "</td><td>" + escapeHtml(formatMoney(row.margeTotale, data.devise)) + "</td><td>" + escapeHtml(formatMoney(margeUnitaireApresTva(row), data.devise)) + "</td><td>" + escapeHtml(formatMoney(margeTotaleApresTva(row), data.devise)) + "</td><td>" + escapeHtml(row.tauxMarge + "%") + "</td></tr>").join("");
    popup.document.write("<!doctype html><html lang='fr'><head><meta charset='utf-8'><title>Projection produits</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#172033;margin:0}h1{font-size:20px;margin:0 0 4px}p{font-size:11px;color:#64748b;margin:0 0 18px}table{width:100%;border-collapse:collapse;font-size:8px}th{background:#f1f5f9;text-align:left;text-transform:uppercase;color:#64748b}th,td{padding:6px;border:1px solid #e2e8f0;vertical-align:top}.footer{margin-top:12px;font-size:9px;color:#94a3b8}</style></head><body><h1>Projection produits</h1><p>Export du " + escapeHtml(new Date().toLocaleString("fr-FR")) + "</p><table><thead><tr><th>Nom</th><th>Categorie</th><th>Quantite actuelle</th><th>Prix achat</th><th>Prix vente HT</th><th>Marge unitaire HT</th><th>Marge totale HT</th><th>Marge unitaire apres TVA</th><th>Marge totale apres TVA</th><th>Taux</th></tr></thead><tbody>" + rows + "</tbody></table><div class='footer'>StockMaster Pro - Document genere automatiquement</div><script>window.onload=()=>window.print();</script></body></html>");
    popup.document.close();
  };

  return (
    <div className="space-y-5 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800">
      <PageHeader title="Projection Produits" subtitle="Projection de marge basee sur le stock actuel : marge unitaire x quantite actuelle." action={<div className="flex flex-wrap gap-2"><button onClick={() => void fetchProjection()} disabled={loading} className={secondaryButton}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser</button>{canExport && <><button onClick={exportExcel} disabled={loading} className={secondaryButton}><Download size={14} /> Excel</button><button onClick={exportPdf} disabled={loading} className={secondaryButton}><FileText size={14} /> PDF</button></>}</div>} />

      {error && <div className="p-3 rounded-xl border border-rose-100 bg-rose-50 text-xs font-semibold text-rose-700 flex items-center gap-2"><AlertCircle size={15} />{error}</div>}

      {loading ? (
        <div className="py-20 flex flex-col items-center gap-3 text-slate-400"><Loader2 size={26} className="animate-spin text-indigo-500" /><span className="text-xs font-medium">Calcul des projections...</span></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard label="Produits analyses" value={String(data.metrics.produitsAnalyses)} detail={String(data.metrics.categoriesAnalysees) + " categorie(s)"} icon={PackageSearch} tone="indigo" onInspect={() => setInfoModal({ title: "Produits analyses", body: "Nombre de produits actifs inclus dans la projection, avec le nombre de categories qui contiennent au moins un produit projete.", formula: "Produits analyses = total des produits actifs visibles dans la boutique." })} />
            <MetricCard label="Quantite actuelle" value={String(data.metrics.quantiteActuelle)} detail="Stock actuel cumule" icon={Layers3} tone="emerald" onInspect={() => setInfoModal({ title: "Quantite actuelle", body: "Somme des stocks actuels de tous les produits inclus dans la projection.", formula: "Exemple : 10 biscuits + 5 jus = 15 unites en stock." })} />
            <MetricCard label="Marge unitaire moyenne" value={formatMoney(data.metrics.margeUnitaireMoyenne, data.devise)} detail="Moyenne par unite en stock" icon={TrendingUp} tone="amber" onInspect={() => setInfoModal({ title: "Marge unitaire moyenne", body: "Moyenne estimee de marge pour une unite disponible en stock.", formula: "Marge unitaire moyenne = marge totale projetee / quantite actuelle." })} />
            <MetricCard label="Marge totale projetee" value={formatMoney(data.metrics.margeTotale, data.devise)} detail={String(data.metrics.tauxMargeMoyen) + "% de taux moyen"} icon={BarChart3} tone={data.metrics.margeTotale >= 0 ? "emerald" : "rose"} onInspect={() => setInfoModal({ title: "Marge totale projetee", body: "Projection de marge si tout le stock actuel est vendu au prix actuel.", formula: "Marge totale projetee = somme de ((prix de vente HT - prix d'achat) x stock actuel)." })} />
          </div>

          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
              <div><h2 className="text-sm font-bold text-slate-900">Projection par {tab === "products" ? "produit" : "categorie"}</h2><p className="text-[11px] text-slate-400 mt-1">Exemple HT : achat 10, vente 15, stock 10 donne une marge totale de 50. Apres TVA : vente TTC 17,4, marge unitaire 7,4.</p></div>
              <div className="flex flex-col sm:flex-row gap-2 min-w-0 lg:min-w-[520px]"><SearchInput value={search} onChange={setSearch} placeholder="Rechercher produit, SKU ou categorie..." /><div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-xl"><button onClick={() => setTab("products")} className={(tab === "products" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500") + " h-8 px-3 rounded-lg text-[11px] font-bold"}>Produits</button><button onClick={() => setTab("categories")} className={(tab === "categories" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500") + " h-8 px-3 rounded-lg text-[11px] font-bold"}>Categories</button></div></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">Nom</th><th className="px-5 py-4">Categorie</th><th className="px-5 py-4">Quantite actuelle</th><th className="px-5 py-4">Prix achat unitaire</th><th className="px-5 py-4">Prix vente HT</th><th className="px-5 py-4">Marge unitaire HT</th><th className="px-5 py-4">Marge totale HT</th><th className="px-5 py-4">Marge unitaire apres TVA</th><th className="px-5 py-4">Marge totale apres TVA</th><th className="px-5 py-4">Taux</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.map((row, index) => {
                    const margeUnitTtc = margeUnitaireApresTva(row);
                    const margeTotalTtc = margeTotaleApresTva(row);
                    return <tr key={row.produit + row.categorie + index} className="hover:bg-slate-50/60"><td className="px-5 py-4"><p className="font-bold text-slate-900">{row.produit}</p><p className="text-[10px] text-slate-400">{row.sku || (row.produits ? String(row.produits) + " produit(s)" : "-")}</p></td><td className="px-5 py-4 text-slate-500">{row.categorie || "-"}</td><td className="px-5 py-4 font-black">{row.quantiteActuelle} {row.unite || ""}</td><td className="px-5 py-4 text-amber-700 font-bold">{formatMoney(row.prixAchatUnitaire, data.devise)}</td><td className="px-5 py-4 font-bold">{formatMoney(row.prixVenteUnitaire, data.devise)}</td><td className={(row.margeUnitaire >= 0 ? "text-emerald-600" : "text-rose-600") + " px-5 py-4 font-black"}>{formatMoney(row.margeUnitaire, data.devise)}</td><td className={(row.margeTotale >= 0 ? "text-emerald-600" : "text-rose-600") + " px-5 py-4 font-black"}>{formatMoney(row.margeTotale, data.devise)}</td><td className={(margeUnitTtc >= 0 ? "text-emerald-600" : "text-rose-600") + " px-5 py-4 font-black"}>{formatMoney(margeUnitTtc, data.devise)}</td><td className={(margeTotalTtc >= 0 ? "text-emerald-600" : "text-rose-600") + " px-5 py-4 font-black"}>{formatMoney(margeTotalTtc, data.devise)}</td><td className="px-5 py-4"><span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold">{row.tauxMarge}%</span></td></tr>;
                  })}
                  {paginatedRows.length === 0 && <tr><td colSpan={10} className="px-5 py-12 text-center text-slate-400">Aucune projection trouvee.</td></tr>}
                </tbody>
              </table>
            </div>
            <InventoryPagination page={safePage} pageSize={PAGE_SIZE} totalItems={filteredRows.length} onPageChange={setPage} />
          </section>
        </>
      )}

      <InventoryModal
        open={Boolean(infoModal)}
        onClose={() => setInfoModal(null)}
        title={infoModal?.title || "Detail du calcul"}
        subtitle="Explication de la valeur affichee"
        footer={<button type="button" onClick={() => setInfoModal(null)} className={secondaryButton}>Fermer</button>}
      >
        <div className="space-y-3 text-xs text-slate-600">
          <p className="font-medium leading-relaxed">{infoModal?.body}</p>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-indigo-700 font-bold leading-relaxed">
            {infoModal?.formula}
          </div>
        </div>
      </InventoryModal>
    </div>
  );
}
