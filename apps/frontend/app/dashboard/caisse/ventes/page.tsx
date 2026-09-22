"use client";
import { dashboardUi as du, dashboardLocale } from "../../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../../src/components/LanguageRuntime";


import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, Eye, FileText, Loader2, Printer, ReceiptText, TrendingUp, WalletCards, XCircle } from "lucide-react";
import { formatMoney, getActiveBoutiqueCurrency } from "../../inventaire/components/currency";
import { CashBadge, CashHeader, CashMetric, CashModal, CashPagination, CashSearch, fieldClass, secondaryButton } from "../components/cashier-ui";
import { exportTable, authorizedExportRows, type ExportFormat } from "../../components/export-table";
import { useDashboardAccess } from "../../components/DashboardAccess";

type ApiUser = { nom?: string; prenom?: string };
type SaleLine = {
  produitId?: string;
  nomProduit: string;
  sku?: string;
  quantite: number;
  prixUnitaireHT: number;
  prixUnitaireTTC: number;
  totalHT: number;
  totalTTC: number;
};

type ApiSale = {
  _id: string;
  reference: string;
  factureReference?: string;
  clientNom: string;
  devise: string;
  deviseReference?: string;
  paiement: string;
  statut: "PAYEE" | "ANNULEE" | "REMBOURSEE";
  sousTotalHT: number;
  remisePourcentage: number;
  remiseMontant: number;
  taxableAmount: number;
  tvaRate: number;
  tvaMontant: number;
  totalTTC: number;
  montantRecu: number;
  monnaieRendue: number;
  lignes: SaleLine[];
  utilisateurId?: ApiUser | string;
  createdAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const pageSize = 8;

const getCashierName = (sale: ApiSale) => {
  if (typeof sale.utilisateurId === "object" && sale.utilisateurId) {
    return `${sale.utilisateurId.prenom || ""} ${sale.utilisateurId.nom || ""}`.trim() || "Caissier";
  }
  return "Caissier";
};

const getStatusLabel = (status: ApiSale["statut"]) => {
  if (status === "ANNULEE") return "Annulée";
  if (status === "REMBOURSEE") return "Remboursée";
  return "Payée";
};

const formatDate = (value: string) => {
  if (!value) return "";
  return new Intl.DateTimeFormat(dashboardLocale(), { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
};

const formatDateInput = (value: string) => value ? new Date(value).toISOString().slice(0, 10) : "";

const stripHtml = (value: string) => value.replace(/[<>]/g, "");
const compactMoney = (value: number, devise: string) => {
  const amount = Number(value || 0);
  if (Math.abs(amount) < 1000000) return formatMoney(amount, devise);
  const label = new Intl.NumberFormat(dashboardLocale(), { notation: "compact", maximumFractionDigits: 2 }).format(amount);
  return `${label} ${devise.replace(/.*\\((.*)\\).*/, "$1")}`;
};





export default function SalesHistoryPage() {
  const { ui: du } = useDashboardLanguage();
  const [sales, setSales] = useState<ApiSale[]>([]);
  const [scope, setScope] = useState<"all" | "own">("own");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Tous");
  const [payment, setPayment] = useState("Tous");
  const [date, setDate] = useState("");
  const [selectedSale, setSelectedSale] = useState<ApiSale | null>(null);
  const [metricOpen, setMetricOpen] = useState(false);
  const [averageOpen, setAverageOpen] = useState(false);
  const { permissions, isOwner } = useDashboardAccess();
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/caisse/ventes`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Impossible de charger les ventes.");
      setSales(data.data || []);
      setScope(data.scope === "all" ? "all" : "own");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSales();
  }, [fetchSales]);

  const filtered = useMemo(() => {
    return sales.filter((sale) => {
      const cashier = getCashierName(sale);
      const matchSearch = `${sale.reference} ${sale.factureReference || ""} ${sale.clientNom} ${cashier}`.toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === "Tous" || getStatusLabel(sale.statut) === status;
      const matchPayment = payment === "Tous" || sale.paiement === payment;
      const matchDate = !date || formatDateInput(sale.createdAt) === date;
      return matchSearch && matchStatus && matchPayment && matchDate;
    });
  }, [sales, search, status, payment, date]);

  const runExport = async (format: ExportFormat) => {
    if (exporting) return;
    setExporting(true);
    try {
      const rows = await authorizedExportRows(API_URL + "/caisse/ventes", filtered);
      if (!rows.length) throw new Error(du("Aucune donnée à exporter."));
      await exportTable(format, "historique-ventes", { name: "Historique ventes", columns: ["Reference", "Client", "Total TTC", "TVA", "Paiement", "Caissier", "Date", "Statut"], rows: rows.map((sale) => [sale.reference, sale.clientNom, sale.totalTTC, sale.tvaMontant, sale.paiement, getCashierName(sale), formatDate(sale.createdAt), getStatusLabel(sale.statut)]) });
    } catch (error) {
      setError(error instanceof Error ? error.message : du("Export impossible."));
    } finally { setExporting(false); }
  };
  const exportCsv = () => void runExport("xlsx");
  const exportExcel = exportCsv;
  const exportWord = () => void runExport("docx");
  const exportCurrentPdf = () => void runExport("pdf");
  
  const visibleSales = filtered.slice((page - 1) * pageSize, page * pageSize);
  const canExportSales = isOwner || permissions.includes("EXPORTER_HISTORIQUE_VENTES") || permissions.includes("EXPORTER_RAPPORTS");
  const paidSales = filtered.filter((sale) => sale.statut === "PAYEE");
  const reportCurrency = paidSales[0]?.deviseReference || paidSales[0]?.devise || getActiveBoutiqueCurrency();
  const totalPaid = paidSales.reduce((sum, sale) => sum + Number(sale.totalTTC || 0), 0);
  const averageSale = paidSales.length ? totalPaid / paidSales.length : 0;
  
  
  
  

  return (
    <div className="space-y-5 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800">
      <CashHeader
        title={du("mace92fb34113")}
        subtitle={scope === "all" ? du("md9750e26f7c1") : du("m75af14d737d7")}
        action={canExportSales ? <div className="flex flex-wrap gap-2"><button onClick={exportCsv} disabled={exporting || filtered.length === 0} className={secondaryButton}><Download size={14} /> {du("m48d53635551c")}</button><button onClick={exportWord} disabled={exporting || filtered.length === 0} className={secondaryButton}><FileText size={14} /> {du("m3a2860ece5a4")}</button><button onClick={exportCurrentPdf} disabled={exporting || filtered.length === 0} className={secondaryButton}><Printer size={14} /> {du("m1d393b0081b6")}</button></div> : undefined}
      />

      {error && <div className="p-3 rounded-xl border border-rose-100 bg-rose-50 text-xs font-semibold text-rose-700">{du(error)}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CashMetric label={du("mbe9fd27a75e5")} value={`${filtered.length}`} detail={scope === "all" ? du("m4d54bfcf769c") : du("madaf313408e2")} icon={ReceiptText} />
        <CashMetric label={du("m0cf0a5059726")} value={compactMoney(totalPaid, reportCurrency)} detail={du("m3a1733f54079", {p0: reportCurrency})} icon={WalletCards} tone="emerald" onInspect={() => setMetricOpen(true)} />
        <CashMetric label={du("m0ef20380cb71")} value={compactMoney(averageSale, reportCurrency)} detail={du("m4623cf50e92a")} icon={TrendingUp} tone="amber" onInspect={() => setAverageOpen(true)} />
        <CashMetric label={du("m86c79807f234")} value={`${filtered.filter((sale) => sale.statut === "ANNULEE").length}`} detail={du("mc5ef8019adaf")} icon={XCircle} tone="rose" />
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3">
          <CashSearch value={search} onChange={setSearch} placeholder={du("m520545fe6571")} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:w-[520px]">
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={fieldClass}>
              <option>{du("m2ff599814388")}</option>
              <option>{du("mabfdec4b23e7")}</option>
              <option>{du("m2f7ea8495f47")}</option>
              <option>{du("m60eb5f1efb72")}</option>
            </select>
            <select value={payment} onChange={(event) => setPayment(event.target.value)} className={fieldClass}>
              <option>{du("m2ff599814388")}</option>
              <option>{du("m351f78964783")}</option>
              <option>{du("m8ae525330384")}</option>
              <option>{du("mcbaad3cf4a65")}</option>
            </select>
            <div className="relative">
              <CalendarDays size={14} className="hidden sm:block absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`${fieldClass} pl-3 sm:pl-9`} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
              <span className="text-xs font-medium">{du("m720474136e5c")}</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[980px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">{du("m393ca26ab12c")}</th>
                  <th className="px-6 py-4">{du("m0c77fe09ab33")}</th>
                  <th className="px-6 py-4">{du("m7324c6571082")}</th>
                  <th className="px-6 py-4">{du("mae5f52a29195")}</th>
                  <th className="px-6 py-4">{du("m5d9e9e44e18a")}</th>
                  <th className="px-6 py-4">{du("mbe0e77f22f53")}</th>
                  <th className="px-6 py-4">{du("m99c40ab40592")}</th>
                  <th className="px-6 py-4">{du("mdee377cfd8cd")}</th>
                  <th className="px-6 py-4 text-right">{du("mff8059dc6752")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleSales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-bold text-slate-900">{sale.reference}</td>
                    <td className="px-6 py-4 text-slate-600">{sale.clientNom}</td>
                    <td className="px-6 py-4 font-black text-slate-900">{formatMoney(sale.totalTTC, sale.devise)}</td>
                    <td className="px-6 py-4 text-slate-500">{formatMoney(sale.tvaMontant, sale.devise)}</td>
                    <td className="px-6 py-4">{du(sale.paiement)}</td>
                    <td className="px-6 py-4">{getCashierName(sale)}</td>
                    <td className="px-6 py-4">{formatDate(sale.createdAt)}</td>
                    <td className="px-6 py-4"><CashBadge status={getStatusLabel(sale.statut)} /></td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setSelectedSale(sale)} className="p-1.5 text-slate-400 hover:text-indigo-600" title={du("m2cf9926224a3")}>
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {visibleSales.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-14 text-center text-slate-400 font-medium">{du("md7cd82f57be5")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <CashPagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
      </section>

      <CashModal
        open={Boolean(selectedSale)}
        title={du("ma72d88d491e0")}
        subtitle={selectedSale?.reference || ""}
        onClose={() => setSelectedSale(null)}
        footer={<button onClick={() => setSelectedSale(null)} className={secondaryButton}>{du("m711e5f2e198d")}</button>}
      >
        {selectedSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">{du("m0c77fe09ab33")}</span><strong>{selectedSale.clientNom}</strong></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">{du("m7ba96f08a0bf")}</span><strong>{selectedSale.factureReference || "-"}</strong></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">{du("m7324c6571082")}</span><strong>{formatMoney(selectedSale.totalTTC, selectedSale.devise)}</strong></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">{du("mfbe38ee4b645")}</span><strong>{formatMoney(selectedSale.tvaMontant, selectedSale.devise)}</strong></div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">{du("mdcc94f932ed3")}</p>
              <div className="space-y-2">
                {selectedSale.lignes.map((line) => (
                  <div key={`${line.produitId}-${line.sku}`} className="p-3 rounded-xl border border-slate-100 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="font-bold text-slate-800">{line.nomProduit} × {line.quantite}</span>
                      <strong>{formatMoney(line.totalTTC, selectedSale.devise)}</strong>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {du("m3c1fa577ed7a")}{" "}{line.sku || "-"} {du("m5e632c52fafb")}{" "}{formatMoney(line.prixUnitaireHT, selectedSale.devise)} {du("ma81adeee081a")}{" "}{formatMoney(line.prixUnitaireTTC, selectedSale.devise)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CashModal>
      <CashModal open={metricOpen} title={du("m0cf0a5059726")} subtitle={du("m44c4d2592b8a")} onClose={() => setMetricOpen(false)} footer={<button onClick={() => setMetricOpen(false)} className={secondaryButton}>{du("m711e5f2e198d")}</button>}><div className="p-4 rounded-xl bg-slate-50 border border-slate-100"><p className="text-[10px] uppercase font-bold text-slate-400">{du("m0cf0a5059726")}</p><p className="text-2xl font-black text-slate-900 mt-2">{formatMoney(totalPaid, reportCurrency)}</p><p className="text-xs text-slate-500 mt-2">{paidSales.length} {du("m86037aef8225")}</p></div></CashModal>
      <CashModal open={averageOpen} title={du("m0ef20380cb71")} subtitle={du("m19b3f480c735")} onClose={() => setAverageOpen(false)} footer={<button onClick={() => setAverageOpen(false)} className={secondaryButton}>{du("m711e5f2e198d")}</button>}><div className="p-4 rounded-xl bg-slate-50 border border-slate-100"><p className="text-[10px] uppercase font-bold text-slate-400">{du("m0ef20380cb71")}</p><p className="text-2xl font-black text-slate-900 mt-2">{formatMoney(averageSale, reportCurrency)}</p><p className="text-xs text-slate-500 mt-2">{du("mf60aafe88551")}{" "}{paidSales.length} {du("m86037aef8225")}</p></div></CashModal>
    </div>
  );
}


