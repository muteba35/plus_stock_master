"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, Filter, Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { CashPagination, secondaryButton } from "../../caisse/components/cashier-ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const PAGE_SIZE = 15;

type AuditLog = {
  _id: string;
  userName: string;
  userEmail: string;
  action: string;
  module: string;
  method: string;
  path: string;
  statusCode: number;
  ipAddress: string;
  browser: string;
  target: string;
  description: string;
  severity: "info" | "warning" | "danger" | "success";
  createdAt: string;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return { Authorization: token ? "Bearer " + token : "" };
};

const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const severityClass = (severity: string) => {
  if (severity === "danger") return "bg-rose-50 text-rose-700";
  if (severity === "warning") return "bg-amber-50 text-amber-700";
  if (severity === "success") return "bg-emerald-50 text-emerald-700";
  return "bg-indigo-50 text-indigo-700";
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search.trim()) params.set("search", search.trim());
      if (moduleFilter !== "all") params.set("module", moduleFilter);
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (methodFilter !== "all") params.set("method", methodFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const response = await fetch(API_URL + "/audit?" + params.toString(), { headers: getAuthHeaders() });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Impossible de charger le journal.");
      setLogs(result.logs || []);
      setTotal(result.pagination?.total || 0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }, [endDate, methodFilter, moduleFilter, page, search, severityFilter, startDate]);

  useEffect(() => { void fetchLogs(); }, [fetchLogs]);

  const modules = useMemo(() => ["all", "AUTHENTIFICATION", "CAISSE", "INVENTAIRE", "EQUIPE", "PARAMETRES", "DASHBOARD", "SYSTEME"], []);

  const exportCsv = () => {
    const header = ["Date", "Utilisateur", "Email", "Module", "Action", "Methode", "Statut", "IP", "Navigateur", "Cible", "Chemin"];
    const rows = logs.map((log) => [
      formatDate(log.createdAt),
      log.userName,
      log.userEmail,
      log.module,
      log.action,
      log.method,
      String(log.statusCode),
      log.ipAddress,
      log.browser,
      log.target,
      log.path,
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => '"' + String(cell || "").replaceAll('"', '""') + '"').join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "journal-audit-stockmaster.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen text-slate-800">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider mb-3">
            <ShieldCheck size={14} /> Tracabilite
          </div>
          <h1 className="text-xl font-bold text-slate-900">Journal d'audit global</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">Qui a fait quoi, quand, depuis quelle IP et avec quel navigateur.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} className={secondaryButton}><Download size={14} /> Export Excel</button>
          <button onClick={exportPdf} className={secondaryButton}><FileText size={14} /> Export PDF</button>
          <button onClick={() => void fetchLogs()} className={secondaryButton}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden print:shadow-none print:border-slate-300">
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 grid grid-cols-1 lg:grid-cols-6 gap-3 print:hidden">
          <div className="relative lg:col-span-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Utilisateur, IP, action, navigateur..." className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-indigo-500" />
          </div>
          <FilterSelect value={moduleFilter} onChange={(value) => { setModuleFilter(value); setPage(1); }} options={modules} />
          <FilterSelect value={severityFilter} onChange={(value) => { setSeverityFilter(value); setPage(1); }} options={["all", "success", "warning", "danger", "info"]} />
          <FilterSelect value={methodFilter} onChange={(value) => { setMethodFilter(value); setPage(1); }} options={["all", "POST", "PUT", "PATCH", "DELETE"]} />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold outline-none focus:border-indigo-500" />
            <input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold outline-none focus:border-indigo-500" />
          </div>
        </div>

        {error && <div className="m-4 p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 text-xs font-bold">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1100px]">
            <thead className="bg-slate-950 text-white uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Navigateur</th>
                <th className="px-4 py-3">Chemin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={8} className="px-4 py-16 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-2 text-indigo-500" />Chargement...</td></tr>}
              {!loading && logs.length === 0 && <tr><td colSpan={8} className="px-4 py-16 text-center text-slate-400 font-semibold">Aucune action trouvee.</td></tr>}
              {!loading && logs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-500">{formatDate(log.createdAt)}</td>
                  <td className="px-4 py-3"><p className="font-black text-slate-900">{log.userName}</p><p className="text-[10px] text-slate-400">{log.userEmail || "Non renseigne"}</p></td>
                  <td className="px-4 py-3 font-black text-indigo-600">{log.module}</td>
                  <td className="px-4 py-3"><p className="font-black text-slate-800">{log.action}</p><p className="text-[10px] text-slate-400">{log.target || log.description}</p></td>
                  <td className="px-4 py-3"><span className={"px-2 py-1 rounded-lg text-[10px] font-black " + severityClass(log.severity)}>{log.statusCode} · {log.method}</span></td>
                  <td className="px-4 py-3 font-semibold text-slate-600">{log.ipAddress || "-"}</td>
                  <td className="px-4 py-3 font-semibold text-slate-600">{log.browser || "-"}</td>
                  <td className="px-4 py-3 text-[10px] text-slate-400 max-w-xs truncate">{log.path}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="print:hidden"><CashPagination page={page} pageSize={PAGE_SIZE} totalItems={total} onPageChange={setPage} /></div>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-black outline-none focus:border-indigo-500 bg-white">
      {options.map((option) => <option key={option} value={option}>{option === "all" ? "Tous" : option}</option>)}
    </select>
  );
}
