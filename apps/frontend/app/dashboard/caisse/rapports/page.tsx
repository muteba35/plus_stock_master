"use client";
import { useDashboardAccess } from "../../components/DashboardAccess";
import { dashboardUi as du, dashboardLocale } from "../../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../../src/components/LanguageRuntime";


import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Download, FileText, Filter, Loader2, ReceiptText, RefreshCw, RotateCcw, Search, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { formatMoney } from "../../inventaire/components/currency";
import { CashHeader, CashMetric, CashModal, CashPagination, CashSearch, secondaryButton } from "../components/cashier-ui";
import { exportXlsxWorkbook } from "../../components/export-xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const PAGE_SIZE = 10;
const DATE_FILTERS = [
  { value: "all", label: "Toutes les dates" },
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "custom", label: "Periode personnalisee" },
] as const;
type DateFilterValue = typeof DATE_FILTERS[number]["value"];

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
  montantRetours?: number;
  margeApresRetour?: number;
  tauxMarge: number;
  tauxMargeApresRetour?: number;
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
  montantRetourTTC?: number;
  margeApresRetour?: number;
  totalTTC: number;
  tva: number;
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


const compactMoney = (value: number, devise: string) => {
  if (Math.abs(value || 0) < 1000000) return formatMoney(value, devise);
  const symbol = devise.includes("(") ? devise.replace(/^.*\((.*)\).*$/, "$1") : devise;
  return new Intl.NumberFormat(dashboardLocale(), { notation: "compact", maximumFractionDigits: 2 }).format(value) + " " + symbol;
};

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat(dashboardLocale(), { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
const csvValue = (value: string | number | undefined) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
const escapeHtml = (value: string | number | undefined) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] || char));

const summarizeMoneyTerms = (values: number[], devise: string, maxTerms = 6) => {
  const terms = values.filter((value) => Number.isFinite(value) && Math.abs(value) > 0.0001);
  if (terms.length === 0) return "Aucune valeur dans la periode";
  const visibleTerms = terms.slice(0, maxTerms).map((value) => formatMoney(value, devise));
  return visibleTerms.join(" + ") + (terms.length > maxTerms ? " + ..." : "");
};

const getPeriodLabel = (value: DateFilterValue) => DATE_FILTERS.find((filter) => filter.value === value)?.label || "Periode selectionnee";

const normalizeFilePart = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "");
export default function CashReportsPage() {
  const { ui: du } = useDashboardLanguage();
  const [data, setData] = useState<ReportData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [cashierFilter, setCashierFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [page, setPage] = useState(1);
  const [metricOpen, setMetricOpen] = useState<null | { title: string; value: string; detail: string; formula?: string; calculation?: string; notes?: string[] }>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const { permissions, isOwner } = useDashboardAccess();

  const canExport = isOwner || permissions.includes("EXPORTER_RAPPORTS_CAISSE") || permissions.includes("EXPORTER_RAPPORTS");

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (dateFilter !== "all") params.set("period", dateFilter);
      if (dateFilter === "custom") {
        if (customStart) params.set("startDate", customStart);
        if (customEnd) params.set("endDate", customEnd);
      }
      const endpoint = API_URL + "/caisse/rapports" + (params.toString() ? "?" + params.toString() : "");
      const response = await fetch(endpoint, { headers: { Authorization: token ? "Bearer " + token : "" } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Impossible de charger les rapports caisse.");
      setData({ ...emptyData, ...result, salesDetails: result.salesDetails || [] });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }, [customEnd, customStart, dateFilter]);

  useEffect(() => { void fetchReports(); }, [fetchReports]);

  const cashierOptions = useMemo(() => data.cashiers.map((row) => row.caissier || "Caissier").filter(Boolean), [data.cashiers]);
  const paymentOptions = useMemo(() => Array.from(new Set(data.salesDetails.map((row) => row.paiement).filter(Boolean))).sort(), [data.salesDetails]);
  const productOptions = useMemo(() => Array.from(new Set(data.salesDetails.map((row) => row.produit).filter(Boolean))).sort(), [data.salesDetails]);
  const categoryOptions = useMemo(() => Array.from(new Set(data.salesDetails.map((row) => row.categorie || "Sans categorie").filter(Boolean))).sort(), [data.salesDetails]);

  const filteredSales = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.salesDetails.filter((row) => {
      const rowCategory = row.categorie || "Sans categorie";
      const matchesCashier = cashierFilter === "all" || row.caissier === cashierFilter;
      const matchesPayment = paymentFilter === "all" || row.paiement === paymentFilter;
      const matchesProduct = productFilter === "all" || row.produit === productFilter;
      const matchesCategory = categoryFilter === "all" || rowCategory === categoryFilter;
      const haystack = [row.reference, row.factureReference, row.clientNom, row.produit, row.sku, row.categorie, row.caissier, row.paiement].join(" ").toLowerCase();
      return matchesCashier && matchesPayment && matchesProduct && matchesCategory && (!query || haystack.includes(query));
    });
  }, [cashierFilter, categoryFilter, data.salesDetails, paymentFilter, productFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedSales = filteredSales.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const exportFileSegment = useMemo(() => {
    const periodPart = dateFilter === "custom" ? [customStart || "debut", customEnd || "fin"].join("-") : dateFilter;
    return normalizeFilePart(periodPart + "-" + new Date().toISOString().slice(0, 10));
  }, [customEnd, customStart, dateFilter]);
  const profitTone = data.metrics.marge >= 0 ? "emerald" : "rose";
  const profitLabel = data.metrics.marge >= 0 ? "Benefice brut" : "Perte brute";
  const caTtcTerms = useMemo(() => summarizeMoneyTerms(data.salesDetails.map((row) => row.totalTTC), data.devise), [data.salesDetails, data.devise]);
  const tvaTerms = useMemo(() => summarizeMoneyTerms(data.daily.map((row) => row.tva), data.devise), [data.daily, data.devise]);
  const costTerms = useMemo(() => summarizeMoneyTerms(data.salesDetails.map((row) => row.coutAchat * row.quantite), data.devise), [data.salesDetails, data.devise]);
  const returnTerms = useMemo(() => summarizeMoneyTerms(data.returns.map((row) => row.montantTotalTTC), data.devise), [data.returns, data.devise]);
  const caHtValue = data.metrics.caTTC - data.metrics.tva;
  const periodLabel = getPeriodLabel(dateFilter);
  const activeFilterCount = [paymentFilter, productFilter, categoryFilter, data.scope === "all" ? cashierFilter : "all"].filter((value) => value !== "all").length;
  const resetAdvancedFilters = () => {
    setPaymentFilter("all");
    setProductFilter("all");
    setCategoryFilter("all");
    setCashierFilter("all");
    setPage(1);
  };

  const exportExcel = () => {
    exportXlsxWorkbook("rapport-caisse-" + exportFileSegment + ".xlsx", [
      {
        name: "Resume",
        columns: ["Indicateur", "Valeur"],
        rows: [
          ["CA TTC", data.metrics.caTTC],
          ["TVA collectee", data.metrics.tva],
          ["Cout sorti", data.metrics.cout],
          [profitLabel, data.metrics.marge],
          ["Retours", data.metrics.montantRetours],
          ["Net apres retours", data.metrics.netApresRetours],
          ["Ventes payees", data.metrics.ventes],
        ],
      },
      {
        name: "Ventes detaillees",
        columns: ["Reference", "Facture", "Client", "Produit", "SKU", "Categorie", "Caissier", "Quantite", "Prix achat", "Prix HT", "Total TTC", "Marge", "Retour TTC", "Marge apres retour", "Date", "Paiement"],
        rows: filteredSales.map((row) => [row.reference, row.factureReference || "", row.clientNom || "", row.produit, row.sku || "", row.categorie || "", row.caissier, row.quantite, row.coutAchat, row.prixVente, row.totalTTC, row.marge, row.montantRetourTTC || 0, row.margeApresRetour ?? row.marge, formatDate(row.date), row.paiement]),
      },
      {
        name: "Paiements",
        columns: ["Paiement", "Ventes", "Quantite", "Total TTC", "TVA", "Marge"],
        rows: data.payments.map((row) => [row.paiement || "-", row.ventes, row.quantite, row.totalTTC, row.tva, row.marge]),
      },
      {
        name: "Caissiers",
        columns: ["Caissier", "Ventes", "Quantite", "Total TTC", "TVA", "Marge"],
        rows: data.cashiers.map((row) => [row.caissier || "-", row.ventes, row.quantite, row.totalTTC, row.tva, row.marge]),
      },
      {
        name: "Retours",
        columns: ["Reference", "Vente", "Client", "Type", "Montant TTC", "Date"],
        rows: data.returns.map((row) => [row.reference, row.venteReference, row.clientNom, row.typeRetour, row.montantTotalTTC, formatDate(row.createdAt)]),
      },
    ]);
  };

  const exportPdf = () => {
    const popup = window.open("", "_blank", "width=1100,height=760");
    if (!popup) return;
    const rows = filteredSales.slice(0, 80).map((row) => "<tr><td>" + escapeHtml(row.reference) + "</td><td>" + escapeHtml(row.produit) + "</td><td>" + escapeHtml(row.caissier) + "</td><td>" + escapeHtml(row.quantite) + "</td><td>" + escapeHtml(formatMoney(row.coutAchat, data.devise)) + "</td><td>" + escapeHtml(formatMoney(row.prixVente, data.devise)) + "</td><td>" + escapeHtml(formatMoney(row.totalTTC, data.devise)) + "</td><td>" + escapeHtml(formatMoney(row.marge, data.devise)) + "</td><td>" + escapeHtml(formatMoney(row.margeApresRetour ?? row.marge, data.devise)) + "</td><td>" + escapeHtml(formatDate(row.date)) + "</td><td>" + escapeHtml(row.paiement) + "</td></tr>").join("");
    popup.document.write("<!doctype html><html lang='fr'><head><meta charset='utf-8'><title>" + du("mf5e79025aa66") + " " + escapeHtml(exportFileSegment) + "</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#172033;margin:0}h1{font-size:20px;margin:0 0 4px}p{font-size:11px;color:#64748b;margin:0 0 18px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:18px}.card{border:1px solid #e2e8f0;padding:10px}.label{font-size:9px;color:#64748b;text-transform:uppercase}.value{font-size:16px;font-weight:800;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:8.5px}th{background:#f1f5f9;text-align:left;text-transform:uppercase;color:#64748b}th,td{padding:6px;border:1px solid #e2e8f0;vertical-align:top}.footer{margin-top:12px;font-size:9px;color:#94a3b8}</style></head><body><h1>" + du("medeb4f82d939") + "</h1><p>" + du("m7289d99c0cec") + " " + escapeHtml(new Date().toLocaleString(dashboardLocale())) + "</p><div class='cards'><div class='card'><div class='label'>" + du("m3c700a1d372c") + "</div><div class='value'>" + escapeHtml(formatMoney(data.metrics.caTTC, data.devise)) + "</div></div><div class='card'><div class='label'>" + du("m22dae2142d1e") + "</div><div class='value'>" + escapeHtml(formatMoney(data.metrics.tva, data.devise)) + "</div></div><div class='card'><div class='label'>" + du("m46367044e037") + "</div><div class='value'>" + escapeHtml(formatMoney(data.metrics.cout, data.devise)) + "</div></div><div class='card'><div class='label'>" + du("m18edfe670359") + "</div><div class='value'>" + escapeHtml(formatMoney(data.metrics.marge, data.devise)) + "</div></div></div><table><thead><tr><th>" + du("m71bf90935fc2") + "</th><th>" + du("ma0d3db2f0803") + "</th><th>" + du("mbe0e77f22f53") + "</th><th>" + du("me51377cc0622") + "</th><th>" + du("mdce306d3233d") + "</th><th>" + du("m5a1bcd077833") + "</th><th>" + du("mae5f52a29195") + "</th><th>" + du("m7324c6571082") + "</th><th>" + du("m18edfe670359") + "</th><th>" + du("mf1e36b00cbf8") + "</th><th>" + du("m99c40ab40592") + "</th><th>" + du("m5d9e9e44e18a") + "</th></tr></thead><tbody>" + rows + "</tbody></table><div class='footer'>" + du("m37009f25b2eb") + "</div><script>window.onload=()=>window.print();</script></body></html>");
    popup.document.close();
  };

  return (
    <div className="space-y-5 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800">
      <CashHeader
        title={du("md5f65d478abb")}
        subtitle={data.scope === "all" ? du("md448ee1ff728") : du("m5f23de2bb497")}
        action={<div className="flex flex-wrap gap-2"><button onClick={() => void fetchReports()} disabled={loading} className={secondaryButton}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> {du("md7d646faaecb")}</button>{canExport && <><button onClick={exportExcel} disabled={loading} className={secondaryButton}><Download size={14} /> {du("m48d53635551c")}</button><button onClick={exportPdf} disabled={loading} className={secondaryButton}><FileText size={14} /> {du("m1d393b0081b6")}</button></>}</div>}
      />

      {error && <div className="p-3 rounded-xl border border-rose-100 bg-rose-50 text-xs font-semibold text-rose-700 flex items-center gap-2"><AlertCircle size={15} />{du(error)}</div>}

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{du("m32c486239cbf")}</label>
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilterValue)} className="mt-2 w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl bg-white outline-none focus:border-indigo-500">
              {DATE_FILTERS.map((item) => <option key={item.value} value={item.value}>{du(item.label)}</option>)}
            </select>
          </div>
          {dateFilter === "custom" && (
            <>
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{du("m5c829628f998")}</label>
                <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="mt-2 w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl bg-white outline-none focus:border-indigo-500" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{du("m2382a693afc3")}</label>
                <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="mt-2 w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl bg-white outline-none focus:border-indigo-500" />
              </div>
            </>
          )}
          <button onClick={() => void fetchReports()} disabled={loading} className={secondaryButton}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> {du("mf9dd37b7e94e")}</button>
        </div>
      </section>

      {loading ? (
        <div className="py-20 flex flex-col items-center gap-3 text-slate-400"><Loader2 size={26} className="animate-spin text-indigo-500" /><span className="text-xs font-medium">{du("m0f35d0d78494")}</span></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <CashMetric label={du("m9735bc91d6c0")} value={compactMoney(data.metrics.caTTC, data.devise)} detail={String(data.metrics.ventes) + " vente(s) payee(s)"} icon={WalletCards} tone="emerald" onInspect={() => setMetricOpen({ title: "Chiffre d'affaires TTC", value: formatMoney(data.metrics.caTTC, data.devise), detail: "Total encaisse avant retours.", formula: "CA TTC = somme des totaux TTC des ventes payees de la periode.", calculation: caTtcTerms + " = " + formatMoney(data.metrics.caTTC, data.devise), notes: ["Periode : " + periodLabel, "Ventes prises en compte : " + String(data.metrics.ventes)] })} />
            <CashMetric label={du("m22dae2142d1e")} value={compactMoney(data.metrics.tva, data.devise)} detail={du("mbbc6f6ab2ca0")} icon={ReceiptText} tone="indigo" onInspect={() => setMetricOpen({ title: "TVA collectee", value: formatMoney(data.metrics.tva, data.devise), detail: "Montant fiscal collecte.", formula: "TVA collectee = somme des TVA calculees sur chaque vente.", calculation: tvaTerms + " = " + formatMoney(data.metrics.tva, data.devise), notes: ["Avec une TVA de 16%, la TVA d'une ligne est calculee au moment de la vente.", "Les anciennes ventes gardent la TVA enregistree lors de la vente."] })} />
            <CashMetric label={du("m46367044e037")} value={compactMoney(data.metrics.cout, data.devise)} detail={du("ma756cf253861")} icon={TrendingDown} tone="amber" onInspect={() => setMetricOpen({ title: "Cout sorti", value: formatMoney(data.metrics.cout, data.devise), detail: "Valeur du stock sorti au prix d'achat.", formula: "Cout sorti = somme(prix d'achat unitaire x quantite vendue).", calculation: costTerms + " = " + formatMoney(data.metrics.cout, data.devise), notes: ["Cette valeur represente le cout du stock qui est parti en vente.", "Elle sert a calculer le benefice brut."] })} />
            <CashMetric label={profitLabel} value={compactMoney(data.metrics.marge, data.devise)} detail={String(data.metrics.tauxMarge) + "% de marge"} icon={TrendingUp} tone={profitTone} onInspect={() => setMetricOpen({ title: profitLabel, value: formatMoney(data.metrics.marge, data.devise), detail: "CA HT moins cout sorti.", formula: "Benefice brut = (CA TTC - TVA collectee) - cout sorti.", calculation: "(" + formatMoney(data.metrics.caTTC, data.devise) + " - " + formatMoney(data.metrics.tva, data.devise) + ") - " + formatMoney(data.metrics.cout, data.devise) + " = " + formatMoney(data.metrics.marge, data.devise), notes: ["CA HT = " + formatMoney(data.metrics.caTTC, data.devise) + " - " + formatMoney(data.metrics.tva, data.devise) + " = " + formatMoney(caHtValue, data.devise), "Taux de marge = benefice brut / CA HT x 100 = " + String(data.metrics.tauxMarge) + "%"] })} />
            <CashMetric label={du("m7c442e059901")} value={compactMoney(data.metrics.montantRetours, data.devise)} detail={String(data.metrics.retours) + " retour(s)"} icon={RotateCcw} tone="rose" onInspect={() => setMetricOpen({ title: "Retours / remboursements", value: formatMoney(data.metrics.montantRetours, data.devise), detail: "Montant valide en retours clients.", formula: "Retours = somme des montants TTC retournes ou rembourses.", calculation: returnTerms + " = " + formatMoney(data.metrics.montantRetours, data.devise), notes: ["Ces montants sont separes du CA TTC pour garder une lecture claire.", "Net apres retours = " + formatMoney(data.metrics.netApresRetours, data.devise)] })} />
          </div>

          {data.metrics.marge < 0 && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{du("m6d70059d040d")}</span>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-5">
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
                <div><h2 className="text-sm font-bold text-slate-900">{du("md4fcd1a14230")}</h2><p className="text-[11px] text-slate-400 mt-1">{du("m3dca7f9c8e2b")}</p></div>
                <div className="flex flex-col sm:flex-row gap-2 min-w-0 lg:min-w-[560px]">
                  <CashSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder={du("m037c2595cb40")} />
                  <button type="button" onClick={() => setFilterOpen(true)} className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors inline-flex items-center justify-center gap-2 text-xs font-black shrink-0" title={du("m88063621d2eb")}>
                    <Filter size={15} />
                    <span className="hidden sm:inline">{du("m6e2287796c72")}</span>
                    {activeFilterCount > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center">{activeFilterCount}</span>}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">{du("mee19f8d8fffd")}</th><th className="px-5 py-4">{du("ma0d3db2f0803")}</th><th className="px-5 py-4">{du("mbe0e77f22f53")}</th><th className="px-5 py-4">{du("me51377cc0622")}</th><th className="px-5 py-4">{du("mdce306d3233d")}</th><th className="px-5 py-4">{du("m5a1bcd077833")}</th><th className="px-5 py-4">{du("mae5f52a29195")}</th><th className="px-5 py-4">{du("m7324c6571082")}</th><th className="px-5 py-4">{du("m18edfe670359")}</th><th className="px-5 py-4">{du("mf1e36b00cbf8")}</th><th className="px-5 py-4">{du("m99c40ab40592")}</th><th className="px-5 py-4">{du("m5d9e9e44e18a")}</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedSales.map((row, index) => <tr key={row.reference + row.produit + index} className="hover:bg-slate-50/60"><td className="px-5 py-4"><p className="font-bold text-slate-900">{row.reference}</p><p className="text-[10px] text-slate-400">{row.clientNom || du("ma848037bd49f")}</p></td><td className="px-5 py-4"><p className="font-bold text-slate-900">{row.produit}</p><p className="text-[10px] text-slate-400">{row.sku || row.categorie || "-"}</p></td><td className="px-5 py-4 font-bold text-slate-700">{row.caissier}</td><td className="px-5 py-4 font-black">{row.quantite}</td><td className="px-5 py-4 text-amber-700 font-bold">{formatMoney(row.coutAchat, data.devise)}</td><td className="px-5 py-4 font-bold">{formatMoney(row.prixVente, data.devise)}</td><td className="px-5 py-4 font-bold text-indigo-600">{formatMoney(row.tva || 0, data.devise)}</td><td className="px-5 py-4 font-black text-slate-900">{formatMoney(row.totalTTC, data.devise)}</td><td className={(row.marge >= 0 ? "text-emerald-600" : "text-rose-600") + " px-5 py-4 font-black"}>{formatMoney(row.marge, data.devise)}</td><td className={((row.margeApresRetour ?? row.marge) >= 0 ? "text-emerald-600" : "text-rose-600") + " px-5 py-4 font-black"}>{formatMoney(row.margeApresRetour ?? row.marge, data.devise)}</td><td className="px-5 py-4 text-slate-500">{formatDate(row.date)}</td><td className="px-5 py-4"><span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">{du(row.paiement)}</span></td></tr>)}
                    {paginatedSales.length === 0 && <tr><td colSpan={12} className="px-5 py-12 text-center text-slate-400">{du("m92b3f565244b")}</td></tr>}
                  </tbody>
                </table>
              </div>
              <CashPagination page={safePage} pageSize={PAGE_SIZE} totalItems={filteredSales.length} onPageChange={setPage} />
            </section>

            <div className="space-y-5">
              <SummaryCard title={du("m5e753ef42861")} rows={[["Nombre", String(data.metrics.retours)], ["Montant retourne", formatMoney(data.metrics.montantRetours, data.devise)], ["Net apres retours", formatMoney(data.metrics.netApresRetours, data.devise)]]} />
              <MiniTable title={du("m23b43acc62c2")} rows={data.payments.slice(0, 5)} labelKey="paiement" devise={data.devise} />
              <MiniTable title={du("ma990b3628166")} rows={data.cashiers.slice(0, 5)} labelKey="caissier" devise={data.devise} />
            </div>
          </div>

          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100"><h2 className="text-sm font-bold text-slate-900">{du("m8c48dc7e3ec8")}</h2><p className="text-[11px] text-slate-400 mt-1">{du("ma283b03a3925")}</p></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[940px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">{du("m99c40ab40592")}</th><th className="px-5 py-4">{du("m0dda3e60892d")}</th><th className="px-5 py-4">{du("m3c700a1d372c")}</th><th className="px-5 py-4">{du("mae5f52a29195")}</th><th className="px-5 py-4">{du("m18edfe670359")}</th><th className="px-5 py-4">{du("m7c442e059901")}</th><th className="px-5 py-4">{du("mf1e36b00cbf8")}</th></tr></thead><tbody className="divide-y divide-slate-100">{data.daily.slice(-10).reverse().map((row) => { const margeApresRetour = row.margeApresRetour ?? row.marge; return <tr key={row.date}><td className="px-5 py-4 font-bold">{formatDate(row.date)}</td><td className="px-5 py-4">{row.ventes}</td><td className="px-5 py-4 font-black">{formatMoney(row.totalTTC, data.devise)}</td><td className="px-5 py-4">{formatMoney(row.tva, data.devise)}</td><td className={(row.marge >= 0 ? "text-emerald-600" : "text-rose-600") + " px-5 py-4 font-black"}>{formatMoney(row.marge, data.devise)}</td><td className="px-5 py-4 text-rose-600 font-bold">{formatMoney(row.montantRetours || 0, data.devise)}</td><td className={(margeApresRetour >= 0 ? "text-emerald-600" : "text-rose-600") + " px-5 py-4 font-black"}>{formatMoney(margeApresRetour, data.devise)}</td></tr>; })}</tbody></table></div>
          </section>
        </>
      )}

      <CashModal
        open={filterOpen}
        title={du("m88063621d2eb")}
        subtitle={du("m376afb5431ef")}
        onClose={() => setFilterOpen(false)}
        footer={<div className="flex flex-wrap justify-end gap-2"><button onClick={resetAdvancedFilters} className={secondaryButton}>{du("m045fa787b10d")}</button><button onClick={() => setFilterOpen(false)} className={secondaryButton}>{du("mb4c8b1dd7acd")}</button></div>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{du("m5d9e9e44e18a")}</label>
            <select value={paymentFilter} onChange={(event) => { setPaymentFilter(event.target.value); setPage(1); }} className="mt-2 w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl bg-white outline-none focus:border-indigo-500">
              <option value="all">{du("m96f26ed8fcaf")}</option>
              {paymentOptions.map((name) => <option key={name} value={name}>{du(name)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{du("ma0d3db2f0803")}</label>
            <select value={productFilter} onChange={(event) => { setProductFilter(event.target.value); setPage(1); }} className="mt-2 w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl bg-white outline-none focus:border-indigo-500">
              <option value="all">{du("mf49918c635df")}</option>
              {productOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{du("m3977d35296ee")}</label>
            <select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }} className="mt-2 w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl bg-white outline-none focus:border-indigo-500">
              <option value="all">{du("maaa605614ccc")}</option>
              {categoryOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          {data.scope === "all" && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">{du("mbe0e77f22f53")}</label>
              <select value={cashierFilter} onChange={(event) => { setCashierFilter(event.target.value); setPage(1); }} className="mt-2 w-full h-10 px-3 text-xs font-bold border border-slate-200 rounded-xl bg-white outline-none focus:border-indigo-500">
                <option value="all">{du("m5aec032a6645")}</option>
                {cashierOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          )}
        </div>
      </CashModal>

      <CashModal
        open={Boolean(metricOpen)}
        title={metricOpen?.title || du("mfb5f27d5457c")}
        subtitle={du(metricOpen?.detail) || du("mf8d9845cc98c")}
        onClose={() => setMetricOpen(null)}
        footer={<button onClick={() => setMetricOpen(null)} className={secondaryButton}>{du("m711e5f2e198d")}</button>}
      >
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] uppercase font-bold text-slate-400">{du("mf8d9845cc98c")}</p>
            <p className="text-2xl font-black text-slate-900 mt-2 break-words">{metricOpen?.value}</p>
            <p className="text-xs text-slate-500 mt-2">{du(metricOpen?.detail)}</p>
          </div>

          {metricOpen?.formula && (
            <div className="p-4 rounded-xl bg-white border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400">{du("me7c95542e449")}</p>
              <p className="text-sm font-bold text-slate-800 mt-2 leading-relaxed">{du(metricOpen.formula)}</p>
            </div>
          )}

          {metricOpen?.calculation && (
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
              <p className="text-[10px] uppercase font-bold text-indigo-500">{du("m6b1a3149ea21")}</p>
              <p className="text-sm font-black text-indigo-900 mt-2 leading-relaxed break-words">{du(metricOpen.calculation)}</p>
            </div>
          )}

          {metricOpen?.notes && metricOpen.notes.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900 text-white">
              <p className="text-[10px] uppercase font-bold text-slate-300">{du("m867149abc242")}</p>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-100 leading-relaxed">
                {metricOpen.notes.map((note) => (
                  <li key={note}>{du(note)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CashModal>
    </div>
  );
}

function SummaryCard({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  const { ui: du } = useDashboardLanguage();
  return <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5"><h2 className="text-sm font-bold text-slate-900 mb-4">{du(title)}</h2><div className="space-y-3">{rows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 text-xs"><span className="text-slate-400 font-bold uppercase text-[10px]">{du(label)}</span><strong className="text-slate-900 text-right">{value}</strong></div>)}</div></section>;
}

function MiniTable({ title, rows, labelKey, devise }: { title: string; rows: ReportRow[]; labelKey: "paiement" | "caissier"; devise: string }) {
  const { ui: du } = useDashboardLanguage();
  return <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5"><h2 className="text-sm font-bold text-slate-900 mb-4">{du(title)}</h2><div className="space-y-3">{rows.length === 0 && <p className="text-xs text-slate-400">{du("mb4c8eb0bc52b")}</p>}{rows.map((row) => <div key={String(row[labelKey])} className="space-y-1"><div className="flex justify-between gap-3 text-xs"><span className="font-bold text-slate-700 truncate">{row[labelKey]}</span><span className="font-black text-slate-900">{formatMoney(row.totalTTC, devise)}</span></div><div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: Math.min(100, Math.max(4, row.tauxMarge || 0)) + "%" }} /></div><p className="text-[10px] text-slate-400">{du("m5e61e76c9f61")}{" "}{formatMoney(row.marge, devise)} - {row.ventes} {du("m751192ac909b")}</p></div>)}</div></section>;
}



