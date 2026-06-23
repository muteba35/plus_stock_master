"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Eye, Filter, ReceiptText, Search, TrendingUp, WalletCards, XCircle } from "lucide-react";
import { formatMoney } from "../../inventaire/components/currency";
import { CashBadge, CashHeader, CashMetric, CashModal, CashPagination, CashSearch, fieldClass, secondaryButton } from "../components/cashier-ui";

type Sale = {
  id: string;
  reference: string;
  client: string;
  amount: number;
  currency: string;
  payment: string;
  cashier: string;
  date: string;
  status: string;
  items: string[];
};

const sales: Sale[] = [
  { id: "1", reference: "VTE-2026-001", client: "Client comptoir", amount: 128.5, currency: "USD ($)", payment: "Espèces", cashier: "Paul Balenda", date: "2026-06-22", status: "Payée", items: ["Clavier mécanique", "Souris optique"] },
  { id: "2", reference: "VTE-2026-002", client: "Kabeya Junior", amount: 73.2, currency: "USD ($)", payment: "Mobile", cashier: "Paul Balenda", date: "2026-06-22", status: "Payée", items: ["Casque audio"] },
  { id: "3", reference: "VTE-2026-003", client: "Client comptoir", amount: 29.99, currency: "USD ($)", payment: "Carte", cashier: "Sandra", date: "2026-06-21", status: "Annulée", items: ["Chargeur USB-C"] },
];

export default function SalesHistoryPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Tous");
  const [payment, setPayment] = useState("Tous");
  const [date, setDate] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(() => {
    return sales.filter((sale) => {
      const matchSearch = `${sale.reference} ${sale.client} ${sale.cashier}`.toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === "Tous" || sale.status === status;
      const matchPayment = payment === "Tous" || sale.payment === payment;
      const matchDate = !date || sale.date === date;
      return matchSearch && matchStatus && matchPayment && matchDate;
    });
  }, [search, status, payment, date]);

  const visibleSales = filtered.slice((page - 1) * pageSize, page * pageSize);
  const paidSales = filtered.filter((sale) => sale.status === "Payée");
  const totalPaid = paidSales.reduce((sum, sale) => sum + sale.amount, 0);

  return (
    <div className="space-y-5 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800">
      <CashHeader title="Historique Ventes" subtitle="Consultez les ventes encaissées, annulées ou filtrées par période." />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CashMetric label="Ventes affichées" value={`${filtered.length}`} detail="Selon les filtres actifs" icon={ReceiptText} />
        <CashMetric label="Total encaissé" value={formatMoney(totalPaid, "USD ($)")} detail="Ventes payées uniquement" icon={WalletCards} tone="emerald" />
        <CashMetric label="Panier moyen" value={formatMoney(paidSales.length ? totalPaid / paidSales.length : 0, "USD ($)")} detail="Moyenne sur les ventes payées" icon={TrendingUp} tone="amber" />
        <CashMetric label="Ventes annulées" value={`${filtered.filter((sale) => sale.status === "Annulée").length}`} detail="Opérations non retenues" icon={XCircle} tone="rose" />
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3">
          <CashSearch value={search} onChange={setSearch} placeholder="Rechercher une vente, un client ou un caissier..." />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:w-[520px]">
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={fieldClass}>
              <option>Tous</option>
              <option>Payée</option>
              <option>Annulée</option>
            </select>
            <select value={payment} onChange={(event) => setPayment(event.target.value)} className={fieldClass}>
              <option>Tous</option>
              <option>Espèces</option>
              <option>Carte</option>
              <option>Mobile</option>
            </select>
            <div className="relative">
              <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`${fieldClass} pl-9`} />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Référence</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Montant</th>
                <th className="px-6 py-4">Paiement</th>
                <th className="px-6 py-4">Caissier</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4 font-bold text-slate-900">{sale.reference}</td>
                  <td className="px-6 py-4 text-slate-600">{sale.client}</td>
                  <td className="px-6 py-4 font-black text-slate-900">{formatMoney(sale.amount, sale.currency)}</td>
                  <td className="px-6 py-4">{sale.payment}</td>
                  <td className="px-6 py-4">{sale.cashier}</td>
                  <td className="px-6 py-4">{sale.date}</td>
                  <td className="px-6 py-4"><CashBadge status={sale.status} /></td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setSelectedSale(sale)} className="p-1.5 text-slate-400 hover:text-indigo-600" title="Consulter">
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
        open={Boolean(selectedSale)}
        title="Détail de la vente"
        subtitle={selectedSale?.reference || ""}
        onClose={() => setSelectedSale(null)}
        footer={<button onClick={() => setSelectedSale(null)} className={secondaryButton}>Fermer</button>}
      >
        {selectedSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">Client</span><strong>{selectedSale.client}</strong></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">Montant</span><strong>{formatMoney(selectedSale.amount, selectedSale.currency)}</strong></div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Articles</p>
              <div className="space-y-2">{selectedSale.items.map((item) => <div key={item} className="p-3 rounded-xl border border-slate-100 text-xs font-semibold">{item}</div>)}</div>
            </div>
          </div>
        )}
      </CashModal>
    </div>
  );
}
