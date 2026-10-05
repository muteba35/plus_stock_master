"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Play, X, MonitorPlay } from "lucide-react";
import { useLanguage } from "./LanguageRuntime";

export default function DemoScreen({ children }: { children: ReactNode }) {
  const { language } = useLanguage(); const en = language === "en";
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const source = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL;
  const validSource = source && (/^https:\/\//.test(source) || /^\/(?!\/)/.test(source)) ? source : null;
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("movoora:demo", show);
    return () => window.removeEventListener("movoora:demo", show);
  }, []);
  useEffect(() => {
    if (!open) return;
    const el = dialog.current; const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    el?.showModal(); document.body.style.overflow = "hidden";
    return () => { el?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [open]);
  const close = () => { video.current?.pause(); setOpen(false); };
  return <><section id="demo" data-no-translate className="scroll-mt-24 bg-white px-6 py-16 text-slate-900"><div className="mx-auto max-w-6xl"><div className="mb-6 flex items-center gap-3 text-blue-700"><MonitorPlay size={24}/><h2 className="text-2xl font-bold text-slate-950">{en ? "Discover Movoora" : "Découvrez Movoora"}</h2></div><button onClick={() => setOpen(true)} className="group flex min-h-56 w-full flex-col items-center justify-center gap-5 rounded-lg border border-slate-200 bg-slate-950 px-6 py-12 text-white sm:min-h-72"><img src="/movoora-mark.png" alt="" className="h-12 w-12 rounded-lg bg-white p-1"/><span className="grid h-14 w-14 place-items-center rounded-full bg-blue-600 transition-colors group-hover:bg-blue-500"><Play size={24}/></span><span className="text-lg font-semibold">{validSource ? (en ? "Watch the demo" : "Voir la démonstration") : (en ? "Open the interactive demo" : "Ouvrir la démo interactive")}</span></button></div></section>
    <dialog ref={dialog} aria-labelledby="demo-title" onCancel={close} onClose={close} onClick={e => { if (e.target === e.currentTarget) close(); }} className="m-auto max-h-[92dvh] w-[calc(100%-24px)] max-w-5xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-black/70" data-no-translate>
      {open && <><header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4"><div><h2 id="demo-title" className="font-bold">{en ? "Movoora demo" : "Démonstration Movoora"}</h2><p className="mt-1 text-xs text-slate-500">{en ? "Discover the checkout workflow" : "Découvrez le parcours d'une vente"}</p></div><button autoFocus onClick={close} title={en ? "Close" : "Fermer"} aria-label={en ? "Close" : "Fermer"} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border hover:bg-slate-100"><X size={20}/></button></header>{validSource && !failed ? <video ref={video} src={validSource} controls playsInline preload="metadata" onError={() => setFailed(true)} className="aspect-video w-full bg-black" aria-label={en ? "Product demonstration video" : "Vidéo de démonstration du produit"}/> : <>{failed && <p role="alert" className="px-6 pt-4 text-sm text-rose-700">{en ? "Video unavailable. Try the interactive demo below." : "Vidéo indisponible. Essayez la démo interactive ci-dessous."}</p>}{children}</>}</>}
    </dialog></>;
}
