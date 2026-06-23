"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Eye, Loader2, ReceiptText, TrendingUp, WalletCards, XCircle } from "lucide-react";
import { formatMoney, getActiveBoutiqueCurrency } from "../../inventaire/components/currency";
import { CashBadge, CashHeader, CashMetric, CashModal, CashPagination, CashSearch, fieldClass, secondaryButton } from "../components/cashier-ui";

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
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
};

const formatDateInput = (value: string) => value ? new Date(value).toISOString().slice(0, 10) : "";

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<ApiSale[]>([]);
  const [scope, setScope] = useState<"all" | "own">("own");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Tous");
  const [payment, setPayment] = useState("Tous");
  const [date, setDate] = useState("");
  const [selectedSale, setSelectedSale] = useState<ApiSale | null>(null);
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

  const visibleSales = filtered.slice((page - 1) * pageSize, page * pageSize);
  const paidSales = filtered.filter((sale) => sale.statut === "PAYEE");
  const reportCurrency = paidSales[0]?.deviseReference || paidSales[0]?.devise || getActiveBoutiqueCurrency();
  const totalPaid = paidSales.reduce((sum, sale) => sum + Number(sale.totalTTC || 0), 0);
  const averageSale = paidSales.length ? totalPaid / paidSales.length : 0;

  return (
    <div className="space-y-5 bg-[#f9fafd] p-3 sm:p-6 rounded-2xl sm:rounded-3xl min-h-screen text-slate-800">
      <CashHeader
        title="Historique Ventes"
        subtitle={scope === "all" ? "Vue globale des ventes de tous les caissiers." : "Vue limitée à vos propres ventes."}
      />

      {error && <div className="p-3 rounded-xl border border-rose-100 bg-rose-50 text-xs font-semibold text-rose-700">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CashMetric label="Ventes affichées" value={`${filtered.length}`} detail={scope === "all" ? "Toutes opérations" : "Mes opérations"} icon={ReceiptText} />
        <CashMetric label="Total encaissé" value={formatMoney(totalPaid, reportCurrency)} detail={`Ventes payées en ${reportCurrency}`} icon={WalletCards} tone="emerald" />
        <CashMetric label="Panier moyen" value={formatMoney(averageSale, reportCurrency)} detail="Moyenne sur les ventes payées" icon={TrendingUp} tone="amber" />
        <CashMetric label="Ventes annulées" value={`${filtered.filter((sale) => sale.statut === "ANNULEE").length}`} detail="Opérations non retenues" icon={XCircle} tone="rose" />
      </div>

      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3">
          <CashSearch value={search} onChange={setSearch} placeholder="Rechercher une vente, une facture, un client ou un caissier..." />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:w-[520px]">
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={fieldClass}>
              <option>Tous</option>
              <option>Payée</option>
              <option>Annulée</option>
              <option>Remboursée</option>
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
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
              <span className="text-xs font-medium">Chargement des ventes...</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[980px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Référence</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Total TTC</th>
                  <th className="px-6 py-4">TVA</th>
                  <th className="px-6 py-4">Paiement</th>
                  <th className="px-6 py-4">Caissier</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleSales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-bold text-slate-900">{sale.reference}</td>
                    <td className="px-6 py-4 text-slate-600">{sale.clientNom}</td>
                    <td className="px-6 py-4 font-black text-slate-900">{formatMoney(sale.totalTTC, sale.devise)}</td>
                    <td className="px-6 py-4 text-slate-500">{formatMoney(sale.tvaMontant, sale.devise)}</td>
                    <td className="px-6 py-4">{sale.paiement}</td>
                    <td className="px-6 py-4">{getCashierName(sale)}</td>
                    <td className="px-6 py-4">{formatDate(sale.createdAt)}</td>
                    <td className="px-6 py-4"><CashBadge status={getStatusLabel(sale.statut)} /></td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setSelectedSale(sale)} className="p-1.5 text-slate-400 hover:text-indigo-600" title="Consulter">
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {visibleSales.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-14 text-center text-slate-400 font-medium">Aucune vente trouvée.</td>
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
        title="Détail de la vente"
        subtitle={selectedSale?.reference || ""}
        onClose={() => setSelectedSale(null)}
        footer={<button onClick={() => setSelectedSale(null)} className={secondaryButton}>Fermer</button>}
      >
        {selectedSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">Client</span><strong>{selectedSale.clientNom}</strong></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">Facture</span><strong>{selectedSale.factureReference || "-"}</strong></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">Total TTC</span><strong>{formatMoney(selectedSale.totalTTC, selectedSale.devise)}</strong></div>
              <div className="p-3 bg-slate-50 rounded-xl"><span className="text-slate-400 block">TVA 16%</span><strong>{formatMoney(selectedSale.tvaMontant, selectedSale.devise)}</strong></div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Articles vendus</p>
              <div className="space-y-2">
                {selectedSale.lignes.map((line) => (
                  <div key={`${line.produitId}-${line.sku}`} className="p-3 rounded-xl border border-slate-100 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="font-bold text-slate-800">{line.nomProduit} × {line.quantite}</span>
                      <strong>{formatMoney(line.totalTTC, selectedSale.devise)}</strong>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">SKU : {line.sku || "-"} · PU TTC : {formatMoney(line.prixUnitaireTTC, selectedSale.devise)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CashModal>
    </div>
  );
}
