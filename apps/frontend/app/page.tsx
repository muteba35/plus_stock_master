"use client";

import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import Navbar from "../src/components/Navbar";
import Hero from "../src/components/Hero";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { 
  ArrowRight, CheckCircle2, Smartphone, Database, 
  Globe, Facebook, Linkedin, Instagram, ArrowUp,
  Zap, ShieldCheck, WifiOff, FileDown } from "lucide-react";

// --- COMPOSANT COMPTEUR ---
function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const end = value;
      const duration = 2000; 
      const increment = end / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// --- CONFIG ANIMATIONS ---
const reveal = {
  initial: { opacity: 0, y: 20, filter: "blur(8px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }
};

const slideIn = (direction: "left" | "right") => ({
  initial: { opacity: 0, x: direction === "left" ? -40 : 40, scale: 0.95, filter: "blur(10px)" },
  whileInView: { opacity: 1, x: 0, scale: 1, filter: "blur(0px)" },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] as const }
});

const imageHover = {
  whileHover: { scale: 1.02, y: -5, boxShadow: "0 20px 40px rgba(79, 70, 229, 0.15)" }
};

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const backgroundColor = useTransform(scrollYProgress, [0, 0.3, 0.5], ["#ffffff", "#ffffff", "#020617"]);
  const textColor = useTransform(scrollYProgress, [0, 0.3, 0.5], ["#0f172a", "#0f172a", "#f8fafc"]);

  // Gérer l'affichage du bouton de retour en haut
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <motion.main style={{ backgroundColor }} className="min-h-screen transition-colors duration-700 relative">
      <Navbar />
      <Hero />

      {/* --- SECTION 1 : SERVICES --- */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <motion.div initial={reveal.initial} whileInView={reveal.whileInView} viewport={reveal.viewport} transition={reveal.transition} className="text-center mb-16">
          <h2 className="text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px] mb-4">Services Experts</h2>
          <motion.p style={{ color: textColor }} className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase leading-tight">
            Une infrastructure robuste <br/> pour vos ventes.
          </motion.p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: <Smartphone size={20}/>, t: "Point de Vente", d: "Une caisse tactile ultra-rapide qui fonctionne même hors-ligne." },
            { icon: <Database size={20}/>, t: "Multi-Dépôts", d: "Gérez plusieurs entrepôts et transférez vos stocks en un clic." },
            { icon: <Globe size={20}/>, t: "E-commerce Sync", d: "Synchronisez votre boutique physique avec Shopify." }
          ].map((s, i) => (
            <motion.div key={i} initial={reveal.initial} whileInView={reveal.whileInView} viewport={reveal.viewport} transition={{ ...reveal.transition, delay: i * 0.1 }} className="p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 hover:border-indigo-200 transition-all group">
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
                {s.icon}
              </div>
              <h3 className="text-sm font-black uppercase italic mb-2 text-slate-900">{s.t}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed uppercase tracking-tight">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* --- SÉPARATEUR --- */}
      <div className="w-full flex justify-center px-6"><div className="w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-60" /></div>

      {/* --- SECTION 2 : GESTION --- */}
      <section className="py-16 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div {...slideIn("left")}>
            <motion.h2 style={{ color: textColor }} className="text-4xl font-black uppercase italic mb-6 leading-none">Zéro perte, <br/><span className="text-indigo-600">Max de profit.</span></motion.h2>
            <p className="text-slate-500 text-xs mb-8 font-bold uppercase tracking-tight leading-relaxed max-w-md">Recevez des alertes automatiques avant la rupture de stock. Notre IA analyse vos cycles de vente.</p>
            <Link href="#" className="flex items-center gap-2 text-[10px] font-black uppercase italic text-indigo-600 group">Découvrir l'analyse <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></Link>
          </motion.div>
          <motion.div {...slideIn("right")} className="relative">
             <motion.img whileHover={imageHover.whileHover} src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1000" className="rounded-[2.5rem] shadow-xl border border-white/10 cursor-pointer" alt="Warehouse" />
          </motion.div>
        </div>
      </section>

      {/* --- SÉPARATEUR 2 --- */}
      <div className="w-full flex justify-center px-6"><div className="w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-40" /></div>

      {/* --- SECTION 3 : ANALYSE --- */}
      <section className="py-16 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div {...slideIn("left")} className="order-2 lg:order-1">
             <motion.img whileHover={imageHover.whileHover} src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000" className="rounded-[2.5rem] shadow-xl border border-white/10 cursor-pointer" alt="Analytics" />
          </motion.div>
          <motion.div {...slideIn("right")} className="order-1 lg:order-2 text-right">
            <motion.h2 style={{ color: textColor }} className="text-4xl font-black uppercase italic mb-6 leading-none">Rapports <br/><span className="text-indigo-600">Clairs & Précis.</span></motion.h2>
            <p className="text-slate-500 text-xs mb-8 font-bold uppercase tracking-tight ml-auto max-w-md">Visualisez la santé de votre business en un coup d'œil. Marges nettes et produits phares.</p>
            <div className="flex justify-end"><button className="px-6 py-3 border-2 border-indigo-600 text-indigo-600 rounded-full text-[10px] font-black uppercase italic hover:bg-indigo-600 hover:text-white transition-all">Voir exemple</button></div>
          </motion.div>
        </div>
      </section>

{/* --- SECTION BENTO GRID (FEATURES TECHNIQUES) --- */}
      <section className="py-32 px-6 max-w-7xl mx-auto">
        <motion.div initial={reveal.initial} whileInView={reveal.whileInView} className="mb-16">
          <h2 className="text-indigo-500 font-black uppercase text-[10px] tracking-[0.4em] mb-4">Ingénierie</h2>
          <motion.p style={{ color: textColor }} className="text-4xl font-black italic uppercase tracking-tighter">Puissance brute.</motion.p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 h-full md:h-[600px]">
          
          {/* Carte 1: Scan IA (Grande) */}
          <motion.div whileHover={{ y: -5 }} className="md:col-span-2 md:row-span-2 bg-slate-950 rounded-[3rem] p-10 relative overflow-hidden flex flex-col justify-between border border-white/10 group">
            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&q=80&w=800')] bg-cover opacity-20 group-hover:scale-110 transition-transform duration-700" />
            <div className="relative z-10 w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4"><Zap size={24} className="text-white" /></div>
            <div className="relative z-10">
              <h3 className="text-white text-3xl font-black uppercase italic mb-3">Scan IA Intégré</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wide leading-relaxed max-w-xs">
                Reconnaissance instantanée des codes-barres via caméra 4K. Inventaire 5x plus rapide.
              </p>
            </div>
          </motion.div>

          {/* Carte 2: Sécurité (Large) */}
          <motion.div whileHover={{ y: -5 }} className="md:col-span-2 bg-indigo-600 rounded-[3rem] p-8 relative overflow-hidden flex items-center gap-6 group">
            <div className="flex-1">
              <h3 className="text-white text-xl font-black uppercase italic mb-2">Cloud Security</h3>
              <p className="text-indigo-100 text-[10px] font-bold uppercase opacity-80">Chiffrement AES-256 bits & Sauvegarde automatique toutes les 5 min.</p>
            </div>
            <ShieldCheck size={80} className="text-white/20 absolute -right-4 group-hover:rotate-12 transition-transform" />
          </motion.div>

          {/* Carte 3: Mode Offline */}
          <motion.div whileHover={{ y: -5 }} className="md:col-span-1 bg-slate-100 rounded-[3rem] p-8 flex flex-col justify-between border border-slate-200 group">
            <WifiOff size={28} className="text-indigo-600" />
            <div>
              <h3 className="text-slate-900 font-black uppercase italic text-sm mb-1">Mode Offline</h3>
              <p className="text-slate-500 text-[9px] font-bold uppercase leading-tight">Continuez à vendre même sans connexion internet.</p>
            </div>
          </motion.div>

          {/* Carte 4: Export PDF */}
          <motion.div whileHover={{ y: -5 }} className="md:col-span-1 bg-white rounded-[3rem] p-8 flex flex-col justify-between border border-slate-200 shadow-sm group">
            <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center"><FileDown size={20} className="text-white" /></div>
            <div>
              <h3 className="text-slate-900 font-black uppercase italic text-sm mb-1">Export PDF/XL</h3>
              <p className="text-slate-500 text-[9px] font-bold uppercase leading-tight">Générez vos bons de commande en un clic.</p>
            </div>
          </motion.div>

        </div>
      </section>
  
  {/* --- SÉPARATEUR --- */}
      <div className="w-full flex justify-center px-6"><div className="w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-60" /></div>


    {/* --- SECTION 4 : PRICING --- */}
      <section id="pricing" className="py-24 px-6 relative">
        <motion.div initial={reveal.initial} whileInView={reveal.whileInView} viewport={reveal.viewport} transition={reveal.transition} className="text-center mb-16">
          <h2 className="text-indigo-500 font-black uppercase text-[10px] tracking-[0.4em] mb-4">Tarification</h2>
          <motion.p style={{ color: textColor }} className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">Vitesse supérieure.</motion.p>
        </motion.div>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            { t: "Starter", p: 0, f: ["1 Boutique", "Stock Limité"] },
            { t: "Pro", p: 49, f: ["5 Boutiques", "IA Analytics"], hot: true },
            { t: "Enterprise", p: 99, f: ["Illimité", "API Dédiée"] }
          ].map((plan, i) => (
            <motion.div key={i} initial={reveal.initial} whileInView={reveal.whileInView} viewport={reveal.viewport} transition={{ ...reveal.transition, delay: i * 0.1 }} whileHover={{ y: -10, scale: 1.02 }} className={`p-10 rounded-[3rem] border transition-all cursor-pointer ${plan.hot ? 'border-indigo-500 bg-indigo-600/5 shadow-2xl shadow-indigo-500/10' : 'border-white/10 bg-white/5'} backdrop-blur-md`}>
              <h3 className="text-indigo-500 font-black uppercase italic text-xs mb-2 tracking-widest">{plan.t}</h3>
              <div className="text-5xl font-black text-white mb-8 tracking-tighter">{plan.p}$<span className="text-[10px] text-slate-500 uppercase">/mo</span></div>
              <ul className="space-y-4 mb-10">{plan.f.map((feat, j) => (<li key={j} className="flex items-center gap-3 text-slate-400 font-bold italic text-[10px] uppercase"><CheckCircle2 size={14} className="text-indigo-500" /> {feat}</li>))}</ul>
              <button className={`w-full py-4 rounded-xl text-[10px] font-black uppercase italic transition-all ${plan.hot ? 'bg-indigo-600 text-white' : 'bg-white text-slate-900'}`}>S'abonner</button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* --- STATS --- */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          {[ { n: 500, s: "+", t: "Entreprises" }, { n: 99, s: "%", t: "Satisfaction" }, { n: 24, s: "h", t: "Réponse" }, { n: 10, s: "M", t: "Ventes" }].map((stat, i) => (
            <motion.div key={i} initial={reveal.initial} whileInView={reveal.whileInView} viewport={reveal.viewport} transition={reveal.transition}>
              <div className="text-4xl md:text-5xl font-black text-white mb-1 italic tracking-tighter leading-none"><Counter value={stat.n} suffix={stat.s} /></div>
              <div className="text-indigo-500 font-black uppercase text-[9px] tracking-[0.3em]">{stat.t}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-950 text-white py-16 px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold italic">S</div>
              <span className="text-lg font-black italic uppercase tracking-tighter">StockMaster</span>
            </div>
            <div className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">© 2026 StockMaster — Kinshasa</div>
            <div className="flex gap-6 text-slate-400">
              <Facebook size={18} className="hover:text-white transition cursor-pointer" />
              <Linkedin size={18} className="hover:text-white transition cursor-pointer" />
              <Instagram size={18} className="hover:text-white transition cursor-pointer" />
            </div>
        </div>
      </footer>

      {/* --- BOUTON SCROLL TO TOP --- */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-50 w-12 h-12 bg-indigo-600/10 backdrop-blur-xl border border-indigo-500/20 text-indigo-500 rounded-full flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-lg"
          >
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.main>
  );
}