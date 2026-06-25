"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Download, FileText, Loader2, ReceiptText, RotateCcw, Search, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { formatMoney } from "../../inventaire/components/currency";
import { CashHeader, CashMetric, CashModal, CashPagination, CashSearch, secondaryButton } from "../components/cashier-ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const PAGE_SIZE = 10;

type Metrics = {
  ventes: number;
  caHT: number;
  caTTC: number;
  tva: number;
  cout: number;
  marge: number;
  tauxMarge: number;
  retours: number;
  montantRetours: number;
  netApresRetours: number;
};

type ReportRow = {
  date?: string;
  caissier?: string;
  paiement?: string;
  ventes: number;
  quantite: number;
  caHT: number;
  totalTTC: number;
  tva: number;
  cout: number;
  marge: number;
  tauxMarge: number;
};

type SaleDetail = {
  reference: string;
  factureReference?: string;
  clientNom?: string;
  date: string;
  caissier: string;
  paiement: string;
  produit: string;
  sku?: string;
  categorie?: string;
  quantite: number;
  prixVente: number;
  coutAchat: number;
  margeUnitaire: number;
  marge: number;
  totalTTC: number;
  devise?: string;
};

type ReturnRow = {
  reference: string;
  venteReference: string;
  clientNom: string;
  typeRetour: string;
  montantTotalTTC: number;
  createdAt: string;
};

type ReportData = {
  success: boolean;
  scope: "all" | "own";
  devise: string;
  metrics: Metrics;
  daily: ReportRow[];
  cashiers: ReportRow[];
  payments: ReportRow[];
  salesDetails: SaleDetail[];
  returns: ReturnRow[];
};

const emptyMetrics: Metrics = { ventes: 0, caHT: 0, caTTC: 0, tva: 0, cout: 0, marge: 0, tauxMarge: 0, retours: 0, montantRetours: 0, netApresRetours: 0 };
const emptyData: ReportData = { success: true, scope: "own", devise: "USD ($)", metrics: emptyMetrics, daily: [], cashiers: [], payments: [], salesDetails: [], returns: [] };

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

const compactMoney = (value: number, devise: string) => {
  if (Math.abs(value || 0) < 1000000) return formatMoney(value, devise);
  const symbol = devise.includes("(") ? devise.replace(/^.*\((.*)\).*$/, "$1") : devise;
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 2 }).format(value) + " " + symbol;
};

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
const csvValue = (value: string | number | undefined) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
const escapeHtml = (value: string | number | undefined) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] || char));

export default function CashReportsPage() {
  const [data, setData] = useState<ReportData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [cashierFilter, setCashierFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [metricOpen, setMetricOpen] = useState<null | { title: string; value: string; detail: string }>(null);
  const [{ permissions, isOwner }] = useState(getStoredAccess);

  const canExport = isOwner || permissions.includes("EXPORTER_RAPPORTS_CAISSE") || permissions.includes("EXPORTER_RAPPORTS");

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const response = await fetch(API_URL + "/caisse/rapports", { headers: { Authorization: token ? "Bearer " + token : "" } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Impossible de charger les rapports caisse.");
      setData({ ...emptyData, ...result, salesDetails: result.salesDetails || [] });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchReports(); }, [fetchReports]);

  const cashierOptions = useMemo(() => data.cashiers.map((row) => row.caissier || "Caissier").filter(Boolean), [data.cashiers]);

  const filteredSales = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.salesDetails.filter((row) => {
      const matchesCashier = cashierFilter === "all" || row.caissier === cashierFilter;
      const haystack = [row.reference, row.factureReference, row.clientNom, row.produit, row.sku, row.categorie, row.caissier, row.paiement].join(" ").toLowerCase();
      return matchesCashier && (!query || haystack.includes(query));
    });
  }, [cashierFilter, data.salesDetails, search]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedSales = filteredSales.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const profitTone = data.metrics.marge >= 0 ? "emerald" : "rose";
  const profitLabel = data.metrics.marge >= 0 ? "Benefice brut" : "Perte brute";

  const exportExcel = () => {
    const headers = ["reference", "facture", "client", "produit", "sku", "categorie", "caissier", "quantite", "prix_achat", "prix_ht", "prix_total_ttc", "date", "paiement"];
    const rows = filteredSales.map((row) => [row.reference, row.factureReference || "", row.clientNom || "", row.produit, row.sku || "", row.categorie || "", row.caissier, row.quantite, row.coutAchat, row.prixVente, row.totalTTC, formatDate(row.date), row.paiement]);
    const content = "\uFEFF" + [headers, ...rows].map((row) => row.map((cell) => csvValue(cell as string | number)).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "rapports-caisse-ventes.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const popup = window.open("", "_blank", "width=1100,height=760");
    if (!popup) return;
    const rows = filteredSales.slice(0, 80).map((row) => "<tr><td>" + escapeHtml(row.reference) + "</td><td>" + escapeHtml(row.produit) + "</td><td>" + escapeHtml(row.caissier) + "</td><td>" + escapeHtml(row.quantite) + "</td><td>" + escapeHtml(formatMoney(row.coutAchat, data.devise)) + "</td><td>" + escapeHtml(formatMoney(row.prixVente, data.devise)) + "</td><td>" + escapeHtml(formatMoney(row.totalTTC, data.devise)) + "</td><td>" + escapeHtml(formatDate(row.date)) + "</td><td>" + escapeHtml(row.paiement) + "</td></tr>").join("");
    popup.document.write("<!doctype html><html lang='fr'><head><meta charset='utf-8'><title>Rapports caisse</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#172033;margin:0}h1{font-size:20px;margin:0 0 4px}p{font-size:11px;color:#64748b;margin:0 0 18px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:18px}.card{border:1px solid #e2e8f0;padding:10px}.label{font-size:9px;color:#64748b;text-transform:uppercase}.value{font-size:16px;font-weight:800;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:8.5px}th{background:#f1f5f9;text-align:left;text-transform:uppercase;color:#64748b}th,td{padding:6px;border:1px solid #e2e8f0;vertical-align:top}.footer{margin-top:12px;font-size:9px;color:#94a3b8}</style></head><body><h1>Rapports caisse</h1><p>Export du " + escapeHtml(new Date().toLocaleString("fr-FR")) + "</p><div class='cards'><div class='card'><div class='label'>CA TTC</div><div class='value'>" + escapeHtml(formatMoney(data.metrics.caTTC, data.devise)) + "</div></div><div class='card'><div class='label'>TVA collectee</div><div class='value'>" + escapeHtml(formatMoney(data.metrics.tva, data.devise)) + "</div></div><div class='card'><div class='label'>Cout sorti</div><div class='value'>" + escapeHtml(formatMoney(data.metrics.cout, data.devise)) + "</div></div><div class='card'><div class='label'>Marge</div><div class='value'>" + escapeHtml(formatMoney(data.metrics.marge, data.devise)) + "</div></div></div><table><thead><tr><th>Reference</th><th>Produit</th><th>Caissier</th><th>Qte</th><th>Prix achat</th><th>Prix HT</th><th>Total TTC</th><th>Date</th><th>Paiement</th></tr></thead><tbody>" + rows + "</tbody></table><div class='footer'>StockMaster Pro - Document genere automatiquement</div><script>window.onload=()=>window.print();</script></body></html>");
    popup.document.close();
  };

  return (
    <div className="space-y-5 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800">
      <CashHeader
        title="Rapports Caisse"
        subtitle={data.scope === "all" ? "Analyse operationnelle de toutes les caisses." : "Analyse limitee a vos propres operations."}
        action={canExport ? <div className="flex flex-wrap gap-2"><button onClick={exportExcel} disabled={loading} className={secondaryButton}><Download size={14} /> Excel</button><button onClick={exportPdf} disabled={loading} className={secondaryButton}><FileText size={14} /> PDF</button></div> : undefined}
      />

      {error && <div className="p-3 rounded-xl border border-rose-100 bg-rose-50 text-xs font-semibold text-rose-700 flex items-center gap-2"><AlertCircle size={15} />{error}</div>}

      {loading ? (
        <div className="py-20 flex flex-col items-center gap-3 text-slate-400"><Loader2 size={26} className="animate-spin text-indigo-500" /><span className="text-xs font-medium">Calcul des rapports caisse...</span></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <CashMetric label="Chiffre d'affaires TTC" value={compactMoney(data.metrics.caTTC, data.devise)} detail={String(data.metrics.ventes) + " vente(s) payee(s)"} icon={WalletCards} tone="emerald" onInspect={() => setMetricOpen({ title: "Chiffre d'affaires TTC", value: formatMoney(data.metrics.caTTC, data.devise), detail: "Total encaisse avant retours." })} />
            <CashMetric label="TVA collectee" value={compactMoney(data.metrics.tva, data.devise)} detail="TVA calculee a la vente" icon={ReceiptText} tone="indigo" onInspect={() => setMetricOpen({ title: "TVA collectee", value: formatMoney(data.metrics.tva, data.devise), detail: "Montant fiscal collecte." })} />
            <CashMetric label="Cout sorti" value={compactMoney(data.metrics.cout, data.devise)} detail="Prix d'achat des produits vendus" icon={TrendingDown} tone="amber" onInspect={() => setMetricOpen({ title: "Cout sorti", value: formatMoney(data.metrics.cout, data.devise), detail: "Valeur du stock sorti au prix d'achat." })} />
            <CashMetric label={profitLabel} value={compactMoney(data.metrics.marge, data.devise)} detail={String(data.metrics.tauxMarge) + "% de marge"} icon={TrendingUp} tone={profitTone} onInspect={() => setMetricOpen({ title: profitLabel, value: formatMoney(data.metrics.marge, data.devise), detail: "CA HT moins cout sorti." })} />
            <CashMetric label="Retours" value={compactMoney(data.metrics.montantRetours, data.devise)} detail={String(data.metrics.retours) + " retour(s)"} icon={RotateCcw} tone="rose" onInspect={() => setMetricOpen({ title: "Retours / remboursements", value: formatMoney(data.metrics.montantRetours, data.devise), detail: "Montant valide en retours clients." })} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-5">
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
                <div><h2 className="text-sm font-bold text-slate-900">Tableau des ventes detaillees</h2><p className="text-[11px] text-slate-400 mt-1">Vente, produit, caissier, quantite, prix d'achat, prix HT et total TTC.</p></div>
                <div className="flex flex-col sm:flex-row gap-2 min-w-0 lg:min-w-[520px]">
                  <CashSearch value={search} onChange={setSearch} placeholder="Rechercher vente, produit, client, SKU..." />
                  {data.scope === "all" && <div className="relative sm:w-56"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><select value={cashierFilter} onChange={(event) => setCashierFilter(event.target.value)} className="w-full h-10 pl-10 pr-3 text-xs font-bold border border-slate-200 rounded-xl bg-white outline-none focus:border-indigo-500"><option value="all">Tous les caissiers</option>{cashierOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">Vente</th><th className="px-5 py-4">Produit</th><th className="px-5 py-4">Caissier</th><th className="px-5 py-4">Qte</th><th className="px-5 py-4">Prix achat</th><th className="px-5 py-4">Prix HT</th><th className="px-5 py-4">Total TTC</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Paiement</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedSales.map((row, index) => <tr key={row.reference + row.produit + index} className="hover:bg-slate-50/60"><td className="px-5 py-4"><p className="font-bold text-slate-900">{row.reference}</p><p className="text-[10px] text-slate-400">{row.clientNom || "Client comptoir"}</p></td><td className="px-5 py-4"><p className="font-bold text-slate-900">{row.produit}</p><p className="text-[10px] text-slate-400">{row.sku || row.categorie || "-"}</p></td><td className="px-5 py-4 font-bold text-slate-700">{row.caissier}</td><td className="px-5 py-4 font-black">{row.quantite}</td><td className="px-5 py-4 text-amber-700 font-bold">{formatMoney(row.coutAchat, data.devise)}</td><td className="px-5 py-4 font-bold">{formatMoney(row.prixVente, data.devise)}</td><td className="px-5 py-4 font-black text-slate-900">{formatMoney(row.totalTTC, data.devise)}</td><td className="px-5 py-4 text-slate-500">{formatDate(row.date)}</td><td className="px-5 py-4"><span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">{row.paiement}</span></td></tr>)}
                    {paginatedSales.length === 0 && <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-400">Aucune vente trouvee.</td></tr>}
                  </tbody>
                </table>
              </div>
              <CashPagination page={safePage} pageSize={PAGE_SIZE} totalItems={filteredSales.length} onPageChange={setPage} />
            </section>

            <div className="space-y-5">
              <SummaryCard title="Retours / remboursements" rows={[["Nombre", String(data.metrics.retours)], ["Montant retourne", formatMoney(data.metrics.montantRetours, data.devise)], ["Net apres retours", formatMoney(data.metrics.netApresRetours, data.devise)]]} />
              <MiniTable title="Ventes par paiement" rows={data.payments.slice(0, 5)} labelKey="paiement" devise={data.devise} />
              <MiniTable title="Ventes par caissier" rows={data.cashiers.slice(0, 5)} labelKey="caissier" devise={data.devise} />
            </div>
          </div>

          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100"><h2 className="text-sm font-bold text-slate-900">Chiffre d'affaires par jour</h2><p className="text-[11px] text-slate-400 mt-1">Vue rapide des derniers jours encaisses.</p></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Ventes</th><th className="px-5 py-4">CA TTC</th><th className="px-5 py-4">TVA</th><th className="px-5 py-4">Marge</th></tr></thead><tbody className="divide-y divide-slate-100">{data.daily.slice(-10).reverse().map((row) => <tr key={row.date}><td className="px-5 py-4 font-bold">{formatDate(row.date)}</td><td className="px-5 py-4">{row.ventes}</td><td className="px-5 py-4 font-black">{formatMoney(row.totalTTC, data.devise)}</td><td className="px-5 py-4">{formatMoney(row.tva, data.devise)}</td><td className={(row.marge >= 0 ? "text-emerald-600" : "text-rose-600") + " px-5 py-4 font-black"}>{formatMoney(row.marge, data.devise)}</td></tr>)}</tbody></table></div>
          </section>
        </>
      )}

      <CashModal open={Boolean(metricOpen)} title={metricOpen?.title || "Detail"} subtitle={metricOpen?.detail || "Valeur exacte"} onClose={() => setMetricOpen(null)} footer={<button onClick={() => setMetricOpen(null)} className={secondaryButton}>Fermer</button>}><div className="p-4 rounded-xl bg-slate-50 border border-slate-100"><p className="text-[10px] uppercase font-bold text-slate-400">Valeur exacte</p><p className="text-2xl font-black text-slate-900 mt-2 break-words">{metricOpen?.value}</p><p className="text-xs text-slate-500 mt-2">{metricOpen?.detail}</p></div></CashModal>
    </div>
  );
}

function SummaryCard({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5"><h2 className="text-sm font-bold text-slate-900 mb-4">{title}</h2><div className="space-y-3">{rows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 text-xs"><span className="text-slate-400 font-bold uppercase text-[10px]">{label}</span><strong className="text-slate-900 text-right">{value}</strong></div>)}</div></section>;
}

function MiniTable({ title, rows, labelKey, devise }: { title: string; rows: ReportRow[]; labelKey: "paiement" | "caissier"; devise: string }) {
  return <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5"><h2 className="text-sm font-bold text-slate-900 mb-4">{title}</h2><div className="space-y-3">{rows.length === 0 && <p className="text-xs text-slate-400">Aucune donnee.</p>}{rows.map((row) => <div key={String(row[labelKey])} className="space-y-1"><div className="flex justify-between gap-3 text-xs"><span className="font-bold text-slate-700 truncate">{row[labelKey]}</span><span className="font-black text-slate-900">{formatMoney(row.totalTTC, devise)}</span></div><div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: Math.min(100, Math.max(4, row.tauxMarge || 0)) + "%" }} /></div><p className="text-[10px] text-slate-400">Marge : {formatMoney(row.marge, devise)} - {row.ventes} vente(s)</p></div>)}</div></section>;
}
