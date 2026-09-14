"use client";
import { dashboardUi as du, dashboardLocale } from "../../../../src/i18n/catalog";
import { useLanguage as useDashboardLanguage } from "../../../../src/components/LanguageRuntime";


import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ImagePlus, Palette, RotateCcw, Save, ShieldAlert, Trash2 } from "lucide-react";
import { useLanguage } from "../../../../src/components/LanguageRuntime";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const FONTS = ["Inter", "Roboto", "Poppins", "Montserrat", "Open Sans"];
const DEFAULTS = { fontFamily: "Inter", textSize: "normal", theme: "system", primaryColor: "#4F46E5", secondaryColor: "#0F172A", accentColor: "#10B981", logo: "" };
type Appearance = typeof DEFAULTS;
type Store = { id: string; isActive?: boolean; appearance?: Partial<Appearance> };

export default function AppearancePage() {
  const { ui: du } = useDashboardLanguage();
  const { translate } = useLanguage();
  const [store, setStore] = useState<Store | null>(null);
  const [form, setForm] = useState<Appearance>(DEFAULTS);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const canEdit = useMemo(() => permissions.includes("MODIFIER_PERSONNALISATION") || permissions.includes("MODIFIER_BOUTIQUE"), [permissions]);

  useEffect(() => {
    setPermissions(JSON.parse(localStorage.getItem("user_permissions") || "[]"));
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/boutiques`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Chargement impossible.");
        const active = (data.boutiques || []).find((item: Store) => item.isActive) || data.boutiques?.[0];
        setStore(active || null);
        setForm({ ...DEFAULTS, ...(active?.appearance || {}) });
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, []);

  const preview = (next: Appearance) => {
    setForm(next);
    window.dispatchEvent(new CustomEvent("movooraAppearancePreview", { detail: next }));
  };

  const chooseLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (![/^image\/png$/, /^image\/jpeg$/, /^image\/webp$/].some((pattern) => pattern.test(file.type)) || file.size > 500 * 1024) {
      setMessage(translate("Utilisez une image PNG, JPEG ou WebP de 500 Ko maximum."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => preview({ ...form, logo: String(reader.result || "") });
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!store || !canEdit) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`${API_URL}/boutiques/${store.id}/appearance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Enregistrement impossible.");
      localStorage.setItem(`movoora_appearance_${store.id}`, JSON.stringify(form));
      window.dispatchEvent(new CustomEvent("movooraAppearanceSaved", { detail: form }));
      setMessage(translate("Modifications enregistrées"));
    } catch (error) { setMessage(error instanceof Error ? translate(error.message) : translate("Une erreur est survenue.")); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-sm font-semibold text-slate-500">{translate("Chargement...")}</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-black text-slate-950 dark:text-white">{translate("Apparence et personnalisation")}</h1><p className="mt-1 text-sm text-slate-500">{translate("Personnalisez l'apparence de la boutique active.")}</p></div>
      {!canEdit && <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800"><ShieldAlert size={20}/>{translate("Vous n'avez pas la permission de modifier la personnalisation.")}</div>}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 font-black"><Palette size={19}/>{translate("Style de l'interface")}</h2>
          <label className="block text-sm font-bold">{translate("Police")}<select disabled={!canEdit} value={form.fontFamily} onChange={(e) => preview({ ...form, fontFamily: e.target.value })} className="mt-2 w-full rounded-xl border p-3 dark:bg-slate-800">{FONTS.map((font) => <option key={font}>{font}</option>)}</select></label>
          <label className="block text-sm font-bold">{translate("Taille du texte")}<select disabled={!canEdit} value={form.textSize} onChange={(e) => preview({ ...form, textSize: e.target.value })} className="mt-2 w-full rounded-xl border p-3 dark:bg-slate-800"><option value="small">{translate("Petite")}</option><option value="normal">{translate("Normale")}</option><option value="large">{translate("Grande")}</option><option value="xlarge">{translate("Très grande")}</option></select></label>
          <label className="block text-sm font-bold">{translate("Thème")}<select disabled={!canEdit} value={form.theme} onChange={(e) => preview({ ...form, theme: e.target.value })} className="mt-2 w-full rounded-xl border p-3 dark:bg-slate-800"><option value="light">{translate("Clair")}</option><option value="dark">{translate("Sombre")}</option><option value="system">{translate("Système")}</option></select></label>
          <div className="grid grid-cols-3 gap-3">{(["primaryColor", "secondaryColor", "accentColor"] as const).map((key) => <label key={key} className="text-xs font-bold">{translate(key === "primaryColor" ? "Principale" : key === "secondaryColor" ? "Secondaire" : "Accent")}<input disabled={!canEdit} type="color" value={form[key]} onChange={(e) => preview({ ...form, [key]: e.target.value })} className="mt-2 h-11 w-full rounded-lg"/></label>)}</div>
        </section>
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 font-black"><ImagePlus size={19}/>{translate("Logo de la boutique")}</h2>
          <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed bg-slate-50 p-6 dark:bg-slate-800"><img src={form.logo || "/movoora-logo.svg?v=2"} alt={translate("Aperçu du logo")} className="max-h-full max-w-full object-contain"/></div>
          <p className="text-xs text-slate-500">{translate("PNG, JPEG ou WebP, 500 Ko maximum.")}</p>
          <div className="flex flex-wrap gap-2"><label className={`rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white ${!canEdit ? "pointer-events-none opacity-50" : "cursor-pointer"}`}><input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={chooseLogo}/>{translate("Choisir une image")}</label><button disabled={!canEdit || !form.logo} onClick={() => preview({ ...form, logo: "" })} className="flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-black disabled:opacity-40"><Trash2 size={14}/>{translate("Supprimer le logo")}</button></div>
        </section>
      </div>
      {message && <p className="text-sm font-bold text-indigo-600">{du(message)}</p>}
      <div className="flex flex-wrap justify-end gap-3"><button disabled={!canEdit} onClick={() => preview(DEFAULTS)} className="flex items-center gap-2 rounded-xl border px-5 py-3 text-xs font-black disabled:opacity-40"><RotateCcw size={15}/>{translate("Réinitialiser")}</button><button disabled={!canEdit || saving} onClick={save} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black text-white disabled:opacity-40"><Save size={15}/>{saving ? translate("Enregistrement...") : translate("Enregistrer les modifications")}</button></div>
    </div>
  );
}
