"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, Loader2, CheckCircle2, Package2, RefreshCw } from "lucide-react";
import Link from "next/link";
import AuthNavbar from "../AuthNavbar";
import axios, { AxiosError } from "axios";
import toast, { Toaster } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Fonction principale
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data } = await axios.post(`${API_URL}/auth/forgot-password`, {
        email 
      });

      if (data.status === "success") {
        setIsSent(true);
        toast.success("Lien envoyé avec succès !");
      }
    } catch (error) {
      const err = error as AxiosError<{message: string}>;
      const message = err.response?.data?.message || "Une erreur est survenue.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de renvoi
  const handleResend = async () => {
    if (!email) return toast.error("Veuillez saisir votre email d'abord.");
    
    setIsResending(true);
    try {
      await axios.post(`${API_URL}/auth/resend-forgot-password`, { email });
      toast.success("Nouveau lien de récupération envoyé !");
    } catch (error) {
      const err = error as AxiosError<{message: string}>;
      const message = err.response?.data?.message || "Impossible de renvoyer le lien.";
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
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
          <AnimatePresence mode="wait">
            {!isSent ? (
              <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <header className="text-center mb-10">
                  <div className="flex flex-col items-center gap-3 mb-8">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                      <img src="/movoora-mark.svg" alt="Movoora" className="w-8 h-8" />
                    </div>
                    <div className="flex flex-col leading-none">
                      <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                        MOVO<span className="text-indigo-600">ORA</span>
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jean@boutique.cd"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white focus:ring-8 focus:ring-indigo-50/40 transition-all font-bold text-slate-900 text-sm placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <button 
                      disabled={isLoading || isResending}
                      type="submit"
                      className="w-full py-4.5 bg-[#090E1A] hover:bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all duration-300 flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
                        <>
                          Envoyer le lien
                          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>

                    <div className="flex justify-center">
                      <button 
                        type="button"
                        onClick={handleResend}
                        disabled={isResending || isLoading}
                        className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-900 hover:text-indigo-600 transition-colors group disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <RefreshCw size={14} className={`${isResending ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
                        {isResending ? "Renvoi en cours..." : "Renvoyer un autre lien"}
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto mb-8 relative">
                  <CheckCircle2 size={48} className="relative z-10" />
                  <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-green-200 rounded-full" />
                </div>
                
                <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter mb-4 leading-tight">Lien Envoyé !</h2>
                <p className="text-slate-500 text-sm font-medium leading-relaxed mb-10 px-2">
                  Un email a été envoyé à <strong className="text-slate-900">{email}</strong>. 
                  <span className="block mt-2 font-bold text-indigo-600/80 italic">Pensez à vérifier vos spams.</span>
                </p>

                <div className="space-y-4">
                  <Link 
                    href="/login"
                    className="w-full py-4.5 bg-[#090E1A] hover:bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all duration-300 flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
                  >
                    Retour à la connexion
                  </Link>

                  <button 
                    onClick={handleResend}
                    disabled={isResending || isLoading}
                    className="w-full py-4 border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 text-slate-500 hover:text-indigo-600 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isResending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    {isResending ? "Renvoi en cours..." : "Renvoyer le lien"}
                  </button>
                </div>

                <footer className="mt-12 pt-8 border-t border-slate-50 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">
                    Erreur d`adresse ? <br />
                    <button 
                      disabled={isLoading || isResending}
                      onClick={() => setIsSent(false)} 
                      className="text-indigo-600 hover:underline font-black disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Saisir un autre email
                    </button>
                  </p>
                </footer>
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


