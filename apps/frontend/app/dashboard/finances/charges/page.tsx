"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Edit2, Loader2, Plus, RefreshCw, Search, Trash2, WalletCards } from "lucide-react";
import { CashHeader, CashMetric, CashModal, CashPagination, CashSearch, primaryButton, secondaryButton } from "../../caisse/components/cashier-ui";
import { formatMoney } from "../../inventaire/components/currency";
import { FinanceDateFilters, FinanceShell, StateBlock, compactMoney, useFinanceData, type DateFilterValue } from "../finance-shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const PAGE_SIZE = 8;

const TYPE_OPTIONS = [
  { value: "TRANSPORT", label: "Transport" },
  { value: "ELECTRICITE", label: "Electricite" },
  { value: "LOYER", label: "Loyer" },
  { value: "SALAIRE", label: "Salaire" },
  { value: "FOURNITURE", label: "Fourniture" },
  { value: "TAXE", label: "Taxe" },
  { value: "AUTRE", label: "Autre" },
];

const DEVISES = ["USD ($)", "CDF (FC)", "EUR (€)"];

type Charge = {
  id: string;
  libelle: string;
  type: string;
  montant: number;
  devise: string;
  statut: "PAYEE" | "PREVUE";
  recurrence: "PONCTUELLE" | "MENSUELLE" | "HEBDOMADAIRE" | "ANNUELLE";
  dateCharge: string;
  note?: string;
};

type ChargeForm = {
  libelle: string;
  type: string;
  montant: string;
  devise: string;
  statut: "PAYEE" | "PREVUE";
  recurrence: "PONCTUELLE" | "MENSUELLE" | "HEBDOMADAIRE" | "ANNUELLE";
  dateCharge: string;
  note: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (devise = "USD ($)"): ChargeForm => ({
  libelle: "",
  type: "TRANSPORT",
  montant: "",
  devise,
  statut: "PAYEE",
  recurrence: "PONCTUELLE",
  dateCharge: today(),
  note: "",
});

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value)) : "-";

export default function FinanceChargesPage() {
  const finance = useFinanceData();
  const [charges, setCharges] = useState<Charge[]>([]);
  const [chargesLoading, setChargesLoading] = useState(true);
  const [chargesError, setChargesError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null);
  const [form, setForm] = useState<ChargeForm>(emptyForm());
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("period", finance.dateFilter);
    if (finance.dateFilter === "custom") {
      if (finance.customStart) params.set("startDate", finance.customStart);
      if (finance.customEnd) params.set("endDate", finance.customEnd);
    }
    return params.toString();
  }, [finance.customEnd, finance.customStart, finance.dateFilter]);

  const fetchCharges = useCallback(async () => {
    try {
      setChargesLoading(true);
      setChargesError("");
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/finances/charges?${queryString}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Impossible de charger les charges.");
      setCharges(result.charges || []);
    } catch (error) {
      setChargesError(error instanceof Error ? error.message : "Erreur de connexion.");
    } finally {
      setChargesLoading(false);
    }
  }, [queryString]);

  useEffect(() => { void fetchCharges(); }, [fetchCharges]);

  const refreshAll = () => {
    void finance.fetchData();
    void fetchCharges();
  };

  const openCreate = () => {
    setEditingCharge(null);
    setForm(emptyForm(finance.data.devise));
    setModalError("");
    setModalOpen(true);
  };

  const openEdit = (charge: Charge) => {
    setEditingCharge(charge);
    setForm({
      libelle: charge.libelle,
      type: charge.type,
      montant: String(charge.montant),
      devise: charge.devise || finance.data.devise,
      statut: charge.statut,
      recurrence: charge.recurrence,
      dateCharge: charge.dateCharge ? new Date(charge.dateCharge).toISOString().slice(0, 10) : today(),
      note: charge.note || "",
    });
    setModalError("");
    setModalOpen(true);
  };

  const totalChargesPayees = useMemo(() => charges.filter((charge) => charge.statut === "PAYEE").reduce((sum, charge) => sum + Number(charge.montant || 0), 0), [charges]);
  const totalChargesPrevues = useMemo(() => charges.filter((charge) => charge.statut === "PREVUE").reduce((sum, charge) => sum + Number(charge.montant || 0), 0), [charges]);
  const beneficeBrutApresRetour = finance.data.metrics.netApresRetours - finance.data.metrics.tva - finance.data.metrics.cout;
  const beneficeNet = beneficeBrutApresRetour - totalChargesPayees;

  const filteredCharges = useMemo(() => {
    const query = search.trim().toLowerCase();
    return charges.filter((charge) => {
      const haystack = [charge.libelle, charge.type, charge.statut, charge.recurrence, charge.note].join(" ").toLowerCase();
      return !query || haystack.includes(query);
    });
  }, [charges, search]);

  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredCharges.length / PAGE_SIZE)));
  const visibleCharges = filteredCharges.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const saveCharge = async () => {
    try {
      setSaving(true);
      setModalError("");
      const montant = Number(form.montant);
      if (!form.libelle.trim()) throw new Error("Le libelle est obligatoire.");
      if (!Number.isFinite(montant) || montant <= 0) throw new Error("Le montant doit etre superieur a zero.");

      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/finances/charges${editingCharge ? `/${editingCharge.id}` : ""}`, {
        method: editingCharge ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ ...form, montant }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Impossible d'enregistrer la charge.");
      setModalOpen(false);
      await fetchCharges();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCharge = async (charge: Charge) => {
    if (!confirm(`Supprimer la charge "${charge.libelle}" ?`)) return;
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_URL}/finances/charges/${charge.id}`, {
      method: "DELETE",
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      alert(result.message || "Suppression impossible.");
      return;
    }
    await fetchCharges();
  };

  const isLoading = finance.loading || chargesLoading;
  const error = finance.error || chargesError;

  return (
    <FinanceShell>
      <CashHeader
        title="Depenses & Charges"
        subtitle="Enregistrez les frais reels pour calculer le benefice net apres charges."
        action={<div className="flex flex-wrap gap-2"><button onClick={refreshAll} disabled={isLoading} className={secondaryButton}><RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Actualiser</button><button onClick={openCreate} className={primaryButton}><Plus size={14} /> Nouvelle charge</button></div>}
      />

      <FinanceDateFilters dateFilter={finance.dateFilter as DateFilterValue} onDateFilterChange={finance.setDateFilter} customStart={finance.customStart} customEnd={finance.customEnd} onCustomStartChange={finance.setCustomStart} onCustomEndChange={finance.setCustomEnd} />
      <StateBlock loading={isLoading} error={error} />

      {!isLoading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <CashMetric label="Benefice brut apres retours" value={compactMoney(beneficeBrutApresRetour, finance.data.devise)} detail="Net apres retours - TVA - cout sorti" icon={WalletCards} tone={beneficeBrutApresRetour >= 0 ? "emerald" : "rose"} />
            <CashMetric label="Charges payees" value={compactMoney(totalChargesPayees, finance.data.devise)} detail={`${charges.filter((item) => item.statut === "PAYEE").length} charge(s) payee(s)`} icon={WalletCards} tone="amber" />
            <CashMetric label="Charges prevues" value={compactMoney(totalChargesPrevues, finance.data.devise)} detail="A surveiller pour la tresorerie" icon={WalletCards} tone="indigo" />
            <CashMetric label={beneficeNet >= 0 ? "Benefice net estime" : "Perte nette estimee"} value={formatMoney(beneficeNet, finance.data.devise)} detail="Benefice brut - charges payees" icon={WalletCards} tone={beneficeNet >= 0 ? "emerald" : "rose"} />
          </div>

          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Journal des charges</h2>
                <p className="text-[11px] text-slate-400 mt-1">Transport, loyer, electricite, salaires et autres frais.</p>
              </div>
              <div className="w-full lg:w-[360px]">
                <CashSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Rechercher une charge..." />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr><th className="px-5 py-4">Charge</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Montant</th><th className="px-5 py-4">Statut</th><th className="px-5 py-4">Recurrence</th><th className="px-5 py-4 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleCharges.map((charge) => (
                    <tr key={charge.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-4"><p className="font-black text-slate-900">{charge.libelle}</p><p className="text-[10px] text-slate-400">{charge.note || "Aucune note"}</p></td>
                      <td className="px-5 py-4 font-bold text-slate-600">{TYPE_OPTIONS.find((item) => item.value === charge.type)?.label || charge.type}</td>
                      <td className="px-5 py-4 text-slate-500">{formatDate(charge.dateCharge)}</td>
                      <td className="px-5 py-4 font-black">{formatMoney(charge.montant, charge.devise || finance.data.devise)}</td>
                      <td className="px-5 py-4"><span className={`px-2 py-1 rounded-md text-[10px] font-black ${charge.statut === "PAYEE" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{charge.statut === "PAYEE" ? "Payee" : "Prevue"}</span></td>
                      <td className="px-5 py-4 text-slate-500">{charge.recurrence}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(charge)} className="p-2 text-slate-400 hover:text-amber-600" title="Modifier"><Edit2 size={15} /></button>
                          <button onClick={() => void deleteCharge(charge)} className="p-2 text-slate-400 hover:text-rose-600" title="Supprimer"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleCharges.length === 0 && <tr><td colSpan={7} className="px-5 py-14 text-center text-slate-400">Aucune charge trouvee.</td></tr>}
                </tbody>
              </table>
            </div>
            <CashPagination page={safePage} pageSize={PAGE_SIZE} totalItems={filteredCharges.length} onPageChange={setPage} />
          </section>
        </>
      )}

      <CashModal open={modalOpen} title={editingCharge ? "Modifier la charge" : "Nouvelle charge"} subtitle="Ajoutez une depense pour calculer le benefice net." onClose={() => setModalOpen(false)} footer={<div className="flex justify-end gap-2"><button onClick={() => setModalOpen(false)} className={secondaryButton}>Annuler</button><button onClick={() => void saveCharge()} disabled={saving} className={primaryButton}>{saving ? <Loader2 size={14} className="animate-spin" /> : null} Enregistrer</button></div>}>
        <div className="space-y-4">
          {modalError && <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-bold text-rose-600 flex items-center gap-2"><AlertCircle size={14} />{modalError}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Libelle *"><input value={form.libelle} onChange={(event) => setForm((prev) => ({ ...prev, libelle: event.target.value }))} className={inputClass} placeholder="Ex: Transport livraison" /></Field>
            <Field label="Type *"><select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))} className={inputClass}>{TYPE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
            <Field label="Montant *"><input type="number" min="0" value={form.montant} onChange={(event) => setForm((prev) => ({ ...prev, montant: event.target.value }))} className={inputClass} placeholder="0" /></Field>
            <Field label="Devise"><select value={form.devise} onChange={(event) => setForm((prev) => ({ ...prev, devise: event.target.value }))} className={inputClass}>{DEVISES.map((devise) => <option key={devise} value={devise}>{devise}</option>)}</select></Field>
            <Field label="Date *"><input type="date" value={form.dateCharge} onChange={(event) => setForm((prev) => ({ ...prev, dateCharge: event.target.value }))} className={inputClass} /></Field>
            <Field label="Statut"><select value={form.statut} onChange={(event) => setForm((prev) => ({ ...prev, statut: event.target.value as ChargeForm["statut"] }))} className={inputClass}><option value="PAYEE">Payee</option><option value="PREVUE">Prevue</option></select></Field>
            <Field label="Recurrence"><select value={form.recurrence} onChange={(event) => setForm((prev) => ({ ...prev, recurrence: event.target.value as ChargeForm["recurrence"] }))} className={inputClass}><option value="PONCTUELLE">Ponctuelle</option><option value="HEBDOMADAIRE">Hebdomadaire</option><option value="MENSUELLE">Mensuelle</option><option value="ANNUELLE">Annuelle</option></select></Field>
            <Field label="Note"><input value={form.note} onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} className={inputClass} placeholder="Detail facultatif" /></Field>
          </div>
        </div>
      </CashModal>
    </FinanceShell>
  );
}

const inputClass = "w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:border-indigo-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span><div className="mt-2">{children}</div></label>;
}
