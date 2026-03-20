"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Package2, Menu, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const { scrollY } = useScroll();
  const [open, setOpen] = useState(false);

  // Animations scroll
  const width = useTransform(scrollY, [0, 100], ["100%", "90%"]);
  const y = useTransform(scrollY, [0, 100], [0, 20]);
  const borderRadius = useTransform(scrollY, [0, 100], [0, 32]);
  const borderWidth = useTransform(scrollY, [0, 100], [0, 1]);
  const shadow = useTransform(scrollY, [0, 100], ["none", "0 10px 30px -10px rgba(0,0,0,0.1)"]);

  const menuItems = [
    { name: "Fonctionnalités", href: "#" },
    { name: "Solutions", href: "#" },
    { name: "Tarifs", href: "#pricing" },
    { name: "À propos", href: "#" },
  ];

  return (
    <div className="fixed w-full flex justify-center z-[100] pointer-events-none px-4">
      <motion.nav
        style={{ width, y, borderRadius, borderWidth, boxShadow: shadow }}
        className="bg-white/80 backdrop-blur-xl border-slate-200/50 pointer-events-auto overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* CÔTÉ GAUCHE : LOGO + HAMBURGER (MOBILE) */}
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} className="text-slate-900"/> : <Menu size={20} className="text-slate-900"/>}
            </button>

            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                <Package2 size={18} />
              </div>
              <span className="text-xs font-black tracking-tighter text-slate-900 uppercase italic">
                StockMaster
              </span>
            </Link>
          </div>

          {/* CENTRE : MENU DESKTOP */}
          <div className="hidden md:flex items-center gap-8 bg-slate-100/50 px-6 py-2 rounded-full border border-slate-200/50">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-[10px] font-black text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-[0.15em] italic"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* CÔTÉ DROIT : ACTIONS */}
          <div className="flex items-center gap-3">
            <Link 
              href="#" 
              className="text-[10px] font-black uppercase italic text-slate-900 hover:text-indigo-600 transition-colors px-3 py-2"
            >
              Login
            </Link>

            <Link 
              href="#" 
              className="group flex items-center gap-2 px-4 py-2 bg-slate-900 text-[9px] uppercase font-black italic text-white rounded-full hover:bg-indigo-600 transition-all shadow-md"
            >
              Essai Gratuit
              <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* MENU MOBILE DÉROULANT */}
        <AnimatePresence>
          {open && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden border-t border-slate-100 bg-white"
            >
              <div className="flex flex-col p-6 gap-4">
                {menuItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="text-xs font-black uppercase italic text-slate-600 hover:text-indigo-600 flex items-center justify-between group"
                  >
                    {item.name}
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </Link>
                ))}
                
                <div className="h-px bg-slate-100 my-2" />
                
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
                  Simplifiez votre logistique dès aujourd'hui.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}