"use client";
import { dashboardUi as du, dashboardLocale } from "../../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../../src/components/LanguageRuntime";


import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, Loader2, Printer, ReceiptText, Send, WalletCards } from "lucide-react";
import { formatMoney } from "../../inventaire/components/currency";
import { CashBadge, CashHeader, CashMetric, CashModal, CashPagination, CashSearch, secondaryButton } from "../components/cashier-ui";
import { exportXlsxWorkbook } from "../../components/export-xlsx";

type ApiUser = { nom?: string; prenom?: string };
type InvoiceLine = {
  produitId?: string;
  nomProduit: string;
  sku?: string;
  quantite: number;
  prixUnitaireHT: number;
  prixUnitaireTTC: number;
  totalHT: number;
  totalTTC: number;
};

type InvoiceSale = {
  _id: string;
  reference: string;
  factureReference: string;
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
  lignes: InvoiceLine[];
  utilisateurId?: ApiUser | string;
  createdAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const pageSize = 8;

const getCashierName = (sale: InvoiceSale) => {
  if (typeof sale.utilisateurId === "object" && sale.utilisateurId) {
    return `${sale.utilisateurId.prenom || ""} ${sale.utilisateurId.nom || ""}`.trim() || "Caissier";
  }
  return "Caissier";
};


const stripHtml = (value: string) => value.replace(/[<>]/g, "");
const compactMoney = (value: number, devise: string) => {
  const amount = Number(value || 0);
  if (Math.abs(amount) < 1000000) return formatMoney(amount, devise);
  const label = new Intl.NumberFormat(dashboardLocale(), { notation: "compact", maximumFractionDigits: 2 }).format(amount);
  return `${label} ${devise.replace(/.*\\((.*)\\).*/, "$1")}`;
};
const downloadBlob = (content: string, filename: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
const exportPdf = (title: string, html: string) => {
  const printWindow = window.open("", "_blank", "width=1100,height=760");
  if (!printWindow) return;
  printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${stripHtml(title)}</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#172033;margin:0}h1{font-size:20px;margin:0 0 4px}p{font-size:11px;color:#64748b;margin:0 0 18px}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#f1f5f9;text-align:left;text-transform:uppercase;color:#64748b}th,td{padding:7px;border:1px solid #e2e8f0;vertical-align:top}.total{font-weight:800}.footer{margin-top:12px;font-size:9px;color:#94a3b8}</style></head><body><h1>${stripHtml(title)}</h1><p>${du("m7289d99c0cec")} ${new Date().toLocaleString(dashboardLocale())}</p>${html}<div class="footer">${du("me4461ff35f0d")}</div><script>window.onload=()=>{window.print();}</script></body></html>`);
  printWindow.document.close();
};

const getStoredAccess = () => {
  if (typeof window === "undefined") return { permissions: [] as string[], isOwner: false };
  try {
    const permissions = JSON.parse(localStorage.getItem("user_permissions") || "[]") as string[];
    const profile = JSON.parse(localStorage.getItem("user_profile") || "{}") as { role?: string };
    return { permissions, isOwner: profile.role === "Admin Général" || profile.role === "Admin Général" };
  } catch {
    return { permissions: [] as string[], isOwner: false };
  }
};

const formatDate = (value: string) => {
  if (!value) return "";
  return new Intl.DateTimeFormat(dashboardLocale(), { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
};

const getBusinessName = () => {
  if (typeof window === "undefined") return "Movoora";
  try {
    const profile = JSON.parse(localStorage.getItem("user_profile") || "{}");
    return profile?.boutiqueActive?.nom || profile?.boutiqueNom || "Movoora";
  } catch {
    return "Movoora";
  }
};

const getInvoiceStatus = (sale: InvoiceSale) => {
  if (sale.statut === "ANNULEE") return "Annulée";
  if (sale.statut === "REMBOURSEE") return "Remboursée";
  return "Émise";
};

const invoiceHtml = (sale: InvoiceSale, businessName: string) => {
  const rows = sale.lignes.map((line) => `
    <tr>
      <td>
        <strong>${line.nomProduit}</strong>
        <span>${du("m3c1fa577ed7a")} ${line.sku || "-"}</span>
      </td>
      <td>${line.quantite}</td>
      <td>${formatMoney(line.prixUnitaireHT, sale.devise)}</td>
      <td>${formatMoney(line.totalHT, sale.devise)}</td>
    </tr>
  `).join("");

  return `<!doctype html>
  <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <title>${sale.factureReference}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 32px; background: #f8fafc; }
        .invoice { max-width: 900px; margin: auto; background: white; padding: 36px; border: 1px solid #e2e8f0; }
        .top { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 20px; }
        h1 { margin: 0; font-size: 28px; letter-spacing: 0.04em; }
        .muted { color: #64748b; font-size: 12px; margin-top: 6px; }
        .meta { text-align: right; font-size: 12px; line-height: 1.7; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 26px 0; }
        .box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; font-size: 12px; }
        .label { text-transform: uppercase; font-weight: 700; color: #64748b; font-size: 10px; display: block; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { text-align: left; background: #f1f5f9; color: #475569; padding: 12px; text-transform: uppercase; font-size: 10px; }
        td { padding: 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        td span { display: block; color: #94a3b8; font-size: 10px; margin-top: 4px; }
        .totals { margin-left: auto; width: 320px; margin-top: 24px; font-size: 12px; }
        .totals div { display: flex; justify-content: space-between; padding: 8px 0; }
        .total { border-top: 2px solid #0f172a; font-size: 18px; font-weight: 800; }
        .footer { margin-top: 36px; color: #64748b; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        @media print { body { background: white; padding: 0; } .invoice { border: none; max-width: none; } }
      </style>
    </head>
    <body>
      <section class="invoice">
        <div class="top">
          <div>
            <h1>${du("m7a0aa1554ac7")}</h1>
            <p class="muted">${businessName}</p>
          </div>
          <div class="meta">
            <strong>${sale.factureReference}</strong><br />
            ${du("m557fd53e28c6")} ${sale.reference}<br />
            ${du("m8e73ccee8a83")} ${formatDate(sale.createdAt)}<br />
            ${du("m1eb543dc320e")} ${getInvoiceStatus(sale)}
          </div>
        </div>
        <div class="grid">
          <div class="box"><span class="label">${du("m0c77fe09ab33")}</span><strong>${sale.clientNom}</strong></div>
          <div class="box"><span class="label">${du("mbe0e77f22f53")}</span><strong>${getCashierName(sale)}</strong><br />${du("mbace9bdd7eb8")} ${sale.paiement}</div>
        </div>
        <table>
          <thead><tr><th>${du("m29d94922512b")}</th><th>${du("m3849f9d2a8fa")}</th><th>${du("m5a1bcd077833")}</th><th>${du("mf1587f7b0873")}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="totals">
          <div><span>${du("mf0d8a19e2e95")}</span><strong>${formatMoney(sale.sousTotalHT, sale.devise)}</strong></div>
          <div><span>${du("md596fa470381")}</span><strong>- ${formatMoney(sale.remiseMontant, sale.devise)}</strong></div>
          <div><span>${du("m38769e1bcc6c")}</span><strong>${formatMoney(sale.taxableAmount, sale.devise)}</strong></div>
          <div><span>${du("mae5f52a29195")} ${(sale.tvaRate * 100).toFixed(0)}%</span><strong>${formatMoney(sale.tvaMontant, sale.devise)}</strong></div>
          <div class="total"><span>${du("m7324c6571082")}</span><strong>${formatMoney(sale.totalTTC, sale.devise)}</strong></div>
        </div>
        <p class="footer">${du("m547880e11f46")}</p>
      </section>
    </body>
  </html>`;
};

export default function InvoicesPage() {
  const { ui: du } = useDashboardLanguage();
  const [invoices, setInvoices] = useState<InvoiceSale[]>([]);
  const [scope, setScope] = useState<"all" | "own">("own");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSale | null>(null);
  const [page, setPage] = useState(1);
  const [businessName, setBusinessName] = useState("Movoora");
  const [metricOpen, setMetricOpen] = useState(false);
  const [{ permissions, isOwner }] = useState(getStoredAccess);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/caisse/factures`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Impossible de charger les factures.");
      setInvoices(data.data || []);
      setScope(data.scope === "all" ? "all" : "own");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setBusinessName(getBusinessName());
    void fetchInvoices();
  }, [fetchInvoices]);

  const filtered = useMemo(() => {
    return invoices.filter((invoice) =>
      `${invoice.factureReference} ${invoice.reference} ${invoice.clientNom} ${getCashierName(invoice)}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [invoices, search]);

  const visibleInvoices = filtered.slice((page - 1) * pageSize, page * pageSize);
  const canExportInvoices = isOwner || permissions.includes("EXPORTER_FACTURES") || permissions.includes("EXPORTER_RAPPORTS");
  const canPrintInvoices = isOwner || permissions.includes("IMPRIMER_FACTURE");
  const invoiceCurrency = filtered[0]?.deviseReference || filtered[0]?.devise || "USD ($)";
  const totalAmount = filtered.reduce((sum, invoice) => sum + Number(invoice.totalTTC || 0), 0);
  const invoiceRowsHtml = (items: InvoiceSale[]) => `<table><thead><tr><th>${du("m7ba96f08a0bf")}</th><th>${du("mee19f8d8fffd")}</th><th>${du("m0c77fe09ab33")}</th><th>${du("m7324c6571082")}</th><th>${du("mae5f52a29195")}</th><th>${du("m99c40ab40592")}</th><th>${du("mdee377cfd8cd")}</th></tr></thead><tbody>${items.map((invoice) => `<tr><td>${invoice.factureReference}</td><td>${invoice.reference}</td><td>${invoice.clientNom}</td><td class="total">${formatMoney(invoice.totalTTC, invoice.devise)}</td><td>${formatMoney(invoice.tvaMontant, invoice.devise)}</td><td>${formatDate(invoice.createdAt)}</td><td>${getInvoiceStatus(invoice)}</td></tr>`).join("")}</tbody></table>`;
  const exportCsv = () => exportXlsxWorkbook("factures.xlsx", [{ name: "Factures", columns: ["Facture", "Vente", "Client", "Total TTC", "TVA", "Date", "Statut"], rows: filtered.map((invoice) => [invoice.factureReference, invoice.reference, invoice.clientNom, invoice.totalTTC, invoice.tvaMontant, formatDate(invoice.createdAt), getInvoiceStatus(invoice)]) }]);
  const exportWord = () => downloadBlob(`<html><body><h1>${du("mcf728fa6fc3f")}</h1>${invoiceRowsHtml(filtered)}</body></html>`, "factures.doc", "application/msword;charset=utf-8");
  const exportCurrentPdf = () => exportPdf("Factures", invoiceRowsHtml(filtered));

  const openPrint = (invoice: InvoiceSale) => {
    const printWindow = window.open("", "_blank", "width=980,height=720");
    if (!printWindow) return;
    printWindow.document.write(invoiceHtml(invoice, businessName));
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 400);
  };

  const downloadInvoice = (invoice: InvoiceSale) => {
    const blob = new Blob([invoiceHtml(invoice, businessName)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${invoice.factureReference}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800">
      <CashHeader title={du("mcf728fa6fc3f")} subtitle={scope === "all" ? du("m89d0d8d23b55") : du("m41a5b0ad015c")} action={canExportInvoices ? <div className="flex flex-wrap gap-2"><button onClick={exportCsv} disabled={filtered.length === 0} className={secondaryButton}><Download size={14} /> {du("m48d53635551c")}</button><button onClick={exportWord} disabled={filtered.length === 0} className={secondaryButton}><FileText size={14} /> {du("m3a2860ece5a4")}</button><button onClick={exportCurrentPdf} disabled={filtered.length === 0} className={secondaryButton}><Printer size={14} /> {du("m1d393b0081b6")}</button></div> : undefined} />

      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700">{du(error)}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CashMetric label={du("mcf728fa6fc3f")} value={`${filtered.length}`} detail={du("mb687aca75c9e")} icon={FileText} />
        <CashMetric label={du("m7ad4b81a97e2")} value={compactMoney(totalAmount, invoiceCurrency)} detail={du("m40d488d155d7")} icon={WalletCards} tone="emerald" onInspect={() => setMetricOpen(true)} />
        <CashMetric label={du("m83172b7173fb")} value={`${filtered.filter((item) => item.statut === "PAYEE").length}`} detail={du("m459e9d89177c")} icon={ReceiptText} tone="amber" />
        <CashMetric label={du("m32c3fecaa411")} value={`${filtered.length}`} detail={du("mc1d3cd1303f5")} icon={Printer} tone="indigo" />
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <CashSearch value={search} onChange={setSearch} placeholder={du("m8b0a41e5561f")} />
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
              <span className="text-xs font-medium">{du("ma470c0dfb1e6")}</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[920px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">{du("m7ba96f08a0bf")}</th>
                  <th className="px-6 py-4">{du("m604e928292a9")}</th>
                  <th className="px-6 py-4">{du("m0c77fe09ab33")}</th>
                  <th className="px-6 py-4">{du("m7324c6571082")}</th>
                  <th className="px-6 py-4">{du("mae5f52a29195")}</th>
                  <th className="px-6 py-4">{du("m99c40ab40592")}</th>
                  <th className="px-6 py-4">{du("mdee377cfd8cd")}</th>
                  <th className="px-6 py-4 text-right">{du("mff8059dc6752")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleInvoices.map((invoice) => (
                  <tr key={invoice._id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-bold text-slate-900">{invoice.factureReference}</td>
                    <td className="px-6 py-4 text-slate-500">{invoice.reference}</td>
                    <td className="px-6 py-4">{invoice.clientNom}</td>
                    <td className="px-6 py-4 font-black">{formatMoney(invoice.totalTTC, invoice.devise)}</td>
                    <td className="px-6 py-4 text-slate-500">{formatMoney(invoice.tvaMontant, invoice.devise)}</td>
                    <td className="px-6 py-4">{formatDate(invoice.createdAt)}</td>
                    <td className="px-6 py-4"><CashBadge status={getInvoiceStatus(invoice)} /></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setSelectedInvoice(invoice)} className="p-1.5 text-slate-400 hover:text-indigo-600" title={du("m11529cec5085")}><Eye size={15} /></button>
                        {canPrintInvoices && <button onClick={() => openPrint(invoice)} className="p-1.5 text-slate-400 hover:text-slate-700" title={du("md674258167f2")}><Printer size={15} /></button>}
                        <button onClick={() => downloadInvoice(invoice)} className="p-1.5 text-slate-400 hover:text-emerald-600" title={du("mcdaaab442d26")}><Download size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleInvoices.length === 0 && (
                  <tr><td colSpan={8} className="px-6 py-14 text-center text-slate-400 font-medium">{du("m8a0fefe45650")}</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <CashPagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
      </section>

      <CashModal
        open={Boolean(selectedInvoice)}
        title={du("m11157f98e90b")}
        subtitle={selectedInvoice?.factureReference || ""}
        onClose={() => setSelectedInvoice(null)}
        footer={
          <>
            {selectedInvoice && <button onClick={() => downloadInvoice(selectedInvoice)} className={secondaryButton}><Download size={14} /> {du("mcdaaab442d26")}</button>}
            {selectedInvoice && canPrintInvoices && <button onClick={() => openPrint(selectedInvoice)} className={secondaryButton}><Printer size={14} /> {du("md674258167f2")}</button>}
            <button onClick={() => setSelectedInvoice(null)} className={secondaryButton}>{du("m711e5f2e198d")}</button>
          </>
        }
      >
        {selectedInvoice && (
          <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden">
            <div className="p-6 border-b-2 border-slate-900 flex justify-between gap-4">
              <div>
                <p className="text-2xl font-black tracking-wider text-slate-950">{du("m7a0aa1554ac7")}</p>
                <p className="text-xs text-slate-400 mt-1">{businessName}</p>
              </div>
              <div className="text-right text-[11px] text-slate-500 leading-relaxed">
                <p className="font-black text-slate-900">{selectedInvoice.factureReference}</p>
                <p>{du("m557fd53e28c6")}{" "}{selectedInvoice.reference}</p>
                <p>{formatDate(selectedInvoice.createdAt)}</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block uppercase text-[10px] font-bold">{du("m0c77fe09ab33")}</span><strong>{selectedInvoice.clientNom}</strong></div>
                <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block uppercase text-[10px] font-bold">{du("mbe0e77f22f53")}</span><strong>{getCashierName(selectedInvoice)}</strong><p className="text-slate-400 mt-1">{du("mbace9bdd7eb8")}{" "}{du(selectedInvoice.paiement)}</p></div>
              </div>

              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold">
                    <tr><th className="text-left p-3">{du("m29d94922512b")}</th><th className="p-3">{du("m3849f9d2a8fa")}</th><th className="text-right p-3">{du("m5a1bcd077833")}</th><th className="text-right p-3">{du("m7324c6571082")}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.lignes.map((line) => (
                      <tr key={`${line.produitId}-${line.sku}`}>
                        <td className="p-3"><strong>{line.nomProduit}</strong><p className="text-[10px] text-slate-400 mt-1">{du("m3c1fa577ed7a")}{" "}{line.sku || "-"}</p></td>
                        <td className="p-3 text-center font-bold">{line.quantite}</td>
                        <td className="p-3 text-right font-bold">{formatMoney(line.prixUnitaireHT, selectedInvoice.devise)}</td>
                        <td className="p-3 text-right font-black">{formatMoney(line.totalTTC, selectedInvoice.devise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ml-auto max-w-xs space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">{du("mf0d8a19e2e95")}</span><strong>{formatMoney(selectedInvoice.sousTotalHT, selectedInvoice.devise)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">{du("md596fa470381")}</span><strong>- {formatMoney(selectedInvoice.remiseMontant, selectedInvoice.devise)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">{du("m38769e1bcc6c")}</span><strong>{formatMoney(selectedInvoice.taxableAmount, selectedInvoice.devise)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">{du("mae5f52a29195")}{" "}{(selectedInvoice.tvaRate * 100).toFixed(0)}%</span><strong>{formatMoney(selectedInvoice.tvaMontant, selectedInvoice.devise)}</strong></div>
                <div className="flex justify-between text-base font-black border-t border-slate-900 pt-3"><span>{du("m7324c6571082")}</span><span>{formatMoney(selectedInvoice.totalTTC, selectedInvoice.devise)}</span></div>
              </div>
            </div>
          </div>
        )}
      </CashModal>
      <CashModal open={metricOpen} title={du("m7ad4b81a97e2")} subtitle={du("m42aecd7f07f3")} onClose={() => setMetricOpen(false)} footer={<button onClick={() => setMetricOpen(false)} className={secondaryButton}>{du("m711e5f2e198d")}</button>}><div className="p-4 rounded-xl bg-slate-50 border border-slate-100"><p className="text-[10px] uppercase font-bold text-slate-400">{du("m7ad4b81a97e2")}</p><p className="text-2xl font-black text-slate-900 mt-2">{formatMoney(totalAmount, invoiceCurrency)}</p><p className="text-xs text-slate-500 mt-2">{filtered.length} {du("m5b98207fb4c6")}</p></div></CashModal>
    </div>
  );
}


