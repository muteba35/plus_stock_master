"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ArrowRight, Loader2, CheckCircle2, Package2, Eye, EyeOff, Check, X } from "lucide-react";
import AuthNavbar from "../AuthNavbar";
import axios, { AxiosError } from "axios";
import toast, { Toaster } from 'react-hot-toast';
import { useParams, useRouter } from "next/navigation";

// --- CONSTANTES DES RÈGLES ---
const PASSWORD_REQUIREMENTS = [
  { 
    id: 1, 
    label: "8+ caractères (ex: abc123...)", 
    test: (pw: string) => pw.length >= 8 
  },
  { 
    id: 2, 
    label: "Majuscule incluse (A, B, C...)", 
    test: (pw: string) => /[A-Z]/.test(pw) 
  },
  { 
    id: 3, 
    label: "Un chiffre (0, 1, 2...)", 
    test: (pw: string) => /[0-9]/.test(pw) 
  },
  { 
    id: 4, 
    label: "Caractère spécial (@, #, $...)", 
    test: (pw: string) => /[^A-Za-z0-9]/.test(pw) 
  },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://plus-stock-master.onrender.com/api";

export default function ResetPassword() {
  const params = useParams();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allRequirementsMet = PASSWORD_REQUIREMENTS.every(req => req.test(password));
    if (!allRequirementsMet) {
      return toast.error("Le mot de passe ne respecte pas les critères de sécurité.");
    }

    if (password !== confirmPassword) {
      return toast.error("Les mots de passe ne correspondent pas.");
    }

    setIsLoading(true);
    
    try {
      const { data } = await axios.post(`${API_URL}/auth/reset-password/${params.token}`, {
        password,
        confirmPassword
      });

      if (data.status === "success") {
        setIsSuccess(true);
        toast.success("Mot de passe mis à jour !");
        setTimeout(() => router.push("/login"), 3000);
      }
    } catch (error) {
      const err = error as AxiosError<{message: string}>;
      const message = err.response?.data?.message || "Le lien est invalide ou a expiré.";
      toast.error(message);
    } finally {
      setIsLoading(false);
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
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[460px] bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(15,23,42,0.1)] border border-slate-100 p-8 lg:p-14 relative"
        >
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div key="reset-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <header className="text-center mb-10">
                  <div className="flex flex-col items-center gap-3 mb-8">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                      <img src="/movoora-mark.svg" alt="Movoora" className="w-8 h-8" />
                    </div>
                    <div className="flex flex-col leading-none">
                      <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">
                        BOUTI<span className="text-indigo-600">QO</span>
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Pro Edition</span>
                    </div>
                  </div>

                  <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter leading-none mb-4">Nouveau Code</h2>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed px-2">
                    Créez un mot de passe robuste pour sécuriser votre accès inventaire.
                  </p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="flex flex-col gap-2 group">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 italic group-focus-within:text-indigo-600 transition-colors">
                      Nouveau Mot de Passe
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-all" size={20} />
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => {
                           setPassword(e.target.value);
                           setShowRequirements(e.target.value.length > 0);
                        }}
                        className="w-full pl-12 pr-12 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white focus:ring-8 focus:ring-indigo-50/40 transition-all font-bold text-slate-900 text-sm"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showRequirements && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 10 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          {PASSWORD_REQUIREMENTS.map((req) => {
                            const isMet = req.test(password);
                            return (
                              <div key={req.id} className="flex items-center gap-2">
                                <div className={`p-0.5 rounded-full transition-colors duration-300 ${isMet ? "bg-green-100" : "bg-red-100"}`}>
                                  {isMet ? <Check size={10} className="text-green-600" strokeWidth={4} /> : <X size={10} className="text-red-500" strokeWidth={4} />}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-tight ${isMet ? "text-green-600" : "text-red-500"}`}>
                                  {req.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col gap-2 group">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 italic group-focus-within:text-indigo-600 transition-colors">
                      Confirmer le Mot de Passe
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-all" size={20} />
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white focus:ring-8 focus:ring-indigo-50/40 transition-all font-bold text-slate-900 text-sm"
                      />
                    </div>
                  </div>

                  <button 
                    disabled={isLoading || !PASSWORD_REQUIREMENTS.every(r => r.test(password))}
                    type="submit"
                    className="w-full mt-2 py-4.5 bg-[#090E1A] hover:bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] transition-all duration-300 flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed group"
                  >
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
                      <>Mettre à jour <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto mb-8 relative">
                  <CheckCircle2 size={48} className="relative z-10" />
                  <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-green-200 rounded-full" />
                </div>
                <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter mb-4">Succès !</h2>
                <p className="text-slate-500 text-sm font-medium leading-relaxed mb-10">
                  Votre mot de passe a été réinitialisé avec succès. Redirection vers la connexion...
                </p>
                <div className="w-full py-4.5 bg-[#090E1A] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3">
                   <Loader2 size={18} className="animate-spin" /> Initialisation...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}


