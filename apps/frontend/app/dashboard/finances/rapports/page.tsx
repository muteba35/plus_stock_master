"use client";
import { dashboardUi as du, dashboardLocale } from "../../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../../src/components/LanguageRuntime";


import { Download, FileText, RefreshCw } from "lucide-react";
import { CashHeader, secondaryButton } from "../../caisse/components/cashier-ui";
import { FinanceDateFilters, FinanceShell, StateBlock, formatDate, useFinanceData } from "../finance-shared";
import { formatMoney } from "../../inventaire/components/currency";
import { exportXlsxWorkbook } from "../../components/export-xlsx";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char] || char));

const printReport = (title: string, html: string) => {
  const popup = window.open("", "_blank", "width=1200,height=800");
  if (!popup) return;
  popup.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#172033;margin:0;background:white}.brand{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111827;padding-bottom:14px;margin-bottom:18px}.brand h1{font-size:22px;margin:0;color:#111827}.brand p{font-size:11px;color:#64748b;margin:4px 0 0}.pill{border:1px solid #dbe3ef;border-radius:999px;padding:6px 10px;font-size:10px;font-weight:700;color:#334155}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:18px}.card{border:1px solid #e2e8f0;border-radius:12px;padding:10px}.card span{display:block;font-size:9px;text-transform:uppercase;color:#64748b;font-weight:800}.card strong{display:block;font-size:15px;margin-top:4px;color:#0f172a}table{width:100%;border-collapse:collapse;font-size:9px;margin-top:10px}th{background:#f1f5f9;text-align:left;text-transform:uppercase;color:#64748b}th,td{padding:7px;border:1px solid #e2e8f0;vertical-align:top}h2{font-size:13px;margin:18px 0 6px}.footer{margin-top:14px;font-size:9px;color:#94a3b8}</style></head><body><div class="brand"><div><h1>${du("m9dcc36525dc0")}</h1><p>${du("m0a703bc88144")} ${escapeHtml(new Date().toLocaleString(dashboardLocale()))}</p></div><div class="pill">${du("m9cb3bcee7ddc")}</div></div>${html}<div class="footer">${du("m9d9952ee292e")}</div><script>window.onload=()=>window.print();</script></body></html>`);
  popup.document.close();
};

export default function FinanceReportsPage() {
  const { ui: du } = useDashboardLanguage();
  const { data, loading, error, fetchData, dateFilter, setDateFilter, customStart, setCustomStart, customEnd, setCustomEnd } = useFinanceData();
  const fileSuffix = dateFilter === "custom" && customStart && customEnd ? `${customStart}-${customEnd}` : dateFilter;

  const exportReport = () => exportXlsxWorkbook(`rapport-financier-${fileSuffix}.xlsx`, [
    { name: "Résumé", columns: ["Indicateur", "Valeur", "Devise"], rows: [["CA HT", data.metrics.caHT, data.devise], ["CA TTC", data.metrics.caTTC, data.devise], ["TVA", data.metrics.tva, data.devise], ["Coût sorti", data.metrics.cout, data.devise], ["Marge", data.metrics.marge, data.devise], ["Retours", data.metrics.montantRetours, data.devise], ["Net après retours", data.metrics.netApresRetours, data.devise]] },
    { name: "Ventes détaillées", columns: ["Référence", "Produit", "Caissier", "Qté", "Prix vente", "Total TTC", "Marge", "Paiement", "Date"], rows: data.salesDetails.map((row) => [row.reference, row.produit, row.caissier, row.quantite, row.prixVente, row.totalTTC, row.marge, row.paiement, formatDate(row.date)]) },
    { name: "Paiements", columns: ["Paiement", "Ventes", "Total TTC", "TVA", "Marge"], rows: data.payments.map((row) => [row.paiement || "-", row.ventes, row.totalTTC, row.tva, row.marge]) },
    { name: "Par jour", columns: ["Date", "Ventes", "CA TTC", "TVA", "Coût", "Marge"], rows: data.daily.map((row) => [row.date || "-", row.ventes, row.totalTTC, row.tva, row.cout, row.marge]) },
  ]);

  const exportPdf = () => {
    const metricHtml = `<div class="grid"><div class="card"><span>${du("m2aa354feb8eb")}</span><strong>${escapeHtml(formatMoney(data.metrics.caHT, data.devise))}</strong></div><div class="card"><span>${du("m3c700a1d372c")}</span><strong>${escapeHtml(formatMoney(data.metrics.caTTC, data.devise))}</strong></div><div class="card"><span>${du("mae5f52a29195")}</span><strong>${escapeHtml(formatMoney(data.metrics.tva, data.devise))}</strong></div><div class="card"><span>${du("mb4e029d1ffdb")}</span><strong>${escapeHtml(formatMoney(data.metrics.cout, data.devise))}</strong></div><div class="card"><span>${du("m18edfe670359")}</span><strong>${escapeHtml(formatMoney(data.metrics.marge, data.devise))}</strong></div></div>`;
    const rows = data.salesDetails.map((row) => `<tr><td>${escapeHtml(row.reference)}</td><td>${escapeHtml(row.produit)}</td><td>${escapeHtml(row.caissier)}</td><td>${escapeHtml(row.quantite)}</td><td>${escapeHtml(formatMoney(row.prixVente, data.devise))}</td><td>${escapeHtml(formatMoney(row.totalTTC, data.devise))}</td><td>${escapeHtml(formatMoney(row.marge, data.devise))}</td><td>${escapeHtml(row.paiement)}</td><td>${escapeHtml(formatDate(row.date))}</td></tr>`).join("");
    printReport("Rapport financier", metricHtml + `<h2>${du("mde785ec73ac5")}</h2><table><thead><tr><th>${du("m393ca26ab12c")}</th><th>${du("ma0d3db2f0803")}</th><th>${du("mbe0e77f22f53")}</th><th>${du("m3849f9d2a8fa")}</th><th>${du("m1c8ae62d5564")}</th><th>${du("m7324c6571082")}</th><th>${du("m18edfe670359")}</th><th>${du("m5d9e9e44e18a")}</th><th>${du("m99c40ab40592")}</th></tr></thead><tbody>${rows || "<tr><td colspan='9'>" + du("m6360f344add8") + "</td></tr>"}</tbody></table>`);
  };

  return <FinanceShell>
    <CashHeader title={du("m071b06db4f59")} subtitle={du("mcd57dc1f14a8")} action={<div className="flex flex-wrap gap-2"><button onClick={() => void fetchData()} disabled={loading} className={secondaryButton}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> {du("md7d646faaecb")}</button><button onClick={exportReport} disabled={loading} className={secondaryButton}><Download size={14} /> {du("m48d53635551c")}</button><button onClick={exportPdf} disabled={loading} className={secondaryButton}><FileText size={14} /> {du("m1d393b0081b6")}</button></div>} />
    <FinanceDateFilters dateFilter={dateFilter} onDateFilterChange={setDateFilter} customStart={customStart} customEnd={customEnd} onCustomStartChange={setCustomStart} onCustomEndChange={setCustomEnd} />
    <StateBlock loading={loading} error={error} />
    {!loading && !error && <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-5"><div><h2 className="text-sm font-bold text-slate-900">{du("m152ab2e65fb0")}</h2><p className="text-xs text-slate-500 mt-2">{du("md5340b0fb3ba")}</p></div><div className="grid grid-cols-1 md:grid-cols-4 gap-3"><Metric label={du("m3c700a1d372c")} value={formatMoney(data.metrics.caTTC, data.devise)} /><Metric label={du("mae5f52a29195")} value={formatMoney(data.metrics.tva, data.devise)} /><Metric label={du("m18edfe670359")} value={formatMoney(data.metrics.marge, data.devise)} /><Metric label={du("m7c442e059901")} value={formatMoney(data.metrics.montantRetours, data.devise)} /></div></section>}
  </FinanceShell>;
}

function Metric({ label, value }: { label: string; value: string }) {
  const { ui: du } = useDashboardLanguage();
  return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{du(label)}</p><p className="text-sm font-black text-slate-900 mt-2 truncate">{value}</p></div>;
}

