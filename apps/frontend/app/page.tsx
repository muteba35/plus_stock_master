"use client";

import { motion, useScroll, useTransform, useInView } from "framer-motion";
import Navbar from "../src/components/Navbar";
import Hero from "../src/components/Hero";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { 
  ArrowRight, CheckCircle2, Smartphone, Database, 
  Globe, Facebook, Linkedin, Instagram 
} from "lucide-react";

// --- COMPOSANT COMPTEUR (Incrémentation automatique) ---
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

// --- CONFIGURATION DES ANIMATIONS (Correction TypeScript avec 'as const') ---
const reveal = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }
};

const slideIn = (direction: "left" | "right") => ({
  initial: { opacity: 0, x: direction === "left" ? -60 : 60 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true },
  transition: { duration: 1, ease: [0.16, 1, 0.3, 1] as const }
});

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  
  const backgroundColor = useTransform(scrollYProgress, [0, 0.3, 0.5], ["#ffffff", "#ffffff", "#020617"]);
  const textColor = useTransform(scrollYProgress, [0, 0.3, 0.5], ["#0f172a", "#0f172a", "#f8fafc"]);

  return (
    <motion.main style={{ backgroundColor }} className="min-h-screen transition-colors duration-700">
      <Navbar />
      <Hero />

      {/* --- SECTION 1 : SERVICES --- */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <motion.div 
          initial={reveal.initial}
          whileInView={reveal.whileInView}
          viewport={reveal.viewport}
          transition={reveal.transition}
          className="text-center mb-16"
        >
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
            <motion.div 
              key={i}
              initial={reveal.initial}
              whileInView={reveal.whileInView}
              viewport={reveal.viewport}
              transition={{ ...reveal.transition, delay: i * 0.1 }}
              className="p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 hover:border-indigo-200 transition-all group"
            >
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
                {s.icon}
              </div>
              <h3 className="text-sm font-black uppercase italic mb-2 text-slate-900">{s.t}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed uppercase tracking-tight">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* --- SECTION 2 : GESTION --- */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div {...slideIn("left")}>
            <motion.h2 style={{ color: textColor }} className="text-4xl font-black uppercase italic mb-6 leading-none">
              Zéro perte, <br/><span className="text-indigo-600">Max de profit.</span>
            </motion.h2>
            <p className="text-slate-500 text-xs mb-8 font-bold uppercase tracking-tight leading-relaxed max-w-md">
              Recevez des alertes automatiques avant la rupture de stock. Notre IA analyse vos cycles de vente.
            </p>
            <Link href="#" className="flex items-center gap-2 text-[10px] font-black uppercase italic text-indigo-600 group">
              Découvrir lanalyse <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
          <motion.div {...slideIn("right")} className="relative">
             <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1000" className="rounded-[2.5rem] shadow-xl border border-white/10" alt="Warehouse" />
          </motion.div>
        </div>
      </section>

      {/* --- SECTION 3 : ANALYSE --- */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div {...slideIn("left")} className="order-2 lg:order-1">
             <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000" className="rounded-[2.5rem] shadow-xl border border-white/10" alt="Analytics" />
          </motion.div>
          <motion.div {...slideIn("right")} className="order-1 lg:order-2 text-right">
            <motion.h2 style={{ color: textColor }} className="text-4xl font-black uppercase italic mb-6 leading-none">
              Rapports <br/><span className="text-indigo-600">Clairs & Précis.</span>
            </motion.h2>
            <p className="text-slate-500 text-xs mb-8 font-bold uppercase tracking-tight ml-auto max-w-md">
              Visualisez la santé de votre business en un coup dœil. Marges nettes et produits phares.
            </p>
            <div className="flex justify-end">
              <button className="px-6 py-3 border-2 border-indigo-600 text-indigo-600 rounded-full text-[10px] font-black uppercase italic hover:bg-indigo-600 hover:text-white transition-all">
                Voir exemple
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- SECTION 4 : PRICING --- */}
      <section id="pricing" className="py-24 px-6 relative">
        <motion.div 
          initial={reveal.initial}
          whileInView={reveal.whileInView}
          viewport={reveal.viewport}
          transition={reveal.transition}
          className="text-center mb-16"
        >
          <h2 className="text-indigo-500 font-black uppercase text-[10px] tracking-[0.4em] mb-4">Tarification</h2>
          <motion.p style={{ color: textColor }} className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">
            Vitesse supérieure.
          </motion.p>
        </motion.div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            { t: "Starter", p: 0, f: ["1 Boutique", "Stock Limité"] },
            { t: "Pro", p: 49, f: ["5 Boutiques", "IA Analytics"], hot: true },
            { t: "Enterprise", p: 99, f: ["Illimité", "API Dédiée"] }
          ].map((plan, i) => (
            <motion.div 
              key={i}
              initial={reveal.initial}
              whileInView={reveal.whileInView}
              viewport={reveal.viewport}
              transition={{ ...reveal.transition, delay: i * 0.1 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className={`p-10 rounded-[3rem] border transition-all cursor-pointer ${plan.hot ? 'border-indigo-500 bg-indigo-600/5 shadow-2xl shadow-indigo-500/10' : 'border-white/10 bg-white/5'} backdrop-blur-md`}
            >
              <h3 className="text-indigo-500 font-black uppercase italic text-xs mb-2 tracking-widest">{plan.t}</h3>
              <div className="text-5xl font-black text-white mb-8 tracking-tighter">{plan.p}$<span className="text-[10px] text-slate-500 uppercase">/mo</span></div>
              <ul className="space-y-4 mb-10">
                {plan.f.map((feat, j) => (
                  <li key={j} className="flex items-center gap-3 text-slate-400 font-bold italic text-[10px] uppercase">
                    <CheckCircle2 size={14} className="text-indigo-500" /> {feat}
                  </li>
                ))}
              </ul>
              <button className={`w-full py-4 rounded-xl text-[10px] font-black uppercase italic transition-all ${plan.hot ? 'bg-indigo-600 text-white' : 'bg-white text-slate-900'}`}>
                Sabonner
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* --- SECTION 5 : TRUST / STATS --- */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          {[
            { n: 500, s: "+", t: "Entreprises" },
            { n: 99, s: "%", t: "Satisfaction" },
            { n: 24, s: "h", t: "Réponse" },
            { n: 10, s: "M", t: "Ventes" }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={reveal.initial}
              whileInView={reveal.whileInView}
              viewport={reveal.viewport}
              transition={reveal.transition}
            >
              <div className="text-4xl md:text-5xl font-black text-white mb-1 italic tracking-tighter leading-none">
                <Counter value={stat.n} suffix={stat.s} />
              </div>
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
            <div className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">
              © 2026 StockMaster — Kinshasa
            </div>
            <div className="flex gap-6 text-slate-400">
              <Facebook size={18} className="hover:text-white transition cursor-pointer" />
              <Linkedin size={18} className="hover:text-white transition cursor-pointer" />
              <Instagram size={18} className="hover:text-white transition cursor-pointer" />
            </div>
        </div>
      </footer>
    </motion.main>
  );
}