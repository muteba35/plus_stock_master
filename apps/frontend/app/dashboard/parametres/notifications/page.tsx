"use client";
import { dashboardUi as du, dashboardLocale } from "../../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../../src/components/LanguageRuntime";


import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCircle2, Loader2, Save, ShieldCheck, SlidersHorizontal, ToggleLeft, ToggleRight } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";

type Preferences = {
  stockThresholdGlobal: number;
  expirationWarningDays: number;
  receiveCashAlerts: boolean;
  showEmployeeAlerts: boolean;
  onlyOwnerSensitiveAlerts: boolean;
};

const DEFAULT_PREFS: Preferences = {
  stockThresholdGlobal: 5,
  expirationWarningDays: 7,
  receiveCashAlerts: true,
  showEmployeeAlerts: true,
  onlyOwnerSensitiveAlerts: true,
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? "Bearer " + token : "",
  };
};

export default function NotificationSettingsPage() {
  const { ui: du } = useDashboardLanguage();
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(API_URL + "/notifications/preferences", { headers: getAuthHeaders() });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Impossible de charger les preferences.");
      setPreferences({ ...DEFAULT_PREFS, ...(result.preferences || {}) });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchPreferences(); }, [fetchPreferences]);

  const savePreferences = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const response = await fetch(API_URL + "/notifications/preferences", {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(preferences),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Impossible d'enregistrer.");
      setPreferences({ ...DEFAULT_PREFS, ...(result.preferences || {}) });
      setMessage(result.message || "Preferences enregistrees.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur de connexion.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof Preferences) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="space-y-6 bg-[#f9fafd] p-6 rounded-3xl min-h-screen text-slate-800">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider mb-3">
            <Bell size={14} /> {du("mff92419ef550")}{" "}</div>
          <h1 className="text-xl font-bold text-slate-900">{du("m54e8b54afab3")}</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">{du("m4934dfd3cd80")}</p>
        </div>
        <button onClick={savePreferences} disabled={saving || loading} className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-3 rounded-xl transition-colors disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {du("m71dc74873e23")}{" "}</button>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold">{du(error)}</div>}
      {message && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold flex items-center gap-2"><CheckCircle2 size={14} />{du(message)}</div>}

      {loading ? (
        <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
          <p className="text-xs font-semibold">{du("m85f5e8231310")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <section className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
              <SlidersHorizontal size={19} />
            </div>
            <h2 className="mt-4 text-sm font-black text-slate-900">{du("m52c48b94c666")}</h2>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">{du("mddd411c1127b")}</p>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">{du("md761fb38ea68")}</span>
                <input type="number" min={0} value={preferences.stockThresholdGlobal} onChange={(event) => setPreferences((current) => ({ ...current, stockThresholdGlobal: Number(event.target.value) }))} className="mt-2 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-500" />
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">{du("m4c42acf9e944")}</span>
                <input type="number" min={1} max={365} value={preferences.expirationWarningDays} onChange={(event) => setPreferences((current) => ({ ...current, expirationWarningDays: Number(event.target.value) }))} className="mt-2 w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-indigo-500" />
                <p className="mt-1 text-[11px] text-slate-400 font-semibold">{du("m6ad07448bcbd")}</p>
              </label>
            </div>
          </section>

          <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-900">{du("m13b69ea3787a")}</h2>
              <p className="mt-1 text-xs text-slate-400 font-medium">{du("mab18f35ca9f9")}</p>
            </div>
            <div className="divide-y divide-slate-100">
              <PreferenceToggle title={du("m6e0c205ca3d1")} text="Ventes, retours clients et incidents operationnels de caisse." value={preferences.receiveCashAlerts} onToggle={() => toggle("receiveCashAlerts")} />
              <PreferenceToggle title={du("mea34f85b28c5")} text="Permet aux caissiers et gestionnaires de voir les alertes liees a leur role." value={preferences.showEmployeeAlerts} onToggle={() => toggle("showEmployeeAlerts")} />
              <PreferenceToggle title={du("me27a64c6ab81")} text="Securite, suppression, modification sensible et finance critique restent visibles au proprietaire." value={preferences.onlyOwnerSensitiveAlerts} onToggle={() => toggle("onlyOwnerSensitiveAlerts")} />
            </div>
          </section>

          <section className="lg:col-span-3 bg-slate-950 rounded-2xl p-5 text-white">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider">{du("mbc2cbfe4c64f")}</h2>
                <p className="mt-2 text-xs text-white/65 leading-relaxed">
                  {du("m7ad75bdf9859")}{" "}</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function PreferenceToggle({ title, text, value, onToggle }: { title: string; text: string; value: boolean; onToggle: () => void }) {
  const { ui: du } = useDashboardLanguage();
  return (
    <button type="button" onClick={onToggle} className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-50 transition-colors">
      <div>
        <p className="text-sm font-black text-slate-900">{du(title)}</p>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">{du(text)}</p>
      </div>
      <div className={value ? "text-indigo-600" : "text-slate-300"}>
        {value ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
      </div>
    </button>
  );
}
