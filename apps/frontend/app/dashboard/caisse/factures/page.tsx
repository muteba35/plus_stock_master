"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, Loader2, Printer, ReceiptText, Send, WalletCards } from "lucide-react";
import { formatMoney } from "../../inventaire/components/currency";
import { CashBadge, CashHeader, CashMetric, CashModal, CashPagination, CashSearch, secondaryButton } from "../components/cashier-ui";

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
  const label = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 2 }).format(amount);
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
  printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${stripHtml(title)}</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#172033;margin:0}h1{font-size:20px;margin:0 0 4px}p{font-size:11px;color:#64748b;margin:0 0 18px}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#f1f5f9;text-align:left;text-transform:uppercase;color:#64748b}th,td{padding:7px;border:1px solid #e2e8f0;vertical-align:top}.total{font-weight:800}.footer{margin-top:12px;font-size:9px;color:#94a3b8}</style></head><body><h1>${stripHtml(title)}</h1><p>Export du ${new Date().toLocaleString("fr-FR")}</p>${html}<div class="footer">StockMaster Pro · Document généré automatiquement</div><script>window.onload=()=>{window.print();}</script></body></html>`);
  printWindow.document.close();
};

const getStoredAccess = () => {
  if (typeof window === "undefined") return { permissions: [] as string[], isOwner: false };
  try {
    const permissions = JSON.parse(localStorage.getItem("user_permissions") || "[]") as string[];
    const profile = JSON.parse(localStorage.getItem("user_profile") || "{}") as { role?: string };
    return { permissions, isOwner: profile.role === "Admin Général" || profile.role === "Admin GÃ©nÃ©ral" };
  } catch {
    return { permissions: [] as string[], isOwner: false };
  }
};

const formatDate = (value: string) => {
  if (!value) return "";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
};

const getBusinessName = () => {
  if (typeof window === "undefined") return "StockMaster Pro";
  try {
    const profile = JSON.parse(localStorage.getItem("user_profile") || "{}");
    return profile?.boutiqueActive?.nom || profile?.boutiqueNom || "StockMaster Pro";
  } catch {
    return "StockMaster Pro";
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
        <span>SKU : ${line.sku || "-"}</span>
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
            <h1>FACTURE</h1>
            <p class="muted">${businessName}</p>
          </div>
          <div class="meta">
            <strong>${sale.factureReference}</strong><br />
            Vente : ${sale.reference}<br />
            Date : ${formatDate(sale.createdAt)}<br />
            Statut : ${getInvoiceStatus(sale)}
          </div>
        </div>
        <div class="grid">
          <div class="box"><span class="label">Client</span><strong>${sale.clientNom}</strong></div>
          <div class="box"><span class="label">Caissier</span><strong>${getCashierName(sale)}</strong><br />Paiement : ${sale.paiement}</div>
        </div>
        <table>
          <thead><tr><th>Article</th><th>Qté</th><th>Prix HT</th><th>Total HT</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="totals">
          <div><span>Sous-total HT</span><strong>${formatMoney(sale.sousTotalHT, sale.devise)}</strong></div>
          <div><span>Remise</span><strong>- ${formatMoney(sale.remiseMontant, sale.devise)}</strong></div>
          <div><span>Base taxable</span><strong>${formatMoney(sale.taxableAmount, sale.devise)}</strong></div>
          <div><span>TVA ${(sale.tvaRate * 100).toFixed(0)}%</span><strong>${formatMoney(sale.tvaMontant, sale.devise)}</strong></div>
          <div class="total"><span>Total TTC</span><strong>${formatMoney(sale.totalTTC, sale.devise)}</strong></div>
        </div>
        <p class="footer">Merci pour votre achat. Facture générée par StockMaster Pro.</p>
      </section>
    </body>
  </html>`;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceSale[]>([]);
  const [scope, setScope] = useState<"all" | "own">("own");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSale | null>(null);
  const [page, setPage] = useState(1);
  const [businessName, setBusinessName] = useState("StockMaster Pro");
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
  const invoiceRowsHtml = (items: InvoiceSale[]) => `<table><thead><tr><th>Facture</th><th>Vente</th><th>Client</th><th>Total TTC</th><th>TVA</th><th>Date</th><th>Statut</th></tr></thead><tbody>${items.map((invoice) => `<tr><td>${invoice.factureReference}</td><td>${invoice.reference}</td><td>${invoice.clientNom}</td><td class="total">${formatMoney(invoice.totalTTC, invoice.devise)}</td><td>${formatMoney(invoice.tvaMontant, invoice.devise)}</td><td>${formatDate(invoice.createdAt)}</td><td>${getInvoiceStatus(invoice)}</td></tr>`).join("")}</tbody></table>`;
  const exportCsv = () => downloadBlob("\uFEFF" + ["facture;vente;client;total_ttc;tva;date;statut", ...filtered.map((invoice) => [invoice.factureReference, invoice.reference, invoice.clientNom, invoice.totalTTC, invoice.tvaMontant, formatDate(invoice.createdAt), getInvoiceStatus(invoice)].join(";"))].join("\n"), "factures.csv", "text/csv;charset=utf-8");
  const exportWord = () => downloadBlob(`<html><body><h1>Factures</h1>${invoiceRowsHtml(filtered)}</body></html>`, "factures.doc", "application/msword;charset=utf-8");
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
      <CashHeader title="Factures" subtitle={scope === "all" ? "Documents de vente de tous les caissiers." : "Documents de vente liés à vos encaissements."} action={canExportInvoices ? <div className="flex flex-wrap gap-2"><button onClick={exportCsv} disabled={filtered.length === 0} className={secondaryButton}><Download size={14} /> Excel</button><button onClick={exportWord} disabled={filtered.length === 0} className={secondaryButton}><FileText size={14} /> Word</button><button onClick={exportCurrentPdf} disabled={filtered.length === 0} className={secondaryButton}><Printer size={14} /> PDF</button></div> : undefined} />

      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CashMetric label="Factures" value={`${filtered.length}`} detail="Documents affichés" icon={FileText} />
        <CashMetric label="Total facturé" value={compactMoney(totalAmount, invoiceCurrency)} detail="Selon la recherche" icon={WalletCards} tone="emerald" onInspect={() => setMetricOpen(true)} />
        <CashMetric label="Émises" value={`${filtered.filter((item) => item.statut === "PAYEE").length}`} detail="Factures validées" icon={ReceiptText} tone="amber" />
        <CashMetric label="À imprimer" value={`${filtered.length}`} detail="Disponibles en aperçu" icon={Printer} tone="indigo" />
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <CashSearch value={search} onChange={setSearch} placeholder="Rechercher une facture, une vente, un client ou un caissier..." />
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
              <span className="text-xs font-medium">Chargement des factures...</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[920px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Facture</th>
                  <th className="px-6 py-4">Vente liée</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Total TTC</th>
                  <th className="px-6 py-4">TVA</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
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
                        <button onClick={() => setSelectedInvoice(invoice)} className="p-1.5 text-slate-400 hover:text-indigo-600" title="Prévisualiser"><Eye size={15} /></button>
                        {canPrintInvoices && <button onClick={() => openPrint(invoice)} className="p-1.5 text-slate-400 hover:text-slate-700" title="Imprimer"><Printer size={15} /></button>}
                        <button onClick={() => downloadInvoice(invoice)} className="p-1.5 text-slate-400 hover:text-emerald-600" title="Télécharger"><Download size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleInvoices.length === 0 && (
                  <tr><td colSpan={8} className="px-6 py-14 text-center text-slate-400 font-medium">Aucune facture trouvée.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <CashPagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
      </section>

      <CashModal
        open={Boolean(selectedInvoice)}
        title="Aperçu facture"
        subtitle={selectedInvoice?.factureReference || ""}
        onClose={() => setSelectedInvoice(null)}
        footer={
          <>
            {selectedInvoice && <button onClick={() => downloadInvoice(selectedInvoice)} className={secondaryButton}><Download size={14} /> Télécharger</button>}
            {selectedInvoice && canPrintInvoices && <button onClick={() => openPrint(selectedInvoice)} className={secondaryButton}><Printer size={14} /> Imprimer</button>}
            <button onClick={() => setSelectedInvoice(null)} className={secondaryButton}>Fermer</button>
          </>
        }
      >
        {selectedInvoice && (
          <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden">
            <div className="p-6 border-b-2 border-slate-900 flex justify-between gap-4">
              <div>
                <p className="text-2xl font-black tracking-wider text-slate-950">FACTURE</p>
                <p className="text-xs text-slate-400 mt-1">{businessName}</p>
              </div>
              <div className="text-right text-[11px] text-slate-500 leading-relaxed">
                <p className="font-black text-slate-900">{selectedInvoice.factureReference}</p>
                <p>Vente : {selectedInvoice.reference}</p>
                <p>{formatDate(selectedInvoice.createdAt)}</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block uppercase text-[10px] font-bold">Client</span><strong>{selectedInvoice.clientNom}</strong></div>
                <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block uppercase text-[10px] font-bold">Caissier</span><strong>{getCashierName(selectedInvoice)}</strong><p className="text-slate-400 mt-1">Paiement : {selectedInvoice.paiement}</p></div>
              </div>

              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold">
                    <tr><th className="text-left p-3">Article</th><th className="p-3">Qté</th><th className="text-right p-3">Prix HT</th><th className="text-right p-3">Total TTC</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.lignes.map((line) => (
                      <tr key={`${line.produitId}-${line.sku}`}>
                        <td className="p-3"><strong>{line.nomProduit}</strong><p className="text-[10px] text-slate-400 mt-1">SKU : {line.sku || "-"}</p></td>
                        <td className="p-3 text-center font-bold">{line.quantite}</td>
                        <td className="p-3 text-right font-bold">{formatMoney(line.prixUnitaireHT, selectedInvoice.devise)}</td>
                        <td className="p-3 text-right font-black">{formatMoney(line.totalTTC, selectedInvoice.devise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ml-auto max-w-xs space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Sous-total HT</span><strong>{formatMoney(selectedInvoice.sousTotalHT, selectedInvoice.devise)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Remise</span><strong>- {formatMoney(selectedInvoice.remiseMontant, selectedInvoice.devise)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Base taxable</span><strong>{formatMoney(selectedInvoice.taxableAmount, selectedInvoice.devise)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">TVA {(selectedInvoice.tvaRate * 100).toFixed(0)}%</span><strong>{formatMoney(selectedInvoice.tvaMontant, selectedInvoice.devise)}</strong></div>
                <div className="flex justify-between text-base font-black border-t border-slate-900 pt-3"><span>Total TTC</span><span>{formatMoney(selectedInvoice.totalTTC, selectedInvoice.devise)}</span></div>
              </div>
            </div>
          </div>
        )}
      </CashModal>
      <CashModal open={metricOpen} title="Total facturé" subtitle="Montant complet des factures filtrées" onClose={() => setMetricOpen(false)} footer={<button onClick={() => setMetricOpen(false)} className={secondaryButton}>Fermer</button>}><div className="p-4 rounded-xl bg-slate-50 border border-slate-100"><p className="text-[10px] uppercase font-bold text-slate-400">Total facturé</p><p className="text-2xl font-black text-slate-900 mt-2">{formatMoney(totalAmount, invoiceCurrency)}</p><p className="text-xs text-slate-500 mt-2">{filtered.length} facture(s)</p></div></CashModal>
    </div>
  );
}
