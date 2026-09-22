"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Loader2, Monitor, Moon, RotateCcw, Save, Sun, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage as useDashboardLanguage } from "../../../../src/components/LanguageRuntime";
import { useDashboardAccess } from "../../components/DashboardAccess";
import ShopLogo from "../../components/ShopLogo";
import { APPEARANCE_DEFAULTS as DEFAULTS, publishAppearance, type Appearance } from "../../components/appearance";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";
const FONTS = ["Inter", "Roboto", "Poppins", "Montserrat", "Open Sans"];
const inputClass = "mt-2 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-40";

export default function AppearancePage() {
  const { ui: du } = useDashboardLanguage();
  const { boutiqueId, permissions, isOwner } = useDashboardAccess();
  const canEdit = isOwner || permissions.includes("MODIFIER_PERSONNALISATION");
  const [form, setForm] = useState<Appearance>(DEFAULTS);
  const [saved, setSaved] = useState<Appearance>(DEFAULTS);
  const [name, setName] = useState("");
  const [loadedId, setLoadedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const snapshot = useRef({ id: "", value: DEFAULTS });
  const imageInput = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  useEffect(() => {
    if (!boutiqueId) return;
    const controller = new AbortController();
    fetch(`${API_URL}/boutiques/settings/appearance`, { signal: controller.signal, headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || data.boutique?.id !== boutiqueId) throw new Error(data.message || "Chargement impossible.");
        if (controller.signal.aborted) return;
        const value = { ...DEFAULTS, ...data.boutique.appearance };
        snapshot.current = { id: boutiqueId, value };
        setSaved(value); setForm(value); setName(data.boutique.nom); setLoadedId(boutiqueId); setError("");
      })
      .catch((err) => { if (!controller.signal.aborted) { setError(err.message); } });
    return () => {
      controller.abort();
      if (snapshot.current.id === boutiqueId) publishAppearance(boutiqueId, snapshot.current.value);
    };
  }, [boutiqueId]);

  const preview = (value: Appearance) => {
    if (!canEdit || saving) return;
    setForm(value); setError(""); publishAppearance(boutiqueId, value);
  };
  const chooseLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 500 * 1024) throw new Error(du("p3.imageLimit"));
      const bitmap = await createImageBitmap(file);
      if (bitmap.width > 4096 || bitmap.height > 4096) { bitmap.close(); throw new Error(du("p3.imageLimit")); }
      bitmap.close();
      const logo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error(du("p3.imageError")));
        reader.readAsDataURL(file);
      });
      if (snapshot.current.id === boutiqueId) preview({ ...form, logo });
    } catch (err) { setError(err instanceof Error ? err.message : du("p3.imageError")); }
  };
  const save = async () => {
    if (!canEdit || saving || !dirty || snapshot.current.id !== boutiqueId) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`${API_URL}/boutiques/${boutiqueId}/appearance`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || du("p3.saveError"));
      const value = { ...DEFAULTS, ...data.boutique.appearance };
      if (snapshot.current.id !== boutiqueId) return;
      snapshot.current = { id: boutiqueId, value };
      setSaved(value); setForm(value); publishAppearance(boutiqueId, value, true);
      toast.success(du("p3.saved"));
    } catch (err) { setError(err instanceof Error ? err.message : du("p3.saveError")); }
    finally { setSaving(false); }
  };

  if (loadedId !== boutiqueId || !boutiqueId) return <div className="p-6">{error ? <p role="alert">{du(error)}</p> : <Loader2 className="animate-spin" aria-label={du("Chargement...")} />}</div>;
  return <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6 text-slate-900">
    <header><h1 className="text-xl font-bold">{du("p3.title")}</h1><p className="mt-1 text-sm text-slate-500">{name}</p></header>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">{du(error)}</p>}
    {!canEdit && <p className="text-sm text-slate-500">{du("p3.noPermission")}</p>}
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {canEdit && <fieldset disabled={saving} className="min-w-0 space-y-7 disabled:opacity-60">
        <section><h2 className="mb-3 text-sm font-bold">{du("p3.theme")}</h2>
          <div className="grid grid-cols-3 gap-2">{[{ value: "light", icon: Sun }, { value: "dark", icon: Moon }, { value: "system", icon: Monitor }].map(({ value, icon: Icon }) => <button key={value} type="button" aria-pressed={form.theme === value} onClick={() => preview({ ...form, theme: value })} className={`flex min-w-0 flex-col items-center gap-2 rounded-lg border p-3 text-xs font-semibold ${form.theme === value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white"}`}><Icon size={20} />{du(`p3.${value}`)}</button>)}</div>
        </section>
        <section className="grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
          <label className="min-w-0 text-sm font-semibold">{du("p3.font")}<select value={form.fontFamily} onChange={(e) => preview({ ...form, fontFamily: e.target.value })} className={inputClass}>{FONTS.map((font) => <option key={font}>{font}</option>)}</select></label>
          <label className="min-w-0 text-sm font-semibold">{du("p3.size")}<select value={form.textSize} onChange={(e) => preview({ ...form, textSize: e.target.value })} className={inputClass}>{["small", "normal", "large", "xlarge"].map((size) => <option value={size} key={size}>{du(`p3.${size}`)}</option>)}</select></label>
        </section>
        <section className="border-t border-slate-200 pt-5"><h2 className="mb-3 text-sm font-bold">{du("p3.colors")}</h2><div className="grid gap-3 sm:grid-cols-3">{(["primaryColor", "secondaryColor", "accentColor"] as const).map((key) => <label key={key} className="min-w-0 text-xs font-semibold">{du(`p3.${key}`)}<div className="mt-2 flex items-center gap-2"><input type="color" value={form[key]} onChange={(e) => preview({ ...form, [key]: e.target.value })} className="h-9 w-10 shrink-0 cursor-pointer rounded border border-slate-200"/><span className="text-xs text-slate-500">{form[key]}</span></div></label>)}</div></section>
        <section className="border-t border-slate-200 pt-5"><h2 className="mb-3 text-sm font-bold">{du("p3.logo")}</h2><div className="flex flex-wrap items-center gap-4"><div className="flex h-20 w-20 items-center justify-center rounded-lg border border-slate-200 bg-white p-2"><ShopLogo logo={form.logo} className="h-full w-full" name={name} /></div><div className="space-y-2"><div className="flex flex-wrap gap-2"><button type="button" className={buttonClass} onClick={() => imageInput.current?.click()}><ImagePlus size={16}/>{du("p3.chooseLogo")}</button><button type="button" className={buttonClass} disabled={!form.logo} onClick={() => preview({ ...form, logo: "" })} title={du("p3.defaultLogo")} aria-label={du("p3.defaultLogo")}><Trash2 size={16}/></button></div><p className="text-xs text-slate-500">{du("p3.imageLimit")}</p></div></div><input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseLogo} className="hidden" /></section>
      </fieldset>}
      <aside className="min-w-0"><h2 className="mb-3 text-sm font-bold">{du("p3.preview")}</h2><div className="overflow-hidden rounded-lg border border-slate-200 bg-white" style={{ fontFamily: `"${form.fontFamily}", sans-serif` }}><div className="flex min-w-0 items-center gap-3 p-4" style={{ backgroundColor: form.secondaryColor, color: "#fff" }}><ShopLogo logo={form.logo} className="h-9 w-9 rounded bg-white p-1" name={name}/><span className="min-w-0 break-words font-semibold">{name}</span></div><div className="space-y-4 p-5"><p className="font-semibold">{du("p3.previewTitle")}</p><div className="flex items-center justify-between border-b border-slate-200 pb-3 text-sm"><span>{du("p3.previewProduct")}</span><span style={{ color: form.accentColor }}>24</span></div><button type="button" className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: form.primaryColor }}>{du("p3.previewAction")}</button></div></div></aside>
    </div>
    {canEdit && <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5"><button type="button" onClick={() => preview(DEFAULTS)} disabled={saving} className={`${buttonClass} sm:mr-auto`}><RotateCcw size={16}/>{du("p3.reset")}</button><button type="button" onClick={() => preview(saved)} disabled={!dirty || saving} className={buttonClass}><X size={16}/>{du("p3.cancel")}</button><button type="button" onClick={save} disabled={!dirty || saving} className={`${buttonClass} bg-indigo-600 text-white`}>{saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} {du("p3.save")}</button></footer>}
  </div>;
}
