"use client";
import { dashboardUi as du, dashboardLocale } from "../../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../../src/components/LanguageRuntime";


import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDownLeft, CheckCircle2, Download, Eye, FileText, Loader2, Plus, Printer, RotateCcw, WalletCards, XCircle } from "lucide-react";
import { formatMoney, getActiveBoutiqueCurrency } from "../../inventaire/components/currency";
import { CashBadge, CashHeader, CashMetric, CashModal, CashPagination, CashSearch, fieldClass, primaryButton, secondaryButton } from "../components/cashier-ui";
import { exportTable, authorizedExportRows, type ExportFormat } from "../../components/export-table";
import { useDashboardAccess } from "../../components/DashboardAccess";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";

const stripHtml = (value: string) => value.replace(/[<>]/g, "");
const compactMoney = (value: number, devise: string) => {
  const amount = Number(value || 0);
  if (Math.abs(amount) < 1000000) return formatMoney(amount, devise);
  const label = new Intl.NumberFormat(dashboardLocale(), { notation: "compact", maximumFractionDigits: 2 }).format(amount);
  return `${label} ${devise.replace(/.*\\((.*)\\).*/, "$1")}`;
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
  const { ui: du } = useDashboardLanguage();
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
  const { permissions, isOwner } = useDashboardAccess();
  const [exporting, setExporting] = useState(false);
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

  const runExport = async (format: ExportFormat) => {
    if (exporting) return;
    setExporting(true);
    try {
      const rows = await authorizedExportRows(API_URL + "/caisse/retours", filtered);
      if (!rows.length) throw new Error(du("Aucune donnée à exporter."));
      await exportTable(format, "retours-clients", { name: "Retours clients", columns: ["Retour", "Vente", "Client", "Type", "Montant", "Statut"], rows: rows.map((item) => [item.reference, item.venteReference, item.clientNom, typeLabel(item.typeRetour), item.montantTotalTTC, statusLabel(item.statut)]) });
    } catch (error) {
      setError(error instanceof Error ? error.message : du("Export impossible."));
    } finally { setExporting(false); }
  };
  const exportCsv = () => void runExport("xlsx");
  const exportExcel = exportCsv;
  const exportWord = () => void runExport("docx");
  const exportCurrentPdf = () => void runExport("pdf");
  
  const visibleReturns = filtered.slice((page - 1) * pageSize, page * pageSize);
  const canExportReturns = isOwner || permissions.includes("EXPORTER_RETOURS_CLIENTS") || permissions.includes("EXPORTER_RAPPORTS");
  const canCreateReturn = isOwner || permissions.includes("CREER_RETOUR_CLIENT") || permissions.includes("ANNULER_VENTE");
  const validReturns = filtered.filter((item) => item.statut === "VALIDE");
  const exchanges = filtered.filter((item) => item.typeRetour === "ECHANGE").length;
  const returnCurrency = validReturns[0]?.deviseReference || validReturns[0]?.devise || getActiveBoutiqueCurrency();
  const totalReturned = validReturns.reduce((sum, item) => sum + Number(item.montantTotalTTC || 0), 0);
  
  
  
  

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
        title={du("me44b386d4c1e")}
        subtitle={du("m686404ba99aa")}
        action={
          <div className="flex flex-wrap gap-2">{canExportReturns && <><button onClick={exportCsv} disabled={exporting || filtered.length === 0} className={secondaryButton}><Download size={14} /> {du("m48d53635551c")}</button><button onClick={exportWord} disabled={exporting || filtered.length === 0} className={secondaryButton}><FileText size={14} /> {du("m3a2860ece5a4")}</button><button onClick={exportCurrentPdf} disabled={exporting || filtered.length === 0} className={secondaryButton}><Printer size={14} /> {du("m1d393b0081b6")}</button></>}{canCreateReturn && <button onClick={openCreateModal} className={primaryButton}>
            <Plus size={15} />
            {du("m55b74cb23ae1")}{" "}</button>}</div>
        }
      />

      {(error || success) && (
        <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${error ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
          {error ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          {error || du(success)}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CashMetric label={du("m894cd3022f00")} value={`${filtered.length}`} detail={du("me20d6c1054d0")} icon={RotateCcw} />
        <CashMetric label={du("m6d83e3bc7ed4")} value={compactMoney(totalReturned, returnCurrency)} detail={du("md23a62cbdcff", {p0: returnCurrency})} icon={WalletCards} tone="emerald" onInspect={() => setMetricOpen(true)} />
        <CashMetric label={du("m2c1017935891")} value={`${exchanges}`} detail={du("m744b507b5994")} icon={ArrowDownLeft} tone="amber" />
        <CashMetric label={du("mb3fd626a7932")} value={`${filtered.filter((item) => item.statut === "REFUSE").length}`} detail={du("m7efd102601c5")} icon={XCircle} tone="rose" />
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <CashSearch value={search} onChange={setSearch} placeholder={du("m1ca80e4e972c")} />
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={`${fieldClass} sm:w-48`}>
            <option value="Tous">{du("md2bbf4fe69be")}</option>
            <option value="VALIDE">{du("mc89377ea81db")}</option>
            <option value="REFUSE">{du("mb3fd626a7932")}</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 flex flex-col items-center gap-3 text-slate-400 text-xs font-bold">
              <Loader2 className="animate-spin text-indigo-600" size={24} />
              {du("m8a073efae0db")}{" "}</div>
          ) : (
            <table className="w-full text-left text-xs min-w-[960px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">{du("mef23a5940244")}</th>
                  <th className="px-6 py-4">{du("mee19f8d8fffd")}</th>
                  <th className="px-6 py-4">{du("m0c77fe09ab33")}</th>
                  <th className="px-6 py-4">{du("ma0d3db2f0803")}</th>
                  <th className="px-6 py-4">{du("mbaaddf70fb5d")}</th>
                  <th className="px-6 py-4">{du("m947cc07e2b3e")}</th>
                  <th className="px-6 py-4">{du("md5cade7ef319")}</th>
                  <th className="px-6 py-4">{du("mdee377cfd8cd")}</th>
                  <th className="px-6 py-4 text-right">{du("mff8059dc6752")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleReturns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-14 text-center text-slate-400 font-medium">
                      {du("m39aae9093e4f")}{" "}</td>
                  </tr>
                ) : (
                  visibleReturns.map((item) => {
                    const firstLine = item.lignes[0];
                    return (
                      <tr key={item._id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{item.reference}</p>
                          <p className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleDateString(dashboardLocale())}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          <p>{item.venteReference}</p>
                          <p className="text-[10px]">{item.factureReference}</p>
                        </td>
                        <td className="px-6 py-4">{item.clientNom}</td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{firstLine?.nomProduit || "-"}</p>
                          <p className="text-[10px] text-slate-400">{du("m3849f9d2a8fa")}{" "}{firstLine?.quantite || 0}</p>
                        </td>
                        <td className="px-6 py-4">{du(typeLabel(item.typeRetour))}</td>
                        <td className="px-6 py-4 font-black">{formatMoney(item.montantTotalTTC, item.deviseReference || item.devise || returnCurrency)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold ${firstLine?.remiseEnStock ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {firstLine?.remiseEnStock ? du("mb16201df7a1b") : du("mba492cd41aed")}
                          </span>
                        </td>
                        <td className="px-6 py-4"><CashBadge status={statusLabel(item.statut)} /></td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => setSelectedReturn(item)} className="p-1.5 text-slate-400 hover:text-indigo-600" title={du("m2cf9926224a3")}>
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
        title={du("m55b74cb23ae1")}
        subtitle={du("m9fe044c77e38")}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className={secondaryButton}>{du("m46ad3916f6a0")}</button>
            <button type="submit" form="return-form" disabled={saving || !form.venteId || !form.produitId} className={primaryButton}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {du("m71dc74873e23")}{" "}</button>
          </>
        }
      >
        {modalError && (
          <div className="mb-4 p-3 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 text-xs font-bold flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{du(modalError)}</span>
          </div>
        )}
        <form id="return-form" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">{du("m708b1e76afa1")}{" "}<span className="text-rose-500">*</span></span>
            <select value={form.venteId} onChange={(event) => handleSaleChange(event.target.value)} className={fieldClass} required>
              <option value="">{du("md56bccdc60d5")}</option>
              {sales.map((sale) => (
                <option key={sale._id} value={sale._id}>
                  {sale.reference} · {sale.clientNom} · {formatMoney(sale.totalTTC, sale.devise)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">{du("ma0d3db2f0803")}{" "}<span className="text-rose-500">*</span></span>
            <select value={form.produitId} onChange={(event) => setForm((current) => ({ ...current, produitId: event.target.value, quantite: 1 }))} className={fieldClass} required disabled={!selectedSale}>
              <option value="">{du("m30b710bc734b")}</option>
              {selectedSale?.lignes.map((line) => (
                <option key={line.produitId} value={line.produitId}>
                  {line.nomProduit} {du("m0c48fc1e3fe8")}{" "}{line.quantite}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">{du("ma258a8ef030a")}{" "}<span className="text-rose-500">*</span></span>
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
            <span className="text-[10px] font-bold uppercase text-slate-400">{du("me1f27044cd25")}{" "}<span className="text-rose-500">*</span></span>
            <select value={form.typeRetour} onChange={(event) => setForm((current) => ({ ...current, typeRetour: event.target.value }))} className={fieldClass}>
              <option value="REMBOURSEMENT">{du("m1d2bff7fbeda")}</option>
              <option value="ECHANGE">{du("ma347c8575d1d")}</option>
              <option value="AVOIR">{du("medca159c60a9")}</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">{du("md5cade7ef319")}</span>
            <select value={form.remiseEnStock ? "yes" : "no"} onChange={(event) => setForm((current) => ({ ...current, remiseEnStock: event.target.value === "yes" }))} className={fieldClass}>
              <option value="yes">{du("m86a6fdde1bec")}</option>
              <option value="no">{du("m708a41b07bea")}</option>
            </select>
          </label>

          {selectedLine && (
            <div className="sm:col-span-2 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-700 font-bold">
              {du("m9cfe24500caf")}{" "}{formatMoney((Number(selectedLine.totalTTC || 0) / Number(selectedLine.quantite || 1)) * Number(form.quantite || 0), selectedSale?.devise)}
            </div>
          )}

          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">{du("mc89ac8f0d41a")}{" "}<span className="text-rose-500">*</span></span>
            <textarea
              value={form.motif}
              onChange={(event) => setForm((current) => ({ ...current, motif: event.target.value }))}
              className={`${fieldClass} h-24 py-3 resize-none`}
              placeholder={du("m03784fe06b19")}
              required
            />
          </label>
        </form>
      </CashModal>

      <CashModal
        open={Boolean(selectedReturn)}
        title={du("m6226f0c80734")}
        subtitle={selectedReturn?.reference || ""}
        onClose={() => setSelectedReturn(null)}
        footer={<button onClick={() => setSelectedReturn(null)} className={secondaryButton}>{du("m711e5f2e198d")}</button>}
      >
        {selectedReturn && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">{du("mee19f8d8fffd")}</span><strong>{selectedReturn.venteReference}</strong></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">{du("m7ba96f08a0bf")}</span><strong>{selectedReturn.factureReference}</strong></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">{du("m0c77fe09ab33")}</span><strong>{selectedReturn.clientNom}</strong></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">{du("m947cc07e2b3e")}</span><strong>{formatMoney(selectedReturn.montantTotalTTC, selectedReturn.deviseReference || selectedReturn.devise || returnCurrency)}</strong></div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block mb-2">{du("m62232ba19bf5")}</span>
              {selectedReturn.lignes.map((line) => (
                <div key={line.produitId} className="flex justify-between gap-3 py-1">
                  <strong>{line.nomProduit}</strong>
                  <span>{du("m3849f9d2a8fa")}{" "}{line.quantite}</span>
                </div>
              ))}
            </div>
            <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">{du("mc89ac8f0d41a")}</span><strong>{selectedReturn.motif}</strong></div>
          </div>
        )}
      </CashModal>
      <CashModal open={metricOpen} title={du("m6d83e3bc7ed4")} subtitle={du("m07caeb90e3d1")} onClose={() => setMetricOpen(false)} footer={<button onClick={() => setMetricOpen(false)} className={secondaryButton}>{du("m711e5f2e198d")}</button>}><div className="p-4 rounded-xl bg-slate-50 border border-slate-100"><p className="text-[10px] uppercase font-bold text-slate-400">{du("m6d83e3bc7ed4")}</p><p className="text-2xl font-black text-slate-900 mt-2">{formatMoney(totalReturned, returnCurrency)}</p><p className="text-xs text-slate-500 mt-2">{validReturns.length} {du("m9ce74faf30b1")}</p></div></CashModal>
    </div>
  );
}


