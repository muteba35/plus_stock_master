"use client";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import Link from "next/link"; // Importation du composant Link

export default function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
    visible: { 
      opacity: 1, 
      y: 0, 
      filter: "blur(0px)",
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } 
    }
  };

  return (
    <section className="relative pt-32 pb-16 px-6 overflow-hidden bg-white">
      {/* Background Decor - Très subtil */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[120px] opacity-50" />
      </div>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {/* Badge Style Apple/Linear */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 mb-8 border border-slate-200 rounded-full bg-slate-50/50 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                Nouveau : Mode multi-entrepôts
            </span>
          </motion.div>
          
          <motion.h1 
            variants={itemVariants} 
            className="text-5xl lg:text-7xl font-black text-slate-900 leading-[0.92] mb-8 tracking-tighter"
          >
            Gerez votre <br />
            stock{" "}
            <span className="relative inline-block text-indigo-600 italic tracking-[-0.02em]">
              avec précision.
              <motion.span 
                initial={{ x: "-100%", opacity: 0 }}
                animate={{ x: "100%", opacity: 1 }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 pointer-events-none"
              />
            </span>
          </motion.h1>
           
          <motion.p 
            variants={itemVariants} 
            className="text-sm md:text-base text-slate-500 mb-10 max-w-md font-medium leading-relaxed uppercase tracking-tight"
          >
            La solution complète de gestion de stock pour les entreprises en RDC. 
            Sécurisez vos inventaires avec le suivi en temps réel et automatisez vos rapports de ventes sans aucune erreur.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-wrap gap-5">
            {/* REDIRECTION VERS L'INSCRIPTION */}
            <Link 
              href="/register" 
              className="px-7 py-3.5 bg-slate-950 text-white rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-3 group"
            >
              Démarrer l`experience 
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>

            <button className="px-7 py-3.5 bg-transparent text-slate-900 border border-slate-200 rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition flex items-center gap-3">
              <PlayCircle size={16} /> Voir la démo
            </button>
          </motion.div>
        </motion.div>

        {/* Dashboard avec animation de flottement */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative lg:ml-auto"
        >
          <motion.div 
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 bg-white rounded-[2.5rem] p-3 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)] border border-slate-100"
          >
            <img 
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000" 
              alt="Dashboard StockMaster" 
              className="rounded-[2rem] w-full" 
            />
          </motion.div>
          
          <div className="absolute -inset-4 bg-indigo-500/10 blur-3xl rounded-full -z-10" />
        </motion.div>
      </div>
    </section>
  );
}