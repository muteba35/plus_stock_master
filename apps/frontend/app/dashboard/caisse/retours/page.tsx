"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, CheckCircle2, Eye, Plus, RotateCcw, WalletCards, XCircle } from "lucide-react";
import { formatMoney } from "../../inventaire/components/currency";
import { CashBadge, CashHeader, CashMetric, CashModal, CashPagination, CashSearch, fieldClass, primaryButton, secondaryButton } from "../components/cashier-ui";

type ReturnItem = {
  id: string;
  reference: string;
  saleRef: string;
  client: string;
  product: string;
  amount: number;
  currency: string;
  reason: string;
  date: string;
  status: string;
};

const returnsData: ReturnItem[] = [
  { id: "1", reference: "RET-2026-001", saleRef: "VTE-2026-001", client: "Client comptoir", product: "Souris optique", amount: 39.5, currency: "USD ($)", reason: "Produit défectueux", date: "2026-06-22", status: "Remboursé" },
  { id: "2", reference: "RET-2026-002", saleRef: "VTE-2026-002", client: "Kabeya Junior", product: "Casque audio", amount: 73.2, currency: "USD ($)", reason: "Échange demandé", date: "2026-06-22", status: "En validation" },
  { id: "3", reference: "RET-2026-003", saleRef: "VTE-2026-004", client: "Entreprise Mboka", product: "Onduleur", amount: 205, currency: "USD ($)", reason: "Erreur de référence", date: "2026-06-21", status: "Refusé" },
];

export default function CustomerReturnsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Tous");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnItem | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(() => {
    return returnsData.filter((item) => {
      const matchSearch = `${item.reference} ${item.saleRef} ${item.client} ${item.product}`.toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === "Tous" || item.status === status;
      return matchSearch && matchStatus;
    });
  }, [search, status]);

  const visibleReturns = filtered.slice((page - 1) * pageSize, page * pageSize);
  const refunded = filtered.filter((item) => item.status === "Remboursé").reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-5 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800">
      <CashHeader
        title="Retours clients"
        subtitle="Suivez les remboursements, échanges et retours après vente."
        action={
          <button onClick={() => setModalOpen(true)} className={primaryButton}>
            <Plus size={15} />
            Nouveau retour
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CashMetric label="Retours affichés" value={`${filtered.length}`} detail="Selon les filtres" icon={RotateCcw} />
        <CashMetric label="Montant remboursé" value={formatMoney(refunded, "USD ($)")} detail="Retours validés" icon={WalletCards} tone="emerald" />
        <CashMetric label="En validation" value={`${filtered.filter((item) => item.status === "En validation").length}`} detail="À traiter" icon={ArrowDownLeft} tone="amber" />
        <CashMetric label="Refusés" value={`${filtered.filter((item) => item.status === "Refusé").length}`} detail="Demandes rejetées" icon={XCircle} tone="rose" />
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <CashSearch value={search} onChange={setSearch} placeholder="Rechercher un retour, une vente, un client..." />
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={`${fieldClass} sm:w-48`}>
            <option>Tous</option>
            <option>Remboursé</option>
            <option>En validation</option>
            <option>Refusé</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Retour</th>
                <th className="px-6 py-4">Vente</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Produit</th>
                <th className="px-6 py-4">Montant</th>
                <th className="px-6 py-4">Motif</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleReturns.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4 font-bold text-slate-900">{item.reference}</td>
                  <td className="px-6 py-4 text-slate-500">{item.saleRef}</td>
                  <td className="px-6 py-4">{item.client}</td>
                  <td className="px-6 py-4">{item.product}</td>
                  <td className="px-6 py-4 font-black">{formatMoney(item.amount, item.currency)}</td>
                  <td className="px-6 py-4 max-w-[180px] truncate">{item.reason}</td>
                  <td className="px-6 py-4"><CashBadge status={item.status} /></td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setSelectedReturn(item)} className="p-1.5 text-slate-400 hover:text-indigo-600" title="Consulter">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CashPagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
      </section>

      <CashModal
        open={modalOpen}
        title="Nouveau retour"
        subtitle="Préparez une demande de retour client."
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className={secondaryButton}>Annuler</button>
            <button onClick={() => setModalOpen(false)} className={primaryButton}><CheckCircle2 size={14} /> Enregistrer</button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Référence vente</span>
            <input className={fieldClass} placeholder="VTE-2026-001" />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Produit</span>
            <input className={fieldClass} placeholder="Nom du produit" />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Quantité</span>
            <input type="number" min="1" className={fieldClass} defaultValue={1} />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Mode de compensation</span>
            <select className={fieldClass}>
              <option>Remboursement</option>
              <option>Échange</option>
              <option>Avoir client</option>
            </select>
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Motif</span>
            <textarea className={`${fieldClass} h-24 py-3 resize-none`} placeholder="Décrivez la raison du retour..." />
          </label>
        </div>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">Vente</span><strong>{selectedReturn.saleRef}</strong></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">Montant</span><strong>{formatMoney(selectedReturn.amount, selectedReturn.currency)}</strong></div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">Motif</span><strong>{selectedReturn.reason}</strong></div>
          </div>
        )}
      </CashModal>
    </div>
  );
}
