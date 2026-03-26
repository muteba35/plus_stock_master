"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, Loader2, CheckCircle2, Package2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import AuthNavbar from "../AuthNavbar";

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulation d'envoi d'email
    setTimeout(() => {
      setIsLoading(false);
      setIsSent(true);
    }, 2000);
  };

  return (
    <>
      <AuthNavbar />
      
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 pt-32 selection:bg-indigo-100 font-sans relative overflow-hidden">
        
        {/* Décoration de fond dynamique */}
        <div className="absolute inset-0 -z-10 overflow-hidden opacity-60">
          <motion.div 
            animate={{ 
              scale: [1, 1.15, 1],
              rotate: [0, 5, 0] 
            }}
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
          <AnimatePresence mode="wait">
            {!isSent ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <header className="text-center mb-10">
                  {/* --- LOGO ET NOM RECTIFIÉS --- */}
                  <div className="flex flex-col items-center gap-3 mb-8">
                    {/* Carré Bleu avec Icône Blanche */}
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 group-hover:rotate-3 transition-transform">
                      <Package2 size={32} />
                    </div>
                    
                    <div className="flex flex-col leading-none">
                      {/* STOCK (Noir) MASTER (Bleu) */}
                      <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                        STOCK<span className="text-indigo-600">MASTER</span>
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                        Pro Edition
                      </span>
                    </div>
                  </div>

                  <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter leading-none mb-4">
                    Accès Perdu ?
                  </h2>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed px-2">
                    Entrez votre email pour recevoir un lien de réinitialisation sécurisé.
                  </p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex flex-col gap-2 group">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 italic group-focus-within:text-indigo-600 transition-colors">
                      Email Professionnel
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-all" size={20} />
                      <input 
                        type="email"
                        required
                        placeholder="jean@boutique.cd"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white focus:ring-8 focus:ring-indigo-50/40 transition-all font-bold text-slate-900 text-sm placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  <button 
                    disabled={isLoading}
                    type="submit"
                    className="w-full py-4.5 bg-[#090E1A] hover:bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all duration-300 flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] disabled:opacity-50 group"
                  >
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
                      <>
                        Envoyer le lien
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto mb-8 relative">
                  <CheckCircle2 size={48} className="relative z-10" />
                  <motion.div 
                    animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-green-200 rounded-full"
                  />
                </div>
                
                <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter mb-4">Email envoyé !</h2>
                <p className="text-slate-500 text-sm font-medium leading-relaxed mb-10">
                  Un lien de récupération a été envoyé à votre adresse. Vérifiez vos spams si besoin.
                </p>

                <Link 
                  href="/login"
                  className="inline-flex items-center gap-2 text-indigo-600 font-black text-[11px] uppercase tracking-widest hover:gap-4 transition-all group"
                >
                  <ArrowLeft size={16} />
                  Retour à la connexion
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {!isSent && (
            <footer className="mt-10 pt-8 border-t border-slate-50 text-center">
              <Link href="/login" className="text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-indigo-600 transition-colors">
                Annuler et retourner à la connexion
              </Link>
            </footer>
          )}
        </motion.div>
      </div>
    </>
  );
}