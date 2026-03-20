"use client";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";

export default function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <section className="pt-48 pb-20 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.span variants={itemVariants} className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-full">
            Nouveau : Mode multi-entrepôts
          </motion.span>
          <motion.h1 variants={itemVariants} className="text-6xl lg:text-8xl font-extrabold text-slate-900 leading-[0.9] mb-8 tracking-tighter">
            Gérez votre stock <br />
            <span className="text-indigo-600 italic font-serif">en légèreté.</span>
          </motion.h1>
          <motion.p variants={itemVariants} className="text-xl text-slate-600 mb-10 max-w-lg leading-relaxed">
            La solution tout-en-un pour automatiser vos inventaires et optimiser votre logistique en temps réel.
          </motion.p>
          <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
            <button className="px-8 py-4 bg-indigo-600 text-white rounded-full font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2">
              Démarrer <ArrowRight size={20} />
            </button>
            <button className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-full font-bold text-lg hover:bg-slate-50 transition flex items-center gap-2">
              <PlayCircle size={20} /> Voir démo
            </button>
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="absolute inset-0 bg-indigo-300 rounded-[3rem] blur-[100px] opacity-20" />
          <motion.div 
            whileHover={{ y: -10 }}
            className="relative bg-white rounded-[2.5rem] p-4 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border border-slate-100"
          >
            <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000" alt="Dashboard" className="rounded-[2rem] w-full shadow-inner" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}