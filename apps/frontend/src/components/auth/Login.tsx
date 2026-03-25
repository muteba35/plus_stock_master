"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package2, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, LucideIcon 
} from "lucide-react";
import Link from "next/link";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
}

export default function Login() {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulation de connexion
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 selection:bg-indigo-100 font-sans relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute inset-0 -z-10 overflow-hidden opacity-60">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[100px]" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[900px] flex flex-col lg:flex-row bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100"
      >
        
        {/* --- PANNEAU GAUCHE : IDENTITÉ VISUELLE --- */}
        <div className="lg:w-[320px] bg-[#090E1A] p-10 flex flex-col items-center justify-center relative shrink-0 border-r border-slate-800/40 text-center">
          <div className="absolute inset-0 opacity-[0.02] pattern-grid-md text-white" />
          
          <div className="relative z-10 flex flex-col items-center w-full">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-xl mb-6 border border-white/10">
              <Package2 size={32} strokeWidth={1.5} />
            </div>
            
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">
              STOCK<span className="text-indigo-400">MASTER</span>
            </h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-1">Pro Edition</p>
            
            {/* SÉPARATEUR DESIGN */}
            <div className="flex items-center gap-3 w-full my-8">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-700" />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-700" />
            </div>
            
            <p className="text-slate-500 text-[11px] font-medium leading-relaxed max-w-[200px] opacity-80 italic">
              Accédez à votre tableau de bord <span className="text-slate-300">StockMaster</span> pour piloter votre activité.
            </p>
          </div>

          <div className="absolute bottom-8 text-slate-800 text-[8px] font-black uppercase tracking-[0.2em]">
            RDC • Connexion Sécurisée
          </div>
        </div>

        {/* --- PANNEAU DROIT : FORMULAIRE DE CONNEXION --- */}
        <div className="flex-1 bg-white p-8 lg:p-14 overflow-y-auto">
          <div className="max-w-[420px] mx-auto">
            
            <header className="mb-10 text-center lg:text-left">
              <h2 className="text-2xl font-black text-slate-950 tracking-tight uppercase leading-none">Connexion</h2>
              <div className="h-1 w-8 bg-indigo-600 rounded-full mt-3 mx-auto lg:mx-0" />
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4">Ravis de vous revoir sur StockMaster</p>
            </header>

            <form className="space-y-5" onSubmit={handleLogin}>
              <InputGroup 
                label="Email Professionnel" 
                type="email" 
                icon={Mail} 
                placeholder="votre@email.cd" 
                required 
              />

              <div className="relative group flex flex-col">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 italic group-focus-within:text-indigo-600 transition-colors">
                    Mot de passe
                  </label>
                    <Link href="" className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-tighter">
                    Oublié ?
                    </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-all" size={16} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-12 py-3 bg-slate-50/50 border border-slate-100 rounded-lg outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all font-bold text-slate-900 text-sm placeholder:text-slate-200"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 cursor-pointer group py-2">
                <input 
                  type="checkbox" 
                  id="remember" 
                  className="h-4 w-4 rounded border-slate-200 text-indigo-600 focus:ring-indigo-50" 
                />
                <label htmlFor="remember" className="text-[10px] text-slate-500 font-bold uppercase tracking-tight cursor-pointer">
                  Rester connecté
                </label>
              </div>

              <button 
                disabled={isLoading}
                type="submit"
                className="w-full py-4 bg-[#090E1A] hover:bg-indigo-600 text-white rounded-lg font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 mt-4 shadow-lg active:scale-[0.98] disabled:opacity-30"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">Se connecter au dashboard <ArrowRight size={16} /></span>
                )}
              </button>
            </form>

            <footer className="mt-12 pt-8 border-t border-slate-50 text-center">
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.1em]">
                Pas encore de compte ? 
                <Link href="/register" className="text-indigo-600 hover:text-indigo-800 ml-2 border-b border-indigo-100 hover:border-indigo-600 transition-colors">
                  Créer un compte pro
                </Link>
              </p>
            </footer>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function InputGroup({ label, icon: Icon, ...props }: InputGroupProps) {
  return (
    <div className="flex flex-col gap-1 w-full group/input">
      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 italic group-focus-within/input:text-indigo-600 transition-colors">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-indigo-600 transition-all" size={16} />
        <input 
          className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-lg outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all font-bold text-slate-900 text-sm placeholder:text-slate-200 placeholder:font-normal"
          {...props}
        />
      </div>
    </div>
  );
}