"use client";
import { dashboardUi as du, dashboardLocale } from "../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../src/components/LanguageRuntime";


import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Table2,
  type LucideIcon,
} from "lucide-react";
import { CashHeader, CashPagination, CashSearch, secondaryButton } from "../caisse/components/cashier-ui";
import { FinanceShell } from "../finances/finance-shared";
import { exportXlsxWorkbook } from "../components/export-xlsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const PAGE_SIZE = 9;

type NotificationType = "info" | "warning" | "danger" | "success";
type DateFilter = "all" | "today" | "month";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: string;
  href: string;
  actionLabel?: string;
  actionHref?: string;
  priority: "critique" | "important" | "information";
  read: boolean;
  createdAt: string;
};

const typeStyle = (type: NotificationType) =>
  type === "danger"
    ? "bg-rose-50 text-rose-700 border-rose-100"
    : type === "warning"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : type === "success"
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : "bg-indigo-50 text-indigo-700 border-indigo-100";

const typeDot = (type: NotificationType) =>
  type === "danger" ? "bg-rose-500" : type === "warning" ? "bg-amber-500" : type === "success" ? "bg-emerald-500" : "bg-indigo-500";

const formatDate = (value: string) => new Intl.DateTimeFormat(dashboardLocale(), { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const isSameDay = (value: string) => {
  const target = new Date(value);
  const today = new Date();
  return target.getFullYear() === today.getFullYear() && target.getMonth() === today.getMonth() && target.getDate() === today.getDate();
};

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char] || char));

const printNotifications = (rows: Array<Array<string | number | boolean | null | undefined>>) => {
  const title = "Notifications";
  const columns = ["Titre", "Message", "Categorie", "Niveau", "Priorite", "Statut", "Date"];
  const popup = window.open("", "_blank", "width=1200,height=800");
  if (!popup) return;
  const header = columns.map((column) => "<th>" + escapeHtml(column) + "</th>").join("");
  const body = rows.map((row) => "<tr>" + row.map((cell) => "<td>" + escapeHtml(cell) + "</td>").join("") + "</tr>").join("");
  popup.document.write("<!doctype html><html lang='fr'><head><meta charset='utf-8'><title>" + escapeHtml(title) + "</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#172033;margin:0}h1{font-size:20px;margin:0 0 4px}p{font-size:11px;color:#64748b;margin:0 0 18px}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#f1f5f9;text-align:left;text-transform:uppercase;color:#64748b}th,td{padding:7px;border:1px solid #e2e8f0;vertical-align:top}.footer{margin-top:12px;font-size:9px;color:#94a3b8}</style></head><body><h1>" + escapeHtml(title) + "</h1><p>" + du("m7289d99c0cec") + " " + escapeHtml(new Date().toLocaleString(dashboardLocale())) + "</p><table><thead><tr>" + header + "</tr></thead><tbody>" + body + "</tbody></table><div class='footer'>" + du("m37009f25b2eb") + "</div><script>window.onload=()=>window.print();</script></body></html>");
  popup.document.close();
};

const isSameMonth = (value: string) => {
  const target = new Date(value);
  const today = new Date();
  return target.getFullYear() === today.getFullYear() && target.getMonth() === today.getMonth();
};

export default function NotificationsPage() {
  const { ui: du } = useDashboardLanguage();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | NotificationType>("all");
  const [page, setPage] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const response = await fetch(API_URL + "/notifications", { headers: { Authorization: token ? "Bearer " + token : "" } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Impossible de charger les notifications.");
      setItems(result.notifications || []);
      setUnreadCount(Number(result.unreadCount || 0));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchNotifications(); }, [fetchNotifications]);

  const categories = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = !query || [item.title, item.message, item.category, item.type].map((value) => du(value)).join(" ").toLowerCase().includes(query);
      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "today" && isSameDay(item.createdAt)) ||
        (dateFilter === "month" && isSameMonth(item.createdAt));
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      return matchesSearch && matchesDate && matchesCategory && matchesType;
    });
  }, [categoryFilter, dateFilter, items, search, typeFilter, du]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const exportRows = filtered.map((item) => [du(item.title), du(item.message), du(item.category), item.type, du(item.priority), du(item.read ? "Lu" : "Non lu"), formatDate(item.createdAt)]);
  const exportXlsx = () => exportXlsxWorkbook("notifications.xlsx", [{ name: "Notifications", columns: ["Titre", "Message", "Categorie", "Niveau", "Priorite", "Statut", "Date"], rows: exportRows }]);
  const exportPdf = () => printNotifications(exportRows);

  const markRead = async (id: string, read: boolean) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/notifications/${id}/${read ? "unread" : "read"}`, {
        method: "PATCH",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Action impossible.");
      setItems((current) => current.map((item) => item.id === id ? { ...item, read: !read } : item));
      setUnreadCount((value) => Math.max(0, value + (read ? 1 : -1)));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Action impossible.");
    }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_URL + "/notifications/read-all", {
        method: "PATCH",
        headers: { Authorization: token ? "Bearer " + token : "" },
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Action impossible.");
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Action impossible.");
    }
  };

  const setFilterAndReset = (callback: () => void) => {
    callback();
    setPage(1);
  };

  return (
    <FinanceShell>
      <CashHeader
        title={du("m788011833a5a")}
        subtitle={du("m7ad4466447fc")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportPdf} disabled={loading} className={secondaryButton}><FileText size={14} /> {du("m1d393b0081b6")}</button>
            <button onClick={exportXlsx} disabled={loading} className={secondaryButton}><Download size={14} /> {du("m48d53635551c")}</button>
            <button onClick={() => void markAllRead()} disabled={loading || unreadCount === 0} className={secondaryButton}>{du("m8ed33b378dfd")}</button>
            <button onClick={() => void fetchNotifications()} disabled={loading} className={secondaryButton}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> {du("md7d646faaecb")}{" "}</button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Metric label={du("m755cc5281b14")} value={unreadCount} icon={BellRing} tone="indigo" />
        <Metric label={du("mbab048c401af")} value={items.filter((item) => item.type === "danger").length} icon={ShieldAlert} tone="rose" />
        <Metric label={du("m823478057d31")} value={items.filter((item) => item.type === "warning").length} icon={AlertTriangle} tone="amber" />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <CashSearch
              value={search}
              onChange={(value) => setFilterAndReset(() => setSearch(value))}
              placeholder={du("m0548733116c9")}
            />

            <div className="flex flex-wrap items-center gap-2">
              {[
                { value: "all", label: "Tout" },
                { value: "today", label: "Aujourd'hui" },
                { value: "month", label: "Ce mois" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilterAndReset(() => setDateFilter(item.value as DateFilter))}
                  className={`h-10 px-3 rounded-xl border text-[11px] font-black transition-colors ${
                    dateFilter === item.value ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:border-indigo-200"
                  }`}
                >
                  {du(item.label)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="relative">
              <Table2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(event) => setFilterAndReset(() => setCategoryFilter(event.target.value))}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="all">{du("mdf9fdc525d81")}</option>
                {categories.map((category) => <option key={category} value={category}>{du(category)}</option>)}
              </select>
            </label>

            <label className="relative">
              <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(event) => setFilterAndReset(() => setTypeFilter(event.target.value as "all" | NotificationType))}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="all">{du("m6aac98d660bc")}</option>
                <option value="danger">{du("m0197946cc322")}</option>
                <option value="warning">{du("m823478057d31")}</option>
                <option value="info">{du("m1cb0ba125f84")}</option>
                <option value="success">{du("mfc43ebef8e2a")}</option>
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
            <p className="text-xs">{du("m33317d288d7c")}</p>
          </div>
        ) : error ? (
          <div className="p-4 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 m-4 rounded-xl">{du(error)}</div>
        ) : (
          <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-3">
            {pageItems.length === 0 && (
              <div className="xl:col-span-2 py-16 text-center text-slate-400">
                <CheckCircle2 className="mx-auto text-emerald-500" size={26} />
                <p className="text-xs font-semibold mt-3">{du("mb0be993e329a")}</p>
              </div>
            )}
            {pageItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm ${typeStyle(item.type)} ${item.read ? "opacity-70" : "ring-2 ring-white"}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${typeDot(item.type)}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!item.read && <span className="px-2 py-0.5 rounded-lg bg-slate-950 text-white text-[9px] font-black uppercase tracking-wide">{du("m98ab209e4fc3")}</span>}
                      <span className="px-2 py-0.5 rounded-lg bg-white/70 border border-white text-[10px] font-black uppercase tracking-wide">{du(item.priority)}</span>
                      <span className="px-2 py-0.5 rounded-lg bg-white/70 border border-white text-[10px] font-black uppercase tracking-wide">{du(item.category)}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold opacity-70">
                        <Clock3 size={12} />
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm font-black mt-3">{du(item.title)}</p>
                    <p className="text-xs mt-1.5 leading-relaxed opacity-80">{du(item.message)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={item.actionHref || item.href} className="px-3 py-1.5 rounded-xl bg-white/80 border border-white text-[10px] font-black uppercase tracking-wide hover:bg-white">
                        {item.actionLabel || du("m4a1e847ec470")}
                      </Link>
                      <button type="button" onClick={() => void markRead(item.id, item.read)} className="px-3 py-1.5 rounded-xl bg-white/60 border border-white text-[10px] font-black uppercase tracking-wide hover:bg-white">
                        {item.read ? du("m053518c315a1") : du("m349aaf6ed2ca")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <CashPagination page={page} pageSize={PAGE_SIZE} totalItems={filtered.length} onPageChange={setPage} />
      </div>
    </FinanceShell>
  );
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: "indigo" | "rose" | "amber" }) {
  const { ui: du } = useDashboardLanguage();
  const styles = tone === "rose" ? "bg-rose-50 text-rose-600 border-rose-100" : tone === "amber" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-indigo-50 text-indigo-600 border-indigo-100";
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{du(label)}</p>
        <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      </div>
      <div className={"w-10 h-10 rounded-xl border flex items-center justify-center " + styles}><Icon size={18} /></div>
    </div>
  );
}

