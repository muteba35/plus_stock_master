"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Loader2, Package2, RefreshCw } from "lucide-react";
import Link from "next/link";
import AuthNavbar from "../AuthNavbar";

export default function VerifyEmail() {
  const [isResending, setIsResending] = useState(false);

  const handleResend = () => {
    setIsResending(true);
    // Simulation d'envoi de nouveau mail
    setTimeout(() => setIsResending(false), 2000);
  };

  return (
    <>
      <AuthNavbar />
      
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 pt-32 selection:bg-indigo-100 font-sans relative overflow-hidden">
        
        {/* Décoration de fond dynamique */}
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
            {/* --- LOGO ET NOM --- */}
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

            {/* --- SÉPARATEUR MODERNE --- */}
            <div className="flex items-center justify-center gap-4 mb-10">
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              <div className="h-1.5 w-1.5 rounded-full bg-slate-200 shrink-0" />
              <div className="h-[1px] w-full bg-gradient-to-l from-transparent via-slate-200 to-transparent" />
            </div>

            {/* Icône de boîte mail animée */}
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mx-auto mb-6">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Mail size={40} strokeWidth={1.5} />
              </motion.div>
            </div>

            <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter leading-none mb-4">
              Vérifiez vos mails
            </h2>
            <p className="text-slate-500 text-sm font-medium leading-relaxed px-2 mb-10">
              Nous avons envoyé un lien de confirmation à votre adresse. Cliquez dessus pour activer votre accès.
            </p>

            <div className="space-y-4">
              <Link 
                href="/login"
                className="w-full py-4.5 bg-[#090E1A] hover:bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all duration-300 flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
              >
                Continuer vers la connexion
                <ArrowRight size={18} />
              </Link>

              <button 
                onClick={handleResend}
                disabled={isResending}
                className="w-full py-4 border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 text-slate-500 hover:text-indigo-600 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isResending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                {isResending ? "Envoi en cours..." : "Renvoyer l'email de vérification"}
              </button>
            </div>
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