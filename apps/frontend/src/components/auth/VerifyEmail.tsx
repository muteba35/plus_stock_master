"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Loader2, Package2, RefreshCw, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import AuthNavbar from "../AuthNavbar";

const COOLDOWN_SECONDS = 120; // 2 minutes

export default function VerifyEmail() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const status = searchParams.get("status"); 

  // --- ÉTATS POUR LE RENVOI ---
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState({ type: "", text: "" });

  // ⏱ Gestion du Timer (Cooldown)
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Redirection automatique si succès
  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => router.push("/login"), 5000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  // --- FONCTION DE RENVOI RÉELLE ---
  const handleResend = async () => {
    const email = localStorage.getItem("userEmailForVerify");
    
    if (!email) {
      setMessage({ type: "error", text: "Email introuvable. Veuillez vous réinscrire." });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("http://localhost:5000/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setCooldown(COOLDOWN_SECONDS);
        setMessage({ type: "success", text: "Un nouveau lien a été envoyé !" });
      } else {
        setMessage({ type: "error", text: data.message || "Erreur lors du renvoi." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Erreur réseau. Vérifiez votre connexion." });
    } finally {
      setLoading(false);
    }
  };  

  return (
    <>
      <AuthNavbar />
      
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 pt-32 selection:bg-indigo-100 font-sans relative overflow-hidden">
        
        <div className="absolute inset-0 -z-10 overflow-hidden opacity-60">
          <motion.div 
            animate={{ scale: [1, 1.15, 1], rotate: [0, 5, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-10%] right-[-5%] w-[45%] h-[45%] bg-indigo-100 rounded-full blur-[100px]" 
          />
          <div className="absolute bottom-[-5%] left-[-5%] w-[25%] h-[25%] bg-blue-50 rounded-full blur-[80px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[460px] bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(15,23,42,0.1)] border border-slate-100 p-8 lg:p-14 relative"
        >
          <header className="text-center">
            <div className="flex flex-col items-center gap-3 mb-8">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                <Package2 size={32} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                  STOCK<span className="text-indigo-600">MASTER</span>
                </span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                  Pro Edition
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mb-10">
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              <div className="h-1.5 w-1.5 rounded-full bg-slate-200 shrink-0" />
              <div className="h-[1px] w-full bg-gradient-to-l from-transparent via-slate-200 to-transparent" />
            </div>

            <AnimatePresence mode="wait">
              {status === "success" ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto mb-6">
                    <CheckCircle2 size={40} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter mb-4">Compte Activé !</h2>
                  <p className="text-slate-500 text-sm mb-10">Votre identité a été confirmée. Redirection vers la connexion en cours...</p>
                  <Link href="/login" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                    Accéder à mon compte <ArrowRight size={14} />
                  </Link>
                </motion.div>
              ) : 

              (status === "invalid" || status === "expired" || status === "error") ? (
                <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
                    <XCircle size={40} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter mb-4">Lien Invalide</h2>
                  <p className="text-slate-500 text-sm mb-10">Ce lien a expiré ou est corrompu. Veuillez en demander un nouveau ci-dessous.</p>
                  
                  {/* Bouton de renvoi même en cas d'erreur */}
                  <button 
                    onClick={handleResend}
                    disabled={loading || cooldown > 0}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    {cooldown > 0 ? `Réessayer dans ${cooldown}s` : "Générer un nouveau lien"}
                  </button>
                </motion.div>
              ) : 

              (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mx-auto mb-6">
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                      <Mail size={40} strokeWidth={1.5} />
                    </motion.div>
                  </div>
                  <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter mb-4">Vérifiez vos mails</h2>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed mb-10">
                    Nous avons envoyé un lien de confirmation à votre adresse. Cliquez dessus pour activer votre accès.
                  </p>

                  <button 
                    onClick={handleResend}
                    disabled={loading || cooldown > 0}
                    className="w-full py-4 border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 text-slate-500 hover:text-indigo-600 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-50"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RefreshCw size={16} className={cooldown > 0 ? "animate-spin" : ""} />
                    )}
                    {loading 
                      ? "Envoi en cours..." 
                      : cooldown > 0 
                      ? `Réessayer dans ${cooldown}s` 
                      : "Renvoyer l'email de vérification"}
                  </button>

                  {/* Message de Feedback (Succès ou Erreur) */}
                  {message.text && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`mt-6 text-[10px] font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-2 ${
                        message.type === 'error' ? 'text-red-500' : 'text-emerald-500'
                      }`}
                    >
                      {message.type === 'success' ? (
                        <CheckCircle2 size={14} strokeWidth={3} />
                      ) : (
                        <XCircle size={14} strokeWidth={3} />
                      )}
                      {message.text}
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </header>

           <footer className="mt-10 pt-8 border-t border-slate-50 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Une erreur d`adresse ? <Link href="/register" className="text-indigo-600 hover:underline">Modifier</Link>
            </p>
          </footer>
        </motion.div>
      </div>
    </>
  );
}