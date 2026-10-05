"use client";
import { useState, type FormEvent } from "react";
import { Send, Loader2, Mail, CheckCircle2, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "./LanguageRuntime";

export default function LandingContact() {
  const { language } = useLanguage(); const en = language === "en";
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "limited">("idle");
  const input = "mt-2 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (state === "sending") return;
    const form = event.currentTarget; const data = new FormData(form); setState("sending");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api"}/public/contact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), email: data.get("email"), subject: data.get("subject"), message: data.get("message"), website: data.get("website"), consent: data.get("consent") === "on" }), signal: AbortSignal.timeout(30000) });
      if (response.status === 429) { setState("limited"); return; }
      const result = await response.json(); if (!response.ok || !result.success) throw new Error();
      form.reset(); setState("sent");
    } catch { setState("error"); }
  }
  return <section id="contact" data-no-translate className="scroll-mt-24 border-t border-slate-200 bg-slate-50 px-6 py-16 sm:py-24"><div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.3fr]">
    <div><span className="text-xs font-semibold uppercase text-blue-700">Contact</span><h2 className="mt-3 text-3xl font-bold text-slate-950">{en ? "Let's talk about your shop." : "Parlons de votre boutique."}</h2><p className="mt-5 max-w-sm text-sm leading-7 text-slate-600">{en ? "A question, a suggestion or a need for assistance? Send us a message." : "Une question, une suggestion ou besoin d'accompagnement ? Envoyez-nous un message."}</p><a href="mailto:juniormuteba10@gmail.com" className="mt-8 flex items-center gap-3 break-all text-sm font-semibold text-blue-700"><Mail size={20} className="shrink-0"/>juniormuteba10@gmail.com<ArrowUpRight size={16} className="shrink-0"/></a><p className="mt-6 max-w-sm text-xs leading-6 text-slate-500">{en ? "Never send passwords, verification codes or payment details." : "Ne transmettez jamais de mot de passe, de code de vérification ou de données de paiement."}</p></div>
    <form onSubmit={submit} className="min-w-0 space-y-5">
      {state === "sent" && <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={20}/>{en ? "Your message has been sent. Thank you!" : "Votre message a bien été envoyé. Merci !"}</p>}
      {(state === "error" || state === "limited") && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{state === "limited" ? (en ? "Too many messages. Please try again in 15 minutes." : "Trop de messages. Réessayez dans 15 minutes.") : (en ? "Sending failed. Please try again or email us directly." : "L'envoi a échoué. Réessayez ou écrivez-nous directement par email.")}</p>}
      <fieldset disabled={state === "sending"} className="space-y-5 disabled:opacity-60"><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium text-slate-800">{en ? "Full name" : "Nom complet"} <span className="text-rose-600">*</span><input name="name" autoComplete="name" required minLength={2} maxLength={100} className={input}/></label><label className="text-sm font-medium text-slate-800">Email <span className="text-rose-600">*</span><input name="email" type="email" autoComplete="email" required maxLength={254} className={input}/></label></div><label className="block text-sm font-medium text-slate-800">{en ? "Subject" : "Objet"} <span className="text-rose-600">*</span><input name="subject" required minLength={3} maxLength={120} className={input}/></label><label className="block text-sm font-medium text-slate-800">Message <span className="text-rose-600">*</span><textarea name="message" required minLength={10} maxLength={4000} rows={5} className={`${input} resize-y`}/></label><input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden"/><label className="flex items-start gap-3 text-xs leading-6 text-slate-600"><input type="checkbox" name="consent" required className="mt-1.5 h-4 w-4 shrink-0 accent-blue-600"/><span>{en ? "I agree to the use of my details to respond to this message." : "J'accepte l'utilisation de mes coordonnées pour répondre à ce message."} <Link className="text-blue-700 underline" href="/confidentialite">{en ? "Privacy" : "Confidentialité"}</Link></span></label><button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto">{state === "sending" ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>} {state === "sending" ? (en ? "Sending..." : "Envoi en cours...") : (en ? "Send message" : "Envoyer le message")}</button></fieldset>
    </form></div></section>;
}
