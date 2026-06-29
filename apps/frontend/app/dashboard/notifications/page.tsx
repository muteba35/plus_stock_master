"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BellRing, CheckCircle2, Loader2, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { CashHeader, CashPagination, CashSearch, secondaryButton } from "../caisse/components/cashier-ui";
import { FinanceShell } from "../finances/finance-shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const PAGE_SIZE = 10;

type NotificationItem = { id: string; title: string; message: string; type: "info" | "warning" | "danger" | "success"; category: string; href: string; createdAt: string };

const typeStyle = (type: string) => type === "danger" ? "bg-rose-50 text-rose-700 border-rose-100" : type === "warning" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-indigo-50 text-indigo-700 border-indigo-100";
const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const response = await fetch(API_URL + "/notifications", { headers: { Authorization: token ? "Bearer " + token : "" } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Impossible de charger les notifications.");
      setItems(result.notifications || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchNotifications(); }, [fetchNotifications]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => !query || [item.title, item.message, item.category, item.type].join(" ").toLowerCase().includes(query));
  }, [items, search]);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return <FinanceShell>
    <CashHeader title="Notifications" subtitle="Alertes opérationnelles de stock, caisse, expiration et finance." action={<button onClick={() => void fetchNotifications()} disabled={loading} className={secondaryButton}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser</button>} />

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Metric label="Total" value={items.length} icon={BellRing} tone="indigo" />
      <Metric label="Critiques" value={items.filter((item) => item.type === "danger").length} icon={ShieldAlert} tone="rose" />
      <Metric label="À surveiller" value={items.filter((item) => item.type === "warning").length} icon={AlertTriangle} tone="amber" />
    </div>

    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center">
        <CashSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Rechercher une notification..." />
      </div>
      {loading ? <div className="py-16 flex flex-col items-center gap-3 text-slate-400"><Loader2 size={24} className="animate-spin text-indigo-500" /><p className="text-xs">Chargement des notifications...</p></div> : error ? <div className="p-4 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 m-4 rounded-xl">{error}</div> : <div className="divide-y divide-slate-100">
        {pageItems.length === 0 && <div className="py-16 text-center text-slate-400"><CheckCircle2 className="mx-auto text-emerald-500" size={26} /><p className="text-xs font-semibold mt-3">Aucune notification à afficher.</p></div>}
        {pageItems.map((item) => <Link key={item.id} href={item.href} className="block p-5 hover:bg-slate-50 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className={"mt-0.5 inline-flex px-2 py-1 rounded-lg border text-[10px] font-black uppercase " + typeStyle(item.type)}>{item.category}</span>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.message}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{formatDate(item.createdAt)}</p>
          </div>
        </Link>)}
      </div>}
      <CashPagination page={page} pageSize={PAGE_SIZE} totalItems={filtered.length} onPageChange={setPage} />
    </div>
  </FinanceShell>;
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Search; tone: "indigo" | "rose" | "amber" }) {
  const styles = tone === "rose" ? "bg-rose-50 text-rose-600 border-rose-100" : tone === "amber" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-indigo-50 text-indigo-600 border-indigo-100";
  return <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-slate-900">{value}</p></div><div className={"w-10 h-10 rounded-xl border flex items-center justify-center " + styles}><Icon size={18} /></div></div>;
}
