"use client";

import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import Navbar from "../src/components/Navbar";
import Hero from "../src/components/Hero";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { 
  ArrowRight, CheckCircle2, Smartphone, Database, 
  Globe, Facebook, Linkedin, Instagram, ArrowUp,
  Zap, ShieldCheck, WifiOff, FileDown, Target, Rocket, Lightbulb
} from "lucide-react";

// --- CONFIG ANIMATIONS (Inchangé) ---
const reveal = {
  initial: { opacity: 0, y: 30, filter: "blur(10px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }
};

const slideIn = (direction: "left" | "right") => ({
  initial: { opacity: 0, x: direction === "left" ? -60 : 60, filter: "blur(15px)" },
  whileInView: { opacity: 1, x: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] as const }
});

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const backgroundColor = useTransform(scrollYProgress, [0, 0.2, 0.4, 0.8], ["#ffffff", "#ffffff", "#020617", "#020617"]);
  const textColor = useTransform(scrollYProgress, [0, 0.2, 0.4], ["#0f172a", "#0f172a", "#f8fafc"]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.main style={{ backgroundColor }} className="min-h-screen transition-colors duration-1000 relative font-sans">
      <Navbar />
      <Hero />

      {/* --- SECTION 1 : SERVICES (AVEC HOVERS) --- */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <motion.div {...reveal} className="text-center mb-12">
          <h2 className="text-indigo-600 font-bold uppercase tracking-widest text-[10px] mb-3">Infrastructure</h2>
          <motion.p style={{ color: textColor }} className="text-2xl md:text-3xl font-extrabold tracking-tight uppercase">
            La puissance <span className="text-indigo-600">Opérationnelle.</span>
          </motion.p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: <Smartphone size={20} />, t: "Point de Vente", d: "Une interface pensée pour la vitesse. Encaissez en moins de 3 secondes." },
            { icon: <Database size={20} />, t: "Multi-Dépôts", d: "Vision globale. Gérez vos entrepôts comme s'ils n'en faisaient qu'un." },
            { icon: <Globe size={20} />, t: "E-commerce Sync", d: "Vendez sur le web et en boutique avec un stock unifié." }
          ].map((s, i) => (
            <motion.div 
              key={i} 
              {...reveal} 
              transition={{delay: i*0.1}} 
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="group p-8 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 cursor-default"
            >
              <div className="w-11 h-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center mb-5 group-hover:rotate-12 group-hover:scale-110 transition-all shadow-lg">
                {s.icon}
              </div>
              <h3 className="text-lg font-bold mb-2 text-slate-900 group-hover:text-indigo-600 transition-colors">{s.t}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed uppercase tracking-tight">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>
      {/* --- SÉPARATEUR 2 --- */}
      <div className="w-full flex justify-center px-6"><div className="w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-40" /></div>


      {/* --- SECTION 2 & 3 : GESTION & ANALYSE (IMAGE HOVER) --- */}
      <div className="space-y-24 py-12">
        {/* GESTION */}
        <section className="px-6 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...slideIn("left")} className="relative z-10">
              <div className="inline-block px-3 py-1 rounded-full border border-indigo-200 text-indigo-600 text-[9px] font-bold uppercase tracking-widest mb-4">Optimisation</div>
              <motion.h2 style={{ color: textColor }} className="text-3xl md:text-4xl font-extrabold uppercase mb-6 leading-tight tracking-tighter">
                Zéro perte, <br/><span className="text-indigo-600">Max Profit.</span>
              </motion.h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-tight leading-relaxed max-w-md mb-8">
                Ne devinez plus. Notre IA prédit vos besoins et vous alerte avant que le stock ne s'épuise.
              </p>
              <button className="group flex items-center gap-3 text-indigo-600 font-bold uppercase text-[10px] tracking-widest hover:gap-5 transition-all">
                Explorer le module <div className="w-8 h-[2px] bg-indigo-600 group-hover:w-12 transition-all" />
              </button>
            </motion.div>
            
            <motion.div {...slideIn("right")} className="relative">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-xl">
                <motion.img whileHover={{scale: 1.05}} transition={{ duration: 0.4 }} src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800" className="w-full object-cover h-[350px]" alt="Warehouse" />
              </div>
            </motion.div>
          </div>
        </section>
        {/* --- SÉPARATEUR 2 --- */}
      <div className="w-full flex justify-center px-6"><div className="w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-40" /></div>


        {/* ANALYSE */}
        <section className="px-6 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...slideIn("left")} className="order-2 lg:order-1 relative">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-xl">
                <motion.img whileHover={{scale: 1.05}} transition={{ duration: 0.4 }} src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800" className="w-full object-cover h-[350px]" alt="Analytics" />
              </div>
            </motion.div>

            <motion.div {...slideIn("right")} className="order-1 lg:order-2 lg:text-right flex flex-col lg:items-end">
              <div className="inline-block px-3 py-1 rounded-full border border-indigo-200 text-indigo-600 text-[9px] font-bold uppercase tracking-widest mb-4">Data-Intelligence</div>
              <motion.h2 style={{ color: textColor }} className="text-3xl md:text-4xl font-extrabold uppercase mb-6 leading-tight tracking-tighter">
                Rapports <br/><span className="text-indigo-600">Précis.</span>
              </motion.h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-tight leading-relaxed max-w-md mb-8">
                Transformez vos chiffres en décisions. Visualisez vos marges nettes et vos produits stars.
              </p>
              <button className="group flex flex-row-reverse items-center gap-3 text-indigo-600 font-bold uppercase text-[10px] tracking-widest hover:gap-5 transition-all">
                Voir les démos <div className="w-8 h-[2px] bg-indigo-600 group-hover:w-12 transition-all" />
              </button>
            </motion.div>
          </div>
        </section>
      </div>
      {/* --- SÉPARATEUR 2 --- */}
      <div className="w-full flex justify-center px-6"><div className="w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-40" /></div>


      {/* --- SECTION 4 : SOLUTIONS (GRID AVEC HOVER) --- */}
      <section id="solutions" className="py-24 px-6 max-w-6xl mx-auto scroll-mt-20">
        <motion.div {...reveal} className="mb-12 text-center">
          <h2 className="text-indigo-500 font-bold uppercase text-[9px] tracking-[0.4em] mb-3">Écosystème Digital</h2>
          <p className="text-2xl md:text-4xl font-extrabold uppercase tracking-tighter text-white leading-none">
            Solutions <span className="text-indigo-600">Sans Limites.</span>
          </p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: <Zap size={18}/>, t: "Scan IA", d: "Reconnaissance via caméra." },
            { icon: <ShieldCheck size={18}/>, t: "Sécurité", d: "Chiffrement AES-256 bits." },
            { icon: <WifiOff size={18}/>, t: "Offline", d: "Vendez sans réseau." },
            { icon: <FileDown size={18}/>, t: "Exports", d: "PDF et Excel instantanés." },
            { icon: <CheckCircle2 size={18}/>, t: "Prédictif", d: "Analyse de tendances." },
            { icon: <ArrowRight size={18}/>, t: "API", d: "Connexion à vos outils." }
          ].map((s, i) => (
            <motion.div 
              key={i} 
              {...reveal} 
              transition={{delay: i*0.1}} 
              whileHover={{ y: -8, scale: 1.02 }}
              className="group p-6 bg-white/5 border border-white/10 rounded-2xl relative overflow-hidden backdrop-blur-sm hover:border-indigo-500/50 hover:bg-white/10 transition-all duration-300 cursor-default"
            >
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center mb-4 shadow-lg group-hover:shadow-indigo-500/20 transition-all">{s.icon}</div>
              <h3 className="text-sm font-bold uppercase mb-2 text-white group-hover:text-indigo-400 transition-colors">{s.t}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>
      {/* --- SÉPARATEUR 2 --- */}
      <div className="w-full flex justify-center px-6"><div className="w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-40" /></div>


      {/* --- SECTION VISION (IMAGE ANIMÉE) --- */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto border border-white/10 bg-white/[0.02] rounded-[2rem] p-10 md:p-16 relative overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...reveal}>
              <h2 className="text-indigo-500 font-bold uppercase text-[9px] tracking-[0.5em] mb-4">Notre Vision</h2>
              <p className="text-2xl md:text-4xl font-extrabold text-white uppercase tracking-tighter leading-tight mb-6">
                Propulser le <span className="text-indigo-600">Commerce Africain.</span>
              </p>
              <p className="text-slate-400 text-xs font-medium leading-relaxed mb-8 max-w-md">
                StockMaster construit les outils qui permettent aux business de Kinshasa de rivaliser avec les standards mondiaux.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="group cursor-default">
                  <div className="text-white font-bold uppercase text-sm mb-1 flex items-center gap-2 group-hover:text-indigo-400 transition-colors">
                    <Target className="text-indigo-500" size={14}/> Mission
                  </div>
                  <p className="text-slate-500 text-[9px] font-bold uppercase">Digitaliser chaque boutique.</p>
                </div>
                <div className="group cursor-default">
                  <div className="text-white font-bold uppercase text-sm mb-1 flex items-center gap-2 group-hover:text-indigo-400 transition-colors">
                    <Rocket className="text-indigo-500" size={14}/> Futur
                  </div>
                  <p className="text-slate-500 text-[9px] font-bold uppercase">Standard de gestion IA.</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div {...reveal} className="flex justify-center">
              <div className="w-48 h-48 border border-indigo-600/20 rounded-full flex items-center justify-center relative">
                <div className="absolute inset-0 border border-dashed border-indigo-600/30 rounded-full animate-[spin_20s_linear_infinite]" />
                <motion.div whileHover={{ scale: 1.2, rotate: 10 }} transition={{ type: "spring", stiffness: 300 }}>
                    <Lightbulb size={40} className="text-indigo-500 cursor-pointer" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-950 text-white py-12 px-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center font-bold text-xs italic group-hover:scale-110 transition-transform">S</div>
              <span className="text-base font-bold uppercase tracking-tight group-hover:text-indigo-400 transition-colors">StockMaster</span>
            </div>
            <div className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">© 2026 — Kinshasa</div>
            <div className="flex gap-5 text-slate-400">
              <Facebook size={16} className="hover:text-white hover:scale-110 transition cursor-pointer" />
              <Linkedin size={16} className="hover:text-white hover:scale-110 transition cursor-pointer" />
              <Instagram size={16} className="hover:text-white hover:scale-110 transition cursor-pointer" />
            </div>
        </div>
      </footer>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => window.scrollTo({top: 0, behavior: "smooth"})}
            className="fixed bottom-6 right-6 z-50 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-indigo-700 transition-colors"
          >
            <ArrowUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

 {/* --- SÉPARATEUR 2 --- */}
      <div className="w-full flex justify-center px-6"><div className="w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-40" /></div>
