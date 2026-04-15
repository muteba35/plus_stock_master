"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package2, Mail, Lock, User, Phone, Store, Building2, 
  Eye, EyeOff, Loader2, LucideIcon, Check, X,
  ChevronDown, Coins, Users, AlertCircle, Ban
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import AuthNavbar from "../AuthNavbar"; 

// --- TYPES ---
interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
}

interface ApiErrorResponse {
  message: string;
  status?: string;
}

// --- CONSTANTS ---
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
export default function Register() {
  const router = useRouter();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRequirements, setShowRequirements] = useState(false);

  const [formData, setFormData] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    nomBoutique: "",
    secteurActivite: "Commerce Général",
    deviseParDefaut: "USD ($)",
    tailleBusiness: "1-2 employés",
    password: "",
    confirmPassword: ""
  });

  // LOGIQUE DE DÉBLOCAGE AUTOMATIQUE
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isBlocked) {
      timer = setTimeout(() => {
        setIsBlocked(false);
        setError(null);
      }, 15 * 60 * 1000); 
    }
    return () => clearTimeout(timer);
  }, [isBlocked]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);

    // Afficher les prérequis dès qu'on commence à taper le mot de passe
    if (name === "password") {
      setShowRequirements(value.length > 0);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!acceptedTerms || isBlocked || isLoading) return;
    
    // Vérification basique de correspondance des mots de passe
    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post("http://localhost:5000/api/auth/register", formData);
      if (response.data.success) {
        setTimeout(() => router.push("/verify-email"), 2000);
      }
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>;
      const errorMessage = axiosError.response?.data?.message || "Une erreur est survenue.";
      if (axiosError.response?.status === 429) {
        setIsBlocked(true);
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthNavbar />

      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 pt-32 relative overflow-hidden font-sans selection:bg-indigo-100">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[900px] flex flex-col lg:flex-row bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100"
        >
          {/* --- PANNEAU GAUCHE --- */}
          <div className="lg:w-[320px] bg-[#090E1A] p-10 flex flex-col items-center justify-center relative shrink-0 border-r border-slate-800/40 text-center">
             <div className="relative z-10 flex flex-col items-center w-full">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-xl mb-6">
                <Package2 size={32} strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase">
                STOCK<span className="text-indigo-400">MASTER</span>
              </h1>
               <div className="flex items-center gap-3 w-full my-8">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-700" />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-700" />
              </div>
              
              <p className="text-slate-500 text-[11px] font-medium leading-relaxed max-w-[200px] opacity-80 italic">
                Donnez vie à votre projet. Créez votre compte <span className="text-slate-300">professionnel</span> et rejoignez l`élite.
              </p>
              </div>

            <div className="absolute bottom-8 text-slate-800 text-[8px] font-black uppercase tracking-[0.2em]">
              RDC • Connexion Sécurisée
            </div>
          </div>

          {/* --- PANNEAU DROIT --- */}
          <div className="flex-1 bg-white p-8 lg:p-12 overflow-y-auto">
            <div className="max-w-[460px] mx-auto">
              
              <header className="mb-8">
                <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Inscription</h2>
                <div className="h-1 w-8 bg-indigo-600 rounded-full mt-3" />
              </header>

             <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="mb-6 p-4 bg-red-50 border-l-4 border-red-600 flex items-center gap-3 overflow-hidden"
                  style={{ color: "#dc2626" }} 
                >
                  <AlertCircle size={18} className="shrink-0" style={{ color: "#dc2626" }} />
                  <span className="text-xs font-black uppercase tracking-tight" style={{ color: "#dc2626" }}>
                    {error}
                  </span>
                </motion.div>
              )}
              </AnimatePresence>
              
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputGroup label="Prénom" name="prenom" icon={User} placeholder="Jean" required onChange={handleChange} />
                  <InputGroup label="Nom" name="nom" icon={User} placeholder="Mubarak" required onChange={handleChange} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputGroup label="Email Pro" name="email" type="email" icon={Mail} placeholder="jean@boutique.cd" required onChange={handleChange} />
                  <InputGroup label="Téléphone" name="telephone" type="tel" maxLength={9} icon={Phone} placeholder="+243..." onChange={handleChange} />
                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputGroup label="Boutique" name="nomBoutique" icon={Store} placeholder="Nom" required onChange={handleChange} />
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 italic ml-1">Business</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
                      <select 
                        name="secteurActivite"
                        value={formData.secteurActivite}
                        onChange={handleChange}
                        className="w-full pl-10 pr-10 py-3 bg-slate-50/50 border border-slate-100 rounded-lg outline-none focus:border-indigo-600 font-bold text-slate-900 text-sm appearance-none cursor-pointer"
                      >
                        <option>Commerce Général</option>
                        <option>Supermarché</option>
                        <option>Pharmacie</option>
                        <option>Restaurant</option>
                        <option>Autre</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 italic ml-1">Devise</label>
                    <div className="relative">
                      <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
                      <select name="deviseParDefaut" value={formData.deviseParDefaut} onChange={handleChange} className="w-full pl-10 pr-10 py-3 bg-slate-50/50 border border-slate-100 rounded-lg outline-none focus:border-indigo-600 font-bold text-slate-900 text-sm appearance-none cursor-pointer">
                        <option>USD ($)</option>
                        <option>CDF (FC)</option>
                        <option>EUR (€)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 italic ml-1">Taille</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
                      <select name="tailleBusiness" value={formData.tailleBusiness} onChange={handleChange} className="w-full pl-10 pr-10 py-3 bg-slate-50/50 border border-slate-100 rounded-lg outline-none focus:border-indigo-600 font-bold text-slate-900 text-sm appearance-none cursor-pointer">
                        <option>1-2 employés</option>
                        <option>3-10 employés</option>
                        <option>10+ employés</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative group flex flex-col">
                    <InputGroup label="Mot de passe" name="password" type={showPassword ? "text" : "password"} icon={Lock} placeholder="••••••••" required onChange={handleChange} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 bottom-3 text-slate-400 hover:text-indigo-600 transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <InputGroup label="Confirmer" name="confirmPassword" type="password" icon={Lock} placeholder="••••••••" required onChange={handleChange} />
                </div>

                <AnimatePresence>
                  {showRequirements && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {PASSWORD_REQUIREMENTS.map((req) => {
                          const isMet = req.test(formData.password);
                          return (
                            <div key={req.id} className="flex items-center gap-2">
                              <div className={`p-0.5 rounded-full transition-colors duration-300 ${isMet ? "bg-green-100" : "bg-red-100"}`}>
                                {isMet ? (
                                  <Check size={10} className="text-green-600" strokeWidth={4} />
                                ) : (
                                  <X size={10} className="text-red-500" strokeWidth={4} />
                                )}
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-tight transition-colors duration-300 ${isMet ? "text-green-600" : "text-red-500"}`}>
                                {req.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-3 mt-6 px-1">
                  <div className="relative flex items-center justify-center shrink-0">
                    <input 
                      type="checkbox" 
                      id="terms" 
                      checked={acceptedTerms}
                      onChange={() => setAcceptedTerms(!acceptedTerms)}
                      className="peer h-4 w-4 cursor-pointer appearance-none rounded border-2 border-slate-200 bg-white checked:border-indigo-600 checked:bg-indigo-600 transition-all outline-none" 
                    />
                    <Check className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={4} />
                  </div>
                  <label htmlFor="terms" className="text-[10px] text-slate-500 font-bold uppercase tracking-tight cursor-pointer">
                    J`accepte les <Link href="#" className="text-indigo-600 hover:underline">Conditions Génerales</Link>
                  </label>
                </div>

                <div className="relative group/btn-container overflow-hidden rounded-lg">
                  <button 
                    disabled={isLoading || !acceptedTerms}
                    type="submit"
                    className={`w-full py-3.5 rounded-lg font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] 
                      bg-[#090E1A] hover:bg-indigo-600 text-white disabled:opacity-30
                      ${isBlocked ? "cursor-none" : "cursor-pointer"}`}
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : "Créer mon compte"}
                  </button>

                  {isBlocked && (
                    <div 
                      className="absolute inset-0 z-20 cursor-none"
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        const icon = document.getElementById('ban-icon');
                        if (icon) {
                          icon.style.transform = `translate(${x - 12}px, ${y - 12}px)`;
                          icon.style.opacity = "1";
                        }
                      }}
                      onMouseLeave={() => {
                        const icon = document.getElementById('ban-icon');
                        if (icon) icon.style.opacity = "0";
                      }}
                    >
                      <div 
                        id="ban-icon"
                        className="pointer-events-none opacity-0 transition-opacity duration-200 absolute top-0 left-0"
                        style={{ willChange: "transform" }}
                      >
                        <Ban size={24} color="#dc2626" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
                      </div>
                    </div>
                  )}
                </div>
              </form>
                <footer className="mt-8 pt-6 border-t border-slate-50 text-center">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.1em]">
                  Déjà un compte ? <Link href="/login" className="text-indigo-600 hover:text-indigo-800 ml-1">Se connecter</Link>
                </p>
              </footer>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

function InputGroup({ label, icon: Icon, ...props }: InputGroupProps & { name: string }) {
  return (
    <div className="flex flex-col gap-1 w-full group/input">
      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 italic group-focus-within/input:text-indigo-600 transition-colors">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-indigo-600 transition-all" size={16} />
        <input 
          className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-lg outline-none focus:border-indigo-600 focus:bg-white font-bold text-slate-900 text-sm placeholder:text-slate-300 placeholder:font-normal transition-all"
          {...props}
        />
      </div>
    </div>
  );
}