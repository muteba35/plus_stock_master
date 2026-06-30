"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, Loader2, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
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
  changedFields?: string[];
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return { Authorization: token ? "Bearer " + token : "" };
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const readable = (value = "") =>
  value
    .replaceAll("_", " ")
    .replaceAll(".", " / ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

const actionSentence = (log: AuditLog) => {
  const user = log.userName || log.userEmail || "Utilisateur inconnu";
  const target = log.target ? " sur " + log.target : "";
  return user + " a effectué l'action " + readable(log.action) + target + ".";
};

const severityClass = (severity: string) => {
  if (severity === "danger") return "bg-rose-50 text-rose-700 border-rose-100";
  if (severity === "warning") return "bg-amber-50 text-amber-700 border-amber-100";
  if (severity === "success") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  return "bg-indigo-50 text-indigo-700 border-indigo-100";
};

const severityLabel = (severity: string) => {
  if (severity === "danger") return "Critique";
  if (severity === "warning") return "À vérifier";
  if (severity === "success") return "Réussie";
  return "Information";
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search.trim()) params.set("search", search.trim());
      if (moduleFilter !== "all") params.set("module", moduleFilter);
      if (severityFilter !== "all") params.set("severity", severityFilter);
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
  }, [endDate, moduleFilter, page, search, severityFilter, startDate]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const modules = useMemo(() => ["all", "AUTHENTIFICATION", "CAISSE", "INVENTAIRE", "EQUIPE", "PARAMETRES", "DASHBOARD", "SYSTEME"], []);

  const exportCsv = () => {
    const header = ["Date", "Utilisateur", "Email", "Module", "Action", "Cible", "IP", "Navigateur", "Résumé", "Champs concernés"];
    const rows = logs.map((log) => [
      formatDate(log.createdAt),
      log.userName,
      log.userEmail,
      readable(log.module),
      readable(log.action),
      log.target,
      log.ipAddress,
      log.browser,
      actionSentence(log),
      (log.changedFields || []).map(readable).join(" | "),
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => '"' + String(cell || "").replaceAll('"', '""') + '"').join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "journal-audit-boutiqo.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen text-slate-800">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider mb-3">
            <ShieldCheck size={14} /> Traçabilité
          </div>
          <h1 className="text-xl font-bold text-slate-900">Journal d'audit global</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">Toutes les actions API sont suivies : connexion, consultation, modification, suppression, caisse, inventaire et paramètres.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} className={secondaryButton}><Download size={14} /> Export Excel</button>
          <button onClick={() => window.print()} className={secondaryButton}><FileText size={14} /> Export PDF</button>
          <button onClick={() => void fetchLogs()} className={secondaryButton}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden print:shadow-none print:border-slate-300">
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 grid grid-cols-1 lg:grid-cols-5 gap-3 print:hidden">
          <div className="relative lg:col-span-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Utilisateur, IP, action, navigateur..." className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-indigo-500" />
          </div>
          <FilterSelect value={moduleFilter} onChange={(value) => { setModuleFilter(value); setPage(1); }} options={modules} />
          <FilterSelect value={severityFilter} onChange={(value) => { setSeverityFilter(value); setPage(1); }} options={["all", "success", "warning", "danger", "info"]} labels={{ all: "Tous les niveaux", success: "Actions réussies", warning: "À vérifier", danger: "Critiques", info: "Informations" }} />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold outline-none focus:border-indigo-500" />
            <input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold outline-none focus:border-indigo-500" />
          </div>
        </div>

        {error && <div className="m-4 p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 text-xs font-bold">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[980px]">
            <thead className="bg-slate-950 text-white uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Quand</th>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Action effectuée</th>
                <th className="px-4 py-3">Connexion</th>
                <th className="px-4 py-3">Résumé</th>
                <th className="px-4 py-3 text-right print:hidden">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-2 text-indigo-500" />Chargement...</td></tr>}
              {!loading && logs.length === 0 && <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-400 font-semibold">Aucune action trouvée.</td></tr>}
              {!loading && logs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-500">{formatDate(log.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-900">{log.userName || "Utilisateur inconnu"}</p>
                    <p className="text-[10px] text-slate-400">{log.userEmail || "Email non renseigné"}</p>
                  </td>
                  <td className="px-4 py-3 font-black text-indigo-600">{readable(log.module)}</td>
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-800">{readable(log.action)}</p>
                    <p className="text-[10px] text-slate-400">{log.target || "Cible non renseignée"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-700">{log.ipAddress || "IP non renseignée"}</p>
                    <p className="text-[10px] text-slate-400">{log.browser || "Navigateur non renseigné"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={"inline-flex mb-1 px-2 py-1 rounded-lg border text-[10px] font-black " + severityClass(log.severity)}>{severityLabel(log.severity)}</span>
                    <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">{actionSentence(log)}</p>
                  </td>
                  <td className="px-4 py-3 text-right print:hidden">
                    <button type="button" onClick={() => setSelectedLog(log)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-black text-slate-600 hover:text-indigo-600 hover:border-indigo-200">
                      <Eye size={13} /> Voir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="print:hidden"><CashPagination page={page} pageSize={PAGE_SIZE} totalItems={total} onPageChange={setPage} /></div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 print:hidden">
          <button type="button" aria-label="Fermer" onClick={() => setSelectedLog(null)} className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-3xl max-h-[88vh] overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/80">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Détails de l'audit</p>
                <h2 className="text-lg font-black text-slate-950 mt-1">{readable(selectedLog.action)}</h2>
                <p className="text-xs text-slate-500 mt-1">{actionSentence(selectedLog)}</p>
              </div>
              <button type="button" onClick={() => setSelectedLog(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white"><X size={18} /></button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(88vh-92px)] space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InfoBox label="Utilisateur" value={selectedLog.userName || "Utilisateur inconnu"} hint={selectedLog.userEmail || "Email non renseigné"} />
                <InfoBox label="Date et heure" value={formatDate(selectedLog.createdAt)} />
                <InfoBox label="Adresse IP" value={selectedLog.ipAddress || "IP non renseignée"} />
                <InfoBox label="Navigateur" value={selectedLog.browser || "Navigateur non renseigné"} />
                <InfoBox label="Module" value={readable(selectedLog.module)} />
                <InfoBox label="Élément concerné" value={selectedLog.target || "Non renseigné"} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs font-black text-slate-900">Résumé lisible</p>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm font-bold text-slate-700 leading-relaxed">{actionSentence(selectedLog)}</p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedLog.changedFields || []).length > 0 ? selectedLog.changedFields?.map((field) => (
                      <span key={field} className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black">{readable(field)}</span>
                    )) : <p className="text-xs text-slate-400 font-semibold">Aucun champ précis à afficher pour cette action.</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBox({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm font-black text-slate-900 mt-1 break-all">{value}</p>
      {hint && <p className="text-[10px] font-semibold text-slate-400 mt-1 break-all">{hint}</p>}
    </div>
  );
}

function FilterSelect({ value, onChange, options, labels = {} }: { value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-black outline-none focus:border-indigo-500 bg-white">
      {options.map((option) => <option key={option} value={option}>{labels[option] || (option === "all" ? "Tous" : readable(option))}</option>)}
    </select>
  );
}
