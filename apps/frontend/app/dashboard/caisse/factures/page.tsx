"use client";

import { useMemo, useState } from "react";
import { Download, Eye, FileText, Printer, ReceiptText, Search, Send, WalletCards } from "lucide-react";
import { formatMoney } from "../../inventaire/components/currency";
import { CashBadge, CashHeader, CashMetric, CashModal, CashPagination, CashSearch, secondaryButton } from "../components/cashier-ui";

type Invoice = {
  id: string;
  number: string;
  saleRef: string;
  client: string;
  total: number;
  currency: string;
  date: string;
  status: string;
  lines: { name: string; qty: number; price: number }[];
};

const invoices: Invoice[] = [
  { id: "1", number: "FAC-2026-001", saleRef: "VTE-2026-001", client: "Client comptoir", total: 128.5, currency: "USD ($)", date: "2026-06-22", status: "Imprimée", lines: [{ name: "Clavier mécanique", qty: 1, price: 89 }, { name: "Souris optique", qty: 1, price: 39.5 }] },
  { id: "2", number: "FAC-2026-002", saleRef: "VTE-2026-002", client: "Kabeya Junior", total: 73.2, currency: "USD ($)", date: "2026-06-22", status: "Envoyée", lines: [{ name: "Casque audio", qty: 1, price: 73.2 }] },
  { id: "3", number: "FAC-2026-003", saleRef: "VTE-2026-004", client: "Entreprise Mboka", total: 410, currency: "USD ($)", date: "2026-06-20", status: "En attente", lines: [{ name: "Onduleur", qty: 2, price: 205 }] },
];

export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(() => {
    return invoices.filter((invoice) =>
      `${invoice.number} ${invoice.saleRef} ${invoice.client} ${invoice.status}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const visibleInvoices = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalAmount = filtered.reduce((sum, invoice) => sum + invoice.total, 0);

  return (
    <div className="space-y-5 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800">
      <CashHeader title="Factures" subtitle="Prévisualisez, imprimez et suivez les justificatifs de vente." />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CashMetric label="Factures" value={`${filtered.length}`} detail="Documents affichés" icon={FileText} />
        <CashMetric label="Total facturé" value={formatMoney(totalAmount, "USD ($)")} detail="Selon la recherche" icon={WalletCards} tone="emerald" />
        <CashMetric label="Imprimées" value={`${filtered.filter((item) => item.status === "Imprimée").length}`} detail="Factures sorties" icon={Printer} tone="amber" />
        <CashMetric label="Envoyées" value={`${filtered.filter((item) => item.status === "Envoyée").length}`} detail="Partagées au client" icon={Send} tone="indigo" />
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <CashSearch value={search} onChange={setSearch} placeholder="Rechercher une facture, une vente, un client..." />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Facture</th>
                <th className="px-6 py-4">Vente liée</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4 font-bold text-slate-900">{invoice.number}</td>
                  <td className="px-6 py-4 text-slate-500">{invoice.saleRef}</td>
                  <td className="px-6 py-4">{invoice.client}</td>
                  <td className="px-6 py-4 font-black">{formatMoney(invoice.total, invoice.currency)}</td>
                  <td className="px-6 py-4">{invoice.date}</td>
                  <td className="px-6 py-4"><CashBadge status={invoice.status} /></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setSelectedInvoice(invoice)} className="p-1.5 text-slate-400 hover:text-indigo-600" title="Prévisualiser"><Eye size={15} /></button>
                      <button className="p-1.5 text-slate-400 hover:text-slate-700" title="Imprimer"><Printer size={15} /></button>
                      <button className="p-1.5 text-slate-400 hover:text-emerald-600" title="Télécharger"><Download size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CashPagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} />
      </section>

      <CashModal
        open={Boolean(selectedInvoice)}
        title="Aperçu facture"
        subtitle={selectedInvoice?.number || ""}
        onClose={() => setSelectedInvoice(null)}
        footer={<button onClick={() => setSelectedInvoice(null)} className={secondaryButton}>Fermer</button>}
      >
        {selectedInvoice && (
          <div className="border border-slate-200 rounded-2xl p-5 bg-white">
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-sm font-black text-slate-900">StockMaster</p>
                <p className="text-[11px] text-slate-400 mt-1">Document de vente</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold">{selectedInvoice.number}</p>
                <p className="text-[11px] text-slate-400">{selectedInvoice.date}</p>
              </div>
            </div>
            <div className="py-4 text-xs">
              <p className="text-slate-400">Client</p>
              <p className="font-bold text-slate-900">{selectedInvoice.client}</p>
            </div>
            <div className="space-y-2">
              {selectedInvoice.lines.map((line) => (
                <div key={line.name} className="flex justify-between text-xs border-b border-slate-50 pb-2">
                  <span>{line.name} × {line.qty}</span>
                  <strong>{formatMoney(line.qty * line.price, selectedInvoice.currency)}</strong>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-base font-black pt-4">
              <span>Total</span>
              <span>{formatMoney(selectedInvoice.total, selectedInvoice.currency)}</span>
            </div>
          </div>
        )}
      </CashModal>
    </div>
  );
}
