"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDownLeft, CheckCircle2, Download, Eye, FileText, Loader2, Plus, Printer, RotateCcw, WalletCards, XCircle } from "lucide-react";
import { formatMoney, getActiveBoutiqueCurrency } from "../../inventaire/components/currency";
import { CashBadge, CashHeader, CashMetric, CashModal, CashPagination, CashSearch, fieldClass, primaryButton, secondaryButton } from "../components/cashier-ui";
import { exportXlsxWorkbook } from "../../components/export-xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";

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
  printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${stripHtml(title)}</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#172033;margin:0}h1{font-size:20px;margin:0 0 4px}p{font-size:11px;color:#64748b;margin:0 0 18px}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#f1f5f9;text-align:left;text-transform:uppercase;color:#64748b}th,td{padding:7px;border:1px solid #e2e8f0;vertical-align:top}.total{font-weight:800}.footer{margin-top:12px;font-size:9px;color:#94a3b8}</style></head><body><h1>${stripHtml(title)}</h1><p>Export du ${new Date().toLocaleString("fr-FR")}</p>${html}<div class="footer">Movoora · Document généré automatiquement</div><script>window.onload=()=>{window.print();}</script></body></html>`);
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

type SaleLine = {
  produitId: string;
  nomProduit: string;
  sku?: string;
  quantite: number;
  totalTTC: number;
};

type Sale = {
  _id: string;
  reference: string;
  factureReference: string;
  clientNom: string;
  devise: string;
  deviseReference?: string;
  totalTTC: number;
  statut: string;
  lignes: SaleLine[];
  createdAt: string;
};

type ReturnItem = {
  _id: string;
  reference: string;
  venteId: string;
  venteReference: string;
  factureReference: string;
  clientNom: string;
  devise: string;
  deviseReference?: string;
  typeRetour: "REMBOURSEMENT" | "ECHANGE" | "AVOIR";
  motif: string;
  statut: string;
  montantTotalTTC: number;
  lignes: Array<SaleLine & { montantTTC: number; remiseEnStock: boolean }>;
  createdAt: string;
};

const emptyForm = {
  venteId: "",
  produitId: "",
  quantite: 1,
  typeRetour: "REMBOURSEMENT",
  remiseEnStock: true,
  motif: "",
};

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

const typeLabel = (type: string) => {
  if (type === "ECHANGE") return "Échange";
  if (type === "AVOIR") return "Avoir client";
  return "Remboursement";
};

const statusLabel = (status: string) => {
  if (status === "VALIDE") return "Validé";
  if (status === "REFUSE") return "Refusé";
  return status;
};

export default function CustomerReturnsPage() {
  const [returnsData, setReturnsData] = useState<ReturnItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Tous");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const [metricOpen, setMetricOpen] = useState(false);
  const [{ permissions, isOwner }] = useState(getStoredAccess);
  const pageSize = 8;

  const fetchReturns = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/caisse/retours`, { headers: getAuthHeaders() });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Impossible de charger les retours clients.");
      setReturnsData(data.data || []);
      setSales(data.ventes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReturns();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const selectedSale = useMemo(() => sales.find((sale) => sale._id === form.venteId), [form.venteId, sales]);
  const selectedLine = useMemo(() => selectedSale?.lignes.find((line) => line.produitId === form.produitId), [form.produitId, selectedSale]);

  const filtered = useMemo(() => {
    return returnsData.filter((item) => {
      const productLabel = item.lignes.map((line) => `${line.nomProduit} ${line.sku || ""}`).join(" ");
      const matchSearch = `${item.reference} ${item.venteReference} ${item.factureReference} ${item.clientNom} ${productLabel}`.toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === "Tous" || item.statut === status;
      return matchSearch && matchStatus;
    });
  }, [returnsData, search, status]);

  const visibleReturns = filtered.slice((page - 1) * pageSize, page * pageSize);
  const canExportReturns = isOwner || permissions.includes("EXPORTER_RETOURS_CLIENTS") || permissions.includes("EXPORTER_RAPPORTS");
  const canCreateReturn = isOwner || permissions.includes("CREER_RETOUR_CLIENT") || permissions.includes("ANNULER_VENTE");
  const validReturns = filtered.filter((item) => item.statut === "VALIDE");
  const exchanges = filtered.filter((item) => item.typeRetour === "ECHANGE").length;
  const returnCurrency = validReturns[0]?.deviseReference || validReturns[0]?.devise || getActiveBoutiqueCurrency();
  const totalReturned = validReturns.reduce((sum, item) => sum + Number(item.montantTotalTTC || 0), 0);
  const returnsRowsHtml = (items: ReturnItem[]) => `<table><thead><tr><th>Retour</th><th>Vente</th><th>Client</th><th>Type</th><th>Montant</th><th>Statut</th></tr></thead><tbody>${items.map((item) => `<tr><td>${item.reference}</td><td>${item.venteReference}</td><td>${item.clientNom}</td><td>${typeLabel(item.typeRetour)}</td><td class="total">${formatMoney(item.montantTotalTTC, item.deviseReference || item.devise || returnCurrency)}</td><td>${statusLabel(item.statut)}</td></tr>`).join("")}</tbody></table>`;
  const exportCsv = () => exportXlsxWorkbook("retours-clients.xlsx", [{ name: "Retours clients", columns: ["Retour", "Vente", "Client", "Type", "Montant", "Statut"], rows: filtered.map((item) => [item.reference, item.venteReference, item.clientNom, typeLabel(item.typeRetour), item.montantTotalTTC, statusLabel(item.statut)]) }]);
  const exportWord = () => downloadBlob(`<html><body><h1>Retours clients</h1>${returnsRowsHtml(filtered)}</body></html>`, "retours-clients.doc", "application/msword;charset=utf-8");
  const exportCurrentPdf = () => exportPdf("Retours clients", returnsRowsHtml(filtered));

  const openCreateModal = () => {
    const firstSale = sales[0];
    const firstLine = firstSale?.lignes[0];
    setForm({
      ...emptyForm,
      venteId: firstSale?._id || "",
      produitId: firstLine?.produitId || "",
    });
    setError("");
    setModalError("");
    setSuccess("");
    setModalOpen(true);
  };

  const handleSaleChange = (venteId: string) => {
    const sale = sales.find((item) => item._id === venteId);
    setForm((current) => ({
      ...current,
      venteId,
      produitId: sale?.lignes[0]?.produitId || "",
      quantite: 1,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setModalError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/caisse/retours`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Impossible d'enregistrer le retour.");

      setReturnsData((current) => [data.data, ...current]);
      setSuccess(data.message || "Retour client enregistré.");
      setModalOpen(false);
      await fetchReturns();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800">
      <CashHeader
        title="Retours clients"
        subtitle="Traitez les remboursements, échanges et retours après vente."
        action={
          <div className="flex flex-wrap gap-2">{canExportReturns && <><button onClick={exportCsv} disabled={filtered.length === 0} className={secondaryButton}><Download size={14} /> Excel</button><button onClick={exportWord} disabled={filtered.length === 0} className={secondaryButton}><FileText size={14} /> Word</button><button onClick={exportCurrentPdf} disabled={filtered.length === 0} className={secondaryButton}><Printer size={14} /> PDF</button></>}{canCreateReturn && <button onClick={openCreateModal} className={primaryButton}>
            <Plus size={15} />
            Nouveau retour
          </button>}</div>
        }
      />

      {(error || success) && (
        <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${error ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
          {error ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          {error || success}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CashMetric label="Retours affichés" value={`${filtered.length}`} detail="Selon les filtres" icon={RotateCcw} />
        <CashMetric label="Montant retourné" value={compactMoney(totalReturned, returnCurrency)} detail={`Retours validés en ${returnCurrency}`} icon={WalletCards} tone="emerald" onInspect={() => setMetricOpen(true)} />
        <CashMetric label="Échanges" value={`${exchanges}`} detail="Compensations produit" icon={ArrowDownLeft} tone="amber" />
        <CashMetric label="Refusés" value={`${filtered.filter((item) => item.statut === "REFUSE").length}`} detail="Demandes rejetées" icon={XCircle} tone="rose" />
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <CashSearch value={search} onChange={setSearch} placeholder="Rechercher un retour, une vente, une facture, un client..." />
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={`${fieldClass} sm:w-48`}>
            <option value="Tous">Tous les statuts</option>
            <option value="VALIDE">Validés</option>
            <option value="REFUSE">Refusés</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 flex flex-col items-center gap-3 text-slate-400 text-xs font-bold">
              <Loader2 className="animate-spin text-indigo-600" size={24} />
              Chargement des retours clients...
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[960px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Retour</th>
                  <th className="px-6 py-4">Vente</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Produit</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Montant</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleReturns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-14 text-center text-slate-400 font-medium">
                      Aucun retour client trouvé.
                    </td>
                  </tr>
                ) : (
                  visibleReturns.map((item) => {
                    const firstLine = item.lignes[0];
                    return (
                      <tr key={item._id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{item.reference}</p>
                          <p className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleDateString("fr-FR")}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          <p>{item.venteReference}</p>
                          <p className="text-[10px]">{item.factureReference}</p>
                        </td>
                        <td className="px-6 py-4">{item.clientNom}</td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{firstLine?.nomProduit || "-"}</p>
                          <p className="text-[10px] text-slate-400">Qté {firstLine?.quantite || 0}</p>
                        </td>
                        <td className="px-6 py-4">{typeLabel(item.typeRetour)}</td>
                        <td className="px-6 py-4 font-black">{formatMoney(item.montantTotalTTC, item.deviseReference || item.devise || returnCurrency)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold ${firstLine?.remiseEnStock ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {firstLine?.remiseEnStock ? "Remis en stock" : "Non remis"}
                          </span>
                        </td>
                        <td className="px-6 py-4"><CashBadge status={statusLabel(item.statut)} /></td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => setSelectedReturn(item)} className="p-1.5 text-slate-400 hover:text-indigo-600" title="Consulter">
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
        <CashPagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
      </section>

      <CashModal
        open={modalOpen}
        title="Nouveau retour"
        subtitle="Sélectionnez la vente et le produit concerné."
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className={secondaryButton}>Annuler</button>
            <button type="submit" form="return-form" disabled={saving || !form.venteId || !form.produitId} className={primaryButton}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Enregistrer
            </button>
          </>
        }
      >
        {modalError && (
          <div className="mb-4 p-3 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 text-xs font-bold flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{modalError}</span>
          </div>
        )}
        <form id="return-form" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Vente concernée <span className="text-rose-500">*</span></span>
            <select value={form.venteId} onChange={(event) => handleSaleChange(event.target.value)} className={fieldClass} required>
              <option value="">Sélectionner une vente</option>
              {sales.map((sale) => (
                <option key={sale._id} value={sale._id}>
                  {sale.reference} · {sale.clientNom} · {formatMoney(sale.totalTTC, sale.devise)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Produit <span className="text-rose-500">*</span></span>
            <select value={form.produitId} onChange={(event) => setForm((current) => ({ ...current, produitId: event.target.value, quantite: 1 }))} className={fieldClass} required disabled={!selectedSale}>
              <option value="">Sélectionner un produit</option>
              {selectedSale?.lignes.map((line) => (
                <option key={line.produitId} value={line.produitId}>
                  {line.nomProduit} · vendu {line.quantite}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Quantité <span className="text-rose-500">*</span></span>
            <input
              type="number"
              min="1"
              max={selectedLine?.quantite || 1}
              value={form.quantite}
              onChange={(event) => setForm((current) => ({ ...current, quantite: Number(event.target.value) }))}
              className={fieldClass}
              required
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Compensation <span className="text-rose-500">*</span></span>
            <select value={form.typeRetour} onChange={(event) => setForm((current) => ({ ...current, typeRetour: event.target.value }))} className={fieldClass}>
              <option value="REMBOURSEMENT">Remboursement</option>
              <option value="ECHANGE">Échange</option>
              <option value="AVOIR">Avoir client</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Stock</span>
            <select value={form.remiseEnStock ? "yes" : "no"} onChange={(event) => setForm((current) => ({ ...current, remiseEnStock: event.target.value === "yes" }))} className={fieldClass}>
              <option value="yes">Remettre en stock</option>
              <option value="no">Ne pas remettre en stock</option>
            </select>
          </label>

          {selectedLine && (
            <div className="sm:col-span-2 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-700 font-bold">
              Montant estimé : {formatMoney((Number(selectedLine.totalTTC || 0) / Number(selectedLine.quantite || 1)) * Number(form.quantite || 0), selectedSale?.devise)}
            </div>
          )}

          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Motif <span className="text-rose-500">*</span></span>
            <textarea
              value={form.motif}
              onChange={(event) => setForm((current) => ({ ...current, motif: event.target.value }))}
              className={`${fieldClass} h-24 py-3 resize-none`}
              placeholder="Exemple : produit défectueux, erreur de référence, échange demandé..."
              required
            />
          </label>
        </form>
      </CashModal>

      <CashModal
        open={Boolean(selectedReturn)}
        title="Détail du retour"
        subtitle={selectedReturn?.reference || ""}
        onClose={() => setSelectedReturn(null)}
        footer={<button onClick={() => setSelectedReturn(null)} className={secondaryButton}>Fermer</button>}
      >
        {selectedReturn && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">Vente</span><strong>{selectedReturn.venteReference}</strong></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">Facture</span><strong>{selectedReturn.factureReference}</strong></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">Client</span><strong>{selectedReturn.clientNom}</strong></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">Montant</span><strong>{formatMoney(selectedReturn.montantTotalTTC, selectedReturn.deviseReference || selectedReturn.devise || returnCurrency)}</strong></div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block mb-2">Produits retournés</span>
              {selectedReturn.lignes.map((line) => (
                <div key={line.produitId} className="flex justify-between gap-3 py-1">
                  <strong>{line.nomProduit}</strong>
                  <span>Qté {line.quantite}</span>
                </div>
              ))}
            </div>
            <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">Motif</span><strong>{selectedReturn.motif}</strong></div>
          </div>
        )}
      </CashModal>
      <CashModal open={metricOpen} title="Montant retourné" subtitle="Montant complet des retours validés" onClose={() => setMetricOpen(false)} footer={<button onClick={() => setMetricOpen(false)} className={secondaryButton}>Fermer</button>}><div className="p-4 rounded-xl bg-slate-50 border border-slate-100"><p className="text-[10px] uppercase font-bold text-slate-400">Montant retourné</p><p className="text-2xl font-black text-slate-900 mt-2">{formatMoney(totalReturned, returnCurrency)}</p><p className="text-xs text-slate-500 mt-2">{validReturns.length} retour(s) validé(s)</p></div></CashModal>
    </div>
  );
}


